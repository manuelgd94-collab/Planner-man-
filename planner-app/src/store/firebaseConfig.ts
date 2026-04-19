// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (free Spark plan is enough)
// 3. Add a Web app (</> icon in Project Overview)
// 4. Enable Firestore: Build → Firestore Database → Create database (Start in test mode)
// 5. Copy your config values below, replacing each "YOUR_..." placeholder
// ─────────────────────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};
