// ============================================
// ANALYTICS.DATA.JS — Filtering + growth logic
// ============================================


// ── Load global arrays into analytics state ───────────────────────────────────
// Global `members`, `contributions`, `events` are populated by the main app.

 async function loadFromGlobals() {
    state.members = [...(window.members || [])];
    state.events  = [...(window.events  || [])];

    state.contributions = (window.contributions || []).map(c => ({
        ...c,
        date:       c.date instanceof Date ? c.date : new Date(c.date),
        category:   c.category   || c.type   || 'Other',
        memberName: c.memberName || c.member  || 'Unknown',
        amount:     parseFloat(c.amount) || 0
    }));
}

// ── Period filter ─────────────────────────────────────────────────────────────

async function filterByPeriod(contributions, period, year) {
    const selectedYear = parseInt(year);
    const now          = new Date();

    return contributions.filter(c => {
        const d = c.date;
        if (period === 'year')    return d.getFullYear() === selectedYear;
        if (period === 'month')   return d.getFullYear() === selectedYear && d.getMonth() === now.getMonth();
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
    const firstSum = sorted.slice(0, mid).reduce((s, c) => s + c.amount, 0);
    const lastSum  = sorted.slice(mid).reduce((s, c)  => s + c.amount, 0);

    return firstSum === 0 ? 0 : Math.round(((lastSum - firstSum) / firstSum) * 100);
}

// ── Year range helpers ────────────────────────────────────────────────────────

function getEarliestYear() {
    let earliest = new Date().getFullYear();

    state.contributions.forEach(c => {
        const y = c.date.getFullYear();
        if (y < earliest) earliest = y;
    });

    (window.pledges || []).forEach(p => {
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