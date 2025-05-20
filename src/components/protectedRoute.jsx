/* eslint-disable react/prop-types */
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; // for glbal user , userRole

export const ProtectedRoute = ({ children, role }) => {
    const { user, userRole, loading } = useAuth();

    if (loading) return <h2>Loading...</h2>;
    if (!user) return <Navigate to="/" />;
    if (role && role !== userRole) return <Navigate to="/" />;
  
    return children;

};
    
export default ProtectedRoute;