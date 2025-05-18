import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Creates a new user document in the Firestore "users" collection.
 * @param {string} uid - User ID from Firebase Authentication.
 * @param {string} email - User email address.
 * @param {string} role - User role (courier, business, admin).
 */
export const createUserDocument = async (uid, email, role=null) => {
  try {
    await setDoc(doc(db, "users", uid), {
      email,
      role,
    });
    console.log(`User document created for UID: ${uid}`);
  } catch (error) {
    console.error("Error creating user document:", error);
  }
};
