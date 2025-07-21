import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/protectedRoute";
import { InvalidRoute } from "./components/invalidRoute";
import { Login } from "./pages/login";
import { Role } from "./pages/role";
import { Admin } from "./pages/admin";
import { Courier } from "./pages/courier";
import { Business } from "./pages/business";
import { useAuth } from "./context/AuthContext"; // for global user / userRole
import Header from "./components/header";

function App() {
  // const { loading } = useAuth();
  // if (loading) return <h2>Loading...</h2>;

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;