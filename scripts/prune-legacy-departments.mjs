/**
 * One-off migration for the grocery pivot.
 *
 * The catalog is backed by Firestore, and the seed only fills an *empty*
 * collection, so the three dessert documents written before the pivot are still
 * stored with `department: "postres"`. `Department.create` no longer accepts
 * that value, and the product mapper throws on a document it cannot restore,
 * which takes the whole storefront down with a 500.
 *
 * This deletes only the documents whose department is no longer a valid member
 * of the domain's closed set. It never touches valid products.
 *
 * Dry run (default, writes nothing):  node scripts/prune-legacy-departments.mjs
 * Apply:                              node scripts/prune-legacy-departments.mjs --apply
 */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COLLECTION = "products";
// Mirrors DepartmentName in modules/catalog/domain/value-objects/department.ts
const VALID_DEPARTMENTS = new Set(["supermercado"]);
const APPLY = process.argv.includes("--apply");

/** Minimal .env.local reader so the script needs no extra dependency. */
function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[match[1]] ??= value;
  }
}

loadEnv();
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();
const snapshot = await db.collection(COLLECTION).get();

const stale = snapshot.docs.filter((doc) => !VALID_DEPARTMENTS.has(doc.data().department));

console.log(`${snapshot.size} products in "${COLLECTION}".`);
if (stale.length === 0) {
  console.log("Nothing to prune: every product has a valid department.");
  process.exit(0);
}

console.log(`\n${stale.length} with a department outside the domain's set:`);
for (const doc of stale) {
  const data = doc.data();
  console.log(`  - ${doc.id}  "${data.name}"  department="${data.department}"`);
}

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to delete these documents.");
  process.exit(0);
}

const batch = db.batch();
for (const doc of stale) batch.delete(doc.ref);
await batch.commit();
console.log(`\nDeleted ${stale.length} document(s).`);
