import { BrowserRouter, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import { ProtectedRoute } from "./components/protectedRoute";
import { Login } from "./pages/login";
import { Role } from "./pages/role";
import { Admin } from "./pages/admin";
import { Courier } from "./pages/courier";
import { Business } from "./pages/business";
import { useAuth } from "./context/AuthContext"; // for global user / userRole

import "./App.css";
import { useEffect, useState } from "react";

function App() {
  const { loading } = useAuth();
  if (loading) return <h2>Loading...</h2>;

  return (
    <BrowserRouter>
      <Routes>
        <Route index path="/" element={<Login />}></Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Admin />
            </ProtectedRoute>
          }
        ></Route>

        <Route
          path="/courier"
          element={
            <ProtectedRoute role="courier">
              <Courier />
            </ProtectedRoute>
          }
        ></Route>

        <Route
          path="/business"
          element={
            <ProtectedRoute role="business">
              <Business />
            </ProtectedRoute>
          }
        ></Route>

        <Route
          path="/role"
          element={
            <ProtectedRoute> {/* passing noting as the role is yet set, will be seen as null inside ProtectedRoute */}
              <Role />
            </ProtectedRoute>
          }
        ></Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;