/**
 * firebase.ts – Zentrale Initialisierung von Firebase Authentication und Cloud Firestore.
 * 
 * Sicherheitshinweis:
 * In Firebase Client-Anwendungen (Single Page Apps) ist der API-Key eine öffentliche Projekt-ID.
 * Die tatsächliche Sicherheit wird auf Datenbankebene über Firestore Security Rules (firestore.rules)
 * und Firebase Authentication geregelt.
 * 
 * Zur flexiblen Konfiguration können Umgebungsvariablen (.env via Vite: import.meta.env.VITE_...)
 * genutzt werden. Falls diese nicht gesetzt sind, greift der produktive Standard.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBISq_9_Dn5XfAQ0x-XYHmkLcSPIb0L6P0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'lernmap-ca6e7.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'lernmap-ca6e7',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'lernmap-ca6e7.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '810011948540',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:810011948540:web:557a32e20d095a7ffa2e79',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-QTG5RDD01D',
};

// Singleton-Initialisierung der Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export type { User };
export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
};
