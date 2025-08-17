import { useState, useEffect } from "react";
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
    const { user , userRole } = useAuth();

    const [error, setError] = useState(null);


    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUpActive, setIsSignUpActive] = useState(true);
    const [isPasswordHidden, setPasswordHidden] = useState(true)

    const navigate = useNavigate();

    const handleMethodChange = () => {
      setIsSignUpActive(!isSignUpActive);
      setError(null);
    };
  
    
    // this function fetches the user doc and returns it's role.
    // if no role, returns null. 
    const checkUserRole = async (id) => {
        try{
            const userDoc = await getDoc(doc(db, "users", id));
            if (userDoc.exists()) {
                return userDoc.data().role;
            }
        }
        catch(error){
          const readable = mapFirebaseError(error.code || error.message);
            setError(readable);
            console.log("Error:", error);

        }
        return (null)
    }

    // this function trigered for an existing user / new user , trying to auth with google. 
    // Trying to autonticate with firebase auth function. 
    //  if success : navigate to the relenevt page
    //  else : create new user using firebase functions and navigate to role selection. 
    const handleGoogleSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
      
            // check if the user already has a role
            const role = checkUserRole(user.uid);
      
            if (role) {
              // existing user - navigate to their role-based dashboard
              navigate(`/${role}`);
            } else {
              // new user - create Firestore document and navigate to role selection
              await createUserDocument(user.uid, user.email, null);
              navigate("/role");
            }
          } catch (error) {
            const readable = mapFirebaseError(error.code || error.message);
            setError(readable);
            console.log("Error:", error);

          }
    };

    // this function trigered for a new user.
    // Trying to autonticate with firebase auth function. 
    //  if success : navigate to the role selection page
    //  else : present an error
    const handleSignUp = async () => {
        if (!email || !password) return;
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          const user = result.user;
          // create the Firestore user document with no role initially
          await createUserDocument(user.uid, user.email, null);
          // navigate to role selection
          navigate("/role")
        } catch (error) {
          const readable = mapFirebaseError(error.code || error.message);
          setError(readable);
        }
      };
  
      // this function trigered for an existing user. 
      // Trying to autonticate with firebase auth function. 
      //  if success : navigate to the relenevt page
      //  else : present an error
      const handleSignIn = async () => {
        if (!email || !password) return;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
    
          // check the user's role
          const role = checkUserRole(user.uid);
    
          if (role) {
            // existing user - navigate to their role-based dashboard
            navigate(`/${role}`);
          }

        } catch (error) {
          const readable = mapFirebaseError(error.code || error.message);
          setError(readable);
          console.log("Error:", error);

        }
      };

    // to set email and password upon submitting and validationg in sign-in/out handler functions.
    const handleEmailChange = (event) => setEmail(event.target.value);
    const handlePasswordChange = (event) => setPassword(event.target.value);
    
    // to handle signout / signin
    useEffect(() => {
      if (user) {
        navigate(`/${userRole || "role"}`);
      }
    }, [user, userRole, navigate]);
    
    // display errors more readable to the user.
    const mapFirebaseError = (code) => {
      switch (code) {
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/email-already-in-use': return 'This email is already registered.';
        case 'auth/user-not-found': return "";
        case 'auth/wrong-password': return 'Invalid email or password.';
        case 'auth/weak-password': return 'Password must be at least 6 characters.';
        case 'auth/popup-closed-by-user': return 'Google sign-in was cancelled.';
        default: return 'Something went wrong. Please try again.';
      }
    };
    // return (
    //   <section>
    //     <h2>Login</h2>
    //     <form>
    //       {isSignUpActive && <legend>Sign Up</legend>}
    //       {!isSignUpActive && <legend>Sign In</legend>}
  
    //       <fieldset>
    //         <ul>
    //           <li>
    //             <label htmlFor="email">Email</label>
    //             <input type="text" id="email" onChange={handleEmailChange} />
    //           </li>
    //           <li>
    //             <label htmlFor="password">Password</label>
    //             <input
    //               type="password"
    //               id="password"
    //               onChange={handlePasswordChange}
    //             />
    //           </li>
    //         </ul>

    //         {error && <p style={{ color: "red" }}>{error}</p>}

    //         <button
    //         type="button"
    //         onClick={handleGoogleSignIn}
    //         style={{
    //           marginTop: "1rem",
    //           backgroundColor: "#4285F4",
    //           color: "#fff",
    //           padding: "0.5rem 1rem",
    //           border: "none",
    //           cursor: "pointer",
    //         }}
    //       >
    //         Sign in with Google
    //       </button>
          
    //         {isSignUpActive && (
    //           <button type="button" onClick={handleSignUp}>
    //             Sign Up
    //           </button>
    //         )}
    //         {!isSignUpActive && (
    //           <button type="button" onClick={handleSignIn}>
    //             Sign In
    //           </button>
    //         )}
    //       </fieldset>


    //       <button
    //         type="button"
    //         onClick={handleMethodChange}
    //         // make it look like hyperlink
    //         style={{
    //           marginTop: "1rem",
    //           background: "none",
    //           border: "none",
    //           color: "blue",
    //           textDecoration: "underline",
    //           cursor: "pointer",
    //         }}
    //       >
    //         {isSignUpActive ? "Login" : "Create an account"}
    //       </button>

    //     </form>


    //   </section>
    // );
  // };

  // export default () => {
    return (
        <main className="w-full flex ">
          {/* LEFT PANEL */}
            <div className="relative flex-1 hidden items-center justify-center h-screen bg-gray-900 lg:flex">
                <div className="relative z-10 w-full max-w-md">
                    <img src="/name_logo.png" width={150} alt="logo"/> {/* LOGO */}
                    <div className=" mt-16 space-y-3">
                        <h3 className="text-white text-3xl font-bold">Deliver more. Earn more.</h3>
                        <p className="text-gray-300">
                          Power your business with real-time deliveries — or become a courier and get paid for every drop-off.
                          No setup fees. Instant access.
                        </p>
                        <div className="flex items-center -space-x-2 overflow-hidden">
                            <img src="https://randomuser.me/api/portraits/women/79.jpg" className="w-10 h-10 rounded-full border-2 border-white" alt="a"/>
                            <img src="https://api.uifaces.co/our-content/donated/xZ4wg2Xj.jpg" className="w-10 h-10 rounded-full border-2 border-white" alt="b"/>
                            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&fit=crop&h=200&w=200&s=a72ca28288878f8404a795f39642a46f" className="w-10 h-10 rounded-full border-2 border-white" alt="c" />
                            <img src="https://randomuser.me/api/portraits/men/86.jpg" className="w-10 h-10 rounded-full border-2 border-white" alt="d"/>
                            <img src="https://images.unsplash.com/photo-1510227272981-87123e259b17?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&fit=crop&h=200&w=200&s=3759e09a5b9fbe53088b23c615b6312e" className="w-10 h-10 rounded-full border-2 border-white" alt="e"/>
                            <p className="text-sm text-gray-400 font-medium translate-x-5">
                                Join 5.000+ users
                            </p>
                        </div>
                    </div>
                </div>
                <div
                    className="absolute inset-0 my-auto h-[500px]"
                    style={{
                        background: "linear-gradient(152.92deg, rgba(192, 132, 252, 0.2) 4.54%, rgba(232, 121, 249, 0.26) 34.2%, rgba(75, 63, 114, 1) 77.55%)", filter: "blur(118px)"
                    }}
                >

                </div>
            </div>
            {/* RIGHT PANEL */}
            <div className="flex-1 flex items-center justify-center h-screen">
                <div className="w-full max-w-md space-y-8 px-4 bg-white text-gray-600 sm:px-0">
                    <div className="">
                        <img src="/round_logo.png" width={150} className="lg:hidden" alt="round logo"/>
                        <div className="mt-5 space-y-2">
                        {isSignUpActive && <h3 className="text-gray-800 text-2xl font-bold sm:text-3xl">Create your invio account</h3>}
                        {!isSignUpActive && <h3 className="text-gray-800 text-2xl font-bold sm:text-3xl">Sign in</h3>}

                        {isSignUpActive && 
                          <p className="">Already using invio? <button onClick={handleMethodChange} className="font-medium text-indigo-600 hover:text-indigo-500">Log in</button></p>}


                        {!isSignUpActive && <h3 className="text-gray-800 text-2xl font-bold sm:text-3xl">Sign in</h3> &&
                            <p className="">First time here? <button onClick={handleMethodChange} className="font-medium text-indigo-600 hover:text-indigo-500">Create an account</button></p>}

                        </div>
                    </div>
                    <div className="w0full">
                        <button className="w-full flex items-center justify-center gap-2 py-2.5 border rounded-lg hover:bg-gray-50 duration-150 active:bg-gray-100" onClick={handleGoogleSignIn}>
                            <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clip-path="url(#clip0_17_40)">
                                    <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4" />
                                    <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853" />
                                    <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04" />
                                    <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335" />
                                </g>
                                <defs>
                                    <clipPath id="clip0_17_40">
                                        <rect width="48" height="48" fill="white" />
                                    </clipPath>
                                </defs>
                            </svg>
                            <span className="text-sm font-medium text-gray-600">Continue with Google</span>
                        </button>
    
                    </div>
                    <div className="relative">
                        <span className="block w-full h-px bg-gray-300"></span>
                        <p className="inline-block w-fit text-sm bg-white px-2 absolute -top-2 inset-x-0 mx-auto">Or continue with</p>
                    </div>
                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="space-y-5"
                    >
                        <div>
                            <label className="font-medium">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                onChange={handleEmailChange}
                                required
                                className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                            />
                        </div>
 
                        <div>
                          <label className="w-full text-gray-600">
                              Password
                          </label>
                          <div className="relative max-w mt-2">
                              <button className="text-gray-400 absolute right-3 inset-y-0 my-auto active:text-gray-600"
                                  onClick={() => setPasswordHidden(!isPasswordHidden)}
                              >
                                  {
                                      isPasswordHidden ? (
                                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                      ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                          </svg>

                                      )
                                  }
                              </button>
                              <input
                                  type={isPasswordHidden ? "password" : "text"}
                                  placeholder="Enter your password"
                                  onChange={handlePasswordChange}
                                  className="w-full pr-12 pl-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                              />
                          </div>
                      </div >

                      {/* display errors */}
                      {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
                          {error}
                        </div>
                      )}
                      {isSignUpActive && (
                        <button type="button" className="w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150" onClick={handleSignUp}>
                          Start now - it's free
                        </button>
                      )}
                      {!isSignUpActive && (
                        <button type="button" className="w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150" onClick={handleSignIn}>
                          Sign In
                        </button>
                      )}
                    </form>
                </div>
            </div>
        </main>
    )
};