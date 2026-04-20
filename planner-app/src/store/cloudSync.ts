import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

const LEGACY_COLLECTION = 'planner_data';
const BULK_DONE_KEY = 'planner:cloud:bulk_uploaded';

const configured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

let db: Firestore | null = null;

function getDb(): Firestore | null {
  if (!configured) return null;
  if (!db) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

// Returns the current Firebase Auth user UID, or null if not logged in
function getCurrentUid(): string | null {
  if (!configured) return null;
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    return getAuth(app).currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

// Firestore collection path — user-scoped when logged in, legacy otherwise
function dataCollection(): string {
  const uid = getCurrentUid();
  return uid ? `users/${uid}/planner_data` : LEGACY_COLLECTION;
}

function keyToId(key: string): string {
  return encodeURIComponent(key);
}

function idToKey(id: string): string {
  return decodeURIComponent(id);
}

export function isCloudEnabled(): boolean {
  return configured;
}

// Write a single key to Firestore (fire-and-forget)
export function cloudSet(key: string, value: unknown): void {
  const database = getDb();
  if (!database) return;
  setDoc(doc(database, dataCollection(), keyToId(key)), { value, updatedAt: Date.now() }).catch(
    e => console.warn('[CloudSync] write failed:', e),
  );
}

// Pull the current user's Firestore data into localStorage.
// Auto-migrates from legacy planner_data if the user has no data yet.
export async function cloudSyncToLocal(): Promise<void> {
  const database = getDb();
  if (!database) return;
  const uid = getCurrentUid();
  const userPath = uid ? `users/${uid}/planner_data` : LEGACY_COLLECTION;

  try {
    let snap = await getDocs(collection(database, userPath));

    // First login: migrate old single-user data to this user's collection
    if (snap.empty && uid) {
      const legacy = await getDocs(collection(database, LEGACY_COLLECTION));
      if (!legacy.empty) {
        await Promise.all(
          legacy.docs
            .filter(d => d.id !== '__admin__')
            .map(d => setDoc(doc(database, userPath, d.id), d.data()))
        );
        snap = await getDocs(collection(database, userPath));
      }
    }

    snap.forEach(docSnap => {
      const key = idToKey(docSnap.id);
      if (key === '__admin__') return;
      const val = docSnap.data()?.value;
      if (val !== undefined) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
      }
    });
  } catch (e) {
    console.warn('[CloudSync] sync failed:', e);
  }
}

// Clear all planner data from localStorage (called on logout / user switch)
export function clearLocalPlannerData(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('planner:v') || key === BULK_DONE_KEY)) {
      keys.push(key);
    }
  }
  keys.forEach(k => localStorage.removeItem(k));
}

// Read all data for a specific user from Firestore (admin panel use)
export async function getUserAllData(uid: string): Promise<Record<string, unknown>> {
  const database = getDb();
  if (!database) return {};
  try {
    const snap = await getDocs(collection(database, `users/${uid}/planner_data`));
    const result: Record<string, unknown> = {};
    snap.forEach(docSnap => {
      result[idToKey(docSnap.id)] = docSnap.data()?.value;
    });
    return result;
  } catch (e) {
    console.warn('[CloudSync] getUserAllData failed:', e);
    return {};
  }
}

// Write a single key to another user's Firestore (admin: assign objectives)
export async function setUserItem(uid: string, key: string, value: unknown): Promise<void> {
  const database = getDb();
  if (!database) return;
  await setDoc(
    doc(database, `users/${uid}/planner_data`, keyToId(key)),
    { value, updatedAt: Date.now() }
  );
}

// ── Admin PIN (legacy single-user mode) ─────────────────────────────────────
const ADMIN_DOC_ID = '__admin__';

export async function getCloudAdminPin(): Promise<string | null> {
  const database = getDb();
  if (!database) return null;
  try {
    const snap = await getDoc(doc(database, LEGACY_COLLECTION, ADMIN_DOC_ID));
    return snap.exists() ? (snap.data()?.pinHash ?? null) : null;
  } catch {
    return null;
  }
}

export function setCloudAdminPin(pinHash: string): void {
  const database = getDb();
  if (!database) return;
  setDoc(doc(database, LEGACY_COLLECTION, ADMIN_DOC_ID), { pinHash, updatedAt: Date.now() }).catch(
    e => console.warn('[CloudSync] setCloudAdminPin failed:', e),
  );
}

// ── Bulk upload (legacy single-user first-time migration) ───────────────────
export async function cloudUploadAll(): Promise<void> {
  const database = getDb();
  if (!database) return;
  const col = dataCollection();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('planner:')) keys.push(key);
    }
    await Promise.all(keys.map(async key => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const value = JSON.parse(raw);
        await setDoc(doc(database, col, keyToId(key)), { value, updatedAt: Date.now() });
      } catch (e) {
        console.warn('[CloudSync] upload failed for key:', key, e);
      }
    }));
    localStorage.setItem(BULK_DONE_KEY, 'true');
  } catch (e) {
    console.warn('[CloudSync] bulk upload failed:', e);
  }
}

export function needsBulkUpload(): boolean {
  return !localStorage.getItem(BULK_DONE_KEY);
}
