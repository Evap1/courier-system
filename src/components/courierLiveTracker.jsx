import { useEffect, useState, useRef } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const containerStyle = { width: "100%", height: "100vh" };
const libraries = ["places"];
/**
 * This component is responsible for continuously pushing
 * the courier's live location to Firestore every few seconds.
 * It does not render any visible content.
 */
const CourierLiveTracker = ({ destination }) => {
  const { user } = useAuth();
  const [pos, setPos] = useState(null);
  const [directions, setDirections] = useState(null);
  const mapRef = useRef(null);

  // track courier location
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const newPos = { lat: coords.latitude, lng: coords.longitude };
        setPos(newPos);

        if (user?.uid) {
          await setDoc(
            doc(db, "couriers", user.uid, "location", "current"),
            {
              ...newPos,
              updatedAt: serverTimestamp(),
            }
          );
        }
      },
      (err) => console.error("Geolocation error", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.uid]);

  // get directions from pos to destination
  useEffect(() => {
    if (!pos || !destination || !window.google) return;

    if (!destination || !destination.lat || !destination.lng) {
        console.error("Invalid destination coordinates", destination);
        return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: pos,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
        } else {
          console.error("Failed to fetch directions:", status);
        }
      }
    );
  }, [pos, destination]);

  if (!pos) return <p>Loading courier map…</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pos}
      zoom={15}
      onLoad={(map) => (mapRef.current = map)}
    >
      <Marker position={pos} />
      {directions && <DirectionsRenderer directions={directions} />}
    </GoogleMap>
  );
};

export default CourierLiveTracker;

