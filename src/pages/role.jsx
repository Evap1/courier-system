/**
 * Role - two-step onboarding to set the authenticated user’s role and profile.
 * Step 1 lets the user choose "courier" or "business". 
 * Step 2 collects a name (and, for business, a structured address via <AddressInput/>). 
 * On submit it writes to Firestore `users/{uid}`, preserving the existing email and setting `role`, plus role-specific fields:
 * courier - { courierName, balance: 0 }
 * business - { businessName, businessAddress, placeId, location:{lat,lng} }
 * After saving, it calls `refreshUserRole()` from AuthContext and navigates to `/${role}`.
 */

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
    const [step, setStep] = useState(1);
    const [addressObj, setAddressObj] = useState(null);   // { formatted, placeId, location }

    const [selectedRole, setSelectedRole] = useState("");
    const [error, setError] = useState(null);

    // we want to try to update the data in firebase
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedRole || !name || (selectedRole === "business" && !addressObj)) {
            setError("Please fill in all required fields.");
            return;
          }

        try {
            // update the user document with the selected fields
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
               } : {courierName: name, balance: 0})
            }, { merge: true });


            await refreshUserRole(); // refetch from Firestore
            
            // navigate to the relevant dashboard
            navigate(`/${selectedRole}`);
        } catch (err) {
            console.error("Error updating role:", err);
            setError("Failed to set role");
        }
    };

    const roles = [
      { key: "courier", label: "Courier", icon: "🚚" },
      { key: "business", label: "Business", icon: "🏢" }
    ];

return (
  <main className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
    {/* FIRST VIEW- SELECT ROLE */}
    {step === 1 ? (
      <div className="max-w-lg w-full text-center bg-white p-8 rounded-2xl shadow-lg space-y-6">
        <h2 className="text-2xl font-bold">Please select your role</h2>
        <p className="text-gray-500 text-sm">Choose how you want to use Velora</p>

        <div className="flex justify-center gap-4">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => setSelectedRole(role.key)}
              className={`flex flex-col items-center border p-6 w-32 rounded-lg transition hover:shadow-md ${
                selectedRole === role.key ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
            >
              <div className="text-4xl mb-2">{role.icon}</div>
              <span className="font-medium">{role.label}</span>
            </button>
          ))}
        </div>
    
    {/* Button to move to the next step */}

        <button
          disabled={!selectedRole}
          onClick={() => setStep(2)}
          className="mt-6 px-6 py-2 text-white rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    ) :
   (
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white p-6 rounded-2xl shadow-lg space-y-4">
        <h2 className="text-xl font-semibold">Complete your {selectedRole} setup</h2>

        <div>
          <label className="block font-medium">Name</label>
          <input
            className="w-full px-4 py-2 mt-1 border rounded-md outline-none focus:ring-2 ring-blue-300"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {selectedRole === "business" && (
          <div>
            <label className="block font-medium">Business Address</label>
            <AddressInput onSelect={setAddressObj} />
          </div>
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{error}</div>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Continue
        </button>
      </form>
    )}
  </main>
);
};
export default Role;