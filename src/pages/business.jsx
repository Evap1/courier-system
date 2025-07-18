
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { AddressInput } from "../components/address";
// for delivery creation api req
import { postWithAuth , getWithAuth } from "../api/api";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import CourierMap from "../components/courierMap";

export const Business = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [item, setItem] = useState("");
  const [businessData, setBusinessData] = useState("");

  const [destination, setDestination] = useState("");
  const [payment, setPayment] = useState(0);
  const [error, setError] = useState(null);

  // to allow courier tracking to appear/ disappear
  const [visibleDelivery, setVisibleDelivery] = useState(null);

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

  const handleNewDelivery = async (e) => {
    e.preventDefault();
    if (!item || !destination) {
      setError("Item and Destination are required.");
      return;
    }
    const parsedPayment = parseFloat(payment);

    if (isNaN(parsedPayment)) {
      setError("Please enter only numbers for payment");
      return
    }


    // send api req to create new delivery
    try {
      const body = {
        BusinessName: businessData.BusinessName,
        BusinessAddress: businessData.BusinessAddress,
        BusinessLocation: businessData.BusinessLocation,
        DestinationAddress: destination.formatted,
        DestinationLocation: {
          Lat: destination.location.lat,
          Lng: destination.location.lng
        },
        Item: item,
        Payment: parsedPayment
      };
      await postWithAuth("http://localhost:8080/deliveries", body);
  
      // reset the fields
      setItem("");
      setDestination("");
      setShowForm(false);
      setError(null);
      setPayment(0);
    } catch (err) {
      console.error("Error creating delivery:", err);
      setError("Failed to create delivery");
    }
  };

  return (
    <section>
      <h2>Welcome {businessData.BusinessName}</h2>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? "Back to Overview" : "New Delivery"}
      </button>
      {showForm ? (
        <form onSubmit={handleNewDelivery}>
          <h3>Place a New Delivery</h3>
          <label>
            Item:
            <input value={item} onChange={(e) => setItem(e.target.value)} required />
          </label>
          <br />
          <label>
            Payment:
            <input value={payment} onChange={(e) => setPayment(e.target.value)} required />
          </label>
          <br />
          <label>
            Destination:
            <AddressInput onSelect={setDestination} />
          </label>
          <br />
          <button type="submit">Submit</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      ) : (
        <div>
          <h3>Deliveries Overview</h3>
          <table border="1">
            <thead>
              <tr>
                <th>Item</th>
                <th>Status</th>
                <th>Destination</th>
                <th>Time of Submission</th>
                <th>Courier Info</th>
              </tr>
            </thead>
            <tbody>
              {/* courier's live location view */}
              {deliveries.map(delivery => (
                <tr key={delivery.id}>
                  <td>{delivery.item}</td>
                  <td>{delivery.status}</td>
                  <td>{delivery.destinationAddress}</td>
                  <td>{delivery.createdAt?.toDate().toLocaleString()}</td>
                  <td>
                  {delivery.assignedTo && delivery.status !== "accepted" ? (
                    <div>
                      <button
                        onClick={() => {
                          if (visibleDelivery?.id === delivery.id) {
                            setVisibleDelivery(null); // close current map
                          } else {
                            setVisibleDelivery(delivery); // open new map
                          }
                        }}
                      >
                        {visibleDelivery?.id === delivery.id ? "Hide Map" : "Open Map"}
                      </button>
                    </div>
                  ) : (
                    <div>
                        {(delivery.status === "accepted") ? "Courier is on the way" : ""}
                        {(delivery.status === "posted") ? "Unassigned" : ""}
                        {(delivery.status === "delivered") ? "Completed" : ""}
                    </div>
                  )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleDelivery && (
            <div style={{ marginTop: "30px" }}>
              <h3>Tracking Courier for Delivery {visibleDelivery.item}</h3>
              <CourierMap courierId={visibleDelivery.assignedTo} />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Business;
