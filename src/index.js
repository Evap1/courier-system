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
    loadingElement={
      <div className="text-center py-4 text-gray-600 text-sm">
        Loading maps...
      </div>
    }
    ></LoadScript>
      <App />
    </AuthProvider>
    </MantineProvider>
  </React.StrictMode>
);

reportWebVitals();
