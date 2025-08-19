/**
 * NewDeliveryTab renders a modal for business users to create a delivery: 
 * enter an item, choose a destination via <AddressInput/>, and it auto-computes distance and a read-only price using a time-based multiplier (rounded to 0.5 NIS with a minimum fare). 
 * On submit it POSTs to /deliveries with API, handles basic validation/error states, and on success clears the form, shows <ConfettiBurst/>, and auto-closes via onClose(). 
 */

import { useEffect, useState } from "react";
import { postWithAuth } from "../../api/api";
import { AddressInput } from "../address";
import ConfettiBurst from "../../components/confettiButton";


/** Helpers  **/
// below helpers support built in payment- without any option to modify it from business user.

// distance in KM
function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // Earth radius (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
// Simple time-based multiplier (tweak to your needs / market)
function getTimeMultiplier(now = new Date()) {
    const h = now.getHours();       // 0..23
    const day = now.getDay();       // sunday = 0 .. saturday = 6

    let mult = 1.0;

    // rush hours
    if ((h >= 11 && h < 15) || (h >= 18 && h < 20)) {
        mult *= 1.25; // +25% at rush
    }

    // night
    if (h >= 22 || h < 5) {
        mult *= 1.15; // +15% at night
    }

    // weekend
    if (day === 5 || day === 6) {
        mult *= 1.10; // +10% weekend
    }

    return mult;
}

// pricing model
function calculatePrice(distanceKm, when = new Date()) {
    if (!isFinite(distanceKm) || distanceKm <= 0) return 0;

    const BASE_FEE = 10;           // pickup + handling
    const PER_KM = 3.2;            // up to 15 km
    const PER_KM_LONG = 2.6;       // > 15 km discounted
    const MIN_FARE = 15;

    const first = Math.min(distanceKm, 15) * PER_KM;
    const rest = Math.max(distanceKm - 15, 0) * PER_KM_LONG;

    const raw = BASE_FEE + first + rest;
    const surge = raw * getTimeMultiplier(when);

    // Round to 0.5 NIS steps
    const rounded = Math.round((surge * 2)) / 2;

    return Math.max(rounded, MIN_FARE);
}


export const NewDeliveryTab = ({ businessData,  open, onClose }) => {
    const [item, setItem] = useState("");
    const [destination, setDestination] = useState(null);
    const [payment, setPayment] = useState(0);
    const [distanceKm, setDistanceKm] = useState(0);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    console.log(businessData)
    // Recompute distance & price when destination changes
    useEffect(() => {
        try {
        setError(null);

        if (!destination) {
            console.log("fell at dest")
            setDistanceKm(0);
            setPayment(0);
            return;
        }
        const bLoc = businessData?.Location
        const dLoc = destination?.location;

        // avoid NaNs
        if (!bLoc ||!dLoc) {
            console.log("fell at if")
            setDistanceKm(0);
            setPayment(0);
            return;
        }

        const km = haversineKm(bLoc.Lat, bLoc.Lng, dLoc.lat, dLoc.lng);
        setDistanceKm(km);

        const price = calculatePrice(km, new Date());
        setPayment(price);
        } catch (e) {
        console.error(e);
        setError("Failed to compute price.");
        setDistanceKm(0);
        setPayment(0);
        }
    }, [destination, businessData]);

    if (!open) return null;

    // this functions posts a new delivery, using API req.
    const handleNewDelivery = async (e) => {
        e.preventDefault();
        if (!item || !destination) {
            setError("Item and Destination are required.");
            return;
        }
        const parsedPayment = parseFloat(payment);
    
        if (isNaN(parsedPayment)) {
            setError("Please enter only numbers for payment");
            return
        }
        // send api req to create new delivery
        try {
            const body = {
              BusinessName: businessData.BusinessName,
              BusinessAddress: businessData.BusinessAddress,
              BusinessLocation: businessData.Location,
              DestinationAddress: destination.formatted,
              DestinationLocation: {
                Lat: destination.location.lat,
                Lng: destination.location.lng
              },
              Item: item,
              Payment: parsedPayment
            };
            await postWithAuth("http://localhost:8080/deliveries", body);
        
            // reset the fields
            setItem("");
            setDestination(null);
            setError(null);
            setPayment(0);

            // success + auto-close modal after 1.5s
            setSuccess("Delivery created successfully!");
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 3500);
            } catch (err) {
            console.error("Error creating delivery:", err);
            setError("Failed to create delivery");
            }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6 relative">
                <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>

                <div className="max-w-screen-xl mx-auto px-4 md:px-8">
                    <div className="items-start justify-between md:flex">
                        <div className="max-w-lg">
                            <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
                                Place a New Delivery
                            </h3>
                        </div>
                    </div>
                <ConfettiBurst show={success} duration={3000} />
                <form className="space-y-4 max-w-md">
                    <div>
                    <label className="block mb-1 font-medium">Item:</label>
                    <input
                        value={item}
                        onChange={(e) => setItem(e.target.value)}
                        required
                        className="w-full border px-3 py-2"
                    />
                    </div>
                    <div>
                    <label className="block mb-1 font-medium">Destination:</label>
                        <AddressInput onSelect={setDestination} />
                        <p className="text-xs text-gray-500 mt-1">
                            {distanceKm > 0 ? `Distance ≈ ${distanceKm.toFixed(1)} km` : ""}
                        </p>
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Estimated price (auto):</label>
                        <input
                            value={destination ? `₪${payment.toFixed(2)}` : ""}
                            readOnly
                            className="w-full border px-3 py-2 rounded bg-gray-100 text-gray-700"
                            placeholder="Select a destination to compute"
                            tabIndex={-1}
                        />
                    </div>
                    <button
                        onClick={handleNewDelivery}
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                        Submit
                    </button>
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
                          {error}
                        </div>
                      )}

                    {success && (
                        <div className="text-sm text-green-600 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                          {success}
                        </div>
                      )}
                </form>
                </div>
            </div>
        </div>
        
      );
};

