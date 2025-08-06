import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from '@react-oauth/google';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="749131023603-04sbcgp0be54tcbttlrbnoonsud9e0bj.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
