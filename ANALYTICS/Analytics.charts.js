// ============================================
// ANALYTICS.CHARTS.JS — All 5 Chart.js renderers
// ============================================


const KSH_TICK  = value => `KSh ${value.toLocaleString()}`;
const KSH_TIP   = ctx   => `KSh ${ctx.parsed.y.toLocaleString()}`;
const KSH_TIP_X = ctx   => `KSh ${ctx.parsed.x.toLocaleString()}`;

const COLORS = ['#4361ee', '#f72585', '#4cc9f0', '#7209b7', '#06d6a0', '#ffd60a'];

// ── Helper: destroy old chart before re-rendering ─────────────────────────────

function canvas(id) {
    return document.getElementById(id)?.getContext('2d') || null;
}

function destroyAndStore(key, chart) {
    state.charts[key]?.destroy();
    state.charts[key] = chart;
}

// ── 1. Monthly trends (line) ──────────────────────────────────────────────────

 function renderMonthlyTrends(contributions) {
    const monthly = {};
    contributions.forEach(c => {
        const key = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}`;
        monthly[key] = (monthly[key] || 0) + c.amount;
    });

    const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    const labels = sorted.map(([key]) => {
        const [y, m] = key.split('-');
        return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
    });

    const ctx = canvas('monthlyTrendsChart');
    if (!ctx) return;

    destroyAndStore('monthly', new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Monthly Collections (KSh)',
                data: sorted.map(([, v]) => v),
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67,97,238,0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#4361ee'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: KSH_TIP } } },
            scales: { y: { beginAtZero: true, ticks: { callback: KSH_TICK } } }
        }
    }));
}

// ── 2. Category breakdown (doughnut) ─────────────────────────────────────────

 function renderCategoryChart(contributions) {
    const categories = {};
    contributions.forEach(c => {
        const cat = c.category || 'Other';
        categories[cat] = (categories[cat] || 0) + c.amount;
    });

    const ctx = canvas('categoryChart');
    if (!ctx) return;

    destroyAndStore('category', new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: COLORS,
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                            return `${ctx.label}: KSh ${ctx.parsed.toLocaleString()} (${pct}%)`;
                        }
                    }
                }
            }
        }
    }));
}

// ── 3. Top 5 contributors (horizontal bar) ───────────────────────────────────

 function renderTopContributors(contributions) {
    const members = {};
    contributions.forEach(c => {
        members[c.memberName || 'Unknown'] = (members[c.memberName || 'Unknown'] || 0) + c.amount;
    });

    const top5 = Object.entries(members).sort(([, a], [, b]) => b - a).slice(0, 5);
    const ctx  = canvas('topContributorsChart');
    if (!ctx) return;

    destroyAndStore('top', new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top5.map(([name]) => name),
            datasets: [{
                label: 'Total (KSh)',
                data: top5.map(([, v]) => v),
                backgroundColor: '#7209b7',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: KSH_TIP_X } } },
            scales: { x: { beginAtZero: true, ticks: { callback: KSH_TICK } } }
        }
    }));
}

// ── 4. Weekly breakdown (bar) ─────────────────────────────────────────────────

 function renderWeeklyChart(contributions) {
    const weeks = {};
    contributions.forEach(c => {
        const key = `Week ${Math.ceil(c.date.getDate() / 7)}`;
        weeks[key] = (weeks[key] || 0) + c.amount;
    });

    const ctx = canvas('weeklyChart');
    if (!ctx) return;

    destroyAndStore('weekly', new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(weeks),
            datasets: [{
                label: 'Weekly Collections (KSh)',
                data: Object.values(weeks),
                backgroundColor: '#06d6a0',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: KSH_TICK } } }
        }
    }));
}

// ── 5. Participation rate (pie) ───────────────────────────────────────────────

 function renderParticipationChart(contributions) {
    const participating    = new Set(contributions.map(c => c.memberName)).size;
    const total            = state.members.length;
    const notParticipating = Math.max(0, total - participating);

    const ctx = canvas('participationChart');
    if (!ctx) return;

    destroyAndStore('participation', new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Contributing', 'Not Contributing'],
            datasets: [{
                data: [participating, notParticipating],
                backgroundColor: ['#06d6a0', '#e0e0e0'],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    }));
}