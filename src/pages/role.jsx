import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const Role = () => {
    const { user , refreshUserRole } = useAuth();
    const navigate = useNavigate();

    const [selectedRole, setSelectedRole] = useState("");
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setSelectedRole(e.target.value);
      };

    // we want to try to update the data in firebase
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRole) {
            setError("Please select a role");
            return;
        }

        try {
            // Update the user document with the selected role
            const userDoc = doc(db, "users", user.uid); // points to users/{uid}
            await updateDoc(userDoc, { role: selectedRole });
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
          <h2>Select Your Role</h2>
          <form onSubmit={handleSubmit}>
            <label>
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
            <button type="submit">Continue</button>
            {error && <p style={{ color: "red" }}>{error}</p>}
          </form>
        </section>
      );
};
    
export default Role;