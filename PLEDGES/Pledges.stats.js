// ============================================
// PLEDGES.STATS.JS — Summary card updates
// ============================================

function updatePledgeStats() {
    const { pledges } = pledgeState;

    const total          = pledges.reduce((s, p) => s + (p.totalAmount     || 0), 0);
    const paid           = pledges.reduce((s, p) => s + (p.paidAmount      || 0), 0);
    const remaining      = pledges.reduce((s, p) => s + (p.remainingAmount || 0), 0);
    const active         = pledges.filter(p => p.status === 'Active').length;
    const overdue        = pledges.filter(p => p.status === 'Overdue').length;
    const completionRate = total > 0 ? Math.round((paid / total) * 100) : 0;

    setText('totalPledged',   `KSh ${total.toLocaleString()}`);
    setText('totalPaid',      `KSh ${paid.toLocaleString()}`);
    setText('totalRemaining', `KSh ${remaining.toLocaleString()}`);
    setText('overduePledges', overdue);
    setText('completionRate', `${completionRate}% completion`);
    setText('activePledges',  `${active} active pledges`);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}