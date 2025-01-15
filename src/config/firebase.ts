// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEb0-HItH08Ek6Ix1OL5PjLMjQdvu0J80",
  authDomain: "webcam-broadcast.firebaseapp.com",
  projectId: "webcam-broadcast",
  storageBucket: "webcam-broadcast.appspot.com",
  messagingSenderId: "1068102663148",
  appId: "1:1068102663148:web:ace324dd65e428ebcb9ec9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Configure Google Auth Provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, db, provider };