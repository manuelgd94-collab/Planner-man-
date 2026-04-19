import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

const COLLECTION = 'planner_data';

// Cloud sync is only active when the config has been filled in
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

// Firestore document IDs cannot contain '/' — replace with double underscore
function keyToId(key: string): string {
  return encodeURIComponent(key);
}

function idToKey(id: string): string {
  return decodeURIComponent(id);
}

export function isCloudEnabled(): boolean {
  return configured;
}

// Write a single key to Firestore (fire-and-forget — never blocks the UI)
export function cloudSet(key: string, value: unknown): void {
  const database = getDb();
  if (!database) return;
  setDoc(doc(database, COLLECTION, keyToId(key)), { value, updatedAt: Date.now() }).catch(
    e => console.warn('[CloudSync] write failed:', e),
  );
}

// Pull all planner documents from Firestore into localStorage
// Called once on app startup so viewers see the latest data
export async function cloudSyncToLocal(): Promise<void> {
  const database = getDb();
  if (!database) return;
  try {
    const snap = await getDocs(collection(database, COLLECTION));
    snap.forEach(docSnap => {
      const key = idToKey(docSnap.id);
      const val = docSnap.data()?.value;
      if (val !== undefined) {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch {
          // quota exceeded — ignore
        }
      }
    });
  } catch (e) {
    console.warn('[CloudSync] initial sync failed:', e);
  }
}
