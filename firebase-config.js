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
const functions = firebase.functions();

// ─── Tenant Resolution ─────────────────────────────────────────────────────────
// Priority: ?tenant= param → sessionStorage → localStorage → subdomain → "default"
// Query param is FIRST so ?tenant=deliverance always wins over the hostname

function resolveTenantId() {
  // 1. Query param — highest priority (invite links, direct URLs)
  const param = new URLSearchParams(window.location.search).get("tenant");
  if (param) {
    localStorage.setItem("simamia_tenant",  param);
    sessionStorage.setItem("tenantId",      param);
    return param;
  }

  // 2. sessionStorage (written on login by auth.js _setSession)
  const session = sessionStorage.getItem("tenantId");
  if (session) return session;

  // 3. localStorage (remembered from a previous ?tenant= visit)
  const cached = localStorage.getItem("simamia_tenant");
  if (cached) return cached;

  // 4. Subdomain — only for custom domains like gracefellowship.simamiakanisa.com
  //    NOT for Vercel preview URLs (simamiakanisa-cms.vercel.app)
  const host  = window.location.hostname;
  const parts = host.split(".");
  const isLocal  = host === "localhost" || host === "127.0.0.1";
  const isVercel = host.endsWith(".vercel.app");

  if (!isLocal && !isVercel && parts.length > 2) {
    const sub = parts[0];
    if (sub && sub !== "www") return sub;
  }

  // 5. Fallback
  return "default";
}

const TENANT_ID = resolveTenantId();

// ─── Tenant-scoped Firestore helpers ──────────────────────────────────────────
const tenantRef                = () => db.collection("tenants").doc(TENANT_ID);
const membersCollection        = () => tenantRef().collection("members");
const contributionsCollection  = () => tenantRef().collection("contributions");
const eventsCollection         = () => tenantRef().collection("events");
const pledgesCollection        = () => tenantRef().collection("pledges");
const pledgePaymentsCollection = () => tenantRef().collection("pledge_payments");
const analyticsCollection      = () => tenantRef().collection("analytics");

// ─── Tenant mismatch guard ────────────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const token         = await user.getIdTokenResult();
  const claimedTenant = token.claims.tenantId;

  if (claimedTenant && claimedTenant !== TENANT_ID && TENANT_ID !== "default") {
    console.warn(`Tenant mismatch: user='${claimedTenant}', page='${TENANT_ID}'. Signing out.`);
    await auth.signOut();
    window.location.href = `/login.html?tenant=${claimedTenant}`;
  }
});

console.log(`Firebase initialized — tenant: "${TENANT_ID}"`);