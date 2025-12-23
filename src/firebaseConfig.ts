import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableNetwork } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQsR6F9QtKfhNEN-mbW6Ab2YrQkSu0z6E",
  authDomain: "the-third-umpire-e01d5.firebaseapp.com",
  projectId: "the-third-umpire-e01d5",
  storageBucket: "the-third-umpire-e01d5.firebasestorage.app",
  messagingSenderId: "596529737683",
  appId: "1:596529737683:web:0a6896cb4bc4626860c926"
};

// Initialize Firebase
// We check if an app is already initialized to avoid "Firebase: Firebase App named '[DEFAULT]' already exists" errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable Firestore network (ensure it's not in offline mode)
enableNetwork(db).then(() => {
  console.log("✅ Firestore network ENABLED");
}).catch((err) => {
  console.error("❌ Failed to enable Firestore network:", err);
});