// for later
import { useAuth } from "../context/AuthContext";

// pages/courier.jsx - for now
import { useState, useEffect , useRef} from "react";
import { GoogleMap, Marker, useJsApiLoader, CircleF } from "@react-google-maps/api";
import { getWithAuth, postWithAuth, patchWithAuth } from "../api/api";

// for nvigation
import { DirectionsRenderer } from "@react-google-maps/api";

// for FCM
// import { messaging } from "../firebase";
// import { getToken, onMessage } from "firebase/messaging";

const containerStyle = { width: "100%", height: "100vh" };

const markerIconPosted    = "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";
const markerIconAccepted  = "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
const markerIconDestination  = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

const libraries        = ["places"];          // memoised - avoids the “new array” warning

const mapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
};

// circle and radius calculation
function haversine({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng }) {
    const R = 6371;                            // km
    const d2r = (deg) => (deg * Math.PI) / 180;
    const dLat = d2r(bLat - aLat);
    const dLng = d2r(bLng - aLng);
    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(d2r(aLat)) * Math.cos(d2r(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(aa));   // distance in km
  }

  function kmForZoom(z) {
    // Approx ground span half-width (km) for mid-latitudes
    // Derived from Google’s scale; tweak if you need finer granularity
    const table = { 15: 1, 14: 2, 13: 5, 12: 10, 11: 20, 10: 40, 9: 80, 8: 160, 7: 320 };
    const clamped = Math.max(7, Math.min(15, z));
    return table[clamped];
  }

  function zoomForKm(km) {
    if (km <= 1) return 15;
    if (km <= 2) return 14;
    if (km <= 5) return 13;
    if (km <= 10) return 12;
    if (km <= 20) return 11;
    if (km <= 40) return 10;
    if (km <= 80) return 9;
    if (km <= 160) return 8;
    return 7;
  }
// function zoomForKm(radiusKm) {
//     const WORLD_PX   = 256;                         // Mercator world size in px at z=0
//     const EQU_KM     = 40075;                       // Earth circumference
//     const lat        = 32.0;                        // centre-lat for Israel; adjust if needed
//     const kmPerPixel = (EQU_KM * Math.cos(lat * Math.PI/180)) /
//                        (WORLD_PX * Math.pow(2, 0)); // km/px at z=0
//     const targetPx   = radiusKm / kmPerPixel;       // radius expressed in map pixels
//     const viewPx     = window.innerWidth / 2;       // half-width of your screen
//     const zoom       = Math.log2(viewPx / targetPx);
//     return Math.round(zoom);
//   }

export const Courier = () => {
  const { user } = useAuth();  
  console.log(user);
  // to know the prev state even if re-rendering
  // avoiding rerendering if not needed. 
  const mapRef = useRef(null);
  const prevPos = useRef(null);
  const prevRadius = useRef(null);
  const timeoutRef = useRef(null);

  /** Store the courier’s current coordinates */
  const [pos, setPos] = useState(null);
  const [posted, setPosted]     = useState([]); // all “posted” deliveries
  const [radiusKm, setRadiusKm] = useState(5);
  const [geoError, setGeoError] = useState(null);
  // for info pop-up
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  // for success /failure pop up
  const [feedback, setFeedback] = useState(null); 
  // for navigation to appear / disappear
  const [navigatingAddress, setNavigatingAddress] = useState(null);
  const [directions, setDirections] = useState(null);

  const zoom = zoomForKm(radiusKm);

  /** Load the Google Maps SDK */
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });


  /** Start watching the device’s location as soon as the component mounts */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setPos({ lat: coords.latitude, lng: coords.longitude }),
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    /* Stop watching when the component unmounts */
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);


  useEffect(() => {
    if (!pos) return;

    const distMoved = prevPos.current ? haversine(pos, prevPos.current) : Infinity;
    const radiusChanged = prevRadius.current !== radiusKm;

    if (distMoved < 0.1 && !radiusChanged) return; // skip if no major change

    prevPos.current = pos;
    prevRadius.current = radiusKm;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const fetchDeliveries = async () => {
        const url = `http://localhost:8080/deliveries?lat=${pos.lat}&lng=${pos.lng}&r=${radiusKm}`;
        try {
          const data = await getWithAuth(url);
          const fixed = data.map(d => ({
            ...d,
            BusinessLocation: {
              lat: d.BusinessLocation.Lat,
              lng: d.BusinessLocation.Lng
            },
            DestinationLocation: {
              lat: d.DestinationLocation.Lat,
              lng: d.DestinationLocation.Lng
            }
          }));
          console.log("IDs:", data.map(d => d.Id));

          setPosted(fixed);

          console.log("Fetched deliveries:", fixed);

        } catch (err) {
          console.error("Failed to fetch deliveries", err);
        }
      };
      fetchDeliveries();
    }, 1000);
  }, [pos, radiusKm]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current); // cleanup on unmount
  }, []);

  const acceptDelivery = async (id) => {
    try {
      await postWithAuth(`http://localhost:8080/deliveries/${id}/accept`);
      alert("Delivery accepted!");
    } catch (err) {
      alert("Failed to accept. Maybe someone else already took it.");
      // throw the err to be catched by selectedDelivery to set the correct error
      throw(err)
    }
  };

  const updateDeliveryStatus = async (id, newStatus) => {
    try {
      await patchWithAuth(`http://localhost:8080/deliveries/${id}`, {
        status: newStatus,
      });
      alert("Status changed to " + newStatus);
    } catch (err) {
      alert("Status change failed " + err);
    }
  };

  /* sync radius ← zoom (map events) */
  const handleZoom = () => {
    const z = mapRef.current?.getZoom();
    if (!z) return;
    const km = kmForZoom(z);
    // avoid loop: only update if slider differs
    if (Math.abs(km - radiusKm) >= 1) setRadiusKm(km);
  };

  // to calculate and show direstions and navigation
  useEffect(() => {
    if (!navigatingAddress || !pos || !window.google) return;
  
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: pos,
        destination: navigatingAddress,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
        } else {
          console.error("Directions request failed due to", status);
        }
      }
    );
  }, [navigatingAddress, pos]);

  /* Handle the three loading/error states cleanly */
  if (loadError)       return <p style={{ color: "red" }}>{loadError}</p>;
  if (geoError)        return <p style={{ color: "red" }}>{geoError}</p>;
  if (!isLoaded || !pos) return <p>Loading map…</p>;

  console.log("Rendering markers for:", posted.length, "deliveries")
  return (
    <>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={pos}
        zoom={zoom}
        onZoomChanged={handleZoom}
        onLoad={(m) => (mapRef.current = m)}
        options={mapOptions}
      >
        {/* courier's current location */}
        <Marker position={pos} />
  
        {/* radius circle */}
        <CircleF
          center={pos}
          radius={radiusKm * 1000}
          options={{
            strokeColor: "#1e90ff",
            strokeOpacity: 0.7,
            strokeWeight: 2,
            fillColor: "#1e90ff",
            fillOpacity: 0.15,
          }}
        />
  
        {/* delivery markers */}
        {posted.map((d, i, arr) => {
          // count how many deliveries share the same lat/lng before this one
          const duplicatesBefore = arr.slice(0, i).filter(
            (other) =>
              other.BusinessLocation.lat === d.BusinessLocation.lat &&
              other.BusinessLocation.lng === d.BusinessLocation.lng
          ).length;

          const offset = 0.00002 * duplicatesBefore; // 2 m per duplicate
          const adjustedPosition = {
            lat: d.BusinessLocation.lat + offset,
            lng: d.BusinessLocation.lng + offset,
          };

          // the delivery is picked_up by the courier, 
          if (d.Status === "picked_up") return null;
          const icon = d.Status === "accepted" ? markerIconAccepted : markerIconPosted;
          return (
            <Marker
              key={d.Id}
              position={adjustedPosition}
              icon={icon}
              title={`${d.Item} @ ${d.BusinessName}`}
              onClick={() => setSelectedDelivery(d)}
            />
          );
        })}

        {/* dest markers when status is picked_up */}
        {posted
          .filter((d) => d.Status === "picked_up")
          .map((d) => (
            <Marker
              key={`dest-${d.Id}`}
              position={d.DestinationLocation}
              icon={markerIconDestination}
              onClick={() => setSelectedDelivery(d)}
            />
          ))}

        {/* courier live navigation */}
        {directions && <DirectionsRenderer directions={directions} />}

      </GoogleMap>
      
      {/* radius slider UI */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "white",
          padding: "6px 10px",
          borderRadius: 4,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          fontSize: 14,
        }}
      >
        Radius: {radiusKm} km
        <br />
        <input
          type="range"
          min={1}
          max={200}
          step={1}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
        />
      </div>
  
      {/* delivery info popup */}
      {selectedDelivery && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            padding: "12px 18px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            zIndex: 1000,
            maxWidth: 300,
          }}
        >
          <h4>{selectedDelivery.Item}</h4>
          <p><strong>Pickup:</strong> {selectedDelivery.BusinessAddress}</p>
          <p><strong>Drop-off:</strong> {selectedDelivery.DestinationAddress}</p>
          <p><strong>By:</strong> {selectedDelivery.BusinessName}</p>


          {selectedDelivery.Status === "posted" && (
            <button
            onClick={async () => {
              try {
                await acceptDelivery(selectedDelivery.Id);
                setSelectedDelivery(null);
                setFeedback("success");
              } catch (err) {
                setSelectedDelivery(null);
                setFeedback("failure");
              }
            }}
            style={{ marginRight: 8 }}
          >
            Accept Delivery
          </button>
          )}
          {selectedDelivery.Status === "accepted" && (
            <button
            onClick={async () => {
              try {
                await updateDeliveryStatus(selectedDelivery.Id, "picked_up");
                setSelectedDelivery(null);
                setNavigatingAddress(selectedDelivery.DestinationLocation); // navigation starts
              } catch (err) {
                setSelectedDelivery(null);
                console.error(err)
              }
            }}
            style={{ marginRight: 8 }}
          >
            Picked up?
          </button>
          )}
          {selectedDelivery.Status === "picked_up" && (
            <button
            onClick={async () => {
              try {
                await updateDeliveryStatus(selectedDelivery.Id, "delivered");
                setSelectedDelivery(null);
                setNavigatingAddress(null); //  stop navigation
              } catch (err) {
                setSelectedDelivery(null);
                setNavigatingAddress(null); //  stop navigation ?
                setDirections(null);
                console.error(err)
              }
            }}
            style={{ marginRight: 8 }}
          >
            Delivered?
          </button>
          )}
          <button onClick={() => setSelectedDelivery(null)} style={{ marginTop: 10 }}>Cancel</button>
        
        </div>
      )}
      {feedback && (
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: feedback === "success" ? "#d4edda" : "#f8d7da",
            color: feedback === "success" ? "#155724" : "#721c24",
            padding: "14px 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            zIndex: 1001,
            maxWidth: 300,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>
            {feedback === "success" ? "Delivery accepted successfully!" : "Failed to accept delivery."}
          </p>
          <button
            style={{ marginTop: 10 }}
            onClick={() => setFeedback(null)}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
  
};

export default Courier;
