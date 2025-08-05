// for later
import { useAuth } from "../context/AuthContext";

// pages/courier.jsx - for now
import { useState, useEffect , useRef} from "react";
import { GoogleMap, Marker, useJsApiLoader, CircleF } from "@react-google-maps/api";
import { getWithAuth, postWithAuth, patchWithAuth } from "../api/api";
import {Header} from "../components/header";

import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

import routes from "../courier_routes.json";

// for nvigation
import { DirectionsRenderer } from "@react-google-maps/api";

import * as Slider from "@radix-ui/react-slider";

import mapStyle from "../components/mapStyle.json"; 

import {DeliveryCard} from "../components/courier/deliveryCard"
import {RotatingMarker} from "../components/courier/rotatingMarker"


const containerStyle = { width: "100%", height: "100vh" };

const markerIconPosted    = "/new_delivery.png";
const markerIconAccepted  = "/pickup.png";
const markerIconDestination  = "/dst.png";


const libraries        = ["places"];  


const mapOptions = {
  styles: mapStyle,
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
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(d2r(aLat)) * Math.cos(d2r(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));   // distance in km
}

// returns the angle in degrees between two coordinates
function getHeading(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = Math.atan2(y, x);

  return (bearing * 180) / Math.PI; // radians to degrees
}

function kmForZoom(z) {
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

function getCourierIcon() {
  if (!window.google || !window.google.maps) return null;

  return {
    url: "/courier.png", // path relative to public folder
    scaledSize: new window.google.maps.Size(80, 80), // size in pixels
    anchor: new window.google.maps.Point(60, 60), // center the icon
  };
}

function getIconForStatus(status) {
  if (!window.google || !window.google.maps) return null;

  const baseSize = 60;
  const size = new window.google.maps.Size(baseSize, baseSize);
  const anchor = new window.google.maps.Point(baseSize / 2, baseSize);

  let url;
  switch (status) {
    case "accepted":
      url = "/pickup.png";
      break;
    case "posted":
      url = "/new_delivery.png";
      break;
    case "dst":
      url = "/dst.png";
      break;
    default:
      url="/pickup.png";
  }

  return { url, scaledSize: size, anchor };
}

export const Courier = () => {
  const { user } = useAuth();  
  console.log(user.uid);
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

  // to allow users to pan and zoom the map freely
  const [manualPan, setManualPan] = useState(false);
  const [balance, setBalance] = useState(0);
  const [name, setName] = useState("");


  const couriersMap = {"QpMsl9n2zTW42vvKVcpwFObRwmQ2" : "courier_1",
                       "iEBhmFIL5dPfNfMXCDdfoIuTzkw2" : "courier_2",
                       "xsmlr7lnvJerCcXSOxWya9Mn4kH2" : "courier_3",
                       "YbeQKvpSpTcchMvxwb0QISq1dZA2" : "courier_4",
                       "0vnSIMXRnFRZvuy1u76ResHtk1M2" : "courier_5"
  };
  // for testing
  const TEST_OVERRIDE = true;
  const co = couriersMap[user.uid];
  const testCoords = routes[co];
  //const [simulatedPos, setSimulatedPos] = useState(null);
  
  const zoom = zoomForKm(radiusKm);

  /** Load the Google Maps SDK */
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });


  // to fetch the balance and refetch wheb delivered
  const fetchBalance = async () => {
    try {
      const data = await getWithAuth("http://localhost:8080/me");
      setBalance(data.Balance || 0);
      // initial one time setup
      if (name === ""){
        setName(data.CourierName);

      }
    } catch (err) {
      console.error("Failed to fetch balance", err);
    }
  };
  
  useEffect(() => {
    fetchBalance();
  }, );


  // for testing
  useEffect(() => {
    if (!TEST_OVERRIDE || !user) return;

    window.setPos = setPos;

    let i = 0;
    const interval = setInterval(() => {
      if (i >= testCoords.length) return clearInterval(interval);
  
      const point = testCoords[i++];
      setPos(point); // override the position for the simulation
  
      // send simulated position to Firestore so business view sees it
      setDoc(doc(db, "couriers", user.uid, "location", "current"), {
        lat: point.lat,
        lng: point.lng,
        updatedAt: Timestamp.now(),
      });
  
    }, 3000);
  
    return () => clearInterval(interval);
  }, [user, TEST_OVERRIDE]);

  /** Start watching the device’s location as soon as the component mounts */
  useEffect(() => {
    if (TEST_OVERRIDE) return;

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
  }, [TEST_OVERRIDE]);


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
          console.log(data);
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
          //console.log("IDs:", data.map(d => d.Id));
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
      //alert("Delivery accepted!");
    } catch (err) {
      //alert("Failed to accept. Maybe someone else already took it.");
      // throw the err to be catched by selectedDelivery to set the correct error
      throw(err)
    }
  };

  const updateDeliveryStatus = async (id, newStatus) => {
    try {
      await patchWithAuth(`http://localhost:8080/deliveries/${id}`, {
        status: newStatus,
      });
      //alert("Status changed to " + newStatus);
    } catch (err) {
      //alert("Status change failed " + err);
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


  const [etaToBusiness, setEtaToBusiness] = useState(null);
  const [etaToDest, setEtaToDest] = useState(null);
  // show eta 
  useEffect(() => {
    if (!selectedDelivery || !pos) return;
  
    const businessLoc = selectedDelivery.BusinessLocation;
    const destLoc = selectedDelivery.DestinationLocation;
  
    const service = new window.google.maps.DirectionsService();
  
    // 1. ETA to business (if status is posted)
    if (selectedDelivery.Status === "posted") {
      service.route(
        {
          origin: pos,
          destination: businessLoc,
          travelMode: "DRIVING",
        },
        (result, status) => {
          if (status === "OK") {
            const leg = result.routes[0].legs[0];
            setEtaToBusiness({
              eta: leg.duration.text,
              distance: leg.distance.text,
            });
          }
        }
      );
  
      // 2. ETA from business to destination (future preview)
      service.route(
        {
          origin: businessLoc,
          destination: destLoc,
          travelMode: "DRIVING",
        },
        (result, status) => {
          if (status === "OK") {
            const leg = result.routes[0].legs[0];
            setEtaToDest({
              eta: leg.duration.text,
              distance: leg.distance.text,
            });
          }
        }
      );
    }
  
    // 3. If picked_up, only calculate to destination
    if (selectedDelivery.Status === "picked_up") {
      service.route(
        {
          origin: pos,
          destination: destLoc,
          travelMode: "DRIVING",
        },
        (result, status) => {
          if (status === "OK") {
            const leg = result.routes[0].legs[0];
            setEtaToDest({
              eta: leg.duration.text,
              distance: leg.distance.text,
            });
          }
        }
      );
    }
  }, [selectedDelivery, pos]);

  // handle accept delivery on popup
  const handleAccept = async (d) => {
    try {
      await acceptDelivery(d.Id);
      setSelectedDelivery(null);
      setFeedback("success");
    } catch (err) {
      setSelectedDelivery(null);
      setFeedback("failure");
    }
  }

  const handlePickUp = async (d) => {
    try {
      await updateDeliveryStatus(d.Id, "picked_up");
      setSelectedDelivery(null);
      setNavigatingAddress(d.DestinationLocation); // navigation starts
    } catch (err) {
      setSelectedDelivery(null);
      console.error(err)
    }
  }

  const handleDelivered = async (d) => {
    try{
      await updateDeliveryStatus(d.Id, "delivered");
      await fetchBalance();
      setSelectedDelivery(null);
      setNavigatingAddress(null);  //  stop navigation
      setDirections(null);
    } catch (err) {
      setSelectedDelivery(null);
      setNavigatingAddress(null); //  stop navigation ?
      setDirections(null);
      console.error(err)
    }
  }

  const handleNavigate = (location) => {
    setNavigatingAddress(location);
    setSelectedDelivery(null);
  }

  /* Handle the three loading/error states cleanly */
  if (loadError)       return <p style={{ color: "red" }}>{loadError}</p>;
  if (geoError)        return <p style={{ color: "red" }}>{geoError}</p>;
  if (!isLoaded || !pos) return <p>Loading map…</p>;

  //console.log("Rendering markers for:", posted.length, "deliveries")
  return (
    <>
      <Header
        balance={balance}
        name = {name}
      />

      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full px-4 z-40">
        <div className="max-w-sm mx-auto backdrop-blur-md bg-white/10 shadow-lg rounded-xl py-3 flex flex-col items-center border border-gray-200">
          <span className="text-xl font-medium text-primary mb-1">
            Search Radius: {radiusKm} km
          </span>
          <Slider.Root
            className="relative flex h-5 w-full max-w-xs touch-none select-none items-center"
            value={[radiusKm]}
            min={0.1}
            max={50}
            step={2}
            onValueChange={([v]) => setRadiusKm(v)}
          >
            <Slider.Track className="relative h-[3px] grow rounded-full bg-gray-300">
              <Slider.Range className="absolute h-full rounded-full bg-primary" />
            </Slider.Track>
            <Slider.Thumb
              className="block w-5 h-5 rounded-full bg-white border border-gray-400 shadow hover:bg-primary focus:outline-none"
              aria-label="Radius"
            />
          </Slider.Root>
        </div>
      </div>

      <div className="fixed top-16 left-0 right-0 bottom-0 z-0 overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={manualPan ? undefined : pos} // if manual pan, dont recenter and move. if pressed recenter, keep moving the position
        zoom={zoom}
        onZoomChanged={handleZoom} // to change radium of query and circle view
        onDragStart={() => setManualPan(true)} // to allow manual drag
        onLoad={(m) => (mapRef.current = m)}
        options={mapOptions}
      >
      
      {/* Recenter Button */}
<div className="absolute bottom-20 left-6 z-50">
  <button
    onClick={() => {
      if (mapRef.current && pos) {
        mapRef.current.panTo(pos);
        setManualPan(false);
      }
    }}
    className="p-3 rounded-full bg-white shadow-md hover:bg-gray-100 border border-primary transition"
    aria-label="Recenter map"
  >
    {/* Inline custom SVG icon */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className="w-12 h-12 text-primary"
      fill="currentColor"
    >
      <g transform="translate(0,512) scale(0.1,-0.1)">
        <path d="M2450 4640 l0 -480 110 0 110 0 0 480 0 480 -110 0 -110 0 0 -480z"/>
        <path d="M1845 4681 c-673 -231 -1186 -746 -1410 -1418 -20 -58 -34 -111 -32
        -117 4 -11 196 -63 200 -55 1 2 20 57 41 121 123 374 377 726 697 965 208
        155 390 245 685 338 17 5 -37 199 -56 202 -8 1 -64 -15 -125 -36z"/>
        <path d="M3137 4713 c-8 -14 -50 -194 -46 -196 2 -1 57 -20 121 -41 585 -193
        1068 -675 1263 -1261 20 -60 39 -115 40 -122 3 -8 31 -4 97 14 51 14 97 29
        102 33 5 5 -7 56 -28 119 -221 673 -746 1200 -1421 1426 -112 37 -121 39
        -128 28z"/>
        <path d="M2359 3714 c-246 -44 -445 -149 -625 -328 -228 -229 -344 -507 -344
        -826 0 -319 116 -597 344 -826 229 -228 507 -344 826 -344 319 0 597 116 826
        344 228 229 344 507 344 826 0 319 -116 597 -344 826 -183 182 -381 285 -633
        329 -105 18 -291 18 -394 -1z m384 -215 c193 -39 354 -125 493 -263 138 -139
        224 -300 263 -493 27 -128 27 -238 0 -366 -39 -193 -125 -354 -263 -493 -139
        -138 -300 -224 -493 -263 -128 -27 -238 -27 -366 0 -193 39 -354 125 -493 263
        -138 139 -224 300 -263 493 -27 128 -27 238 0 366 39 193 125 354 263 493 230
        229 548 327 859 263z"/>
        <path d="M0 2560 l0 -110 480 0 480 0 0 110 0 110 -480 0 -480 0 0 -110z"/>
        <path d="M4160 2560 l0 -110 480 0 480 0 0 110 0 110 -480 0 -480 0 0 -110z"/>
        <path d="M498 2011 c-59 -16 -98 -31 -98 -39 0 -7 18 -67 41 -135 176 -527
        567 -986 1069 -1255 174 -93 455 -196 470 -173 9 15 54 191 49 194 -2 1 -57
        20 -121 41 -588 194 -1068 674 -1267 1269 -21 65 -41 120 -43 121 -1 1 -47 -9
        -100 -23z"/>
        <path d="M4477 1912 c-189 -585 -674 -1071 -1270 -1270 -65 -22 -118 -43 -119
        -46 -4 -22 48 -196 59 -196 7 0 61 16 120 36 638 213 1147 702 1387 1331 46
        120 69 204 59 213 -8 7 -174 50 -190 50 -4 0 -25 -53 -46 -118z"/>
        <path d="M2450 480 l0 -480 110 0 110 0 0 480 0 480 -110 0 -110 0 0 -480z"/>
      </g>
    </svg>
  </button>
</div>

      {/* courier's current location */}
      <Marker position={pos} icon={getCourierIcon()} />

{/*
      <RotatingMarker
        position={pos}
        heading={getHeading(prevPos, pos)}
      />

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

        const offset = 0.0001 * duplicatesBefore; // 2 m per duplicate
        const adjustedPosition = {
          lat: d.BusinessLocation.lat + offset,
          lng: d.BusinessLocation.lng - offset,
        };

        // the delivery is picked_up by the courier, 
        if (d.Status === "picked_up" || d.Status === "delivered") return null;
        const icon = d.Status === "accepted" ? getIconForStatus("accepted") : getIconForStatus("posted");
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
      {posted.map((d, i, arr) => {
        // count how many deliveries share the same lat/lng before this one
        const duplicatesBefore = arr.slice(0, i).filter(
          (other) =>
            other.DestinationLocation.lat === d.DestinationLocation.lat &&
            other.DestinationLocation.lng === d.DestinationLocation.lng
        ).length;

        const offset = 0.00003 * duplicatesBefore; // 3 m per duplicate
        const adjustedPosition = {
          lat: d.DestinationLocation.lat + offset,
          lng: d.DestinationLocation.lng + offset,
        };

        // the delivery is picked_up by the courier, 
        if (d.Status !== "picked_up") return null;
        return (
          <Marker
            key={`dest-${d.Id}`}
            position={adjustedPosition}
            icon={getIconForStatus("dst")}
            onClick={() => setSelectedDelivery(d)}
          />
        );
      })}

      {/* courier live navigation */}
      {directions && <DirectionsRenderer directions={directions}  options={{ suppressMarkers: true, draggable: true, preserveViewport: true }}
 />}
    </GoogleMap>
</div>
    {/* delivery info popup */}
    {/*selectedDelivery && (
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
        <p><strong>Payment:</strong> {selectedDelivery.Payment} ₪</p>


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
          <>
            <button
              onClick={async () => {
                try{
                  await updateDeliveryStatus(selectedDelivery.Id, "delivered");
                  await fetchBalance();
                  setSelectedDelivery(null);
                  setNavigatingAddress(null);  //  stop navigation
                  setDirections(null);
                } catch (err) {
                  setSelectedDelivery(null);
                  setNavigatingAddress(null); //  stop navigation ?
                  setDirections(null);
                  console.error(err)
                }
              }}
            >
              Delivered?
            </button>
            <button
              onClick={() => {
                setNavigatingAddress(selectedDelivery.DestinationLocation);
                setSelectedDelivery(null);
              }}
            >
              Navigate to this destination
            </button>
          </>
        )}
        <button onClick={() => setSelectedDelivery(null)} style={{ marginTop: 10 }}>Cancel</button>
      
      </div>
    )*/}

    {selectedDelivery && (
      <DeliveryCard
        delivery={selectedDelivery}
        etaToBusiness={etaToBusiness}
        etaToDest={etaToDest}
        onClose={() => setSelectedDelivery(null)}
        onAccept={handleAccept}
        onPickedUp={handlePickUp}
        onDelivered={handleDelivered}
        onNavigate={handleNavigate}
      />
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
