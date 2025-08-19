
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
// for delivery creation api req
import { getWithAuth } from "../api/api";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { DeliveriesTab } from "../components/shared/deliveriesTab";
import { ProfileTab } from "../components/shared/profileTab";
import { NewDeliveryTab }from "../components/business/newDeliveryTab";
import { OverViewTab }from "../components/business/overviewTab";


export const Business = () => {
  const { user , signOut} = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [businessData, setBusinessData] = useState("");

  // to allow courier tracking to appear/ disappear
  const [visibleDelivery, setVisibleDelivery] = useState(null);
  const [tab, setTab] = useState("overview");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    // get business info
    const fetchBusiness = async () => {
      try {
        const data = await getWithAuth("http://localhost:8080/me");
        setBusinessData(data);
      } catch (err) {
        console.error("Failed to fetch business info", err);
      }
    };
    fetchBusiness();

    // listener for real-time updates
    const q = query(collection(db, "deliveries"), where("businessId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDeliveries(results);
    });

    return () => unsubscribe();
  }, [user]);

  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (!user) return null; 
    await signOut();
    navigate("/"); 
  };

  return(
    <>
    <div className="flex min-h-screen">
      {/* Side Navbar */}
      <aside
          className="w-64 fixed top-0 left-0 bottom-0 z-30 bg-white border-r flex-shrink-0">
          <div className="flex flex-col h-full">
              <div className='h-20 flex items-center px-8'>
                  <a href='/' className='flex-none'>
                      <img src="/name_logo.png" width={140} className="mx-auto" alt="logo"/>
                  </a>
                  
              </div>
              <div className="flex-1 flex flex-col h-full overflow-auto">
                  <ul className="px-4 text-sm font-medium flex-1">
                    <br></br>
                    <li><button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add New Delivery</button></li>
                    <br></br>

                    <li><button onClick={() => setTab("overview")} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">📊 Overview</button></li>
                    <li><button onClick={() => setTab("deliveries")} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">📦 Deliveries</button></li>
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
                                  <span className="block text-gray-700 text-sm font-semibold">{businessData.BusinessName}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div >
          </div>
      </aside>
            
      {/* Tab views by selection */}
      <main className="flex-1 ml-64 p-6 bg-gray-50 min-h-screen">
        {tab === "deliveries" && <DeliveriesTab
          deliveries={deliveries}
          isAdmin={false}
          visibleDelivery={visibleDelivery}
          setVisibleDelivery={setVisibleDelivery}
          />}
        {tab === "profile" && <ProfileTab
          profile={businessData}
        />}
        {tab === "overview" && <OverViewTab
          deliveries={deliveries}
          businessData={businessData}
          userRole={"business"}
        />}
        {showModal && <NewDeliveryTab
            businessData={businessData}
            open={showModal}
            onClose={() => setShowModal(false)}
          />}
      </main>
  </div>
    </>
  );
};

export default Business;
