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

  let cred;
  try {
    console.log('[signUp] 1/3 Creating Firebase Auth account...');
    cred = await createUserWithEmailAndPassword(getAuth(getApp()), email.trim(), password);
    console.log('[signUp] 1/3 OK — uid:', cred.user.uid);
  } catch (e) {
    console.error('[signUp] 1/3 FAILED (createUserWithEmailAndPassword):', e);
    throw e;
  }

  const db = getFirestore(getApp());
  const profile: UserProfile = {
    uid: cred.user.uid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  try {
    console.log('[signUp] 2/3 Writing profile to Firestore...');
    await setDoc(doc(db, 'user_profiles', cred.user.uid), profile);
    console.log('[signUp] 2/3 OK');
  } catch (e) {
    console.error('[signUp] 2/3 FAILED (setDoc user_profiles):', e);
    throw new Error('Cuenta creada, pero falló la escritura a Firestore. Revisa las Reglas de Firestore en la Consola de Firebase.');
  }

  try {
    console.log('[signUp] 3/3 Checking if first user...');
    const snap = await getDocs(query(collection(db, 'user_profiles'), limit(2)));
    console.log('[signUp] 3/3 OK — total profiles:', snap.size);
    if (snap.size === 1) {
      const adminProfile: UserProfile = { ...profile, role: 'admin' };
      await setDoc(doc(db, 'user_profiles', cred.user.uid), adminProfile);
      console.log('[signUp] Promoted to admin');
      return adminProfile;
    }
  } catch (e) {
    console.warn('[signUp] 3/3 admin check failed — continuing as user:', e);
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
