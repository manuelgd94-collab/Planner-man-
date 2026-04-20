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
import { firebaseConfig } from './firebaseConfig';

const COLLECTION = 'planner_data';
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
  setDoc(doc(database, COLLECTION, keyToId(key)), { value, updatedAt: Date.now() }).catch(
    e => console.warn('[CloudSync] write failed:', e),
  );
}

// Pull all Firestore documents into localStorage (for readers)
export async function cloudSyncToLocal(): Promise<void> {
  const database = getDb();
  if (!database) return;
  try {
    const snap = await getDocs(collection(database, COLLECTION));
    snap.forEach(docSnap => {
      const key = idToKey(docSnap.id);
      const val = docSnap.data()?.value;
      if (val !== undefined) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
      }
    });
  } catch (e) {
    console.warn('[CloudSync] sync failed:', e);
  }
}

// Upload ALL existing localStorage planner keys to Firestore (owner, first time)
export async function cloudUploadAll(): Promise<void> {
  const database = getDb();
  if (!database) return;
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
        await setDoc(doc(database, COLLECTION, keyToId(key)), { value, updatedAt: Date.now() });
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

// ── Admin PIN in cloud ──────────────────────────────────────────────────────
// Stored as a special document so other devices can verify before allowing edits.
const ADMIN_DOC_ID = '__admin__';

export async function getCloudAdminPin(): Promise<string | null> {
  const database = getDb();
  if (!database) return null;
  try {
    const snap = await getDoc(doc(database, COLLECTION, ADMIN_DOC_ID));
    return snap.exists() ? (snap.data()?.pinHash ?? null) : null;
  } catch {
    return null;
  }
}

export function setCloudAdminPin(pinHash: string): void {
  const database = getDb();
  if (!database) return;
  setDoc(doc(database, COLLECTION, ADMIN_DOC_ID), { pinHash, updatedAt: Date.now() }).catch(
    e => console.warn('[CloudSync] setCloudAdminPin failed:', e),
  );
}
