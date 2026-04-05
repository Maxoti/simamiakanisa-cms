// ============================================
// PLEDGES.UI.JS — Layout, export, WhatsApp, error
// ============================================

function buildPledgesHTML() {
    const container = document.querySelector('.pledges-container');
    if (!container) { console.error(' Pledges container not found!'); return; }

    container.innerHTML = `
        <div class="pledges-header">
            <h1 class="pledges-title">Pledges Management</h1>
            <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" onclick="exportPledgesReport()">Export CSV</button>
                <button class="btn btn-primary"   onclick="openCreatePledgeModal()">+ New Pledge</button>
            </div>
        </div>

        <div class="pledges-summary">
            <div class="pledge-stat-card purple">
                <h4>Total Pledged</h4>
                <div class="value" id="totalPledged">KSh 0</div>
                <div class="subtitle">across all pledges</div>
            </div>
            <div class="pledge-stat-card green">
                <h4>Total Paid</h4>
                <div class="value" id="totalPaid">KSh 0</div>
                <div class="subtitle" id="completionRate">0% completion</div>
            </div>
            <div class="pledge-stat-card orange">
                <h4>Remaining</h4>
                <div class="value" id="totalRemaining">KSh 0</div>
                <div class="subtitle" id="activePledges">0 active pledges</div>
            </div>
            <div class="pledge-stat-card red">
                <h4>Overdue</h4>
                <div class="value" id="overduePledges">0</div>
                <div class="subtitle">need attention</div>
            </div>
        </div>

        <div class="pledges-filters">
            <select id="pledgeStatusFilter" onchange="filterPledges()">
                <option value="all">All Pledges</option>
                <option value="Active">Active Only</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
            </select>
            <select id="pledgeCategoryFilter" onchange="filterPledges()">
                <option value="all">All Categories</option>
                <option value="Building Fund">Building Fund</option>
                <option value="Mission">Mission</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
            </select>
        </div>

        <div class="pagination-wrapper" style="margin-bottom:20px">
            <div class="items-per-page">
                <label>Show:</label>
                <select id="pledgesPerPageSelect" onchange="changePledgesPerPage()">
                    <option value="10">10</option>
                    <option value="20" selected>20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>
                <span style="margin-left:auto;color:#6b7280;font-size:13px">
                    Total: <span id="pledgesTotalCount">0</span>
                </span>
            </div>
            <div class="pagination-controls">
                <button id="pledgesPrevBtn" onclick="previousPledgesPage()">← Previous</button>
                <span class="page-info" id="pledgesPageInfo">Page 1 of 1</span>
                <button id="pledgesNextBtn" onclick="nextPledgesPage()">Next →</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3 class="card-title">All Pledges</h3></div>
            <div id="pledgesTable">
                <div class="loading-spinner"><div class="spinner"></div><p>Loading pledges...</p></div>
            </div>
        </div>

        <!-- ══ CREATE PLEDGE MODAL ══════════════════════════════════════ -->
        <div id="createPledgeModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">New Pledge</div>
                <div class="form-group">
                    <label class="form-label">Member *</label>
                    <select class="form-input" id="pledgeMemberSelect">
                        <option value="">Select Member</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Category *</label>
                    <select class="form-input" id="pledgeCategory">
                        <option>Building Fund</option>
                        <option>Mission</option>
                        <option>Equipment</option>
                        <option>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Amount (KSh) *</label>
                    <input type="number" class="form-input" id="pledgeAmount" min="0" placeholder="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Start Date *</label>
                    <input type="date" class="form-input" id="pledgeStartDate">
                </div>
                <div class="form-group">
                    <label class="form-label">End Date *</label>
                    <input type="date" class="form-input" id="pledgeEndDate">
                </div>
                <div class="form-group">
                    <label class="form-label">Payment Frequency</label>
                    <select class="form-input" id="pledgeFrequency">
                        <option>Monthly</option>
                        <option>Weekly</option>
                        <option>Quarterly</option>
                        <option>One-time</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-input" id="pledgeNotes" rows="2" placeholder="Optional notes..."></textarea>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="closeModal('createPledgeModal')">Cancel</button>
                    <button class="btn btn-primary"   onclick="createPledgeFromModal()">Create Pledge</button>
                </div>
            </div>
        </div>

        <!-- ══ RECORD PAYMENT MODAL ═════════════════════════════════════ -->
        <div id="recordPaymentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">Record Payment</div>
                <div style="background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:15px">
                    <div style="font-weight:600" id="paymentPledgeMember"></div>
                    <div style="font-size:13px;color:#6b7280;margin-top:2px" id="paymentPledgeCategory"></div>
                    <div style="display:flex;gap:20px;font-size:13px;margin-top:8px">
                        <span>Total: <strong id="paymentPledgeTotal"></strong></span>
                        <span>Remaining: <strong id="paymentPledgeRemaining"></strong></span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Amount (KSh) *</label>
                    <input type="number" class="form-input" id="paymentAmount" min="0" placeholder="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Payment Date *</label>
                    <input type="date" class="form-input" id="paymentDate">
                </div>
                <div class="form-group">
                    <label class="form-label">Payment Method</label>
                    <select class="form-input" id="paymentMethod">
                        <option>M-Pesa</option>
                        <option>Cash</option>
                        <option>Bank Transfer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Reference / Transaction ID</label>
                    <input type="text" class="form-input" id="paymentReference" placeholder="e.g. QJK7X2...">
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-input" id="paymentNotes" rows="2"></textarea>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="closeModal('recordPaymentModal')">Cancel</button>
                    <button class="btn btn-success"   onclick="submitPayment()">Record Payment</button>
                </div>
            </div>
        </div>

        <!-- ══ PAYMENT HISTORY MODAL ════════════════════════════════════ -->
        <div id="paymentHistoryModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">Payment History</div>
                <div style="background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:15px">
                    <div style="font-weight:600" id="historyPledgeMember"></div>
                    <div style="display:flex;gap:20px;font-size:13px;margin-top:8px;flex-wrap:wrap">
                        <span>Total: <strong id="historyPledgeTotal"></strong></span>
                        <span>Paid: <strong id="historyPledgePaid"></strong></span>
                        <span>Remaining: <strong id="historyPledgeRemaining"></strong></span>
                    </div>
                </div>
                <div id="paymentsListContainer">
                    <p style="text-align:center;color:#6b7280;padding:20px">No payments recorded yet.</p>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="closeModal('paymentHistoryModal')">Close</button>
                </div>
            </div>
        </div>
    `;
}

// ── Modal helpers (used by Pledges.modals.js) ─────────────────────────────────

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function clearField(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportPledgesReport() {
    const { pledges, pagination } = pledgeState;
    const data = pagination.filteredPledges.length ? pagination.filteredPledges : pledges;

    if (!data.length) { alert('No pledges to export'); return; }

    const headers = 'Member,Category,Total Amount,Paid Amount,Remaining Amount,Progress,Status,Start Date,End Date,Payment Frequency\n';
    const rows = data.map(p => {
        const progress = p.totalAmount > 0 ? Math.round((p.paidAmount / p.totalAmount) * 100) : 0;
        return [p.memberName, p.category, p.totalAmount, p.paidAmount, p.remainingAmount,
                `${progress}%`, p.status, p.startDate, p.endDate, p.paymentFrequency]
            .map(f => `"${f ?? ''}"`).join(',');
    }).join('\n');

    const totalPledged   = data.reduce((s, p) => s + p.totalAmount,     0);
    const totalPaid      = data.reduce((s, p) => s + p.paidAmount,      0);
    const totalRemaining = data.reduce((s, p) => s + p.remainingAmount, 0);
    const overallPct     = totalPledged > 0 ? Math.round((totalPaid / totalPledged) * 100) : 0;
    const summary        = `\n"TOTAL","",${totalPledged},${totalPaid},${totalRemaining},"${overallPct}%","","","",""`;

    const blob = new Blob([headers + rows + summary], { type: 'text/csv;charset=utf-8;' });
    const link = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: `pledges_report_${new Date().toISOString().split('T')[0]}.csv`,
        style:    'visibility:hidden'
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    alert(`✅ ${data.length} pledges exported successfully!`);
}

// ── WhatsApp reminder ─────────────────────────────────────────────────────────

function sendPledgeReminder(pledgeId) {
    const pledge = pledgeState.pledges.find(p => p.id === pledgeId);
    if (!pledge) return;

    const member = (window.members || []).find(m => m.name === pledge.memberName);
    if (!member) { alert('Member phone number not found!'); return; }

    let phone = member.phone.replace(/\D/g, '');
    if (phone.startsWith('0'))         phone = '254' + phone.slice(1);
    else if (!phone.startsWith('254')) phone = '254' + phone;

    const message =
` *Pledge Reminder*

Dear ${pledge.memberName},

This is a friendly reminder about your ${pledge.category} pledge.

*Pledge Details:*
Total Amount: KSh ${pledge.totalAmount.toLocaleString()}
Paid So Far:  KSh ${pledge.paidAmount.toLocaleString()}
Balance:      KSh ${pledge.remainingAmount.toLocaleString()}
Due Date:     ${pledge.endDate}

*Payment Options:*
 M-Pesa: [Your Paybill]
 Bank: [Your Account]
Cash: During service

Thank you for your commitment!
SimamiaKanisa Church`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ── Error display ─────────────────────────────────────────────────────────────

function showPledgeError(message) {
    const container = document.querySelector('.pledges-container');
    if (container) {
        container.innerHTML = `
            <div style="background:#fee2e2;padding:30px;border-radius:15px;text-align:center">
                <h2 style="color:#991b1b">Error</h2>
                <p style="color:#991b1b">${message}</p>
            </div>`;
    }
}