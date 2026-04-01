// ============================================
// ANALYTICS.DB.JS — Tenant-scoped Firestore refs
// ============================================

import { db, TENANT_ID } from '../firebase-config.js';
import { collection } from 'firebase/firestore';

export const contributionsRef = () => collection(db, 'tenants', TENANT_ID, 'contributions');
export const membersRef       = () => collection(db, 'tenants', TENANT_ID, 'members');
export const eventsRef        = () => collection(db, 'tenants', TENANT_ID, 'events');
export const pledgesRef       = () => collection(db, 'tenants', TENANT_ID, 'pledges');