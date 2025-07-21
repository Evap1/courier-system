// components/AddressInput.jsx
import { useRef, useState } from "react";
import { Autocomplete } from "@react-google-maps/api";

export function AddressInput({ onSelect }) {
  const acRef = useRef(null);
  const [error, setError] = useState("");

  /** Called when the user picks a suggestion */
  const handlePlaceChanged = () => {
    const place = acRef.current.getPlace();
    if (!place.geometry) {
      setError("Please choose an address from the dropdown.");
      return;
    }
    setError("");
    onSelect({
      formatted: place.formatted_address,
      placeId:   place.place_id,
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    });
  };

  return (
    <>
      <Autocomplete
        onLoad={(ac) => (acRef.current = ac)}
        onPlaceChanged={handlePlaceChanged}
        options={{
          types: ["address"],          // only real street addresses
          componentRestrictions: { country: "il" }, // ← restrict to Israel;
          fields: ["formatted_address", "geometry.location", "place_id"],
        }}
      >
        <input
          type="text"
          placeholder="Fill in address"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </Autocomplete>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </>
  );
}
