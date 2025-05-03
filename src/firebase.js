// src/firebase.js
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBlStIeclSIYSu-PsNNyOqMJQDMpjUiJAM",
  authDomain: "ktgk-b761a.firebaseapp.com",
  projectId: "ktgk-b761a",
  storageBucket: "ktgk-b761a.appspot.com",
  messagingSenderId: "162244598463",
  appId: "1:162244598463:web:045de6d33e387ce094c40a",
  measurementId: "G-FWV5102109"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig)

// Khởi tạo Auth và Firestore
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app);