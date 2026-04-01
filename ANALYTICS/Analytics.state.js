// ============================================
// ANALYTICS.STATE.JS — Shared in-memory state
// ============================================

 const Analyticsstate = {
    contributions: [],
    members:       [],
    events:        [],
    charts:        {},       // keyed by chart name; destroyed before re-render
    initialized:   false
};