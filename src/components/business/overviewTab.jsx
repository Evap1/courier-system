import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line } from "recharts";

const STATUS_COLORS = {
  posted: "#8B5CF6",
  accepted: "#F59E42",
  picked_up: "#3B82F6",
  delivered: "#10B981",
};

// ---------- date helpers ----------
function toDate(any) {
  if (!any) return null;
  // Firestore Timestamp
  if (typeof any === "object" && typeof any.toDate === "function") return any.toDate();
  // seconds/nanoseconds shape
  if (typeof any === "object" && typeof any.seconds === "number") return new Date(any.seconds * 1000);
  // number (ms) or string
  return new Date(any);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay()); // Sunday
  return x;
}

function isSameMonth(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  return ( da && db && da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()
  );
}

function rangeStart(range, now) {
  const n = startOfDay(now);
  switch (range) {
    case "week":
      return startOfWeek(n);
    case "month":
      n.setDate(1);
      return n;
    case "quarter":
      // last 3 months from today (rolling 90 days)
      return new Date(n.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(n.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function isWithinRange(createdAt, start, end) {
  const d = toDate(createdAt);
  if (!d) return false;
  return d >= start && d < end;
}

// ---------- UI options ----------
const timeRanges = [
  { label: "Last 7 days", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 3 Months", value: "quarter" },
];

export const OverViewTab = ({deliveries}) => {
  const [range, setRange] = useState("week");


  // ---------- Derived data (memoized) ----------
  const now = useMemo(() => new Date(), []);
  const end = useMemo(() => new Date(now.getTime() + 24 * 60 * 60 * 1000), [now]); // exclusive upper bound (tomorrow 00:00)
  const from = useMemo(() => rangeStart(range, now), [range, now]);

  // filter everything to the selected range once
  const deliveriesInRange = useMemo(
    () => deliveries.filter((d) => isWithinRange(d.createdAt, from, end)),
    [deliveries, from, end]
  );

  // KPI calculations (keep "Outcome This Month" fixed to calendar month)
  const outcomeThisMonth = useMemo(() => {
    const thisMonthDelivered = deliveries.filter(
      (d) => d.status === "delivered" && isSameMonth(d.createdAt, now)
    );
    return thisMonthDelivered.reduce((acc, d) => acc + (Number(d.payment) || 0), 0);
  }, [deliveries, now]);

  const avgWeekDelta = useMemo(() => {
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inWeek = (s) =>
      deliveries.filter(
        (d) => d.status === "delivered" && isWithinRange(d.createdAt, s, new Date(s.getTime() + 7 * 86400000))
      );

    const thisWeek = inWeek(thisWeekStart);
    const lastWeek = inWeek(lastWeekStart);

    const avg = (arr) =>
      arr.length ? arr.reduce((sum, d) => sum + (Number(d.payment) || 0), 0) / arr.length : 0;

    const a = avg(thisWeek);
    const b = avg(lastWeek);
    const diff = a - b;
    const pct = b ? ((diff / b) * 100).toFixed(1) : 0;
    return { a, b, diff, pct };
  }, [deliveries, now]);

  const summaryData = useMemo(
    () => [
      { label: "Total Deliveries", value: deliveries.length, icon: "📦" },
      {
        label: "Completed",
        value: deliveries.filter((d) => d.status === "delivered").length,
        icon: "✅",
      },
      {
        label: "Outcome This Month",
        value: `₪${outcomeThisMonth.toLocaleString()}`,
        icon: "💸",
      },
      {
        label: "Avg. Cost (Week)",
        value: `₪${avgWeekDelta.a.toFixed(2)}`,
        icon:
          avgWeekDelta.diff > 0 ? (
            <span className="text-red-500">▲</span>
          ) : (
            <span className="text-green-600">▼</span>
          ),
        sub: `Last week: ₪${avgWeekDelta.b.toFixed(2)} (${avgWeekDelta.pct}%)`,
      },
    ],
    [outcomeThisMonth, avgWeekDelta, deliveries]
  );

  // ---------- Charts (now based on deliveriesInRange) ----------
  const pieData = useMemo(() => {
    const statuses = ["posted", "accepted", "picked_up", "delivered"];
    return statuses.map((status) => ({
      name: status[0].toUpperCase() + status.slice(1).replace("_", " "),
      value: deliveriesInRange.filter((d) => d.status === status).length,
      key: status,
    }));
  }, [deliveriesInRange]);

  const barData = useMemo(() => {
    const rangeDays =
      range === "week" ? 7 : range === "month" ? 30 : range === "quarter" ? 90 : 7;

    const days = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      days.push({ date: startOfDay(d), label: `${d.getMonth() + 1}/${d.getDate()}` });
    }

    return days.map((day) => {
      const sameDay = (dt) => startOfDay(toDate(dt)).getTime() === day.date.getTime();
      const deliveredThatDay = deliveriesInRange.filter(
        (d) => d.status === "delivered" && sameDay(d.createdAt)
      );
      const count = deliveredThatDay.length;
      const outcome = deliveredThatDay.reduce(
        (sum, d) => sum + (Number(d.payment) || 0),
        0
      );
      return { name: day.label, delivered: count, outcome };
    });
  }, [deliveriesInRange, range, now]);

  // Recent deliveries (unchanged: always show latest overall)
  const recentDeliveries = useMemo(
    () =>
      [...deliveries]
        .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))
        .slice(0, 7),
    [deliveries]
  );

  function getStatusClasses(status) {
    switch (status) {
      case "posted":
        return "text-purple-700 bg-purple-100";
      case "accepted":
        return "text-yellow-800 bg-yellow-100";
      case "picked_up":
        return "text-blue-700 bg-blue-100";
      case "delivered":
        return "text-green-700 bg-green-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {summaryData.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl shadow hover:shadow-lg transition flex flex-col items-center gap-1 p-6 cursor-pointer"
          >
            <div className="text-3xl">{kpi.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{kpi.value}</div>
            <div className="text-sm text-gray-500">{kpi.label}</div>
            {kpi.sub && <div className="text-xs text-gray-400">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* range  */}
      <div className="flex items-center gap-2 mb-6">
        <span className="font-medium text-gray-700 mr-2">Graphs for:</span>
        {timeRanges.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`px-3 py-1 rounded-lg border text-sm ${
              range === opt.value
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
        <h3 className="mb-4 font-bold text-gray-800 text-lg">Status Breakdown</h3>
        <div className="w-full h-64 flex items-center justify-center">
            {pieData.every(d => d.value === 0) ? (
            <div className="text-gray-400 text-sm">
                No deliveries yet to show breakdown 📭
            </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                >
                    {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.key]} />
                    ))}
                </Pie>
                <RTooltip
                    content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const entry = payload[0];
                    return (
                        <div className="bg-white p-2 border rounded shadow text-xs">
                        <b>{entry.name}</b>: {entry.value} deliveries
                        </div>
                    );
                    }}
                />
                <Legend />
                </PieChart>
            </ResponsiveContainer>
            )}
        </div>
        </div>


        {/* Bar + Line Chart (still filtered by range) */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="mb-4 font-bold text-gray-800 text-lg">Deliveries & Outcome</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `₪${v}`}
                />
                <RTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const bar = payload.find((p) => p.dataKey === "delivered");
                    const line = payload.find((p) => p.dataKey === "outcome");
                    return (
                      <div className="bg-white p-2 border rounded shadow text-xs">
                        <div>
                          <b>{payload[0].payload.name}</b>
                        </div>
                        <div>Deliveries: {bar ? bar.value : 0}</div>
                        <div>Outcome: ₪{line ? line.value : 0}</div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="delivered"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  name="Deliveries"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="outcome"
                  stroke="#F59E42"
                  name="Outcome (₪)"
                  strokeWidth={3}
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="mb-4 font-bold text-gray-800 text-lg">Recent Deliveries</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-600 border-b">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Courier</th>
              </tr>
            </thead>
            <tbody>
              {recentDeliveries.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="py-2 pr-4">{d.item}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(
                        d.status
                      )}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {toDate(d.createdAt)?.toLocaleDateString() || "-"}
                  </td>
                  <td className="py-2 pr-4">₪{Number(d.payment || 0)}</td>
                  <td className="py-2 pr-4">{d.assignedTo || d.deliveredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverViewTab;
