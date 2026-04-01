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
// All data lives under tenants/{TENANT_ID}/ — enforced in pledges.db.js.

console.log('📋 Pledges.js loading...');

import { state }                                                    from './pledges.state.js';
import { loadPledgesData }                                          from '../pledges.data.js';
import { buildPledgesHTML }                                         from './pledges.ui.js';
import { renderPledgesTable, filterPledges,
         changePledgesPerPage, nextPledgesPage,
         previousPledgesPage }                                      from './pledges.table.js';
import { openCreatePledgeModal, createPledgeFromModal,
         openRecordPaymentModal, submitPayment,
         openPaymentHistoryModal, closeModal }                      from './pledges.modals.js';
import { exportPledgesReport, sendPledgeReminder, showPledgeError } from './pledges.ui.js';

// ── Tab initialiser ───────────────────────────────────────────────────────────

export async function renderPledgesTab() {
    console.log('🏁 Pledges tab opened!');

    if (typeof db === 'undefined') {
        showPledgeError('Database not connected. Please reload the page.');
        return;
    }

    if (!state.initialized) {
        state.initialized = true;
    }

    buildPledgesHTML();
    await loadPledgesData();
}

// ── Expose to inline HTML onclick handlers ────────────────────────────────────
// (Required because the HTML uses onclick="..." strings, not addEventListener)

Object.assign(window, {
    renderPledgesTab,
    filterPledges,
    changePledgesPerPage,
    nextPledgesPage,
    previousPledgesPage,
    openCreatePledgeModal,
    createPledgeFromModal,
    openRecordPaymentModal,
    submitPayment,
    openPaymentHistoryModal,
    closeModal,
    exportPledgesReport,
    sendPledgeReminder
});

console.log('✅ Pledges module loaded successfully!');