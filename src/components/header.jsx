import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export const Header = ({ balance, name }) => {
const { user, signOut } = useAuth();
//const navRef = useRef();
const navigate = useNavigate();

// // sticky animation logic
// useEffect(() => {
//   const customStyle = ["sticky-nav", "fixed", "border-b", "backdrop-blur-md", "bg-white/90"];
//   window.onscroll = () => {
//     if (window.scrollY > 80) {
//       navRef.current.classList.add(...customStyle);
//     } else {
//       navRef.current.classList.remove(...customStyle);
//     }
//   };
//   }, []);

  const handleSignOut = async () => {
    if (!user) return;
    await signOut();
    navigate("/");
  };

  return (
  // <header
  //   ref={navRef}
  //   className="w-full z-50 top-0 transition duration-300 shadow-sm"
  // >
    <header
      className=" fixed top-0 left-0 right-0 z-50 h-16 border-b shadow-sm bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      style={{ pointerEvents: "auto" }}
    >
    <div className="w-full mx-auto px-4 flex items-center justify-between h-16">
      {/* LEFT: logo */}
      <div className="flex items-center gap-4">
        <img src="/icon_logo.png" alt="Logo" className="h-10 w-10 object-contain" />
        <img src="/name_logo.png" alt="Logo" className="h-20 w-20 object-contain" />
      </div>


      {/* center: balalance, photo, name */}
      <div className="flex items-center gap-3 text-xl text-gray-700">

        <div className="flex items-center gap-2">
          <img
            src="https://randomuser.me/api/portraits/women/66.jpg"
            alt="Courier"
            className="w-12 h-12 rounded-full object-cover"
          />
          <span className="hidden sm:block font-medium">
            {name}
          </span>
          <span className="text-primary font-semibold sm:block">
          ₪ {balance.toFixed(2)}
        </span>
        </div>
      </div>

      {/* right: sign Out */}
      <button
          onClick={handleSignOut}
          className="px-3 py-2 bg-accent text-white rounded hover:bg-gray-700 text-l"
        >
          Sign Out
        </button>
    </div>
  </header>
);
};

export default Header;
