// ============================================
// ANALYTICS.DATA.JS — Filtering + growth logic
// ============================================
// Depends on: Analytics.state.js (analyticsState)

// ── Load global arrays into analytics state ───────────────────────────────────

function loadFromGlobals() {
    analyticsState.members = Array.isArray(window.members) ? [...window.members] : [];
    analyticsState.events  = Array.isArray(window.events)  ? [...window.events]  : [];

    analyticsState.contributions = (Array.isArray(window.contributions) ? window.contributions : []).map(c => ({
        ...c,
        date:       c.date instanceof Date ? c.date : new Date(c.date),
        category:   c.category   || c.type   || 'Other',
        memberName: c.memberName || c.member  || 'Unknown',
        amount:     parseFloat(c.amount) || 0
    }));
}

// ── Period filter ─────────────────────────────────────────────────────────────

function filterByPeriod(contributions, period, year) {
    const selectedYear = parseInt(year);
    const now          = new Date();

    return contributions.filter(c => {
        const d = c.date instanceof Date ? c.date : new Date(c.date);
        if (period === 'year')    return d.getFullYear() === selectedYear;
        if (period === 'month')   return d.getFullYear() === selectedYear
                                      && d.getMonth()    === now.getMonth();
        if (period === 'quarter') {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - 3);
            return d >= cutoff;
        }
        return true; // 'all'
    });
}

// ── Growth rate (first half vs second half of filtered set) ───────────────────

function calculateGrowthRate(contributions) {
    if (contributions.length < 2) return 0;

    const sorted   = [...contributions].sort((a, b) => a.date - b.date);
    const mid      = Math.floor(sorted.length / 2);
    const firstSum = sorted.slice(0, mid).reduce((s, c) => s + (c.amount || 0), 0);
    const lastSum  = sorted.slice(mid).reduce((s, c)  => s + (c.amount || 0), 0);

    return firstSum === 0 ? 0 : Math.round(((lastSum - firstSum) / firstSum) * 100);
}

// ── Year range helpers ────────────────────────────────────────────────────────

function getEarliestYear() {
    let earliest = new Date().getFullYear();

    analyticsState.contributions.forEach(c => {
        const d = c.date instanceof Date ? c.date : new Date(c.date);
        const y = d.getFullYear();
        if (y < earliest) earliest = y;
    });

    (Array.isArray(window.pledges) ? window.pledges : []).forEach(p => {
        if (p.startDate) {
            const y = new Date(p.startDate).getFullYear();
            if (y < earliest) earliest = y;
        }
    });

    return Math.max(earliest, 2020);
}

function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startYear   = getEarliestYear();

    return Array.from({ length: (currentYear + 10) - startYear + 1 }, (_, i) => {
        const year     = currentYear + 10 - i;
        const selected = year === currentYear ? 'selected' : '';
        return `<option value="${year}" ${selected}>${year}</option>`;
    }).join('');
}