// ============================================
// PLEDGES.DB.JS — Tenant-scoped Firestore refs
// ============================================
// Depends on: firebase-config.js  (db, TENANT_ID — already globals)

const pledgesRef  = () => db.collection('tenants').doc(TENANT_ID).collection('pledges');
const paymentsRef = () => db.collection('tenants').doc(TENANT_ID).collection('pledge_payments');
const pledgeDoc   = (id) => db.collection('tenants').doc(TENANT_ID).collection('pledges').doc(id);
const paymentDoc  = (id) => db.collection('tenants').doc(TENANT_ID).collection('pledge_payments').doc(id);