// ============================================
// PLEDGES.DB.JS — Tenant-scoped Firestore refs
// ============================================

import { db, TENANT_ID } from '../firebase-config.js';
import { collection, doc } from 'firebase/firestore';

// All pledge data lives under tenants/{tenantId}/
export const pledgesRef     = () => collection(db, 'tenants', TENANT_ID, 'pledges');
export const paymentsRef    = () => collection(db, 'tenants', TENANT_ID, 'pledge_payments');
export const pledgeDoc      = (id) => doc(db, 'tenants', TENANT_ID, 'pledges', id);
export const paymentDoc     = (id) => doc(db, 'tenants', TENANT_ID, 'pledge_payments', id);