// src/components/admin/CouriersTab.jsx
import { useEffect, useState } from "react";
import { getDocs, doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { db } from "../../firebase";
import { getWithAuth } from "../../api/api";

const mapStyle = { width: "100%", height: "500px" };
const mapCenter = { lat: 32.09, lng: 34.85 };

/**
 * live map of couriers currently on a delivery
 * and income summary over all time.
 */
export const CouriersTab = () => {
  const [couriers, setCouriers] = useState([]); // all courier users
  const [locations, setLocations] = useState({}); // { courierId: { lat, lng } }
  const [income, setIncome] = useState({}); // { courierId: totalIncome }

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  // load all courier users
  useEffect(() => {
    const fetchCouriers = async () => {
      try {
        const data = await getWithAuth("http://localhost:8080/couriers");
        setCouriers(data);
      } catch (err) {
        console.error("Failed to load couriers", err);
      }
    };
    fetchCouriers();
  }, []);

  // load all deliveries to compute income per courier
  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const data = await getWithAuth("http://localhost:8080/deliveries");
        const stats = {};
        data.forEach((d) => {
          if (d.DeliveredBy && d.Payment) {
            stats[d.DeliveredBy] = (stats[d.DeliveredBy] || 0) + d.Payment;
          }
        });
        setIncome(stats);
      } catch (err) {
        console.error("Failed to compute income", err);
      }
    };
    fetchDeliveries();
  }, []);

  // subscribe to live location for couriers that are actively assigned
  useEffect(() => {
    const unsubscribers = [];

    couriers.forEach((courier) => {
      const ref = doc(db, "couriers", courier.Id, "location", "current");
      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLocations((prev) => ({
            ...prev,
            [courier.Id]: { lat: data.lat, lng: data.lng, name: courier.CourierName },
          }));
        }
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [couriers]);

  return (
    <section>
      <h3>Active Couriers on Live Map</h3>
      {!isLoaded ? (
        <p>Loading map…</p>
      ) : (
        <GoogleMap
          mapContainerStyle={mapStyle}
          center={mapCenter}
          zoom={10}
        >
          {Object.entries(locations).map(([cid, loc]) => (
            <Marker
              key={cid}
              position={{ lat: loc.lat, lng: loc.lng }}
              title={loc.name}
            />
          ))}
        </GoogleMap>
      )}

      <h3 style={{ marginTop: "2rem" }}>Courier Income Summary</h3>
      <table border="1" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Courier</th>
            <th>Total Income (₪)</th>
          </tr>
        </thead>
        <tbody>
          {couriers.map((c) => (
            <tr key={c.Id}>
              <td>{c.CourierName || c.Email}</td>
              <td>{income[c.Id]?.toFixed(2) || "0.00"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default CouriersTab;
