import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { isConfigured, db } from './firebase/config';
import { enableIndexedDbPersistence } from 'firebase/firestore';

if (isConfigured && db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[OG Uzhavan] Multiple tabs open — offline persistence limited.');
    } else if (err.code === 'unimplemented') {
      console.warn('[OG Uzhavan] Browser does not support offline persistence.');
    }
  });
}

// Register Offline-First PWA Service Worker
if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
