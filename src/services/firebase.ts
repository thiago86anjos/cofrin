import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDMCRqSKJBy4WfWKIWoq0-qIQaUx0otECc",
  authDomain: "meu-app-cofrin.firebaseapp.com",
  projectId: "meu-app-cofrin",
  storageBucket: "meu-app-cofrin.firebasestorage.app",
  messagingSenderId: "1026415452462",
  appId: "1:1026415452462:web:12214aad543dc433881abf",
  measurementId: "G-K4G042HC49"
};

const app = initializeApp(firebaseConfig);

// Usar initializeAuth com persistência AsyncStorage para React Native
// Para web, usar getAuth padrão
export const auth = Platform.OS === 'web' 
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

export const db = getFirestore(app);

// Nomes das coleções
export const COLLECTIONS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  ACCOUNTS: 'accounts',
  CREDIT_CARDS: 'creditCards',
  TRANSACTIONS: 'transactions',
  CREDIT_CARD_BILLS: 'creditCardBills',
  GOALS: 'goals',
  USER_PREFERENCES: 'userPreferences',
} as const;
