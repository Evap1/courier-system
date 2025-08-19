/**
 * api.js — Authenticated HTTP helpers for the frontend.
 * Centralize all REST calls from the React app to the Go backend by:
 *  - Automatically attaching the current Firebase ID token (Bearer) to requests
 *  - Using a single place for basic error handling / JSON parsing
 * These helpers are used for any call to backend API.
 **/

import { auth } from "../firebase";

// Get the token
async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  return await user.getIdToken();
}

// Generic GET
export async function getWithAuth(url) {
  const token = await getToken();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Generic POST
export async function postWithAuth(url, body = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Generic PATCH
export async function patchWithAuth(url, body = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
