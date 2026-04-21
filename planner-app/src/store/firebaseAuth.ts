import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  limit,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from './firebaseConfig';

const configured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

function getApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export function isAuthConfigured(): boolean {
  return configured;
}

export function getCurrentFirebaseUser(): User | null {
  if (!configured) return null;
  return getAuth(getApp()).currentUser;
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  if (!configured) { cb(null); return () => {}; }
  return fbOnAuth(getAuth(getApp()), cb);
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  if (!configured) throw new Error('Firebase no configurado');
  const cred = await signInWithEmailAndPassword(getAuth(getApp()), email.trim(), password);
  const profile = await getProfile(cred.user.uid);
  if (!profile) throw new Error('Perfil de usuario no encontrado');
  return profile;
}

// First user to register becomes admin, the rest become 'user'.
// Profile is written first (as 'user'), then promoted to admin if only one exists.
export async function signUp(email: string, password: string, name: string): Promise<UserProfile> {
  if (!configured) throw new Error('Firebase no configurado');

  // Step 1: create Firebase Auth account (SDK is now authenticated)
  const cred = await createUserWithEmailAndPassword(getAuth(getApp()), email.trim(), password);
  const db = getFirestore(getApp());

  // Step 2: write profile as 'user' first (auth is confirmed at this point)
  const profile: UserProfile = {
    uid: cred.user.uid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'user_profiles', cred.user.uid), profile);

  // Step 3: if this is the only profile, promote to admin
  const snap = await getDocs(query(collection(db, 'user_profiles'), limit(2)));
  if (snap.size === 1) {
    const adminProfile: UserProfile = { ...profile, role: 'admin' };
    await setDoc(doc(db, 'user_profiles', cred.user.uid), adminProfile);
    return adminProfile;
  }

  return profile;
}

export async function signOut(): Promise<void> {
  if (!configured) return;
  await fbSignOut(getAuth(getApp()));
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  if (!configured) return null;
  const snap = await getDoc(doc(getFirestore(getApp()), 'user_profiles', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function getAllProfiles(): Promise<UserProfile[]> {
  if (!configured) return [];
  const snap = await getDocs(collection(getFirestore(getApp()), 'user_profiles'));
  return snap.docs.map(s => s.data() as UserProfile);
}

export async function updateUserRole(uid: string, role: 'admin' | 'user'): Promise<void> {
  if (!configured) return;
  await setDoc(doc(getFirestore(getApp()), 'user_profiles', uid), { role }, { merge: true });
}
