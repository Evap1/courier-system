
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { createDeliveryDocument } from "../services/firestoreService";
import { AddressInput } from "../components/address";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export const Business = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [item, setItem] = useState("");
  const [businessData, setBusinessData] = useState("");

  const [destination, setDestination] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    // to shgow the name in the header
    const fetchBusinessName = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setBusinessData(userDoc.data());
          }
        } catch (err) {
          console.error("Error fetching business name:", err);
        }
      };
    
      fetchBusinessName();

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
    try {
        // fetch business info from users collection
        await createDeliveryDocument(
            user.uid,
            businessData.name,
            item,
            businessData.businessAddress,
            businessData.location,
            destination,
            null,
            "posted"
          );

        // reset the fields
        setItem("");
        setDestination("");
        setShowForm(false);
        setError(null);
    } catch (err) {
      console.error("Error creating delivery:", err);
      setError("Failed to create delivery");
    }
  };

  return (
    <section>
      <h2>Welcome {businessData.name}</h2>
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
              {deliveries.map(delivery => (
                <tr key={delivery.id}>
                  <td>{delivery.item}</td>
                  <td>{delivery.status}</td>
                  <td>{delivery.destinationAddress}</td>
                  <td>{delivery.createdAt?.toDate().toLocaleString()}</td>
                  <td>
                    {delivery.assignedTo ? (
                      <button onClick={() => alert("TODO: Map integration")}>Open Map</button>
                    ) : (
                      "Unassigned"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default Business;
