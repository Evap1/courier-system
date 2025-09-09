/**
 * DeliveriesTab renders a filterable, role-aware deliveries table with an optional live map panel.
 * Supports client-side filters by item, status, and (admin-only) business. Rows show item, status (color-coded), destination, submission time, and courier info. 
 * For deliveries with an assigned courier (assignedTo) and not just “accepted”, a button toggles a right-side <CourierMap/> panel
 * bound to the selected delivery; otherwise a short status message is shown.
 */

import {  useEffect, useMemo, useState } from "react";
import CourierMap from "../courierMap";

const PAGE_SIZE = 13;
const LAST_N_DAYS = 30; // change to 31 or use "1 month" logic if you prefer

// try to read a timestamp from a delivery
function getTimeMs(d) {
  const raw =
    d?.updatedAt ??
    d?.createdAt ??
    d?.time ??
    d?.date ??
    null;

  if (!raw) return 0;

  // number of ms already
  if (typeof raw === "number") return raw;

  // plain Date
  if (raw instanceof Date) return raw.getTime();

  // Firestore Timestamp (.toDate exists)
  if (typeof raw.toDate === "function") return raw.toDate().getTime();

  // Firestore-like { seconds, nanoseconds }
  if (typeof raw.seconds === "number") {
    return raw.seconds * 1000 + Math.floor((raw.nanoseconds || 0) / 1e6);
  }

  // ISO string or anything Date.parse can handle
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}


// build a compact page list with ellipses like Float UI examples
function buildPages(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => String(i + 1));
  }

  const pages = [];
  const push = (v) => pages.push(String(v));
  const DOTS = "...";

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  push(1);

  if (left > 2) pages.push(DOTS);
  for (let p = left; p <= right; p++) push(p);
  if (right < total - 1) pages.push(DOTS);

  push(total);

  return pages;
}


export const DeliveriesTab = ({ deliveries = [], isAdmin, visibleDelivery, setVisibleDelivery = () => {} }) => {
  const [filterItem, setFilterItem] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBusiness, setFilterBusiness] = useState("");

  const filteredDeliveries = deliveries.filter((d) => {
    const matchItem = d.item?.toLowerCase().includes(filterItem.toLowerCase());
    const matchStatus = filterStatus ? d.status === filterStatus : true;
    const matchBusiness = filterBusiness
      ? d.businessName?.toLowerCase().includes(filterBusiness.toLowerCase())
      : true;
    return matchItem && matchStatus && matchBusiness;
  });

  // filter to last month
  const cutoff = useMemo(
    () => Date.now() - LAST_N_DAYS * 24 * 60 * 60 * 1000,
    []
  );

  const lastMonthDeliveries = useMemo(() => {
    return (filteredDeliveries ?? []).filter((d) => getTimeMs(d) >= cutoff);
  }, [filteredDeliveries, cutoff]);

  // 2) Sort descending (newest first)
  const sorted = useMemo(() => {
    return [...lastMonthDeliveries].sort((a, b) => getTimeMs(b) - getTimeMs(a));
  }, [lastMonthDeliveries]);

  // 3) Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  

  useEffect(() => {
    // if the data size changes, keep page in range
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [sorted.length, totalPages]);

  const pageStart = (page - 1) * PAGE_SIZE;
  const pageData = useMemo(
    () => sorted.slice(pageStart, pageStart + PAGE_SIZE),
    [sorted, pageStart]
  );

  const pages = useMemo(() => buildPages(page, totalPages), [page, totalPages]);

  const goTo = (p) => {
    if (typeof p !== "number") return;
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const PrevBtn = (
    <button
      type="button"
      onClick={() => goTo(page - 1)}
      disabled={page <= 1}
      className="hover:text-indigo-600 flex items-center gap-x-2 disabled:opacity-40"
      aria-label="Previous page"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
           fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M18 10a.75.75 0 01-.75.75H4.66l2.1 1.95a.75.75 0 11-1.02 1.1l-3.5-3.25a.75.75 0 010-1.1l3.5-3.25a.75.75 0 111.02 1.1l-2.1 1.95h12.59A.75.75 0 0118 10z"
              clipRule="evenodd" />
      </svg>
      Previous
    </button>
  );

  const NextBtn = (
    <button
      type="button"
      onClick={() => goTo(page + 1)}
      disabled={page >= totalPages}
      className="hover:text-indigo-600 flex items-center gap-x-2 disabled:opacity-40"
      aria-label="Next page"
    >
      Next
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
           fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z"
              clipRule="evenodd" />
      </svg>
    </button>
  );


  // for different color badges
  function getStatusClasses(status) {
    switch (status) {
      case "posted":
        return "text-purple-700 bg-purple-100";
      case "accepted":
        return "text-orange-800 bg-orange-100";
      case "picked_up":
        return "text-blue-700 bg-blue-100";
      case "delivered":
        return "text-green-700 bg-green-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  }
  return (
    <div className={`flex flex-col xl:flex-row gap-8 w-full min-h-[calc(100vh-64px)]`}>
      {/* header and title */}
      <section className={`w-full ${visibleDelivery ? "xl:w-1/2" : "xl:w-full"}`}>
          <div className="items-start justify-between md:flex">
                  <div className="max-w-lg">
                      <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
                          All Deliveries
                      </h3>
                      <p className="text-gray-600 mt-2">
                          View and manage all your delivery requests in one place.
                      </p>
                  </div>
              </div>
      <br></br>
        {/* filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            placeholder="Search by item"
            className="border px-2 py-1"
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
          />
          {isAdmin && <input
            placeholder="Search by business"
            className="border px-2 py-1"
            value={filterBusiness}
            onChange={(e) => setFilterBusiness(e.target.value)}
          /> }
          <select
            className="border px-2 py-1"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="posted">Posted</option>
            <option value="accepted">Accepted</option>
            <option value="picked_up">Picked Up</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded shadow bg-white">
            <table className="min-w-max w-full text-sm text-left">
                <thead className="text-gray-600 font-medium border-b">
                    <tr>
                        {isAdmin && <th className="py-3 pr-6">Business</th> }
                        <th className="py-3 pr-6">Item</th>
                        <th className="py-3 pr-6">Status</th>
                        <th className="py-3 pr-6">Destination</th>
                        <th className="py-3 pr-6">Time of Submission</th>
                        <th className="py-3 pr-6">Courier Info</th>
                    </tr>
                </thead>
                <tbody className="text-gray-600 divide-y">
                    {
                        pageData.map((delivery, idx) => (
                            <tr key={idx}>
                                {isAdmin && <td className="pr-6 py-4 whitespace-nowrap">{delivery.businessName}</td>}
                                <td className="pr-6 py-4 whitespace-nowrap">{delivery.item}</td>
                                <td className="pr-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-2 rounded-full font-semibold text-xs ${getStatusClasses(delivery.status)}`}>
                                  {delivery.status}
                                    </span> 
                                </td>
                                <td className="pr-6 py-4 whitespace-nowrap">{delivery.destinationAddress}</td>
                                <td className="pr-6 py-4 whitespace-nowrap">{delivery.createdAt?.toDate().toLocaleString()}</td>
                                <td className="text-right whitespace-nowrap">
                                {delivery.assignedTo && delivery.status === "picked_up" ? (
                                <div className="text-left whitespace-nowrap">
                                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
                                <div className="text-right whitespace-nowrap ">
                                    <p className="text-left whitespace-nowrap ">{(delivery.status === "accepted") ? "Courier is on the way" : ""}</p>
                                    <p className="text-left whitespace-nowrap ">{(delivery.status === "posted") ? "Unassigned" : ""}</p>
                                    <p className="text-left whitespace-nowrap ">{(delivery.status === "delivered") ? "Completed" : ""}</p>
                                </div>
                                )}
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
      {/* Pagination */}
      <br></br>
      <div className="hidden sm:flex items-center justify-between" aria-label="Pagination">
        {PrevBtn}

        <ul className="flex items-center gap-1">
          {pages.map((item) => (
            <li key={item} className="text-sm">
              {item === "..." ? (
                <div className="px-3 py-2 select-none">…</div>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(Number(item))}
                  aria-current={Number(item) === page ? "page" : undefined}
                  className={[
                    "px-3 py-2 rounded-lg duration-150 hover:text-indigo-600 hover:bg-indigo-50",
                    Number(item) === page ? "bg-indigo-50 text-indigo-600 font-medium" : ""
                  ].join(" ")}
                >
                  {item}
                </button>
              )}
            </li>
          ))}
        </ul>

        {NextBtn}
      </div>
    </section>

    {visibleDelivery && (
      <section className="w-full xl:w-1/2">
        <h3 className="text-lg font-bold mb-2">
          Tracking Courier for Delivery{" "}
          <span className="text-blue-700">{visibleDelivery.item}</span>
        </h3>
        <div className="w-full h-[500px] xl:h-full rounded shadow overflow-hidden bg-gray-50">
          <CourierMap courierId={visibleDelivery.assignedTo} />
        </div>
      </section>
    )}
  </div>
)
};

export default DeliveriesTab;
