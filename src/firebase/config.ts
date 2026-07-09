/**
 * Firebase client configuration.
 *
 * These keys are the public project identifiers (apiKey, appId, …). They are NOT
 * secrets: they only name the Firebase project. What protects the data is the
 * Firestore security rules (see backend/firestore.rules) plus anonymous auth —
 * not the secrecy of these values. Safe to commit and ship in the app bundle.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBYKXDePIQXZ-rgN0bMCeuKD5LriQAvYMk',
  authDomain: 'vantage-chronicle.firebaseapp.com',
  projectId: 'vantage-chronicle',
  storageBucket: 'vantage-chronicle.firebasestorage.app',
  messagingSenderId: '457070308262',
  appId: '1:457070308262:web:d031902f1132bb27e0fd67',
} as const;
