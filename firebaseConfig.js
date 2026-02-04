import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // NEU hinzugefügt
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDGzCUQN_kVBFiRP3uywjMSJgBdwtZ5DK4",
  authDomain: "deine-stadt-6f34f.firebaseapp.com",
  projectId: "deine-stadt-6f34f",
  storageBucket: "deine-stadt-6f34f.firebasestorage.app",
  messagingSenderId: "644782416545",
  appId: "1:644782416545:web:145023d7a593065a1046e0",
  measurementId: "G-S1DR6TS1FY"
};

// App initialisieren
const app = initializeApp(firebaseConfig);

// Auth mit Handy-Speicher verbinden
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app); // Storage Dienst initialisieren

export { auth, db, storage }; // Alle drei Dienste exportieren