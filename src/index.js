/**
 * index.js — App entrypoint & global providers.
 *
 * Creates the React 18 root and mounts <App /> inside global providers:
 * <MantineProvider> — app-wide theme, normalized CSS.
 * <AuthProvider>    — exposes { user, userRole, loading, ... } via context.
 * <LoadScript>      — loads the Google Maps JS API once, globally, using the `googleMapsApiKey` from firebase.js and the "places" library so components like <GoogleMap/>,
 *                     <Autocomplete/>, and address pickers work anywhere in the app.
 *
 * Notes
 * - Keeping <LoadScript> at the top level prevents multiple script injections
 *   when routes change and ensures Maps objects exist before any map-dependent
 *   component renders.
 * - If you add more Maps libraries later (e.g., "geometry", "directions"),
 *   include them in the `libraries` prop here so they’re available app-wide.
 */


import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from "./context/AuthContext"; // change to allow user and userRole to be global
import { LoadScript } from "@react-google-maps/api";
import { googleMapsApiKey } from "./firebase"
import {createTheme,  MantineProvider } from '@mantine/core';

const root = ReactDOM.createRoot(document.getElementById('root'));

const theme = createTheme({
  fontFamily: 'Open Sans, sans-serif',
  primaryColor: 'cyan',
});

root.render(
  
  <React.StrictMode>
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={theme}
    >
    <AuthProvider>      {/* wrap for authentication */}
    <LoadScript
    googleMapsApiKey= {googleMapsApiKey}
    libraries={["places"]}          // any future page can now use Autocomplete
    >
      <App />
    </LoadScript>
    </AuthProvider>
    </MantineProvider>
  </React.StrictMode>
);

reportWebVitals();
