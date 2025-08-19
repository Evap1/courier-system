import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { getWithAuth } from "../api/api";

// tabs
import { OverViewTab } from "../components/admin/overviewTab";
import DeliveriesTab from "../components/shared/deliveriesTab";
import ProfileTab from "../components/shared/profileTab";
import { CouriersTab } from "../components/admin/couriersTab"; // upgraded

export const Admin = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [adminData, setAdminData] = useState({});
  const [deliveries, setDeliveries] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [visibleDelivery, setVisibleDelivery] = useState(null);
  const [locations, setLocations] = useState({});

  useEffect(() => {
    if (!user) return;

    // get admin info
    const fetchAdmin = async () => {
        try {
          const data = await getWithAuth("http://localhost:8080/me");
          setAdminData(data);
        } catch (err) {
          console.error("Failed to fetch admin info", err);
        }
      };
      fetchAdmin();
    
    // get couriers info
    const fetchCouriers = async () => {
      try {
        const data = await getWithAuth("http://localhost:8080/couriers");
        setCouriers(data);
      } catch (err) {
        console.error("Failed to load couriers", err);
      }
    };
    fetchCouriers();

    // listen to ALL deliveries in Firestore in real time
    const unsub = onSnapshot(collection(db, "deliveries"), (snapshot) => {
      const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDeliveries(results);
    });

    return () => unsub();
  }, [user]);

  // subscribe to live locations for all couriers
  useEffect(() => {
    const unsubscribers = couriers.map((courier) => {
      const ref = doc(db, "couriers", courier.Id, "location", "current");
      return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLocations((prev) => ({
            ...prev,
            [courier.Id]: {
              lat: data.lat,
              lng: data.lng,
              name: courier.CourierName || courier.Email,
            },
          }));
        }
      });
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [couriers])

  const handleSignOut = async () => {
    if (!user) return;
    await signOut();
    navigate("/");
  };

  return(
    <div className="flex min-h-screen">
      {/* side navbar */}
      <aside
          className="w-64 fixed top-0 left-0 bottom-0 z-30 bg-white border-r flex-shrink-0">
          <div className="flex flex-col h-full">
              <div className='h-20 flex items-center px-8'>
                  <a href="/" className='flex-none'>
                      <img src="/name_logo.png" width={140} className="mx-auto" alt="logo" />
                  </a>
              </div>
              <div className="flex-1 flex flex-col h-full overflow-auto">
                  <ul className="px-4 text-sm font-medium flex-1">

                    <li><button onClick={() => setTab("overview")} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">📊 Overview</button></li>
                    <li><button onClick={() => setTab("deliveries")} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">📦 Deliveries</button></li>
                    <li><button onClick={() => setTab("couriers")} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">🛵 Couriers</button></li>
                    <li><button onClick={() => setTab("profile")} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">👤 Profile</button></li>
                  </ul>
                  <div>
                      <ul className="px-4 pb-4 text-sm font-medium">
                      <button onClick={handleSignOut} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">🚪 Sign Out</button>
                      </ul>
                      <div className="py-4 px-4 border-t">
                          <div className="flex items-center gap-x-4">
                              <img src="https://randomuser.me/api/portraits/women/79.jpg" className="w-12 h-12 rounded-full" alt="user"/>
                              <div>
                                  <span className="block text-gray-700 text-sm font-semibold">{adminData.AdminName}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div >
          </div>
      </aside>

      {/* main content */}
      <main className="flex-1 ml-64 p-6 bg-gray-50 min-h-screen">
        {tab === "overview" && <OverViewTab  deliveries={deliveries} couriers={couriers} /> }
        {tab === "deliveries" && ( <DeliveriesTab deliveries={deliveries} isAdmin={true} visibleDelivery={visibleDelivery} setVisibleDelivery={setVisibleDelivery} /> )}
        {tab === "couriers" && <CouriersTab deliveries={deliveries} couriers={couriers} locations={locations} />}
        {tab === "profile" && <ProfileTab profile={adminData} />}
      </main>
    </div>
  );
};

export default Admin;
