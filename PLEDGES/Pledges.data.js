// ============================================
// PLEDGES.DATA.JS — Firebase load + status logic
// ============================================
// Depends on (loaded before this in index.html):
//   firebase-config.js  → db, TENANT_ID
//   pledges.db.js       → pledgesRef(), paymentsRef(), pledgeDoc()
//   pledges.state.js    → pledgeState
//   pledges.stats.js    → updatePledgeStats()
//   pledges.table.js    → renderPledgesTable()
//   pledges.ui.js       → showPledgeError()

// ── Load all pledges + payments for this tenant ───────────────────────────────

async function loadPledgesData() {
    try {
        console.log(' Loading pledges from Firebase...');

        const [pledgesSnap, paymentsSnap] = await Promise.all([
            pledgesRef().orderBy('createdAt', 'desc').get(),
            paymentsRef().orderBy('createdAt', 'desc').get()
        ]);

        const today = new Date().toISOString().split('T')[0];

        pledgeState.pledges = pledgesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startDate: doc.data().startDate || today,
            endDate:   doc.data().endDate   || today
        }));

        pledgeState.pledgePayments = paymentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Loaded: ${pledgeState.pledges.length} pledges, ${pledgeState.pledgePayments.length} payments`);

        pledgeState.reset();
        updateAllPledgeStatuses();
        updatePledgeStats();
        renderPledgesTable();

    } catch (error) {
        console.error('❌ Error loading pledges:', error);
        showPledgeError('Failed to load pledges. Check console for details.');
    }
}

// ── Derive status from dates + amounts ───────────────────────────────────────

function updateAllPledgeStatuses() {
    const today = new Date();
    pledgeState.pledges.forEach(pledge => {
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

async function createPledge({ memberId, memberName, category, amount, startDate, endDate, frequency, notes }) {
    await pledgesRef().add({
        memberId,
        memberName,
        category,
        totalAmount:      amount,
        paidAmount:       0,
        remainingAmount:  amount,
        startDate,
        endDate,
        status:           'Active',
        paymentFrequency: frequency,
        notes:            notes || '',
        tenantId:         TENANT_ID,
        createdAt:        firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ── Record a payment against a pledge ────────────────────────────────────────

async function recordPayment(pledge, { amount, date, method, reference, notes }) {
    await paymentsRef().add({
        pledgeId:      pledge.id,
        memberId:      pledge.memberId,
        memberName:    pledge.memberName,
        amount,
        paymentDate:   date,
        paymentMethod: method,
        reference:     reference || '',
        notes:         notes     || '',
        tenantId:      TENANT_ID,
        createdAt:     firebase.firestore.FieldValue.serverTimestamp()
    });

    const newPaid      = pledge.paidAmount + amount;
    const newRemaining = pledge.totalAmount - newPaid;

    await pledgeDoc(pledge.id).update({
        paidAmount:      newPaid,
        remainingAmount: newRemaining,
        status:          newRemaining <= 0 ? 'Completed' : pledge.status
    });
}