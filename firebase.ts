// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDMCRqSKJBy4WfWKIWoq0-qIQaUx0otECc",
  authDomain: "meu-app-cofrin.firebaseapp.com",
  projectId: "meu-app-cofrin",
  storageBucket: "meu-app-cofrin.firebasestorage.app",
  messagingSenderId: "1026415452462",
  appId: "1:1026415452462:web:12214aad543dc433881abf",
  measurementId: "G-K4G042HC49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);