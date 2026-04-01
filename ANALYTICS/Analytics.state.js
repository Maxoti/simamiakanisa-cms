// ============================================
// ANALYTICS.STATE.JS — Shared in-memory state
// ============================================

 const state = {
    contributions: [],
    members:       [],
    events:        [],
    charts:        {},       // keyed by chart name; destroyed before re-render
    initialized:   false
};