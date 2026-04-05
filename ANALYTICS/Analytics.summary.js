// ============================================
// ANALYTICS.SUMMARY.JS — Summary card updates
// ============================================


 function updateSummaryCards(contributions) {
    const total            = contributions.reduce((s, c) => s + c.amount, 0);
    const uniqueMembers    = new Set(contributions.map(c => c.memberName)).size;
    const average          = uniqueMembers > 0 ? Math.round(total / uniqueMembers) : 0;
    const participationPct = analyticsState.members.length > 0
        ? Math.round((uniqueMembers / analyticsState.members.length) * 100) : 0;
    const growth           = calculateGrowthRate(contributions);
    const growthLabel      = `${growth >= 0 ? '+' : ''}${growth}%`;

    setText('analyticsTotal',          `KSh ${total.toLocaleString()}`);
    setText('analyticsMembers',        uniqueMembers);
    setText('analyticsAverage',        `KSh ${average.toLocaleString()}`);
    setText('analyticsMembersPercent', `${participationPct}% participation`);
    setText('analyticsGrowth',         growthLabel);
    setText('analyticsChange',         `${growthLabel} vs last period`);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}