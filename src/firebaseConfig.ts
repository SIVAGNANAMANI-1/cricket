import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQsR6F9QtKfhNEN-mbW6Ab2YrQkSu0z6E",
  authDomain: "the-third-umpire-e01d5.firebaseapp.com",
  projectId: "the-third-umpire-e01d5",
  storageBucket: "the-third-umpire-e01d5.firebasestorage.app",
  messagingSenderId: "596529737683",
  appId: "1:596529737683:web:0a6896cb4bc4626860c926"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
