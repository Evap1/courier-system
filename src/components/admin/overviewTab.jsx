// src/components/admin/OverviewTab.jsx
import { useEffect, useState } from "react";
import { getWithAuth } from "../../api/api";

const getLast7Days = () => {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

export const OverviewTab = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [courierUsers, setCourierUsers] = useState([]);
  const [busniessUsers, setBusniessUsers] = useState([]);

  const [courierStats, setCourierStats] = useState({});

  useEffect(() => {
    const fetchData = async () => {
        try{
            const allDeliveries = await getWithAuth("http://localhost:8080/deliveries");
            setDeliveries(allDeliveries);
      
            const couriers = await getWithAuth("http://localhost:8080/couriers");
            setCourierUsers(couriers);
      
            const businesses = await getWithAuth("http://localhost:8080/businesses");
            setBusniessUsers(businesses);
      
        } catch(e){
            console.error("Failed to fetch info", e);
        }
      
      const days = getLast7Days();
      const stats = {};

      if (courierUsers){
        courierUsers.forEach((courier) => {
            stats[courier.Id] = {
              name: courier.CourierName,
              dailyIncome: {},
              dailyCount: {},
            };
            days.forEach((day) => {
              stats[courier.Id].dailyIncome[day] = 0;
              stats[courier.Id].dailyCount[day] = 0;
            });
          });
      }

      if (deliveries){
        deliveries.forEach((d) => {
            if (!d.DeliveredBy || !d.Payment || !d.CreatedAt) return;
            const date = new Date(d.CreatedAt).toISOString().split("T")[0];
            if (!days.includes(date)) return;
            if (!stats[d.DeliveredBy]) return;
    
            stats[d.DeliveredBy].dailyIncome[date] += d.Payment;
            stats[d.DeliveredBy].dailyCount[date] += 1;
          });
      }

      setCourierStats(stats);
    };
    fetchData();
  }, [courierUsers]);
  
  const deliveryStats = deliveries.reduce((acc, d) => {
    acc[d.Status] = (acc[d.Status] || 0) + 1;
    return acc;
  }, {});

  const courierCount = courierUsers.length;
  const businessCount = busniessUsers.length;

  return (
    <div>
      <h3>Delivery Statistics</h3>
      <ul>
        {deliveryStats && Object.entries(deliveryStats).map(([status, count]) => (
          <li key={status}>{status}: {count}</li>
        ))}
      </ul>

      <h3>User Statistics</h3>
      <p>Couriers: {courierCount}</p>
      <p>Businesses: {businessCount}</p>

      <h3>Courier Income and Delivery Count (Last 7 Days)</h3>
      {Object.entries(courierStats).map(([cid, data]) => (
        <div key={cid} style={{ marginBottom: "1rem" }}>
          <strong>{data.name || `Courier ${cid}`}</strong>
          <ul>
            {Object.keys(data.dailyIncome).map(day => (
              <li key={day}>
                {day}: ₪{data.dailyIncome[day].toFixed(2)} ({data.dailyCount[day]} deliveries)
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
