// ============================================
// ANALYTICS.JS — Entry point (orchestrator only)
// ============================================
//
// Module map:
//   analytics.db.js      → tenant-scoped Firestore refs (TENANT_ID isolation)
//   analytics.state.js   → shared in-memory state + chart registry
//   analytics.data.js    → load from globals, period filter, growth, year range
//   analytics.summary.js → summary card DOM updates
//   analytics.charts.js  → all 5 Chart.js renderers
//   analytics.export.js  → CSV + PDF export
//   analytics.ui.js      → layout HTML builder + error display
//
// All Firestore reads use tenants/{TENANT_ID}/... — enforced in analytics.db.js.

console.log(' Analytics.js loading...');

// ── Tab initialiser ───────────────────────────────────────────────────────────

async function initAnalyticsTab() {
    console.log('✅ Analytics tab opened!');

    if (typeof window.members === 'undefined' || typeof window.contributions === 'undefined') {
        showError('Data not loaded. Please reload the page.');
        return;
    }

    loadFromGlobals();
    console.log(' Data loaded:', {
        members:       state.members.length,
        contributions: state.contributions.length,
        events:        state.events.length
    });

    buildAnalyticsHTML();
    updateAnalytics();
    state.initialized = true;
}

// ── Refresh all charts + cards (called by period/year dropdowns) ──────────────

async function updateAnalytics() {
    console.log(' Updating analytics...');

    const period = document.getElementById('periodSelect')?.value || 'year';
    const year   = document.getElementById('yearSelect')?.value   || new Date().getFullYear();
    const data   = filterByPeriod(state.contributions, period, year);

    console.log(` Filtered: ${data.length} contributions`);

    updateSummaryCards(data);

    if (typeof Chart === 'undefined') {
        console.error(' Chart.js not loaded!');
        alert('Chart.js not loaded. Please check your internet connection and reload.');
        return;
    }

    renderMonthlyTrends(data);
    renderCategoryChart(data);
    renderTopContributors(data);
    renderWeeklyChart(data);
    renderParticipationChart(data);
}

// ── Expose to inline HTML onclick handlers ────────────────────────────────────

Object.assign(window, {
    initAnalyticsTab,
    updateAnalytics,
    exportToExcel,
    exportToPDF
});

console.log(' Analytics.js loaded successfully!');