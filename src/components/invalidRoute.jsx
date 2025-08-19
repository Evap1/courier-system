/**
 * InvalidRoute acts as a catch-all route guard. 
 * It reads `user` and `userRole` from AuthContext and redirects accordingly: 
 * unauthenticated to "/" (login)
 * authenticated with role to `/${userRole}` (role dashboard)
 * authenticated without role → "/role" (role selection).
 * Using this for unknown routes or as a default redirect.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const InvalidRoute = () => {
  const { userRole, user } = useAuth();

  if (!user) {
    // Not logged in? Go to login page
    return <Navigate to="/" />;
  }

  if (userRole) {
    // Logged in with a known role? Redirect to correct dashboard
    return <Navigate to={`/${userRole}`} />;
  }

  // Logged in but no role yet? Go to role selection
  return <Navigate to="/role" />;
};

export default InvalidRoute;
