// Firebase Configuration for SimamiaKanisa
// Multitenant-ready configuration

const firebaseConfig = {
  apiKey: "AIzaSyD9_1_qsyvXCEFHwlP3QTsBTSD8tdWiGOY",
  authDomain: "simamiakanisa.firebaseapp.com",
  projectId: "simamiakanisa",
  storageBucket: "simamiakanisa.firebasestorage.app",
  messagingSenderId: "108213015252",
  appId: "1:108213015252:web:1f8fb3771ca8fcc1102141",
  measurementId: "G-8PYNMZNY40"
};

// ─── Initialize Firebase ───────────────────────────────────────────────────────
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

// ─── Tenant Resolution ─────────────────────────────────────────────────────────
// Priority: subdomain → ?tenant= query param → localStorage → "default"
// e.g. gracefellowship.simamiakanisa.web.app  →  tenantId = "gracefellowship"

function resolveTenantId() {
  const host    = window.location.hostname;
  const parts   = host.split(".");
  const isLocal = host === "localhost" || host === "127.0.0.1";

  // 1. Subdomain (production): gracefellowship.simamiakanisa.web.app
  if (!isLocal && parts.length > 2) {
    const sub = parts[0];
    if (sub && sub !== "www") return sub;
  }

  // 2. Query param (dev / invite links): ?tenant=gracefellowship
  const param = new URLSearchParams(window.location.search).get("tenant");
  if (param) {
    localStorage.setItem("simamia_tenant", param);   // remember it
    return param;
  }

  // 3. Remembered from a previous param visit
  const cached = localStorage.getItem("simamia_tenant");
  if (cached) return cached;

  // 4. Fallback (your own admin / local dev)
  return "default";
}

const TENANT_ID = resolveTenantId();

// ─── Tenant-scoped Firestore helpers ──────────────────────────────────────────
// ALL reads/writes must go through these — never use db.collection() directly.
//
// Firestore path:  tenants/{tenantId}/members/{uid}
//                  tenants/{tenantId}/contributions/{id}
//                  tenants/{tenantId}/events/{id}

const tenantRef = () => db.collection("tenants").doc(TENANT_ID);

const membersCollection       = () => tenantRef().collection("members");
const contributionsCollection = () => tenantRef().collection("contributions");
const eventsCollection        = () => tenantRef().collection("events");


// ─── Guard: abort if the signed-in user doesn't belong to this tenant ─────────
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const token = await user.getIdTokenResult();
  const claimedTenant = token.claims.tenantId;

  // If a claim exists and doesn't match the current tenant, sign them out
  if (claimedTenant && claimedTenant !== TENANT_ID) {
    console.warn(`Tenant mismatch: user belongs to '${claimedTenant}', page is '${TENANT_ID}'. Signing out.`);
    await auth.signOut();
    window.location.href = `/login.html?tenant=${claimedTenant}`;
  }
});

console.log(` Firebase initialized — tenant: "${TENANT_ID}"`);

// ─── Exports (used by auth.js, pledges.js, analytics.js, main.js) ─────────────
// Replace every db.collection("members") call in your other files with:
//   membersCollection()         ← note the ()
//   contributionsCollection()
//   eventsCollection()