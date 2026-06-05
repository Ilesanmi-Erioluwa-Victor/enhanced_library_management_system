import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { OverdueCountProvider } from "./context/OverdueCountContext.jsx";
import { LayoutProvider } from "./context/LayoutContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <OverdueCountProvider>
            <LayoutProvider>
              <App />
              <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
            </LayoutProvider>
          </OverdueCountProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
