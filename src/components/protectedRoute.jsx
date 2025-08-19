/**
 * ProtectedRoute is a role-aware route guard. It reads `user` and `userRole` from AuthContext and:
 * Redirects unauthenticated users to "/" (login).
 * If a `role` prop is required and doesn’t match `userRole`, defers to <InvalidRoute /> (sends user to their dashboard/role flow).
 * If no `role` is required but `userRole` is already set, also defers to <InvalidRoute /> (prevents revisiting the role selection).
 * Renders `children` only when the user is authenticated and allowed for the route.
 */

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