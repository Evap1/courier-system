import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserDocument } from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";
import { auth , googleProvider, db} from "../firebase";


export const Login =  () => {
    const { user } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUpActive, setIsSignUpActive] = useState(true);
    const navigate = useNavigate();

    const handleMethodChange = () => {
      setIsSignUpActive(!isSignUpActive);
    };
  
    
  /**
   * Fetch the user role from Firestore
   * @param {string} userId - The UID of the user
   * @returns {string|null} - The role or null if not found
   */
    const checkUserRole = async (id) => {
        try{
            const userDoc = await getDoc(doc(db, "users", id));
            if (userDoc.exists()) {
                return userDoc.data().role;
            }
        }
        catch(e){
            console.error("Error:", e.message);
        }
        return (null)
    }


    const handleGoogleSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
      
            // Check if the user already has a role
            const role = await checkUserRole(user.uid);
      
            if (role) {
              // Existing user - navigate to their role-based dashboard
              navigate(`/${role}`);
            } else {
              // New user - create Firestore document and navigate to role selection
              await createUserDocument(user.uid, user.email, null);
              navigate("/role");
            }
          } catch (error) {
            console.error("Error during Google sign-in:", error);
          }
    };

    const handleSignUp = async () => {
        if (!email || !password) return;
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          const user = result.user;
    
          // Create the Firestore user document with no role initially
          await createUserDocument(user.uid, user.email, null);
    
          // Navigate to role selection
          navigate("/role")
        } catch (error) {
          console.error("Error during email sign-up:", error);
        }
      };
  
      const handleSignIn = async () => {
        if (!email || !password) return;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
    
          // Check the user's role
          const role = await checkUserRole(user.uid);
    
          if (role) {
            // Existing user - navigate to their role-based dashboard
            navigate(`/${role}`);
          }

        } catch (error) {
          console.error("Error during sign-in:", error);
        }
      };

  /**
   * Input Handlers
   */
    const handleEmailChange = (event) => setEmail(event.target.value);
    const handlePasswordChange = (event) => setPassword(event.target.value);
  
    if (user) navigate("/");
    
    return (
      <section>
        <h2>Login</h2>
        <form>
          {isSignUpActive && <legend>Sign Up</legend>}
          {!isSignUpActive && <legend>Sign In</legend>}
  
          <fieldset>
            <ul>
              <li>
                <label htmlFor="email">Email</label>
                <input type="text" id="email" onChange={handleEmailChange} />
              </li>
              <li>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  onChange={handlePasswordChange}
                />
              </li>
            </ul>

            <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              marginTop: "1rem",
              backgroundColor: "#4285F4",
              color: "#fff",
              padding: "0.5rem 1rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Sign in with Google
          </button>
          
            {isSignUpActive && (
              <button type="button" onClick={handleSignUp}>
                Sign Up
              </button>
            )}
            {!isSignUpActive && (
              <button type="button" onClick={handleSignIn}>
                Sign In
              </button>
            )}
          </fieldset>

          {isSignUpActive && <a onClick={handleMethodChange}>Login</a>}
          {!isSignUpActive && (
            <a onClick={handleMethodChange}>Create an account</a>
          )}
        </form>
      </section>
    );
  };