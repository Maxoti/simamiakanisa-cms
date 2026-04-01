// ============================================
// PLEDGES.JS — Entry point (orchestrator only)
// ============================================
//
// Module map:
//   pledges.db.js      → tenant-scoped Firestore refs
//   pledges.state.js   → shared in-memory state
//   pledges.data.js    → Firebase load, create, recordPayment
//   pledges.stats.js   → summary stat card updates
//   pledges.table.js   → table render + pagination
//   pledges.modals.js  → create / pay / history modals
//   pledges.ui.js      → layout HTML, export CSV, WhatsApp, errors
//
// Load order in index.html:
//   pledges.db.js → pledges.state.js → pledges.stats.js →
//   pledges.table.js → pledges.ui.js → pledges.modals.js →
//   pledges.data.js → pledges.js  (this file, always last)

console.log(' Pledges.js loading...');

// ── Tab initialiser ───────────────────────────────────────────────────────────

async function renderPledgesTab() {
    console.log(' Pledges tab opened!');

    if (typeof db === 'undefined') {
        showPledgeError('Database not connected. Please reload the page.');
        return;
    }

    if (!pledgeState.initialized) {
        pledgeState.initialized = true;
    }

    buildPledgesHTML();
    await loadPledgesData();
}

console.log('✅ Pledges module loaded successfully!');