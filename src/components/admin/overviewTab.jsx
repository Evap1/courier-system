/**
 * OverViewTab renders the admin overview analytics: it ingests deliveries and couriers, fetches businesses via the API, and computes KPIs (last-7-days deliveries vs previous week,
 * business/courier growth, and average payments per courier). A range switch (week/month/quarter) drives a status breakdown pie and a daily line chart (avg deliveries & income per courier)
 * using Recharts, plus a “Recent Deliveries” table.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from "recharts";
import { getWithAuth } from "../../api/api";
const DAY = 24 * 60 * 60 * 1000;

const STATUS_COLORS = {
  posted:    "#8B5CF6",
  accepted:  "#F59E42",
  picked_up: "#3B82F6",
  delivered: "#10B981",
};

// date helpers 
function toDate(any) {
  if (!any) return null;
  if (typeof any === "object" && typeof any.toDate === "function") return any.toDate();
  if (typeof any === "object" && typeof any.seconds === "number") return new Date(any.seconds * 1000);
  return new Date(any);
}
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d){ const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function isWithinRange(createdAt, start, end) {
  const d = toDate(createdAt);
  if (!d) return false;
  return d >= start && d <= end;
}
function daysBetween(start, end) {
  return Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000);
}

function getEntityCreatedAt(e) {
  return e?.CreatedAt ?? e?.createdAt ?? e?.created_at ?? null;
}

// UI options 
const timeRanges = [
  { label: "Last 7 days", value: "week" },
  { label: "This Month",  value: "month" },
  { label: "Last 3 Months", value: "quarter" },
];

export const OverViewTab = ({couriers, deliveries}) => {
  const [range, setRange] = useState("week");
  const [businesses, setBusinesses] = useState([]);
  const [error, setError]           = useState("");

  useEffect(() => {
    // get businesses info
    const fetchBusinesses = async () => {
      try {
        const data = await getWithAuth("http://localhost:8080/businesses");
        setBusinesses(data);
      } catch (err) {
        setError("Failed to load businesses", err);
      }
    };
    fetchBusinesses();
  }, []);

  const courierNameMap = useMemo(() => {
    const m = new Map();
    couriers.forEach((c) => {
      m.set(c.Id, c.CourierName || c.Email || c.Id);
    });
    return m;
  }, [couriers]);

  // derived common dates 
  const now       = useMemo(() => new Date(), []);
  const thisWeekS = useMemo(() => startOfWeek(now), [now]);
  const thisWeekE = useMemo(() => endOfDay(new Date(thisWeekS.getTime() + 6*86400000)), [thisWeekS]);
  const prevWeekS = useMemo(() => new Date(thisWeekS.getTime() - 7*86400000), [thisWeekS]);
  const prevWeekE = useMemo(() => endOfDay(new Date(prevWeekS.getTime() + 6*86400000)), [prevWeekS]);

  // KPI #1: total Deliveries (last week) + trend 
  const kpiDeliveries = useMemo(() => {
    const c = deliveries.filter(d => isWithinRange(d.createdAt, thisWeekS, thisWeekE)).length;
    const p = deliveries.filter(d => isWithinRange(d.createdAt, prevWeekS, prevWeekE)).length;
    const diff = c - p;
    const pct  = p > 0 ? ((diff / p) * 100).toFixed(1) : null; // if null, show "—"
    return { current: c, prev: p, diff, pct, up: diff >= 0 };
  }, [deliveries, thisWeekS, thisWeekE, prevWeekS, prevWeekE]);

  // helper to compute “count as of date” using CreatedAt; returns null if no timestamps found
  function countAsOf(items, date) {
    const withTs = items.map(getEntityCreatedAt).filter(Boolean);
    if (withTs.length === 0) return null;
    return items.filter(it => {
      const t = getEntityCreatedAt(it);
      return t ? toDate(t) <= endOfDay(date) : false;
    }).length;
  }

  // KPI #2: businesses + trend vs last week 
  const kpiBusinesses = useMemo(() => {
    const totalNow = businesses.length;
    const asOfPrevWeekEnd = countAsOf(businesses, prevWeekE);
    if (asOfPrevWeekEnd === null) {
      return { current: totalNow, pct: null, up: null, diff: null, prev: null };
    }
    const diff = totalNow - asOfPrevWeekEnd;
    const pct  = asOfPrevWeekEnd > 0 ? ((diff / asOfPrevWeekEnd) * 100).toFixed(1) : null;
    return { current: totalNow, prev: asOfPrevWeekEnd, diff, pct, up: diff >= 0 };
  }, [businesses, prevWeekE]);

  // KPI #3: couriers + trend vs last week 
  const kpiCouriers = useMemo(() => {
    const totalNow = couriers.length;
    const asOfPrevWeekEnd = countAsOf(couriers, prevWeekE);
    if (asOfPrevWeekEnd === null) {
      return { current: totalNow, pct: null, up: null, diff: null, prev: null };
    }
    const diff = totalNow - asOfPrevWeekEnd;
    const pct  = asOfPrevWeekEnd > 0 ? ((diff / asOfPrevWeekEnd) * 100).toFixed(1) : null;
    return { current: totalNow, prev: asOfPrevWeekEnd, diff, pct, up: diff >= 0 };
  }, [couriers, prevWeekE]);

  // KPI #4: average payments (Week) per courier + trend 
  const kpiAvgPayments = useMemo(() => {
    const inRange = (s,e) => deliveries
      .filter(d => d.status === "delivered" && isWithinRange(d.createdAt, s, e));
    const calc = (s,e) => {
      const ds = inRange(s,e);
      const byC = new Map();
      ds.forEach(d => {
        const id = d.deliveredBy || d.assignedTo;
        if (!id) return;
        if (!byC.has(id)) byC.set(id, 0);
        byC.set(id, byC.get(id) + Number(d.payment || 0));
      });
      const active = byC.size;
      const total  = Array.from(byC.values()).reduce((a,b)=>a+b,0);
      return active ? total / active : 0;
    };
    const cur = calc(thisWeekS, thisWeekE);
    const prev = calc(prevWeekS, prevWeekE);
    const diff = cur - prev;
    const pct  = prev > 0 ? ((diff / prev) * 100).toFixed(1) : null;
    return { current: cur, prev, diff, pct, up: diff >= 0 };
  }, [deliveries, thisWeekS, thisWeekE, prevWeekS, prevWeekE]);

  // pie + continuous chart 
  const rangeFrom = useMemo(() => {
    const n = startOfDay(now);
    if (range === "month") { n.setDate(1); return n; }
    if (range === "quarter") return new Date(n.getTime() - 90*86400000);
    // "last 7 days" (rolling): today inclusive back 7 days
    return new Date(n.getTime() - 6 * DAY);  
  }, [range, now]);
  const rangeTo   = useMemo(() => endOfDay(new Date()), []);

  const deliveriesInRange = useMemo(
    () => deliveries.filter(d => isWithinRange(d.createdAt, rangeFrom, rangeTo)),
    [deliveries, rangeFrom, rangeTo]
  );

  const pieData = useMemo(() => {
    const statuses = ["posted", "accepted", "picked_up", "delivered"];
    return statuses.map((status) => ({
      key: status,
      name: status[0].toUpperCase() + status.slice(1).replace("_", " "),
      value: deliveriesInRange.filter(d => d.status === status).length,
    }));
  }, [deliveriesInRange]);

  const dailySeries = useMemo(() => {
    const nDays = daysBetween(rangeFrom, rangeTo);
    const series = [];
    for (let i = 0; i < nDays; i++) {
      const dayStart = new Date(startOfDay(rangeFrom).getTime() + i * 86400000);
      const dayEnd   = endOfDay(dayStart);
      const deliveredToday = deliveriesInRange.filter(
        d => d.status === "delivered" && isWithinRange(d.createdAt, dayStart, dayEnd)
      );
      const byCourier = new Map();
      for (const d of deliveredToday) {
        const id = d.deliveredBy || d.assignedTo;
        if (!id) continue;
        if (!byCourier.has(id)) byCourier.set(id, { deliveries: 0, income: 0 });
        const row = byCourier.get(id);
        row.deliveries += 1;
        row.income     += Number(d.payment || 0);
      }
      const active = byCourier.size;
      const sumDel = Array.from(byCourier.values()).reduce((s,r)=>s + r.deliveries, 0);
      const sumInc = Array.from(byCourier.values()).reduce((s,r)=>s + r.income,     0);
      series.push({
        name: `${dayStart.getMonth()+1}/${dayStart.getDate()}`,
        avgDeliveries: active ? sumDel / active : 0,
        avgIncome:     active ? sumInc / active : 0,
        payments:      sumInc,
      });
    }
    return series;
  }, [deliveriesInRange, rangeFrom, rangeTo]);

  // recent deliveries
  const recent = useMemo(
    () => [...deliveries].sort((a,b)=> (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0)).slice(0,7),
    [deliveries]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/*  KPI CARDS  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* total deliveries (Last 7 Days) */}
        <div className="bg-white rounded-2xl shadow hover:shadow-lg transition p-6">
          <div className="text-3xl">📦</div>
          <div className="text-2xl font-bold text-gray-800">{kpiDeliveries.current}</div>
          <div className="text-sm text-gray-500">Total Deliveries (Last 7 Days)</div>
          <div className="text-xs mt-1">
            {kpiDeliveries.pct !== null ? (
              <span className={kpiDeliveries.up ? "text-green-600" : "text-red-500"}>
                {kpiDeliveries.up ? "▲" : "▼"} {kpiDeliveries.pct}% vs last week
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>

        {/* businesses */}
        <div className="bg-white rounded-2xl shadow hover:shadow-lg transition p-6">
          <div className="text-3xl">🏢</div>
          <div className="text-2xl font-bold text-gray-800">{businesses.length}</div>
          <div className="text-sm text-gray-500">Businesses</div>
          <div className="text-xs mt-1">
            {kpiBusinesses.pct !== null ? (
              <span className={kpiBusinesses.up ? "text-green-600" : "text-red-500"}>
                {kpiBusinesses.up ? "▲" : "▼"} {kpiBusinesses.pct}% vs last week
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>

        {/* couriers */}
        <div className="bg-white rounded-2xl shadow hover:shadow-lg transition p-6">
          <div className="text-3xl">🛵</div>
          <div className="text-2xl font-bold text-gray-800">{couriers.length}</div>
          <div className="text-sm text-gray-500">Couriers</div>
          <div className="text-xs mt-1">
            {kpiCouriers.pct !== null ? (
              <span className={kpiCouriers.up ? "text-green-600" : "text-red-500"}>
                {kpiCouriers.up ? "▲" : "▼"} {kpiCouriers.pct}% vs last week
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>

        {/* average payments per courier */}
        <div className="bg-white rounded-2xl shadow hover:shadow-lg transition p-6">
          <div className="text-3xl">💸</div>
          <div className="text-2xl font-bold text-gray-800">₪{kpiAvgPayments.current.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Avg. Payments per Courier (Last 7 Days)</div>
          <div className="text-xs mt-1">
            {kpiAvgPayments.pct !== null ? (
              <span className={kpiAvgPayments.up ? "text-green-600" : "text-red-500"}>
                {kpiAvgPayments.up ? "▲" : "▼"} {kpiAvgPayments.pct}% vs last week
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* range */}
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

      {/* row: pie chart + continuous chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* pie chart */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
          <h3 className="mb-4 font-bold text-gray-800 text-lg">Status Breakdown</h3>
          <div className="w-full h-64 flex items-center justify-center">
            {pieData.every(d => d.value === 0) ? (
              <div className="text-gray-400 text-sm">No deliveries in this range 📭</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <RTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* continuous chart: averages + payments */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold text-gray-800 text-lg">Avg Income and Deliveries per Courier (Daily)</h3>
            <span className="text-xs text-gray-400">
              {rangeFrom.toLocaleDateString()} – {new Date(rangeTo.getTime()).toLocaleDateString()}
            </span>
          </div>
          <div className="w-full h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" allowDecimals />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v)=>`₪${Number(v).toFixed(0)}`} />
                <RTooltip
                  formatter={(val, key) => {
                    if (key === "avgDeliveries") return [Number(val).toFixed(2), "Avg Deliveries"];
                    if (key === "avgIncome")     return [`₪${Number(val).toFixed(2)}`, "Avg Income"];
                    return [val, key];
                  }}
                />
                <Legend />
                <Line yAxisId="left"  type="monotone" dataKey="avgDeliveries" name="Avg Deliveries" stroke="#3B82F6" dot={false} strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="avgIncome"     name="Avg Income (₪)" stroke="#F59E42" dot={false} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* recent deliveries */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="mb-4 font-bold text-gray-800 text-lg">Recent Deliveries</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-600 border-b">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Business</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Courier</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="py-2 pr-4">{d.item}</td>
                  <td className="py-2 pr-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ color: "#111827", background: `${(STATUS_COLORS[d.status] || "#E5E7EB")}22` }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{d.businessName}</td>
                  <td className="py-2 pr-4">{toDate(d.createdAt)?.toLocaleString() || "-"}</td>
                  <td className="py-2 pr-4">₪{Number(d.payment || 0).toFixed(2)}</td>
                  <td className="py-2 pr-4">
                    {(() => {
                      const cid = d.deliveredBy || d.assignedTo;
                      return cid ? (courierNameMap.get(cid) || cid) : "—";
                    })()}
                  </td>
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