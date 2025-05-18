/* eslint-disable react/prop-types */
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

export const ProtectedRoute = ({ children, role }) => {
    const [userRole, setUserRole] = useState(null);
    const user = auth.currentUser;

    useEffect(() => {
        if (user && !userRole) {
          const fetchUserRole = async () => {
            try {
              const userDoc = await getDoc(doc(db, "users", user.uid));
              if (userDoc.exists()) {
                if (userDoc.data().role){
                    console.log("role is ", userDoc.data().role);

                }
                else{
                    console.log("role is not null");
                }
                setUserRole(userDoc.data().role);
              }
            } catch (error) {
              console.error("Error fetching user role", error);
            }
          };
          fetchUserRole();
        }
      }, [user, userRole]);
    
      if (!user) return <Navigate to="/" />;
      if (!userRole) return <Navigate to="/role" />;
    
      return userRole === role ? children : <Navigate to="/" />;
};
    
export default ProtectedRoute;