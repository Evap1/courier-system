/* eslint-disable react/prop-types */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // for glbal user , userRole
import { InvalidRoute } from "./invalidRoute";

export const ProtectedRoute = ({ children, role }) => {
    const { user, userRole, loading } = useAuth();

    if (loading) return <h2>Loading...</h2>;
    if (!user) return <Navigate to="/" />;
    if (role && role !== userRole) return <InvalidRoute />;
  
    return children;

};
    
export default ProtectedRoute;