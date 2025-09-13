/**
 * Demo seeder:
 *  - WILL NOT DELETE or EDIT existing data; it only inserts if missing.
 *  - It does NOT create/update the admin. All admin changes live in initAdmin.js.
 *
 * ENV (required):
 *   FIREBASE_SA=/abs/path/serviceAccount.json
 *   GCP_PROJECT_ID=<firebase project id>
 *
 * ENV (optional):
 *   SEED_PASSWORD="Demo123!"                 // used only for NEWLY-created demo users
 *   COURIER_LOC_HISTORY_PINGS="24"           // optional location history
 *   COURIER_LOC_STEP_MIN="5"
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { faker } = require('@faker-js/faker');

process.on('unhandledRejection', (err) => { console.error('[seed] UNHANDLED REJECTION:', err); process.exit(1); });
process.on('uncaughtException', (err) => { console.error('[seed] UNCAUGHT EXCEPTION:', err); process.exit(1); });

console.log('[seed] starting at', new Date().toISOString());

if (!process.env.FIREBASE_SA || !process.env.GCP_PROJECT_ID) {
  console.error("FIREBASE_SA and GCP_PROJECT_ID are required env vars.");
  process.exit(1);
}

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "Demo123!";
const HISTORY_PINGS = Math.max(0, parseInt(process.env.COURIER_LOC_HISTORY_PINGS || "0", 10));
const HISTORY_STEP_MIN = Math.max(1, parseInt(process.env.COURIER_LOC_STEP_MIN || "5", 10));

const serviceAccount = require(process.env.FIREBASE_SA);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.GCP_PROJECT_ID,
});
const db = admin.firestore();

// ---------------- Constants ----------------
const NUM_COURIERS = 20;
const NUM_BUSINESSES = 12;

const CITIES = [
  { key: "afula",       city: "Afula",        loc: { lat: 32.6091, lng: 35.2892 } },
  { key: "telaviv",     city: "Tel Aviv",     loc: { lat: 32.0853, lng: 34.7818 } },
  { key: "haifa",       city: "Haifa",        loc: { lat: 32.7940, lng: 34.9896 } },
  { key: "jerusalem",   city: "Jerusalem",    loc: { lat: 31.7683, lng: 35.2137 } },
  { key: "beersheva",   city: "Beer Sheva",   loc: { lat: 31.2529, lng: 34.7915 } },
  { key: "netanya",     city: "Netanya",      loc: { lat: 32.3215, lng: 34.8532 } },
  { key: "rishon",      city: "Rishon LeZion",loc: { lat: 31.9730, lng: 34.7925 } },
  { key: "eilat",       city: "Eilat",        loc: { lat: 29.5577, lng: 34.9519 } },
  { key: "petah",       city: "Petah Tikva",  loc: { lat: 32.0871, lng: 34.8878 } },
  { key: "holon",       city: "Holon",        loc: { lat: 32.0102, lng: 34.7790 } },
  { key: "ashdod",      city: "Ashdod",       loc: { lat: 31.8044, lng: 34.6553 } },
  { key: "herzliya",    city: "Herzliya",     loc: { lat: 32.1663, lng: 34.8436 } },
];
const DESTS = CITIES.map(c => ({ city: c.city, loc: c.loc }));

const STATUS_BUCKETS = [
  "posted","posted",
  "accepted","accepted",
  "picked_up","picked_up",
  "delivered","delivered","delivered","delivered",
];

// ---------------- Utils ----------------
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];

function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function computePaymentKm(a, b) {
  const km = Math.max(1, haversineKm(a, b));
  const raw = Math.max(20, 12 + km * 3.2);
  return Math.round(raw * 2) / 2;
}
function randomDateLast3Months() {
  const now = new Date();
  const start = new Date(); start.setMonth(now.getMonth() - 3);
  const t = start.getTime() + Math.random() ** 1.2 * (now.getTime() - start.getTime());
  return new Date(t);
}

// ------------ Auth/Firestore helpers ------------

async function createAuthUserIfAbsent({ email, password, displayName }) {
  try {
    const u = await admin.auth().getUserByEmail(email);
    // Do NOT edit existing users (insert-only policy)
    return u.uid;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const created = await admin.auth().createUser({ email, password, displayName });
      return created.uid;
    }
    throw e;
  }
}
async function createDocIfAbsent(ref, data) {
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.create(data); // will throw if already exists; that’s ok because we checked
    return true;
  }
  return false;
}

// ---------------- Location helpers ----------------
function jitter(n=0.001) { return (Math.random()-0.5)*2*n; }
function near(loc) { return { lat: loc.lat + jitter(0.005), lng: loc.lng + jitter(0.005) }; }

async function seedCourierLocationDocsInsertOnly(couriers, deliveriesByCourier) {
  const now = new Date();
  const msStep = HISTORY_STEP_MIN * 60 * 1000;

  for (const { uid } of couriers) {
    const assigned = deliveriesByCourier.get(uid) || [];
    let point;
    if (assigned.length) {
      const d = pick(assigned);
      point = {
        lat: d.businessLocation.lat + 0.8 * (d.destinationLocation.lat - d.businessLocation.lat) + jitter(0.003),
        lng: d.businessLocation.lng + 0.8 * (d.destinationLocation.lng - d.businessLocation.lng) + jitter(0.003),
      };
    } else {
      point = near(pick(CITIES).loc);
    }

    // couriers/{uid}/location/current — create if absent
    const currentRef = db.collection('couriers').doc(uid).collection('location').doc('current');
    const currentSnap = await currentRef.get();
    if (!currentSnap.exists) {
      await currentRef.create({ lat: point.lat, lng: point.lng, updatedAt: now });
    }

    // history pings — create only missing docs
    if (HISTORY_PINGS > 0) {
      const historyCol = db.collection('couriers').doc(uid).collection('location').doc('history').collection('pings');
      for (let i=HISTORY_PINGS-1; i>=0; i--) {
        const ts = new Date(now.getTime() - i*msStep).toISOString();
        const pingRef = historyCol.doc(ts);
        const exists = (await pingRef.get()).exists;
        if (!exists) {
          const pt = { lat: point.lat + jitter(0.002), lng: point.lng + jitter(0.002) };
          await pingRef.create({ lat: pt.lat, lng: pt.lng, ts: new Date(ts) });
        }
      }
    }
  }
}

// ---------------- Generators ----------------
function generateCouriers(n) {
  return Array.from({ length: n }).map(() => {
    const name = faker.person.fullName();
    const first = name.split(' ')[0];
    const last  = name.split(' ').slice(-1)[0];
    const email = faker.internet.email({ firstName: first, lastName: last, provider: 'example.com' }).toLowerCase();
    const balance = Math.round((Math.random()*350) * 100) / 100;
    return { name, email, balance };
  });
}
function generateBusinesses(n) {
  const list = [];
  list.push({
    cityKey: 'afula',
    businessName: faker.company.name(),
    businessAddress: "Afula, Israel",
    email: faker.internet.email({ firstName: "afula", lastName: "biz", provider: 'example.com' }).toLowerCase(),
    location: CITIES.find(c => c.key==='afula').loc,
  });
  const rest = n - 1;
  const pool = CITIES.filter(c => c.key !== 'afula');
  for (let i=0;i<rest;i++) {
    const c = pick(pool);
    list.push({
      cityKey: c.key,
      businessName: faker.company.name(),
      businessAddress: `${c.city}, Israel`,
      email: faker.internet.email({ firstName: c.key, lastName: "biz", provider: 'example.com' }).toLowerCase(),
      location: c.loc,
    });
  }
  return list;
}
function generateDeliveriesForBusiness(biz, courierUids) {
  const n = 10 + Math.floor(Math.random()*5); // 10–14
  const out = [];
  for (let i=0;i<n;i++) {
    const id = uuidv4();
    const dst = pick(DESTS);
    const status = pick(STATUS_BUCKETS);
    const createdAt = randomDateLast3Months();
    const assignedTo = status === "posted" ? null : pick(courierUids);
    const deliveredBy = status === "delivered" ? (assignedTo || pick(courierUids)) : null;
    const item = faker.commerce.productName();
    const payment = computePaymentKm(biz.location, dst.loc);
    out.push({
      id,
      businessId: biz.uid,
      businessName: biz.businessName,
      businessAddress: biz.businessAddress,
      businessLocation: biz.location,
      destinationAddress: `${dst.city}, Israel`,
      destinationLocation: dst.loc,
      item,
      payment,
      status,
      assignedTo: assignedTo || null,
      deliveredBy: deliveredBy || null,
      createdAt,
      createdBy: biz.uid,
    });
  }
  return out;
}

// ---------------- Main ----------------
(async function main() {

  // Couriers (auth + Firestore) — insert only
  console.log(`[seed] Ensuring up to ${NUM_COURIERS} couriers exist...`);
  const courierSeeds = generateCouriers(NUM_COURIERS);
  const couriers = [];
  for (const c of courierSeeds) {
    const uid = await createAuthUserIfAbsent({ email: c.email, password: DEFAULT_PASSWORD, displayName: c.name });
    const userRef = db.collection('users').doc(uid);
    // create user profile only if absent
    await createDocIfAbsent(userRef, {
      role: "courier",
      courierName: c.name,
      email: c.email,
      balance: c.balance,
    }).catch(()=>{});
    couriers.push({ uid, ...c });
  }

  // Businesses (auth + Firestore) — insert only
  console.log(`[seed] Ensuring up to ${NUM_BUSINESSES} businesses exist...`);
  const bizSeeds = generateBusinesses(NUM_BUSINESSES);
  const businesses = [];
  for (const b of bizSeeds) {
    const uid = await createAuthUserIfAbsent({ email: b.email, password: DEFAULT_PASSWORD, displayName: b.businessName });
    const userRef = db.collection('users').doc(uid);
    await createDocIfAbsent(userRef, {
      role: "business",
      businessName: b.businessName,
      businessAddress: b.businessAddress,
      email: b.email,
      location: b.location,
    }).catch(()=>{});
    businesses.push({ uid, ...b });
  }

  // Deliveries — always create (UUIDs avoid collisions)
  console.log("[seed] Creating deliveries (new UUIDs)...");
  const allDeliveries = [];
  for (const biz of businesses) {
    const ds = generateDeliveriesForBusiness(biz, couriers.map(c => c.uid));
    allDeliveries.push(...ds);
  }
  for (let i=0; i<allDeliveries.length; i+=400) {
    const slice = allDeliveries.slice(i, i+400);
    const batch = db.batch();
    for (const d of slice) {
      const ref = db.collection('deliveries').doc(d.id);
      batch.create(ref, d); // create-only — will fail if somehow exists (UUID makes it practically unique)
    }
    try {
      await batch.commit();
    } catch (e) {
      console.warn('[seed] Some deliveries may already exist; continuing.', e.message);
    }
  }

  // Courier locations — create if missing - required for correct map funcionality.
  const deliveriesByCourier = new Map();
  for (const d of allDeliveries) {
    if (!d.assignedTo) continue;
    const arr = deliveriesByCourier.get(d.assignedTo) || [];
    arr.push(d);
    deliveriesByCourier.set(d.assignedTo, arr);
  }
  await seedCourierLocationDocsInsertOnly(couriers, deliveriesByCourier);

  console.log(`[seed] COMPLETE
  - Businesses (attempted create up to): ${businesses.length}
  - Couriers (attempted create up to): ${couriers.length}
  - Deliveries created: ${allDeliveries.length}
  - Locations: couriers/{uid}/location/current ${HISTORY_PINGS>0?`(+ history: ${HISTORY_PINGS} pings if missing)`:''}
  - Default password for NEW demo users: ${DEFAULT_PASSWORD}`);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
