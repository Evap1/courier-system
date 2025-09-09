// scripts/initSingleAdmin.js
/**
 * Ensure EXACTLY one admin:
 *  - If any admin exists: update THAT admin's email/name/password to provided values.
 *  - If none exists: create a new admin with provided values.
 *  - If target email belongs to another user: rename that user to free the email.
 *  - If multiple admins exist: keep the first, remove admin from the rest (do NOT demote the kept one).
 *
 * ENV (required):
 *   FIREBASE_SA=/abs/path/to/serviceAccount.json
 *   GCP_PROJECT_ID=<firebase project id>
 *
 * ENV (optional):
 *   ADMIN_EMAIL="you@example.com"      (default: ADMIN_EMAIL@example.com)
 *   ADMIN_PASSWORD="Demo123!"          (default: Demo123!)
 *   ADMIN_NAME="Demo Admin"            (default: Demo Admin)
 */

process.on('unhandledRejection', e => { console.error('[init-admin] UNHANDLED', e); process.exit(1); });
process.on('uncaughtException', e => { console.error('[init-admin] UNCAUGHT', e); process.exit(1); });

const admin = require('firebase-admin');

if (!process.env.FIREBASE_SA || !process.env.GCP_PROJECT_ID) {
  console.error('ERROR: set FIREBASE_SA and GCP_PROJECT_ID');
  process.exit(1);
}

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'eva.poluliakhov@nitzanim.tech';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.SEED_PASSWORD || 'Demo123!';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Demo Admin';

const sa = require(process.env.FIREBASE_SA);
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: process.env.GCP_PROJECT_ID });

const db = admin.firestore();
const { FieldValue } = admin.firestore;

async function listAllUsers() {
  const out = [];
  let token;
  do {
    const page = await admin.auth().listUsers(1000, token);
    out.push(...page.users);
    token = page.pageToken;
  } while (token);
  return out;
}

function emailWithSuffix(email, suffix) {
  const [local, domain] = email.split('@');
  // keep Gmail-style plus addressing compatible
  return `${local}+${suffix}@${domain}`;
}

async function setAdminClaims(uid) {
  const u = await admin.auth().getUser(uid);
  const claims = { ...(u.customClaims || {}), admin: true, role: 'admin' };
  await admin.auth().setCustomUserClaims(uid, claims);
}

async function saveAdminProfile(uid) {
  await db.collection('users').doc(uid).set({
    role: 'admin',
    adminName: ADMIN_NAME,
    email: ADMIN_EMAIL,
  }, { merge: true });
}

async function removeAdminFrom(uid) {
  const u = await admin.auth().getUser(uid);
  if (u.customClaims && (u.customClaims.admin === true || u.customClaims.role === 'admin')) {
    const { admin: _drop1, role: _drop2, ...rest } = u.customClaims;
    await admin.auth().setCustomUserClaims(uid, rest);
  }
  // Fix Firestore role if needed
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (snap.exists && snap.get('role') === 'admin') {
    const update = { role: 'user' };
    if (snap.get('adminName') !== undefined) update.adminName = FieldValue.delete();
    await ref.set(update, { merge: true });
  }
}

async function ensureSingleAdmin() {
  console.log('[init-admin] start', new Date().toISOString());
  console.log('[init-admin] desired admin ->', { ADMIN_EMAIL, ADMIN_NAME });

  const users = await listAllUsers();
  const admins = users.filter(u => u.customClaims?.admin === true || u.customClaims?.role === 'admin');
  console.log("Admins are: ", admins);
  // If no admin exists, create or adopt the account with ADMIN_EMAIL
  if (admins.length === 0) {
    const existing = users.find(u => (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());
    let uid;
    if (existing) {
      // adopt existing user as admin
      uid = existing.uid;
      await admin.auth().updateUser(uid, { password: ADMIN_PASSWORD, displayName: ADMIN_NAME, emailVerified: true });
      console.log(`[init-admin] Adopted existing user as admin uid=${uid}`);
    } else {
      const created = await admin.auth().createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
        emailVerified: true,
      });
      uid = created.uid;
      console.log(`[init-admin] Created admin uid=${uid}`);
    }
    await setAdminClaims(uid);
    await saveAdminProfile(uid);
    console.log('Done (created/adopted admin).');
    return;
  }

  // There is at least one admin already
  const primary = admins[0]; // keep this one as THE admin
  const others = admins.slice(1);

  // If desired email is used by someone else (not the primary admin), rename that other account
  const targetOwner = users.find(u => (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (targetOwner && targetOwner.uid !== primary.uid) {
    const newEmail = emailWithSuffix(targetOwner.email, `replaced_${Date.now()}`);
    await admin.auth().updateUser(targetOwner.uid, { email: newEmail, emailVerified: false });
    console.log(`[init-admin] Renamed conflicting account ${targetOwner.uid} -> ${newEmail}`);
  }

  // Update the primary admin to desired email / password / name
  await admin.auth().updateUser(primary.uid, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: ADMIN_NAME,
    emailVerified: true,
  });
  await setAdminClaims(primary.uid);
  await saveAdminProfile(primary.uid);
  console.log(`[init-admin] Updated primary admin uid=${primary.uid}`);

  // Remove admin from others (do NOT demote the primary)
  if (others.length) {
    console.log(`[init-admin] Found ${others.length} extra admin(s) -> removing admin claims`);
    for (const u of others) {
      await removeAdminFrom(u.uid);
    }
  }

  console.log('Done (single admin ensured).');
}

ensureSingleAdmin()
  .then(() => process.exit(0))
  .catch(err => { console.error('[init-admin] FAILED', err); process.exit(1); });
