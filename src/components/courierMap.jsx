import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker} from "@react-google-maps/api";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const containerStyle = {width: "100%" , height:"100%"}; // can adjust height
/**
 * This component renders a map showing the live position of a courier
 * in real time, using Firestore onSnapshot to subscribe to updates.
 */
const CourierMap = ({ courierId }) => {
  const [courierPos, setCourierPos] = useState(null);
  const [animatedPos, setAnimatedPos] = useState(null);
  const prevPos = useRef(null);

  const isLoaded = true;
  // listen to Firestore location updates
  useEffect(() => {
    if (!courierId) return;
    const unsub = onSnapshot(
      // creates a reference to a Firestore document located at /couriers/{user.uid}/location/current
      // writing a separate subcollection called location under each courier without modifying the existing courier metadata. storing live GPS position separately.
      doc(db, "couriers", courierId, "location", "current"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCourierPos({ lat: data.lat, lng: data.lng });
        }
      }
    );
    return () => unsub();
  }, [courierId]);

  // animate marker between updates
  useEffect(() => {
    if (!courierPos) return;
    if (!prevPos.current) {
      prevPos.current = courierPos;
      setAnimatedPos(courierPos);
      return;
    }

    const steps = 30;
    let step = 0;
    const duration = 500; // ms
    const latDiff = (courierPos.lat - prevPos.current.lat) / steps;
    const lngDiff = (courierPos.lng - prevPos.current.lng) / steps;

    const interval = setInterval(() => {
      step++;
      setAnimatedPos({
        lat: prevPos.current.lat + latDiff * step,
        lng: prevPos.current.lng + lngDiff * step,
      });
      if (step === steps) {
        prevPos.current = courierPos;
        clearInterval(interval);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [courierPos]);

  if (!isLoaded || !animatedPos) return <p>Loading map...</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={animatedPos}
      zoom={15}
    >
      <Marker position={animatedPos} />
    </GoogleMap>
  );
};

export default CourierMap;