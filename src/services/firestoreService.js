import { db } from "../firebase";

import { doc, collection, Timestamp, setDoc, addDoc } from "firebase/firestore";



/**
 * Creates a new user document in the Firestore "users" collection.
 * @param {string} uid - User ID from Firebase Authentication.
 * @param {string} email - User email address.
 * @param {string} role - User role (courier, business, admin).
 */ 
export const createUserDocument = async (uid, email, role = null, name,  extraFields = {}) => {

  try {
    await setDoc(doc(db, "users", uid), {
      email,
      role,
      name,
      ...extraFields

    });
    console.log(`User document created for UID: ${uid}`);
  } catch (error) {
    console.error("Error creating user document:", error);
  }
};

export const createDeliveryDocument = async (businessId, businessName, item, src, dst, assignedTo, status) => {
  try {
    const docRef = await addDoc(collection(db, "deliveries"), {
      businessId,
      businessName,
      item,
      src,
      dst,
      createdAt: Timestamp.now(),
      assignedTo,
      status
    });
    console.log(`Delivery created with ID: ${docRef.id}`);
    //return docRef.id;
  } catch (error) {
    console.error("Error creating delivery document:", error);
    throw error;
  }
};

