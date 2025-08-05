import { useEffect, useState } from "react";
import {
PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend,
BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';

import { getWithAuth } from "../../api/api";

const STATUS_COLORS = {
posted: "#8B5CF6",
accepted: "#F59E42",
picked_up: "#3B82F6",
delivered: "#10B981",
};

// Helper: get week start (Sunday) for a date
function getWeekStart(d) {
    const date = new Date(d);
    date.setHours(0,0,0,0);
    date.setDate(date.getDate() - date.getDay());
    return date;
}

// Helper: check if date is in this week or last week
function isInWeek(date, weekStart) {
    const d = new Date(date);
    return d >= weekStart && d < new Date(weekStart.getTime() + 7*24*60*60*1000);
}

// Helper: get month for a date
function isSameMonth(date, refDate) {
    const d = new Date(date), r = new Date(refDate);
    return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
}

// Time ranges for graph
const timeRanges = [
    { label: "Last 7 days", value: "week" },
    { label: "This Month", value: "month" },
    { label: "Last 3 Months", value: "quarter" },
];

export const OverViewTab = () => {
const [deliveries, setDeliveries] = useState([]);
const [error, setError] = useState();
const [loading, setLoading] = useState(true);
const [range, setRange] = useState("week");

// Fetch deliveries (replace with real API)
useEffect(() => {
async function fetchDeliveries() {
    try{
        const res = await getWithAuth("http://localhost:8080/deliveries");
        setDeliveries(res);
    }
    catch (e){
        setError("Failed to load deliveries data.");
    };
    setLoading(false);
}
fetchDeliveries();
}, []);

// --- KPI CALCULATIONS ---
const now = new Date();
// This month deliveries (outcome)
const thisMonthDeliveries = deliveries.filter(d => d.Status === "delivered" && isSameMonth(d.CreatedAt, now));
const outcomeThisMonth = thisMonthDeliveries.reduce((acc, d) => acc + d.Payment, 0);

// KPI: Average cost per delivery (this week vs last week)
const weekStart = getWeekStart(now);
const lastWeekStart = new Date(weekStart.getTime() - 7*24*60*60*1000);

const weekDeliveries = deliveries.filter(d => d.Status === "delivered" && isInWeek(d.CreatedAt, weekStart));
const lastWeekDeliveries = deliveries.filter(d => d.Status === "delivered" && isInWeek(d.CreatedAt, lastWeekStart));
const avgThisWeek = weekDeliveries.length ? (weekDeliveries.reduce((acc, d) => acc + d.Payment, 0) / weekDeliveries.length) : 0;
const avgLastWeek = lastWeekDeliveries.length ? (lastWeekDeliveries.reduce((acc, d) => acc + d.Payment, 0) / lastWeekDeliveries.length) : 0;
const diff = avgThisWeek - avgLastWeek;
const diffPct = avgLastWeek ? (diff / avgLastWeek * 100).toFixed(1) : 0;

// Summary data for KPI cards
const summaryData = [
{ label: "Total Deliveries", value: deliveries.length, icon: "📦" },
{ label: "Completed", value: deliveries.filter(d => d.Status === "delivered").length, icon: "✅" },
{ label: "Outcome This Month", value: `₪${outcomeThisMonth.toLocaleString()}`, icon: "💸" },
{
    label: "Avg. Cost (Week)",
    value: `₪${avgThisWeek.toFixed(2)}`,
    icon: diff > 0
    ? <span className="text-red-500">▲</span>
    : <span className="text-green-600">▼</span>,
    sub: `Last week: ₪${avgLastWeek.toFixed(2)} (${diffPct}%)`
},
];

// Pie data (status breakdown)
const pieData = ["posted", "accepted", "picked_up", "delivered"]
.map(status => ({
    name: status[0].toUpperCase() + status.slice(1).replace("_", " "),
    value: deliveries.filter(d => d.Status === status).length,
    key: status,
}));

// Deliveries over time: group by day (for selected range)
function getRangeDays(range) {
    if (range === "week") return 7;
    if (range === "month") return 30;
    if (range === "quarter") return 90;
    return 7;
}
const rangeDays = getRangeDays(range);
const days = [];
for (let i = rangeDays-1; i >= 0; --i) {
const d = new Date(now.getTime() - i * 24*3600*1000);
days.push({ date: d, label: `${d.getMonth()+1}/${d.getDate()}` });
}
const barData = days.map(day => {
const count = deliveries.filter(d =>
    d.Status === "delivered" &&
    (new Date(d.CreatedAt)).toDateString() === day.date.toDateString()
).length;
const outcome = deliveries.filter(d =>
    d.Status === "delivered" &&
    (new Date(d.CreatedAt)).toDateString() === day.date.toDateString()
).reduce((sum, d) => sum + d.Payment, 0);
return { name: day.label, delivered: count, outcome };
});

// --- END KPI + CHART DATA ---

// Recent deliveries table
const recentDeliveries = deliveries
.sort((a,b) => b.CreatedAt - a.CreatedAt)
.slice(0, 7);

function getStatusClasses(status) {
switch (status) {
    case "posted": return "text-purple-700 bg-purple-100";
    case "accepted": return "text-yellow-800 bg-yellow-100";
    case "picked_up": return "text-blue-700 bg-blue-100";
    case "delivered": return "text-green-700 bg-green-100";
    default: return "text-gray-700 bg-gray-100";
}
}

if (loading) {
return <div className="flex items-center justify-center h-96 text-gray-400 text-xl">Loading...</div>;
}

return (
<div className="max-w-6xl mx-auto px-4 py-10">
    {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
            {error}
        </div>
        )}
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
        {kpi.sub && (
            <div className="text-xs text-gray-400">{kpi.sub}</div>
        )}
        </div>
    ))}
    </div>

    {/* Time range controls */}
    <div className="flex items-center gap-2 mb-6">
    <span className="font-medium text-gray-700 mr-2">Graphs for:</span>
    {timeRanges.map(opt => (
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

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
    {/* Pie Chart */}
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
        <h3 className="mb-4 font-bold text-gray-800 text-lg">Status Breakdown</h3>
        <div className="w-full h-64">
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
        </div>
    </div>

    {/* Bar + Line Chart (deliveries and outcome) */}
    <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="mb-4 font-bold text-gray-800 text-lg">Deliveries & Outcome</h3>
        <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={v => `₪${v}`} />
            <RTooltip
                content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const bar = payload.find(p => p.dataKey === "delivered");
                const line = payload.find(p => p.dataKey === "outcome");
                return (
                    <div className="bg-white p-2 border rounded shadow text-xs">
                    <div><b>{payload[0].payload.name}</b></div>
                    <div>Deliveries: {bar ? bar.value : 0}</div>
                    <div>Outcome: ₪{line ? line.value : 0}</div>
                    </div>
                );
                }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="delivered" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Deliveries" />
            <Line yAxisId="right" type="monotone" dataKey="outcome" stroke="#F59E42" name="Outcome (₪)" strokeWidth={3} dot={false} />
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
            {recentDeliveries.map((d, i) => (
            <tr key={d.Id} className="border-b">
                <td className="py-2 pr-4">{d.Item}</td>
                <td className="py-2 pr-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(d.Status)}`}>
                    {d.Status}
                </span>
                </td>
                <td className="py-2 pr-4">
                {new Date(d.CreatedAt).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4">₪{d.Payment}</td>
                <td className="py-2 pr-4">{d.AssignedTo || d.DeliveredBy}</td>
            </tr>
            ))}
        </tbody>
        </table>
    </div>
    </div>
</div>
);
}