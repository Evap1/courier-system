import { useState, useMemo } from "react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts";

export const CourierActivityChart = ({ deliveries, couriers }) => {
  const [selectedCourier, setSelectedCourier] = useState("");

  // generate last 7 days
  const last7Days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        date: d,
      };
    });
  }, []);

  // count deliveries for a given courier for last 7 days
  const getCourierData = (courierId) => {
    return last7Days.map((day) => {
      const count = deliveries.filter((del) => {
        if (del.status !== "delivered") return false;
        if (courierId && del.deliveredBy !== courierId) return false;
        const created = new Date(del.createdAt?.seconds * 1000 || del.createdAt);
        return (
          created.getDate() === day.date.getDate() &&
          created.getMonth() === day.date.getMonth() &&
          created.getFullYear() === day.date.getFullYear()
        );
      }).length;
      return { date: day.label, count };
    });
  };

  // average deliveries/day across all couriers
  const avgData = last7Days.map((day) => {
    const totalCount = deliveries.filter((del) => {
      if (del.status !== "delivered") return false;
      const created = new Date(del.createdAt?.seconds * 1000 || del.createdAt);
      return (
        created.getDate() === day.date.getDate() &&
        created.getMonth() === day.date.getMonth() &&
        created.getFullYear() === day.date.getFullYear()
      );
    }).length;
    const courierCount = couriers.length || 1;
    return { date: day.label, avg: totalCount / courierCount };
  });

  // find min and max performers
  let courierTotals = couriers.map((c) => {
    const total = getCourierData(c.Id).reduce((sum, d) => sum + d.count, 0);
    return { courier: c, total };
  });

  courierTotals.sort((a, b) => a.total - b.total);

  const minCourier = courierTotals[0]?.courier || null;
  const maxCourier = courierTotals[courierTotals.length - 1]?.courier || null;

  const minData = minCourier ? getCourierData(minCourier.Id).map((d) => ({ date: d.date, min: d.count })) : [];

  const maxData = maxCourier ? getCourierData(maxCourier.Id).map((d) => ({ date: d.date, max: d.count })) : [];

  // selected courier's data
  const selectedData =
    selectedCourier && couriers.find((c) => c.Id === selectedCourier)
      ? getCourierData(selectedCourier).map((d) => ({
          date: d.date,
          selected: d.count,
        }))
      : [];

  // merge all lines into single dataset
  const mergedData = last7Days.map((day, idx) => ({
    date: day.label,
    avg: avgData[idx].avg,
    min: minData[idx]?.min || null,
    max: maxData[idx]?.max || null,
    selected: selectedData[idx]?.selected || null,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* header with filter */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h3
          className="text-lg font-semibold text-[var(--color-text-dark)]"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Deliveries Trend (Last 7 Days)
        </h3>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedCourier}
            onChange={(e) => setSelectedCourier(e.target.value)}
          >
            <option value="">Select Courier</option>
            {couriers.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.CourierName || c.Email}
              </option>
            ))}
          </select>
          {selectedCourier && (
            <button
              onClick={() => setSelectedCourier("")}
              className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mergedData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-text-dark)" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-text-dark)" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #eee",
              fontSize: "12px",
            }}
          />
          <Legend />

          {/* average */}
          <Line
            type="monotone"
            dataKey="avg"
            name="Average"
            stroke="var(--color-accent)"
            strokeWidth={3}
            dot={{ r: 3 }}
          />

          {/* lowest */}
          <Line
            type="monotone"
            dataKey="min"
            name={minCourier ? `Lowest (${minCourier.CourierName || minCourier.Email})` : "Lowest"}
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ r: 2 }}
          />

          {/* highest */}
          <Line
            type="monotone"
            dataKey="max"
            name={maxCourier ? `Highest (${maxCourier.CourierName || maxCourier.Email})` : "Highest"}
            stroke="#4B3F72"
            strokeWidth={2}
            dot={{ r: 2 }}
          />

          {/* selected courier */}
          {selectedCourier && (
            <Line
              type="monotone"
              dataKey="selected"
              name={`Selected (${couriers.find((c) => c.Id === selectedCourier)?.CourierName || ""})`}
              stroke="#F59E42"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CourierActivityChart;
