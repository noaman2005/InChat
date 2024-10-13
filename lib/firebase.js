// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBDBvtbzyYU8JifpSR9lIbDvECq7mmTi0w",
  authDomain: "proveit-493fc.firebaseapp.com",
  projectId: "proveit-493fc",
  storageBucket: "proveit-493fc.appspot.com",
  messagingSenderId: "304416373736",
  appId: "1:304416373736:web:e7c4a2e6cb4f8ed999025d",
  measurementId: "G-G5EHMH8EVY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
