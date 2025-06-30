// src/components/admin/DeliveriesTab.jsx
import { useEffect, useState } from "react";
import { getWithAuth } from "../../api/api";
import CourierMap from "../courierMap";

/**
 * Admin DeliveriesTab: Shows a table of all deliveries with filters
 * and a live tracking map when clicking "Open Map".
 */
export const DeliveriesTab = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filters, setFilters] = useState({ business: "", item: "" });
  const [visibleDelivery, setVisibleDelivery] = useState(null);

  // Fetch all deliveries using admin API
  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const data = await getWithAuth("http://localhost:8080/deliveries");
        setDeliveries(data);
      } catch (err) {
        console.error("Failed to fetch deliveries", err);
      }
    };
    fetchDeliveries();
  }, []);

  // Filter deliveries by business and item name
  const filtered = deliveries.filter((d) => {
    const matchesBusiness = d.BusinessName?.toLowerCase().includes(filters.business.toLowerCase());
    const matchesItem = d.Item?.toLowerCase().includes(filters.item.toLowerCase());
    return matchesBusiness && matchesItem;
  });

  return (
    <section>
      <h3>All Deliveries</h3>
      <div>
        <input
          placeholder="Filter by Business Name"
          value={filters.business}
          onChange={(e) => setFilters({ ...filters, business: e.target.value })}
        />
        <input
          placeholder="Filter by Item Name"
          value={filters.item}
          onChange={(e) => setFilters({ ...filters, item: e.target.value })}
          style={{ marginLeft: 10 }}
        />
      </div>

      <table border="1" style={{ marginTop: "1rem", width: "100%" }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Status</th>
            <th>Business</th>
            <th>Destination</th>
            <th>Courier</th>
            <th>Live Map</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d.Id}>
              <td>{d.Item}</td>
              <td>{d.Status}</td>
              <td>{d.BusinessName}</td>
              <td>{d.DestinationAddress}</td>
              <td>{d.DeliveredBy || d.AssignedTo || "Unassigned"}</td>
              <td>
              {d.AssignedTo && d.Status !== "accepted" ? (
                    <div>
                      <button
                        onClick={() => {
                          if (visibleDelivery?.Id === d.Id) {
                            setVisibleDelivery(null); // close current map
                          } else {
                            setVisibleDelivery(d); // open new map
                          }
                        }}
                      >
                        {visibleDelivery?.Id === d.Id ? "Hide Map" : "Open Map"}
                      </button>
                    </div>
                  ) : (
                    <div>
                        {(d.Status === "accepted") ? "Courier is on the way" : ""}
                        {(d.Status === "posted") ? "Unassigned" : ""}
                        {(d.Status === "delivered") ? "Completed" : ""}
                    </div>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {visibleDelivery && (
            <div style={{ marginTop: "30px" }}>
              <h3>Tracking Courier for Delivery {visibleDelivery.Item}</h3>
              <CourierMap courierId={visibleDelivery.AssignedTo} />
            </div>
    )}
    </section>
  );
};

export default DeliveriesTab;
