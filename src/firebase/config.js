import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

let app, db, auth, storage, functions;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  functions = getFunctions(app);
} else {
  console.info(
    "%c[OG Uzhavan] Running in Local Persistent Database Mode.\n" +
    "To connect real Firebase Cloud Firestore, add your credentials in .env.local",
    "color:#2E7D32;font-weight:700"
  );
  app = null; db = null; auth = null; storage = null; functions = null;
}

export { app, db, auth, storage, functions, isConfigured };
