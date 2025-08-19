/**
 * Application router & role-based access control.
 * Initializes <BrowserRouter> and declares all routes.
 * Gates rendering on auth bootstrap using AuthContext:
 *  While `loading` is true - show <Loader/>.
 *  If `user` exists but `userRole === null` (fresh signup or role fetch in progress) also show <Loader/> to avoid flicker until role is known.
 * Enforces authorization with <ProtectedRoute/> and uses <InvalidRoute/> for catch-all redirects.
 **/

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/protectedRoute";
import { InvalidRoute } from "./components/invalidRoute";
import { Loader } from "./components/loader";
import { Login } from "./pages/login";
import { Role } from "./pages/role";
import { Admin } from "./pages/admin";
import { Courier } from "./pages/courier";
import { Business } from "./pages/business";
import { useAuth } from "./context/AuthContext"; // for global user / userRole
import './theme.css'; 
function App() {
  const { loading , userRole, user } = useAuth();

  return (
    <BrowserRouter>
          {(loading || (user && userRole === null)) ? (
        <Loader />
      ) : (
        <>
      { /* Global Sign Out button */}
      
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
        {/* any invalid route */}
        <Route
          path="*"
          element={
            <InvalidRoute />
          }
        />
      </Routes>
      </>
      )}
    </BrowserRouter>
  );
}

export default App;