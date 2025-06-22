// for later
import { collection, query, where, onSnapshot} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// pages/courier.jsx - for now
import { useState, useEffect , useRef} from "react";
import { GoogleMap, Marker, useJsApiLoader, CircleF } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100vh" };
const markerIcon = "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";
const libraries        = ["places"];          // memoised => avoids the “new array” warning

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
    const mapRef = useRef(null);

  /** Load the Google Maps SDK */
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  /** Store the courier’s current coordinates */
  const [pos, setPos] = useState(null);
  const [posted, setPosted]     = useState([]); // all “posted” deliveries
  const [radiusKm, setRadiusKm] = useState(5);
  const [geoError, setGeoError] = useState(null);
  const zoom = zoomForKm(radiusKm);


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

   /** live-query all deliveries with status === "posted" */
   useEffect(() => {
    const q = query(collection(db, "deliveries"), where("status", "==", "posted"));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.businessLocation);                 // ignore legacy docs
      setPosted(docs);
    });
    return () => unsub();
  }, []);

  /* radius filter */
  const visible = pos
    ? posted.filter((d) => haversine(pos, d.businessLocation) <= radiusKm)
    : [];

  /* sync radius ← zoom (map events) */
  const handleZoom = () => {
    const z = mapRef.current?.getZoom();
    if (!z) return;
    const km = kmForZoom(z);
    // avoid loop: only update if slider differs
    if (Math.abs(km - radiusKm) >= 1) setRadiusKm(km);
  };


  /* Handle the three loading/error states cleanly */
  if (loadError)       return <p style={{ color: "red" }}>{loadError}</p>;
  if (geoError)        return <p style={{ color: "red" }}>{geoError}</p>;
  if (!isLoaded || !pos) return <p>Loading map…</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pos}
      zoom={zoom}
      onZoomChanged={handleZoom}      // ← listen for manual pinch / scroll
      onLoad={(m) => (mapRef.current = m)}
      options={mapOptions}
    >
      {/* courier's location */}
      <Marker position={pos} />

      {/* visual range */}
      <CircleF
        center={pos}
        radius={radiusKm * 1000}      // metres
        options={{
          strokeColor: "#1e90ff",
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: "#1e90ff",
          fillOpacity: 0.15,
        }}
      />

     {/* every posted delivery (purple) */}
      {/* posted deliveries inside radius (purple) */}
      {visible.map((d) => (
        <Marker
          key={d.id}
          position={d.businessLocation}
          icon={markerIcon}
          title={`${d.item} @ ${d.businessName}`}
          // onClick={() => acceptDelivery(d.id)}
        />
      ))}


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
    </GoogleMap>
  );
};

export default Courier;
