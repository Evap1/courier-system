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
          componentRestrictions: { country: "il" }, // ← restrict to Israel; drop if global
          fields: ["formatted_address", "geometry.location", "place_id"],
        }}
      >
        <input
          type="text"
          placeholder="Business address"
          className="input input-bordered w-full"
          required
        />
      </Autocomplete>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </>
  );
}
