// for later
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db, googleMapsApiKey } from "../firebase";
import { useAuth } from "../context/AuthContext";

// pages/courier.jsx - for now
import { useState, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100vh" };
const markerIcon = "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";
const mapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
};

export const Courier = () => {
    const { user } = useAuth();  
  /** Load the Google Maps SDK */
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places"], 
  });

  /** Store the courier’s current coordinates */
  const [pos, setPos] = useState(null);
  const [posted, setPosted]     = useState([]);
  const [geoError, setGeoError] = useState(null);

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


  /* Handle the three loading/error states cleanly */
  if (loadError)       return <p style={{ color: "red" }}>{loadError}</p>;
  if (geoError)        return <p style={{ color: "red" }}>{geoError}</p>;
  if (!isLoaded || !pos) return <p>Loading map…</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pos}
      zoom={15}
      options={mapOptions}
    >
      {/* courier's location */}
      <Marker position={pos} />

     {/* every posted delivery (purple) */}
     {posted.map(d => (
        <Marker
          key={d.id}
          position={d.businessLocation}
          icon={markerIcon}
          title={`${d.item} @ ${d.businessName}`}
          /* onClick={() => TODO_acceptDelivery(d.id)} */
        />
      ))}

    </GoogleMap>
  );
};

export default Courier;
