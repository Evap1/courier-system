import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { signOut as firebaseSignOut } from "firebase/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);          // Firebase user
  const [userRole, setUserRole] = useState(null);  // Firestore role
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

      if (firebaseUser) {
        setUser(firebaseUser);
        console.log(user);
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
          //console.log("firebase role:", docSnap.data().role);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);  // <-- this is when loading ends

    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("userRole changed ->", userRole);
  }, [userRole]);

  useEffect(() => {
    console.log("user changed ->", user);
  }, [user]);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserRole(null);
      console.log("User signed out");
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  // a function to globally trigget setting the user role (in role component)
  const refreshUserRole = async () => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role);
        setLoading(false);
      }
      else {
        setUserRole(null);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, refreshUserRole, signOut}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
