// ============================================
// ANALYTICS.DB.JS — Tenant-scoped Firestore refs
// ============================================


 const contributionsRef = () => collection(db, 'tenants', TENANT_ID, 'contributions');
 const membersRef       = () => collection(db, 'tenants', TENANT_ID, 'members');
 const eventsRef        = () => collection(db, 'tenants', TENANT_ID, 'events');
