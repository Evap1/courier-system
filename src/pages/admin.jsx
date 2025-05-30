
// src/pages/admin.jsx
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { TableView } from "../components/tableView";

export const Admin = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    const unsubDeliveries = onSnapshot(collection(db, "deliveries"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const deliveriesData = doc.data();
        console.log(deliveriesData);
        return {
          Item: deliveriesData.item,
          Status: deliveriesData.status,
          Pickup: deliveriesData.src,
          Destination: deliveriesData.destinationAddress,
          "Created At": deliveriesData.createdAt?.toDate().toString(),
        };
      });
      setDeliveries(data);
    });

    const unsubCouriers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "courier")),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const courierData = doc.data();
          return {
            Name: courierData.name,
            Email: courierData.email,
            UID: doc.id,
          };
        });
        setCouriers(data);
      }
    );

    const unsubBusinesses = onSnapshot(
      query(collection(db, "users"), where("role", "==", "business")),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const businessData = doc.data();
          return {
            Name: businessData.name,
            Email: businessData.email,
            Address: businessData.businessAddress,
            UID: doc.id,
          };
        });
        setBusinesses(data);
      }
    );

    return () => {
      unsubDeliveries();
      unsubCouriers();
      unsubBusinesses();
    };
  }, []);

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <TableView
        title="All Deliveries"
        columns={["Item", "Status", "Pickup", "Destination", "Created At"]}
        rows={deliveries}
      />
      <TableView
        title="All Couriers"
        columns={["Name", "Email"]}
        rows={couriers}
      />
      <TableView
        title="All Businesses"
        columns={["Name", "Email", "Address"]}
        rows={businesses}
      />
    </section>
  );
};

export default Admin;

