import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/*
 * Firebase Admin bootstrap. This is the only module that reads the service
 * account credentials and initialises the privileged server-side SDK. It lives
 * in the shared kernel's infrastructure because several bounded contexts (iam,
 * ordering, …) back their adapters with the same Firebase project — nothing in
 * any domain/ or application/ layer imports it. Kept as a lazily-initialised
 * singleton so the app is created once per server runtime and reused across
 * requests (and never re-created on hot reload).
 */

const APP_NAME = "mixmag-admin";

/** Reads a required environment variable, failing loudly when it is missing. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Set it in .env.local (see .env.example).`
    );
  }
  return value;
}

/** Returns the shared Admin app, initialising it on first use. */
function adminApp(): App {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) {
    return existing;
  }

  return initializeApp(
    {
      credential: cert({
        projectId: requireEnv("FIREBASE_PROJECT_ID"),
        clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
        // The private key is stored with escaped newlines in the env file.
        privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    },
    APP_NAME
  );
}

/** The Admin Auth service, backed by the shared Admin app. */
export function adminAuth(): Auth {
  return getAuth(adminApp());
}

/** The Admin Firestore service, backed by the shared Admin app. */
export function adminFirestore(): Firestore {
  return getFirestore(adminApp());
}
