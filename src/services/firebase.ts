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
  apiKey: 'AIzaSyBISq_9_Dn5XfAQ0x-XYHmkLcSPIb0L6P0',
  authDomain: 'lernmap-ca6e7.firebaseapp.com',
  projectId: 'lernmap-ca6e7',
  storageBucket: 'lernmap-ca6e7.firebasestorage.app',
  messagingSenderId: '810011948540',
  appId: '1:810011948540:web:557a32e20d095a7ffa2e79',
  measurementId: 'G-QTG5RDD01D',
};

// Initialize Firebase
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
