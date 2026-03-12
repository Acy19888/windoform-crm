import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app, db, auth;
if (cfg.apiKey && cfg.projectId) { app = initializeApp(cfg); db = getFirestore(app); auth = getAuth(app); }

export const loginUser = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const registerUser = async (e, p, n) => { const c = await createUserWithEmailAndPassword(auth, e, p); if (n) await updateProfile(c.user, { displayName: n }); return c.user; };
export const logoutUser = () => signOut(auth);
export const onAuthChange = (cb) => auth ? onAuthStateChanged(auth, cb) : (cb(null), () => {});

export const add = (col, data) => db ? addDoc(collection(db, col), { ...data, createdAt: new Date().toISOString() }) : null;
export const upd = (col, id, data) => db ? updateDoc(doc(db, col, id), { ...data, updatedAt: new Date().toISOString() }) : null;
export const del = (col, id) => db ? deleteDoc(doc(db, col, id)) : null;

export const subscribe = (col, cb) => {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(query(collection(db, col), orderBy("createdAt", "desc")), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));
};

export const addBatch = async (col, items) => {
  if (!db) return;
  for (const item of items) { await addDoc(collection(db, col), { ...item, createdAt: new Date().toISOString() }); }
};

export { db, auth };
