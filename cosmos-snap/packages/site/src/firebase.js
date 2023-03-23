// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAOHIkbcMpQf9EKn141sJXLrLk5UYN7lG4",
  authDomain: "auth-cosmos.firebaseapp.com",
  projectId: "auth-cosmos",
  storageBucket: "auth-cosmos.appspot.com",
  messagingSenderId: "617204160956",
  appId: "1:617204160956:web:fbf7c64efc4d0ac053b3b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);