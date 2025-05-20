import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (!user) return null; // Don't show the header if user is not logged in

    await signOut();
    navigate("/"); // You can still redirect locally here
  }
  return (
    <header style={{ padding: "1rem", backgroundColor: "#eee", display: "flex", justifyContent: "flex-end" }}>
      <button onClick={handleSignOut} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
        Sign Out
      </button>
    </header>
  );
};

export default Header;
