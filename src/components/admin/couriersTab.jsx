/**
 * CouriersTab renders the admin “Couriers” view: a live Google Map of current courier locations, an earnings-based leaderboard, and a 7-day activity chart. 
 * Clicking a marker shows an info window with that courier’s income and delivery count. 
 * Expects deliveries, couriers, and locations. 
 * Use this to monitor real-time activity and performance at a glance.
 */

import { useState } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import mapStyle from "../mapStyle.json"; 

import CourierActivityChart from "./courierChart";

const containerStyle = { width: "100%", height: "500px" };
const mapCenter = { lat: 32.09, lng: 34.85 };

const mapOptions = {
  styles: mapStyle,
};

export const CouriersTab = ({deliveries, couriers,locations}) => {
  const [activeMarker, setActiveMarker] = useState(null);

  // create leaderboard sorted by balance
  const leaderboard = [...couriers]
    .map((c) => {
      // Count deliveries for this courier
      const count = deliveries.filter(
        (d) => d.assignedTo === c.Id || d.deliveredBy === c.Id
      ).length;

      return {
        ...c,
        totalIncome: c.Balance,
        deliveriesCount: count,
      };
    })
    .sort((a, b) => b.totalIncome - a.totalIncome);

  return (
    <section>
      {/* map section */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-8 border border-gray-100">
        <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-3" style={{ fontFamily: "var(--font-sans)" }}>
          Active Couriers on Live Map
        </h3>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={10}
            onClick={() => setActiveMarker(null)}
            options={mapOptions}
          >
            {Object.entries(locations).map(([cid, loc]) => (
              <Marker
                key={cid}
                position={{ lat: loc.lat, lng: loc.lng }}
                title={loc.name}
                onClick={() => setActiveMarker(cid)}
              >
                {activeMarker === cid && (
                  <InfoWindow
                    onCloseClick={() => setActiveMarker(null)}
                    options={{
                      pixelOffset: new window.google.maps.Size(-10, -80) // pushes it up closer to marker
                    }}
                  >
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 px-1 py-1 w-[200px]" style={{ fontFamily: "var(--font-sans)" }}>
                      <h4 className="font-semibold text-[var(--color-primary)] text-base mb-2 truncate">
                        {loc.name}
                      </h4>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[11px] uppercase text-gray-400">Income</p>
                          <p className="text-sm md:text-base font-semibold text-[var(--color-accent)]">
                            {(() => {
                              const income = leaderboard.find((c) => c.Id === cid)?.totalIncome ?? 0;
                              return `₪${income.toFixed(2)}`;
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-gray-400">Deliveries</p>
                          <p className="text-sm md:text-base font-semibold text-[var(--color-text-dark)]">
                            {leaderboard.find((c) => c.Id === cid)?.deliveriesCount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
      </div>

      {/* under the map section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* leaderboard section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <h3
            className="text-xl font-semibold px-5 py-4 border-b border-gray-100 text-[var(--color-text-dark)]"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Courier Leaderboard
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg)] text-s uppercase text-gray-500">
                <th className="py-3 px-5 font-large">Rank</th>
                <th className="py-3 px-5 font-large">Courier</th>
                <th className="py-3 px-5 font-large">Total Income</th>
                <th className="py-3 px-5 font-large">Deliveries</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((c, index) => (
                <tr
                  key={c.Id}
                  className={`border-t border-gray-100 ${
                    index < 3 ? "bg-[var(--color-bg)]" : "bg-white"
                  } hover:bg-gray-50 transition`}
                >
                  <td className="py-3 px-5 text-m">{index + 1}</td>
                  <td className="py-3 px-5 text-m">{c.CourierName || c.Email}</td>
                  <td className="py-3 px-5 text-m font-medium text-[var(--color-primary)]">
                    ₪{c.totalIncome.toFixed(2)}
                  </td>
                  <td className="py-3 px-5 text-m">{c.deliveriesCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* activity chart */}
        <CourierActivityChart deliveries={deliveries} couriers={couriers}/>
      </div>
    </section>
  );
};

export default CouriersTab;
