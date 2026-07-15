// Operator script: grants (or revokes) the premium subscription claim.
//
// Usage (loads the server env vars from .env.local):
//   node --env-file=.env.local scripts/grant-premium.mjs <email|uid>
//   node --env-file=.env.local scripts/grant-premium.mjs <email|uid> --revoke
//
// After running, the user's existing session is invalidated so their next
// sign-in mints a fresh session cookie that carries the updated claim.

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable "${name}".`);
    process.exit(1);
  }
  return value;
}

const identifier = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!identifier) {
  console.error(
    "Usage: node --env-file=.env.local scripts/grant-premium.mjs <email|uid> [--revoke]"
  );
  process.exit(1);
}

const app = initializeApp({
  credential: cert({
    projectId: requireEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  }),
});

const auth = getAuth(app);

const user = identifier.includes("@")
  ? await auth.getUserByEmail(identifier)
  : await auth.getUser(identifier);

await auth.setCustomUserClaims(user.uid, { premium: !revoke });
// Invalidate current sessions so the new claim takes effect on next sign-in.
await auth.revokeRefreshTokens(user.uid);

console.log(
  `${revoke ? "Revoked" : "Granted"} premium for ${user.email ?? user.uid}. ` +
    "Ask them to sign out and sign in again."
);
process.exit(0);
