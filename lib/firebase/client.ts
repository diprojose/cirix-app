import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/*
 * Client-side Firebase bootstrap. Uses the public web-app config (safe to ship
 * to the browser) read from NEXT_PUBLIC_* env vars. This module is imported
 * only by client components; the privileged Admin SDK lives server-side in
 * modules/iam/infrastructure/firebase. Initialised once and reused (guarded
 * against Fast Refresh re-initialisation).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** The browser Auth instance. */
export const auth = getAuth(app);

/** Google provider used for the "Continue with Google" sign-in flow. */
export const googleProvider = new GoogleAuthProvider();
