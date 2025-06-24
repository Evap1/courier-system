import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AddressInput } from "../components/address";


import { doc, setDoc, getDoc } from "firebase/firestore";

import { db } from "../firebase";

export const Role = () => {
    const { user , refreshUserRole } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
//    const [businessAddress, setBusinessAddress] = useState(""); 
    const [addressObj, setAddressObj] = useState(null);   // { formatted, placeId, location }

    const [selectedRole, setSelectedRole] = useState("");
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setSelectedRole(e.target.value);
      };

    // we want to try to update the data in firebase
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedRole || !name || (selectedRole === "business" && !addressObj)) {
            setError("Please fill in all required fields.");
            return;
          }

        try {
            // Update the user document with the selected fields
            const userDoc = doc(db, "users", user.uid);
            const userData = await getDoc(userDoc);
        
            const existingData = userData.exists() ? userData.data() : {};
            const preservedEmail = existingData.email || user.email; // fallback to auth value
        
            await setDoc(userDoc, {
              email: preservedEmail,
              role: selectedRole,
              ...(selectedRole === "business" ? { 
                businessName: name,
                businessAddress: addressObj.formatted,
                placeId: addressObj.placeId,
                location: addressObj.location, //lat/lng
               } : {courierName: name})
            }, { merge: true });


            await refreshUserRole(); // Refetch from Firestore

            // Navigate to the relevant dashboard
            navigate(`/${selectedRole}`);
        } catch (err) {
            console.error("Error updating role:", err);
            setError("Failed to set role");
        }
    };

    return (
        <section>

          <form onSubmit={handleSubmit}>
            <label>
            Select Your Role:
            <br/>

              <input
                type="radio"
                value="courier"
                checked={selectedRole === "courier"}
                onChange={handleChange}
              />
              Courier
            </label>
            <br />
            <label>
              <input
                type="radio"
                value="business"
                checked={selectedRole === "business"}
                onChange={handleChange}
              />
              Business
            </label>
            <br />
            {selectedRole === "business" && (
              <AddressInput onSelect={setAddressObj} />
                // <label>
                //     Business Address:
                //     <input
                //     value={businessAddress}
                //     onChange={(e) => setBusinessAddress(e.target.value)}
                //     required
                //     />
                // </label>
            )}
            <br />
            <label>
            {selectedRole === "business"
                ? "Business name:"
                : selectedRole === "courier"
                ? "Enter courier name:"
                : "Name:"}
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            </label>
            <br />

            <button type="submit">Continue</button>
            {error && <p style={{ color: "red" }}>{error}</p>}
          </form>
        </section>
      );
};
    
export default Role;