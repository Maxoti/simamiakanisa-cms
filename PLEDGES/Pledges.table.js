// ============================================
// PLEDGES.TABLE.JS — Table render + pagination
// ============================================
// Depends on: pledges.state.js (pledgeState)

// ── Public entry points ───────────────────────────────────────────────────────

function renderPledgesTable() {
    const container = document.getElementById('pledgesTable');
    if (!container) return;

    const { pagination, pledges } = pledgeState;
    const data = pagination.filteredPledges.length ? pagination.filteredPledges : pledges;

    pagination.totalItems = data.length;

    if (data.length === 0) {
        container.innerHTML = emptyStateHTML();
        updatePaginationControls();
        return;
    }

    const { currentPage, itemsPerPage } = pagination;
    const start    = (currentPage - 1) * itemsPerPage;
    const pageData = data.slice(start, start + itemsPerPage);

    console.log(` Page ${currentPage}: showing ${pageData.length} of ${data.length} pledges`);

    container.innerHTML = buildTableHTML(pageData);
    updatePaginationControls();
}

function filterPledges() {
    const status   = document.getElementById('pledgeStatusFilter')?.value   || 'all';
    const category = document.getElementById('pledgeCategoryFilter')?.value || 'all';

    let filtered = [...pledgeState.pledges];
    if (status   !== 'all') filtered = filtered.filter(p => p.status   === status);
    if (category !== 'all') filtered = filtered.filter(p => p.category === category);

    pledgeState.pagination.filteredPledges = filtered;
    pledgeState.pagination.currentPage     = 1;

    console.log(`🔍 Filtered: ${filtered.length} of ${pledgeState.pledges.length} pledges`);
    renderPledgesTable();
}

function changePledgesPerPage() {
    const select = document.getElementById('pledgesPerPageSelect');
    if (!select) return;
    pledgeState.pagination.itemsPerPage = parseInt(select.value);
    pledgeState.pagination.currentPage  = 1;
    renderPledgesTable();
}

function nextPledgesPage() {
    const { pagination } = pledgeState;
    const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);
    if (pagination.currentPage < totalPages) {
        pagination.currentPage++;
        renderPledgesTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function previousPledgesPage() {
    const { pagination } = pledgeState;
    if (pagination.currentPage > 1) {
        pagination.currentPage--;
        renderPledgesTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function updatePaginationControls() {
    const { pagination } = pledgeState;
    const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage) || 1;

    setText('pledgesPageInfo',    `Page ${pagination.currentPage} of ${totalPages}`);
    setText('pledgesTotalCount',  pagination.totalItems);
    setDisabled('pledgesPrevBtn', pagination.currentPage === 1);
    setDisabled('pledgesNextBtn', pagination.currentPage >= totalPages);
}

function buildTableHTML(pageData) {
    const rows = pageData.map(pledge => {
        const progress    = pledge.totalAmount > 0
            ? Math.round((pledge.paidAmount / pledge.totalAmount) * 100) : 0;
        const statusClass = { Completed: 'badge-success', Overdue: 'badge-danger' }[pledge.status] || 'badge-primary';
        const isComplete  = pledge.status === 'Completed';

        return `
        <tr data-pledge-id="${pledge.id}">
            <td data-label="Member"><strong>${pledge.memberName}</strong></td>
            <td data-label="Category"><span class="badge badge-primary">${pledge.category}</span></td>
            <td data-label="Total" style="font-weight:bold">KSh ${pledge.totalAmount.toLocaleString()}</td>
            <td data-label="Paid" style="color:#16a34a">KSh ${pledge.paidAmount.toLocaleString()}</td>
            <td data-label="Remaining" style="color:#ea580c">KSh ${pledge.remainingAmount.toLocaleString()}</td>
            <td data-label="Progress">
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width:${progress}%"></div>
                </div>
                <small>${progress}%</small>
            </td>
            <td data-label="Status"><span class="badge ${statusClass}">${pledge.status}</span></td>
            <td data-label="End Date">${pledge.endDate}</td>
            <td data-label="Actions" class="actions-cell">
                <button class="btn btn-success btn-sm" onclick="openRecordPaymentModal('${pledge.id}')" ${isComplete ? 'disabled' : ''}>💳 Pay</button>
                <button class="btn btn-whatsapp btn-sm" onclick="sendPledgeReminder('${pledge.id}')">💬 WhatsApp</button>
                <button class="btn btn-primary btn-sm" onclick="openPaymentHistoryModal('${pledge.id}')">📊 History</button>
            </td>
        </tr>`;
    }).join('');

    return `
    <div class="table-wrapper">
        <table class="pledges-table">
            <thead><tr>
                <th>Member</th><th>Category</th><th>Total</th><th>Paid</th>
                <th>Remaining</th><th>Progress</th><th>Status</th><th>End Date</th><th>Actions</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

function emptyStateHTML() {
    return `
    <div class="empty-state">
        <div class="empty-state-icon"></div>
        <p>No pledges found.</p>
        <button class="btn btn-primary" onclick="openCreatePledgeModal()" style="margin-top:15px">+ Create First Pledge</button>
    </div>`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setDisabled(id, value) {
    const el = document.getElementById(id);
    if (el) el.disabled = value;
}