
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { AddressInput } from "../components/address";
// for delivery creation api req
import { postWithAuth , getWithAuth } from "../api/api";
import {Header} from "../components/header";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import CourierMap from "../components/courierMap";
import { useNavigate } from "react-router-dom";

import { DeliveriesTab } from "../components/shared/deliveriesTab";
import { ProfileTab } from "../components/shared/profileTab";

import { NewDeliveryTab }from "../components/business/newDeliveryTab";
import { OverViewTab }from "../components/business/overviewTab";


export const Business = () => {
  const { user , signOut} = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [item, setItem] = useState("");
  const [businessData, setBusinessData] = useState("");

  const [destination, setDestination] = useState("");
  const [payment, setPayment] = useState(0);
  const [error, setError] = useState(null);

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

  // const handleNewDelivery = async (e) => {
  //   e.preventDefault();
  //   if (!item || !destination) {
  //     setError("Item and Destination are required.");
  //     return;
  //   }
  //   const parsedPayment = parseFloat(payment);

  //   if (isNaN(parsedPayment)) {
  //     setError("Please enter only numbers for payment");
  //     return
  //   }

  // }

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
        <div class="flex flex-col h-full">
            <div className='h-20 flex items-center px-8'>
                <a href='javascript:void(0)' className='flex-none'>
                    <img src="/name_logo.png" width={140} className="mx-auto" />
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
                  {/*                                  <div className="text-gray-500">{item.icon}</div> */}
                </ul>
                <div>
                    <ul className="px-4 pb-4 text-sm font-medium">
                    <button onClick={handleSignOut} className="flex items-center gap-x-2 text-gray-600 p-2 rounded-lg  hover:bg-gray-50 active:bg-gray-100 duration-150">🚪 Sign Out</button>
                    </ul>
                    <div className="py-4 px-4 border-t">
                        <div className="flex items-center gap-x-4">
                            <img src="https://randomuser.me/api/portraits/women/79.jpg" className="w-12 h-12 rounded-full" />
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
        deliveries={deliveries} // state from Firestore snapshot
        isAdmin={false}
        visibleDelivery={visibleDelivery}
        setVisibleDelivery={setVisibleDelivery}
        />}
      {tab === "profile" && <ProfileTab
        businessData={businessData} // state from Firestore snapshot
        userRole={"business"}
      />}
      {tab === "overview" && <OverViewTab
        businessData={businessData} // state from Firestore snapshot
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
//   return (
//     <section>
//       <Header/>
//       <h2>Welcome {businessData.BusinessName}</h2>
//       <button onClick={() => setShowForm(!showForm)}>
//         {showForm ? "Back to Overview" : "New Delivery"}
//       </button>
//       {showForm ? (
//         <form onSubmit={handleNewDelivery}>
//           <h3>Place a New Delivery</h3>
//           <label>
//             Item:
//             <input value={item} onChange={(e) => setItem(e.target.value)} required />
//           </label>
//           <br />
//           <label>
//             Payment:
//             <input value={payment} onChange={(e) => setPayment(e.target.value)} required />
//           </label>
//           <br />
//           <label>
//             Destination:
//             <AddressInput onSelect={setDestination} />
//           </label>
//           <br />
//           <button type="submit">Submit</button>
//           {error && <p style={{ color: "red" }}>{error}</p>}
//         </form>
//       ) : (
//         <div>
//           <h3>Deliveries Overview</h3>
//           <table border="1">
//             <thead>
//               <tr>
//                 <th>Item</th>
//                 <th>Status</th>
//                 <th>Destination</th>
//                 <th>Time of Submission</th>
//                 <th>Courier Info</th>
//               </tr>
//             </thead>
//             <tbody>
//               {/* courier's live location view */}
//               {deliveries.map(delivery => (
//                 <tr key={delivery.id}>
//                   <td>{delivery.item}</td>
//                   <td>{delivery.status}</td>
//                   <td>{delivery.destinationAddress}</td>
//                   <td>{delivery.createdAt?.toDate().toLocaleString()}</td>
//                   <td>
//                   {delivery.assignedTo && delivery.status !== "accepted" ? (
//                     <div>
//                       <button
//                         onClick={() => {
//                           if (visibleDelivery?.id === delivery.id) {
//                             setVisibleDelivery(null); // close current map
//                           } else {
//                             setVisibleDelivery(delivery); // open new map
//                           }
//                         }}
//                       >
//                         {visibleDelivery?.id === delivery.id ? "Hide Map" : "Open Map"}
//                       </button>
//                     </div>
//                   ) : (
//                     <div>
//                         {(delivery.status === "accepted") ? "Courier is on the way" : ""}
//                         {(delivery.status === "posted") ? "Unassigned" : ""}
//                         {(delivery.status === "delivered") ? "Completed" : ""}
//                     </div>
//                   )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {visibleDelivery && (
//             <div style={{ marginTop: "30px" }}>
//               <h3>Tracking Courier for Delivery {visibleDelivery.item}</h3>
//               <CourierMap courierId={visibleDelivery.assignedTo} />
//             </div>
//           )}
//         </div>
//       )}
//     </section>
//   );
// };

// return (
//   <section>
//     <Header/>
//     <h2>Welcome {businessData.BusinessName}</h2>

//     {showForm ? (
      
//       <form onSubmit={handleNewDelivery}>
//         <button
//           className="inline-block px-4 py-2 text-white duration-150 font-medium bg-indigo-600 rounded-lg hover:bg-indigo-500 active:bg-indigo-700 md:text-sm"
//           onClick={() => setShowForm(!showForm)}>
//           {showForm ? "Back to Overview" : "Add product"}
//         </button>
//         <h3>Place a New Delivery</h3>
//         <label>
//           Item:
//           <input value={item} onChange={(e) => setItem(e.target.value)} required />
//         </label>
//         <br />
//         <label>
//           Payment:
//           <input value={payment} onChange={(e) => setPayment(e.target.value)} required />
//         </label>
//         <br />
//         <label>
//           Destination:
//           <AddressInput onSelect={setDestination} />
//         </label>
//         <br />
//         <button type="submit">Submit</button>
//         {error && <p style={{ color: "red" }}>{error}</p>}
//       </form>
//     ) : (
//       <div>
//   <div className="max-w-screen-xl mx-auto px-4 md:px-8">
//       <div className="items-start justify-between md:flex">
//           <div className="max-w-lg">
//               <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
//                   All products
//               </h3>
//               <p className="text-gray-600 mt-2">
//                   Lorem Ipsum is simply dummy text of the printing and typesetting industry.
//               </p>
//           </div>
//           <div className="mt-3 md:mt-0">
//               <button
//                   className="inline-block px-4 py-2 text-white duration-150 font-medium bg-indigo-600 rounded-lg hover:bg-indigo-500 active:bg-indigo-700 md:text-sm"
//                   onClick={() => setShowForm(!showForm)}>
//                   {showForm ? "Back to Overview" : "Add product"}
//               </button>
//           </div>
//       </div>
//       <div className="mt-12 relative h-max overflow-auto">
//           <table className="w-full table-auto text-sm text-left">
//               <thead className="text-gray-600 font-medium border-b">
//                   <tr>
//                       <th className="py-3 pr-6">Item</th>
//                       <th className="py-3 pr-6">Status</th>
//                       <th className="py-3 pr-6">Destination</th>
//                       <th className="py-3 pr-6">Time of Submission</th>
//                       <th className="py-3 pr-6">Courier Info</th>
//                   </tr>
//               </thead>
//               <tbody className="text-gray-600 divide-y">
//                   {
//                       deliveries.map((delivery, idx) => (
//                           <tr key={idx}>
//                               <td className="pr-6 py-4 whitespace-nowrap">{delivery.item}</td>
//                               <td className="pr-6 py-4 whitespace-nowrap">
//                                   <span className={`px-3 py-2 rounded-full font-semibold text-xs ${delivery.status == "Posted" ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"}`}>
//                                       {delivery.status}
//                                   </span>
//                               </td>
//                               <td className="pr-6 py-4 whitespace-nowrap">{delivery.destinationAddress}</td>
//                               <td className="pr-6 py-4 whitespace-nowrap">{delivery.createdAt?.toDate().toLocaleString()}</td>
//                               <td className="text-right whitespace-nowrap">
//                               {delivery.assignedTo && delivery.status !== "accepted" ? (
//                                 <div>
//                                   <button
//                                     onClick={() => {
//                                       if (visibleDelivery?.id === delivery.id) {
//                                         setVisibleDelivery(null); // close current map
//                                       } else {
//                                         setVisibleDelivery(delivery); // open new map
//                                       }
//                                     }}
//                                   >
//                                     {visibleDelivery?.id === delivery.id ? "Hide Map" : "Open Map"}
//                                   </button>
//                                 </div>
//                               ) : (
//                                 <div className="text-right whitespace-nowrap ">
//                                     <p className="text-left whitespace-nowrap ">{(delivery.status === "accepted") ? "Courier is on the way" : ""}</p>
//                                     <p className="text-left whitespace-nowrap ">{(delivery.status === "posted") ? "Unassigned" : ""}</p>
//                                     <p className="text-left whitespace-nowrap ">{(delivery.status === "delivered") ? "Completed" : ""}</p>
//                                 </div>
//                               )}
//                               </td>
//                           </tr>
//                       ))
//                   }
//               </tbody>
//           </table>
//       </div>
//   </div>
        
//         {visibleDelivery && (
//           <div style={{ marginTop: "30px" }}>
//             <h3>Tracking Courier for Delivery {visibleDelivery.item}</h3>
//             <CourierMap courierId={visibleDelivery.assignedTo} />
//           </div>
//         )}
//       </div>
//     )}
//   </section>
// );
// };

// return (
//   <div className="max-w-screen-xl mx-auto px-4 md:px-8">
//       <div className="items-start justify-between md:flex">
//           <div className="max-w-lg">
//               <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
//                   All products
//               </h3>
//               <p className="text-gray-600 mt-2">
//                   Lorem Ipsum is simply dummy text of the printing and typesetting industry.
//               </p>
//           </div>
//           <div className="mt-3 md:mt-0">
//               <button
//                   className="inline-block px-4 py-2 text-white duration-150 font-medium bg-indigo-600 rounded-lg hover:bg-indigo-500 active:bg-indigo-700 md:text-sm"
//                   onClick={() => setShowForm(!showForm)}>
//                   {showForm ? "Back to Overview" : "Add product"}
//               </button>
//           </div>
//       </div>
//       <div className="mt-12 relative h-max overflow-auto">
//           <table className="w-full table-auto text-sm text-left">
//               <thead className="text-gray-600 font-medium border-b">
//                   <tr>
//                       <th className="py-3 pr-6">Item</th>
//                       <th className="py-3 pr-6">Status</th>
//                       <th className="py-3 pr-6">Destination</th>
//                       <th className="py-3 pr-6">Time of Submission</th>
//                       <th className="py-3 pr-6">Courier Info</th>
//                   </tr>
//               </thead>
//               <tbody className="text-gray-600 divide-y">
//                   {
//                       deliveries.map((delivery, idx) => (
//                           <tr key={idx}>
//                               <td className="pr-6 py-4 whitespace-nowrap">{delivery.item}</td>
//                               <td className="pr-6 py-4 whitespace-nowrap">
//                                   <span className={`px-3 py-2 rounded-full font-semibold text-xs ${delivery.status == "Posted" ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"}`}>
//                                       {delivery.status}
//                                   </span>
//                               </td>
//                               <td className="pr-6 py-4 whitespace-nowrap">{delivery.destinationAddress}</td>
//                               <td className="pr-6 py-4 whitespace-nowrap">{delivery.createdAt?.toDate().toLocaleString()}</td>
//                               <td className="text-right whitespace-nowrap">
//                               {delivery.assignedTo && delivery.status !== "accepted" ? (
//                                 <div>
//                                   <button
//                                     onClick={() => {
//                                       if (visibleDelivery?.id === delivery.id) {
//                                         setVisibleDelivery(null); // close current map
//                                       } else {
//                                         setVisibleDelivery(delivery); // open new map
//                                       }
//                                     }}
//                                   >
//                                     {visibleDelivery?.id === delivery.id ? "Hide Map" : "Open Map"}
//                                   </button>
//                                 </div>
//                               ) : (
//                                 <div>
//                                     {(delivery.status === "accepted") ? "Courier is on the way" : ""}
//                                     {(delivery.status === "posted") ? "Unassigned" : ""}
//                                     {(delivery.status === "delivered") ? "Completed" : ""}
//                                 </div>
//                               )}
//                               </td>
//                           </tr>
//                       ))
//                   }
//               </tbody>
//           </table>
//       </div>
//   </div>
// )

export default Business;
