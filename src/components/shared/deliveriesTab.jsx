import { useState } from "react";
import CourierMap from "../courierMap";

export const DeliveriesTab = ({
  deliveries = [],
  isAdmin,
  visibleDelivery,
  setVisibleDelivery = () => {},
}) => {
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
    {/* Header and title */}
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
    {/* Filters */}
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
                        filteredDeliveries.map((delivery, idx) => (
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
                                {delivery.assignedTo && delivery.status !== "accepted" ? (
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
    </section>

    {/* Map view */}
    {/*
    {visibleDelivery && (
    <section className="flex flex-col flex-[2] min-w-[350px] max-w-full mt-8 lg:mt-0">
          <h3 className="text-lg font-bold mb-2">
            Tracking Courier for Delivery{" "}
            <span className="text-blue-700">{visibleDelivery.item}</span>
          </h3>
          <div className="flex-1 min-h-[350px] h-[350px] rounded shadow overflow-hidden bg-gray-50">
            <CourierMap courierId={visibleDelivery.assignedTo} />
          </div>
        </section>
    )}
    */}
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
