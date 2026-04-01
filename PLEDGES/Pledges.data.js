// ============================================
// PLEDGES.DATA.JS — Firebase load + status logic
// ============================================

import { getDocs, orderBy, query, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { pledgesRef, paymentsRef, pledgeDoc } from '../pledges.db.js';
import { state } from './pledges.state.js';
import { updatePledgeStats } from './pledges.stats.js';
import { renderPledgesTable } from './pledges.table.js';
import { showPledgeError } from './pledges.ui.js';

// ── Load all pledges + payments for this tenant ──────────────────────────────

export async function loadPledgesData() {
    try {
        console.log(' Loading pledges from Firebase...');

        const [pledgesSnap, paymentsSnap] = await Promise.all([
            getDocs(query(pledgesRef(), orderBy('createdAt', 'desc'))),
            getDocs(query(paymentsRef(), orderBy('createdAt', 'desc')))
        ]);

        const today = new Date().toISOString().split('T')[0];

        state.pledges = pledgesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startDate: doc.data().startDate || today,
            endDate:   doc.data().endDate   || today
        }));

        state.pledgePayments = paymentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Loaded: ${state.pledges.length} pledges, ${state.pledgePayments.length} payments`);

        state.reset();
        updateAllPledgeStatuses();
        updatePledgeStats();
        renderPledgesTable();

    } catch (error) {
        console.error(' Error loading pledges:', error);
        showPledgeError('Failed to load pledges. Check console for details.');
    }
}

// ── Derive status from dates + amounts ───────────────────────────────────────

export function updateAllPledgeStatuses() {
    const today = new Date();
    state.pledges.forEach(pledge => {
        if (pledge.remainingAmount <= 0) {
            pledge.status = 'Completed';
        } else if (today > new Date(pledge.endDate)) {
            pledge.status = 'Overdue';
        } else {
            pledge.status = 'Active';
        }
    });
}

// ── Create a new pledge ───────────────────────────────────────────────────────

export async function createPledge({ memberId, memberName, category, amount, startDate, endDate, frequency, notes }) {
    await addDoc(pledgesRef(), {
        memberId,
        memberName,
        category,
        totalAmount:     amount,
        paidAmount:      0,
        remainingAmount: amount,
        startDate,
        endDate,
        status:           'Active',
        paymentFrequency: frequency,
        notes:            notes || '',
        createdAt:        serverTimestamp()
    });
}

// ── Record a payment against a pledge ────────────────────────────────────────

export async function recordPayment(pledge, { amount, date, method, reference, notes }) {
    await addDoc(paymentsRef(), {
        pledgeId:      pledge.id,
        memberId:      pledge.memberId,
        memberName:    pledge.memberName,
        amount,
        paymentDate:   date,
        paymentMethod: method,
        reference:     reference || '',
        notes:         notes     || '',
        createdAt:     serverTimestamp()
    });

    const newPaid      = pledge.paidAmount + amount;
    const newRemaining = pledge.totalAmount - newPaid;
    await updateDoc(pledgeDoc(pledge.id), {
        paidAmount:      newPaid,
        remainingAmount: newRemaining,
        status:          newRemaining <= 0 ? 'Completed' : pledge.status
    });
}