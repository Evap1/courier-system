/* eslint-disable react/prop-types */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // for glbal user , userRole
import { InvalidRoute } from "./invalidRoute";

export const ProtectedRoute = ({ children, role }) => {
    const { user, userRole } = useAuth();

    if (!user) return <Navigate to="/" />;
    if (role && role !== userRole) return <InvalidRoute />;
    if (role == null && userRole != null) return <InvalidRoute />; // if the user have role but attempts to go back to role page, restrict
  
    return children;

};
    
export default ProtectedRoute;