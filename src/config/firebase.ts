// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCEb8-HItH08EkbIx1OL5PjlMjQdvu0J80",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "webcam-broadcast.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "webcam-broadcast",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "webcam-broadcast.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1068102663148",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1068102663148:web:ace324dd65e428ebcb9ec9"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw error;
}

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Configure Google Auth Provider with error handling
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');

// Enable offline persistence for Firestore with better error handling
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
} catch (error) {
  console.error("Error enabling persistence:", error);
}

export { auth, db, provider };