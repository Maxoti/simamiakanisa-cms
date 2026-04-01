// ============================================
// ANALYTICS.STATE.JS — Shared in-memory state
// ============================================

export const state = {
    contributions: [],
    members:       [],
    events:        [],
    charts:        {},       // keyed by chart name; destroyed before re-render
    initialized:   false
};