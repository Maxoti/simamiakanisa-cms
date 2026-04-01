// Firebase Configuration for SimamiaKanisa
// Multitenant-ready configuration

const firebaseConfig = {
  apiKey:            "AIzaSyD9_1_qsyvXCEFHwlP3QTsBTSD8tdWiGOY",
  authDomain:        "simamiakanisa.firebaseapp.com",
  projectId:         "simamiakanisa",
  storageBucket:     "simamiakanisa.firebasestorage.app",
  messagingSenderId: "108213015252",
  appId:             "1:108213015252:web:1f8fb3771ca8fcc1102141",
  measurementId:     "G-8PYNMZNY40"
};

// ─── Initialize Firebase ───────────────────────────────────────────────────────
firebase.initializeApp(firebaseConfig);

const auth      = firebase.auth();
const db        = firebase.firestore();
const functions = firebase.functions(); // ✅ needed by auth.js → setTenantClaim

// ─── Tenant Resolution ─────────────────────────────────────────────────────────
// Priority: subdomain → ?tenant= param → sessionStorage → localStorage → "default"

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
    localStorage.setItem("simamia_tenant", param);
    sessionStorage.setItem("tenantId", param); // ✅ survives tab reload
    return param;
  }

  // 3. sessionStorage (written on login by auth.js _setSession)
  const session = sessionStorage.getItem("tenantId");
  if (session) return session;

  // 4. localStorage (remembered from a previous ?tenant= visit)
  const cached = localStorage.getItem("simamia_tenant");
  if (cached) return cached;

  // 5. Fallback
  return "default";
}

const TENANT_ID = resolveTenantId();

// ─── Tenant-scoped Firestore helpers ──────────────────────────────────────────
// ALL reads/writes must go through these — never call db.collection() directly.
//
// Path: tenants/{tenantId}/{collection}/{docId}

const tenantRef = () => db.collection("tenants").doc(TENANT_ID);

const membersCollection        = () => tenantRef().collection("members");
const contributionsCollection  = () => tenantRef().collection("contributions");
const eventsCollection         = () => tenantRef().collection("events");
const pledgesCollection        = () => tenantRef().collection("pledges");          // ✅ added
const pledgePaymentsCollection = () => tenantRef().collection("pledge_payments");  // ✅ added
const analyticsCollection      = () => tenantRef().collection("analytics");        // ✅ added

// ─── Tenant mismatch guard ─────────────────────────────────────────────────────
// Signs out any user whose JWT claim belongs to a different tenant

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const token         = await user.getIdTokenResult();
  const claimedTenant = token.claims.tenantId;

  if (claimedTenant && claimedTenant !== TENANT_ID) {
    console.warn(`Tenant mismatch: user='${claimedTenant}', page='${TENANT_ID}'. Signing out.`);
    await auth.signOut();
    window.location.href = `/login.html?tenant=${claimedTenant}`;
  }
});

console.log(`🏢 Firebase initialized — tenant: "${TENANT_ID}"`);