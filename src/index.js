import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from "./context/AuthContext"; // change to allow user and userRole to be global
import { LoadScript } from "@react-google-maps/api";
import { googleMapsApiKey } from "./firebase"

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LoadScript
    googleMapsApiKey= {googleMapsApiKey}
    libraries={["places"]}          // any future page can now use Autocomplete
  ></LoadScript>
    <AuthProvider>      {/* wrap for authentication */}
      
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
