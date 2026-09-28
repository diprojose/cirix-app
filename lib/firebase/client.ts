import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  initializeAuth,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";

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
} satisfies FirebaseOptions;

export const hasFirebaseClientConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let cachedAuth: Auth | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;

/**
 * Lazily bootstraps the browser SDK so public storefront routes still render
 * when Firebase is intentionally absent in local/demo environments.
 */
export function getFirebaseAuth() {
  if (!hasFirebaseClientConfig) {
    throw new Error(
      "Firebase no está configurado para el inicio de sesión en este entorno."
    );
  }

  if (!cachedAuth || !cachedGoogleProvider) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    // Set persistence before the click: awaiting setPersistence inside the
    // handler can lose Safari's user activation and block the popup.
    cachedAuth = initializeAuth(app, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    cachedGoogleProvider = new GoogleAuthProvider();
  }

  return { auth: cachedAuth, googleProvider: cachedGoogleProvider };
}
