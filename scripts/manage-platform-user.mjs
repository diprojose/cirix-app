import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Usage: node scripts/manage-platform-user.mjs --email user@example.com (--grant | --revoke) [--operator] --confirm");
  process.exit(0);
}
const emailIndex = args.indexOf("--email");
const email = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : "";
const grant = args.includes("--grant");
const revoke = args.includes("--revoke");
if (!args.includes("--confirm") || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || grant === revoke || (revoke && args.includes("--operator"))) {
  throw new Error("Provide --email, exactly one of --grant/--revoke, and --confirm. Use --operator only with --grant.");
}
nextEnv.loadEnvConfig(process.cwd());
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};
const app = initializeApp({ credential: cert({
  projectId: required("FIREBASE_PROJECT_ID"),
  clientEmail: required("FIREBASE_CLIENT_EMAIL"),
  privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
}) }, "platform-access-admin");
const auth = getAuth(app);
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (error.code !== "auth/user-not-found" || !grant) throw error;
  // Google verifies email ownership on first sign-in; this is not a public signup.
  user = await auth.createUser({ email });
}
if (grant && user.disabled) throw new Error("This account is disabled. Review it in Firebase before granting access.");
const claims = { ...user.customClaims, platformAccess: grant };
if (grant && args.includes("--operator")) claims.operator = true;
await auth.setCustomUserClaims(user.uid, claims);
if (revoke) await auth.revokeRefreshTokens(user.uid);
console.log(`${grant ? "Granted" : "Revoked"} platform access for ${email} (${user.uid}).`);
