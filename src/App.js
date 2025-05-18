import { BrowserRouter, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import { ProtectedRoute } from "./components/protectedRoute";
import { Login } from "./pages/login";
import { Role } from "./pages/role";
import { Admin } from "./pages/admin";
import { Courier } from "./pages/courier";
import { Business } from "./pages/business";

import "./App.css";
import { useEffect, useState } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setIsFetching(false);
        return;
      }

      setUser(null);
      setIsFetching(false);
    });
    return () => unsubscribe();
  }, []);

  if (isFetching) {
    return <h2>Loading...</h2>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route index path="/" element={<Login user={user}></Login>}></Route>
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
            <ProtectedRoute role="">
              <Role />
            </ProtectedRoute>
          }
        ></Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;