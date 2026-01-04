import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    memoryLocalCache,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";
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
// Use default auth instance; react-native-specific persistence isn't configured here.
export const auth = getAuth(app);

// Firestore
// No SDK atual, enableIndexedDbPersistence() será depreciado.
// Para web, usamos cache local persistente (IndexedDB). Para mobile, getFirestore padrão.
export const db = (() => {
  if (Platform.OS !== 'web') {
    return getFirestore(app);
  }

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (err) {
    // Fallback seguro (ex.: IndexedDB indisponível)
    console.log('Firestore persistence not available, falling back to memory cache');
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  }
})();

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
  OPERACOES_ATIVOS: 'operacoes_ativos',
} as const;
