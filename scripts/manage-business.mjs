import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

/*
 * Administrator tool to register businesses and their team. It writes the same
 * documents as FirestoreBusinessRepository / FirestoreMembershipRepository
 * (core/tenancy): `businesses`, `business_slugs` and `business_members`. The
 * rules below mirror the domain; test/tenancy-script.test.ts keeps them in sync.
 *
 * Run it from a trusted environment: it writes to the Firebase project in .env.local.
 */

const USAGE = `Usage:
  node scripts/manage-business.mjs create --name "Cafe Luna" --slug cafe-luna --kind restaurant --owner owner@example.com --confirm
  node scripts/manage-business.mjs add-member --slug cafe-luna --email person@example.com --role staff|owner --confirm
  node scripts/manage-business.mjs list

Kinds: supermarket | restaurant | other.  Roles: owner | staff.
Owners and members are signed in with Google or an emailed link; their email is
pre-registered here so the same account is recognized on first sign-in.`;

const KINDS = ["supermarket", "restaurant", "other"];
const ROLES = ["owner", "staff"];
const RESERVED = [
  "admin", "api", "app", "b", "biz", "me", "login", "logout", "es", "en", "www",
  "demo", "zoho", "pixels", "reviews", "review", "make-a-review", "calls", "n8n",
  "loyalty", "cart", "checkout", "orders", "ai-support", "static", "assets",
];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const args = process.argv.slice(2);
const command = args[0];
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1]?.trim() : undefined;
};
const fail = (message) => {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(1);
};

if (!command || args.includes("--help")) {
  console.log(USAGE);
  process.exit(0);
}
if (!["create", "add-member", "list"].includes(command)) fail(`Unknown command "${command}".`);
if (command !== "list" && !args.includes("--confirm")) fail("Add --confirm to write to Firebase.");

function validSlug(raw) {
  const slug = (raw ?? "").trim().toLowerCase();
  if (slug.length < 3 || slug.length > 40 || !SLUG_PATTERN.test(slug) || RESERVED.includes(slug)) return null;
  return slug;
}

nextEnv.loadEnvConfig(process.cwd());
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};
const app = initializeApp(
  {
    credential: cert({
      projectId: required("FIREBASE_PROJECT_ID"),
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  },
  "business-admin"
);
const auth = getAuth(app);
const db = getFirestore(app);

async function userByEmail(email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    // Not a public signup: the person verifies this address on first sign-in.
    return auth.createUser({ email });
  }
}

async function saveMembership(businessId, user, email, role) {
  if (user.disabled) throw new Error(`The account ${email} is disabled. Review it in Firebase first.`);
  await db.collection("business_members").doc(`${businessId}_${user.uid}`).set({
    businessId,
    userId: user.uid,
    email,
    role,
    createdAt: new Date().toISOString(),
  });
}

async function businessBySlug(slug) {
  const snapshot = await db.collection("businesses").where("slug", "==", slug).limit(1).get();
  return snapshot.docs[0] ?? null;
}

if (command === "list") {
  const snapshot = await db.collection("businesses").orderBy("createdAt", "desc").limit(200).get();
  if (snapshot.empty) console.log("No businesses yet.");
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`${data.slug.padEnd(24)} ${data.kind.padEnd(12)} ${data.status.padEnd(10)} ${data.name}  (${doc.id})`);
  }
  process.exit(0);
}

if (command === "create") {
  const name = option("name") ?? "";
  const slug = validSlug(option("slug"));
  const kind = option("kind") ?? "";
  const owner = option("owner")?.toLowerCase();
  if (name.length < 2 || name.length > 100) fail("--name must be 2-100 characters.");
  if (!slug) fail("--slug must be 3-40 characters: lowercase letters, digits and single hyphens, and not a reserved word.");
  if (!KINDS.includes(kind)) fail(`--kind must be one of: ${KINDS.join(", ")}.`);
  if (owner && !EMAIL_PATTERN.test(owner)) fail("--owner must be a valid email.");

  const businessId = randomUUID();
  const slugRef = db.collection("business_slugs").doc(slug);
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(slugRef)).exists) throw new Error(`The address "${slug}" is already in use.`);
    transaction.set(slugRef, { businessId });
    transaction.set(db.collection("businesses").doc(businessId), {
      slug,
      name,
      kind,
      status: "active",
      createdAt: new Date().toISOString(),
    });
  });
  if (owner) await saveMembership(businessId, await userByEmail(owner), owner, "owner");
  console.log(`Created "${name}" at /b/${slug} (${businessId})${owner ? `; owner: ${owner}` : ""}.`);
}

if (command === "add-member") {
  const slug = validSlug(option("slug"));
  const email = option("email")?.toLowerCase() ?? "";
  const role = option("role") ?? "";
  if (!slug) fail("--slug is invalid.");
  if (!EMAIL_PATTERN.test(email)) fail("--email must be a valid email.");
  if (!ROLES.includes(role)) fail(`--role must be one of: ${ROLES.join(", ")}.`);
  const business = await businessBySlug(slug);
  if (!business) throw new Error(`No business has the address "${slug}".`);
  await saveMembership(business.id, await userByEmail(email), email, role);
  console.log(`${email} is now ${role} of "${business.data().name}".`);
}
