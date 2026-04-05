// ============================================
// PLEDGES.JS - With Pagination
// ============================================

console.log(' Pledges.js loading...');

// Global pledge data
let pledges = [];
let pledgePayments = [];
let pledgesInitialized = false;
let currentPledgeId = null; // For modal operations

// ✅ PAGINATION STATE - NEW
const pledgesPaginationState = {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    filteredPledges: []
};

// ============================================
// TEMPLATE LOADER
// ============================================

async function loadPledge() {
    try {
        const response = await fetch('pledges.html');
        const html = await response.text();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);
        
        console.log('✅ Pledge templates loaded');
        return true;
    } catch (error) {
        console.warn('⚠️ Could not load templates, using inline HTML');
        return false;
    }
}

// ============================================
// GET TEMPLATE CONTENT
// ============================================

function getTemplate(templateId) {
    const template = document.getElementById(templateId);
    if (template) {
        return template.content.cloneNode(true);
    }
    console.error(`❌ Template not found: ${templateId}`);
    return null;
}

// ============================================
// INITIALIZE PLEDGES TAB
// ============================================

async function renderPledgesTab() {
    console.log(' Pledges tab opened!');
    
    if (!pledgesInitialized) {
        await loadPledge();
        pledgesInitialized = true;
    }
    
    if (typeof db === 'undefined') {
        console.error('❌ Firebase not initialized!');
        showPledgeError('Database not connected. Please reload the page.');
        return;
    }
    
    buildPledgesHTML();
    loadPledgesData();
}

// ============================================
// BUILD PLEDGES HTML - WITH PAGINATION
// ============================================

function buildPledgesHTML() {
    const container = document.querySelector('.pledges-container');
    if (!container) {
        console.error('❌ Pledges container not found!');
        return;
    }
    
    const template = getTemplate('pledges-dashboard-template');
    if (template) {
        container.innerHTML = '';
        container.appendChild(template);
    } else {
        // ✅ UPDATED: Added pagination controls
        container.innerHTML = `
            <div class="pledges-header">
                <h1 class="pledges-title"> Pledges Management</h1>
                <button class="btn btn-primary" onclick="openCreatePledgeModal()">+ New Pledge</button>
            </div>
            
            <div class="pledges-summary">
                <div class="pledge-stat-card purple">
                    <h4> Total Pledged</h4>
                    <div class="value" id="totalPledged">KSh 0</div>
                    <div class="subtitle">across all pledges</div>
                </div>
                <div class="pledge-stat-card green">
                    <h4>✅ Total Paid</h4>
                    <div class="value" id="totalPaid">KSh 0</div>
                    <div class="subtitle" id="completionRate">0% completion</div>
                </div>
                <div class="pledge-stat-card orange">
                    <h4>📊 Remaining</h4>
                    <div class="value" id="totalRemaining">KSh 0</div>
                    <div class="subtitle" id="activePledges">0 active pledges</div>
                </div>
                <div class="pledge-stat-card red">
                    <h4> Overdue</h4>
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
            
            <!-- ✅ PAGINATION CONTROLS - NEW -->
            <div class="pagination-wrapper" style="margin-bottom: 20px;">
                <div class="items-per-page">
                    <label>Show:</label>
                    <select id="pledgesPerPageSelect" onchange="changePledgesPerPage()">
                        <option value="10">10</option>
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <span style="margin-left: auto; color: #6b7280; font-size: 13px;">
                        Total: <span id="pledgesTotalCount">0</span>
                    </span>
                </div>
                
                <div class="pagination-controls">
                    <button id="pledgesPrevBtn" onclick="previousPledgesPageCustom()">← Previous</button>
                    <span class="page-info" id="pledgesPageInfo">Page 1 of 1</span>
                    <button id="pledgesNextBtn" onclick="nextPledgesPageCustom()">Next →</button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header"><h3 class="card-title">All Pledges</h3></div>
                <div id="pledgesTable">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading pledges...</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    insertModalTemplates();
}

// ============================================
// PAGINATION FUNCTIONS - NEW
// ============================================

function changePledgesPerPage() {
    const select = document.getElementById('pledgesPerPageSelect');
    if (select) {
        pledgesPaginationState.itemsPerPage = parseInt(select.value);
        pledgesPaginationState.currentPage = 1;
        renderPledgesTable();
    }
}

function nextPledgesPageCustom() {
    const state = pledgesPaginationState;
    const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
    
    if (state.currentPage < totalPages) {
        state.currentPage++;
        renderPledgesTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function previousPledgesPageCustom() {
    const state = pledgesPaginationState;
    
    if (state.currentPage > 1) {
        state.currentPage--;
        renderPledgesTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updatePledgesPaginationControls() {
    const state = pledgesPaginationState;
    const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
    
    const pageInfo = document.getElementById('pledgesPageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Page ${state.currentPage} of ${totalPages || 1}`;
    }
    
    const prevBtn = document.getElementById('pledgesPrevBtn');
    const nextBtn = document.getElementById('pledgesNextBtn');
    
    if (prevBtn) prevBtn.disabled = state.currentPage === 1;
    if (nextBtn) nextBtn.disabled = state.currentPage === totalPages || totalPages === 0;
    
    const totalCountEl = document.getElementById('pledgesTotalCount');
    if (totalCountEl) totalCountEl.textContent = state.totalItems;
}

// ============================================
// INSERT MODAL TEMPLATES
// ============================================

function insertModalTemplates() {
    if (!document.getElementById('createPledgeModal')) {
        const createModal = getTemplate('create-pledge-modal-template');
        if (createModal) document.body.appendChild(createModal);
    }
    
    if (!document.getElementById('recordPaymentModal')) {
        const paymentModal = getTemplate('record-payment-modal-template');
        if (paymentModal) document.body.appendChild(paymentModal);
    }
    
    if (!document.getElementById('paymentHistoryModal')) {
        const historyModal = getTemplate('payment-history-modal-template');
        if (historyModal) document.body.appendChild(historyModal);
    }
}

// ============================================
// LOAD PLEDGES DATA
// ============================================

async function loadPledgesData() {
    try {
        console.log(' Loading pledges from Firebase...');
        
        const pledgesSnapshot = await db.collection('pledges')
            .orderBy('createdAt', 'desc')
            .get();
        
        pledges = pledgesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startDate: doc.data().startDate || new Date().toISOString().split('T')[0],
            endDate: doc.data().endDate || new Date().toISOString().split('T')[0]
        }));
        
        const paymentsSnapshot = await db.collection('pledge_payments')
            .orderBy('createdAt', 'desc')
            .get();
        
        pledgePayments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('✅ Loaded:', pledges.length, 'pledges,', pledgePayments.length, 'payments');
        
        // ✅ Reset pagination
        pledgesPaginationState.filteredPledges = [];
        pledgesPaginationState.currentPage = 1;
        pledgesPaginationState.totalItems = pledges.length;
        
        updateAllPledgeStatuses();
        updatePledgeStats();
        renderPledgesTable();
        
    } catch (error) {
        console.error('❌ Error loading pledges:', error);
        showPledgeError('Failed to load pledges. Check console for details.');
    }
}

// ============================================
// UPDATE PLEDGE STATUSES
// ============================================

function updateAllPledgeStatuses() {
    const today = new Date();
    
    pledges.forEach(pledge => {
        const endDate = new Date(pledge.endDate);
        
        if (pledge.remainingAmount <= 0) {
            pledge.status = 'Completed';
        } else if (today > endDate) {
            pledge.status = 'Overdue';
        } else {
            pledge.status = 'Active';
        }
    });
}

// ============================================
// UPDATE STATISTICS
// ============================================

function updatePledgeStats() {
    const total = pledges.reduce((sum, p) => sum + p.totalAmount, 0);
    const paid = pledges.reduce((sum, p) => sum + p.paidAmount, 0);
    const remaining = pledges.reduce((sum, p) => sum + p.remainingAmount, 0);
    const active = pledges.filter(p => p.status === 'Active').length;
    const overdue = pledges.filter(p => p.status === 'Overdue').length;
    const completionRate = total > 0 ? Math.round((paid / total) * 100) : 0;
    
    document.getElementById('totalPledged').textContent = `KSh ${total.toLocaleString()}`;
    document.getElementById('totalPaid').textContent = `KSh ${paid.toLocaleString()}`;
    document.getElementById('totalRemaining').textContent = `KSh ${remaining.toLocaleString()}`;
    document.getElementById('overduePledges').textContent = overdue;
    document.getElementById('completionRate').textContent = `${completionRate}% completion`;
    document.getElementById('activePledges').textContent = `${active} active pledges`;
}

// ============================================
// RENDER PLEDGES TABLE - WITH PAGINATION
// ============================================

function renderPledgesTable() {
    const container = document.getElementById('pledgesTable');
    
    if (!container) {
        console.error('❌ Pledges table container not found');
        return;
    }
    
    // ✅ Use filtered pledges if available
    const dataToRender = pledgesPaginationState.filteredPledges.length > 0 
        ? pledgesPaginationState.filteredPledges 
        : pledges;
    
    pledgesPaginationState.totalItems = dataToRender.length;
    
    if (dataToRender.length === 0) {
        const emptyTemplate = getTemplate('pledges-empty-template');
        if (emptyTemplate) {
            container.innerHTML = '';
            container.appendChild(emptyTemplate);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"></div>
                    <p>No pledges found.</p>
                    <button class="btn btn-primary" onclick="openCreatePledgeModal()" style="margin-top: 15px;">
                        + Create First Pledge
                    </button>
                </div>
            `;
        }
        updatePledgesPaginationControls();
        return;
    }
    
    // ✅ Calculate pagination
    const state = pledgesPaginationState;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const pageData = dataToRender.slice(startIndex, endIndex);
    
    console.log(`📄 Page ${state.currentPage}: showing ${pageData.length} of ${dataToRender.length} pledges`);
    
   // ✅ MOBILE-RESPONSIVE TABLE
let html = '<div class="table-wrapper"><table class="pledges-table"><thead><tr>';
html += '<th>Member</th><th>Category</th><th>Total</th><th>Paid</th><th>Remaining</th>';
html += '<th>Progress</th><th>Status</th><th>End Date</th><th>Actions</th>';
html += '</tr></thead><tbody>';

pageData.forEach(pledge => {
    const progress = pledge.totalAmount > 0 
        ? Math.round((pledge.paidAmount / pledge.totalAmount) * 100) 
        : 0;
    
    const statusClass = pledge.status === 'Completed' ? 'badge-success' 
                      : pledge.status === 'Overdue' ? 'badge-danger'
                      : 'badge-primary';
    
    html += `
        <tr data-pledge-id="${pledge.id}">
            <td data-label="Member"><strong>${pledge.memberName}</strong></td>
            <td data-label="Category"><span class="badge badge-primary">${pledge.category}</span></td>
            <td data-label="Total" style="font-weight: bold;">KSh ${pledge.totalAmount.toLocaleString()}</td>
            <td data-label="Paid" style="color: #16a34a;">KSh ${pledge.paidAmount.toLocaleString()}</td>
            <td data-label="Remaining" style="color: #ea580c;">KSh ${pledge.remainingAmount.toLocaleString()}</td>
            <td data-label="Progress">
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <small>${progress}%</small>
            </td>
            <td data-label="Status"><span class="badge ${statusClass}">${pledge.status}</span></td>
            <td data-label="End Date">${pledge.endDate}</td>
            <td data-label="Actions" class="actions-cell">
                <button class="btn btn-success btn-sm" onclick="openRecordPaymentModal('${pledge.id}')" 
                        ${pledge.status === 'Completed' ? 'disabled' : ''}>
                     Pay
                </button>
                <button class="btn btn-whatsapp btn-sm" onclick="sendPledgeReminder('${pledge.id}')">
                    💬 WhatsApp
                </button>
                <button class="btn btn-primary btn-sm" onclick="openPaymentHistoryModal('${pledge.id}')">
                    📊 History
                </button>
            </td>
        </tr>
    `;
});

html += '</tbody></table></div>';
container.innerHTML = html;
    
    // ✅ Update pagination controls
    updatePledgesPaginationControls();
}

// ============================================
// FILTER PLEDGES - WITH PAGINATION SUPPORT
// ============================================

function filterPledges() {
    const statusFilter = document.getElementById('pledgeStatusFilter')?.value || 'all';
    const categoryFilter = document.getElementById('pledgeCategoryFilter')?.value || 'all';
    
    let filtered = [...pledges];
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    pledgesPaginationState.filteredPledges = filtered;
    pledgesPaginationState.currentPage = 1; // Reset to first page
    
    console.log(`🔍 Filtered: ${filtered.length} of ${pledges.length} pledges`);
    
    renderPledgesTable();
}

// ============================================
// MODAL FUNCTIONS (Keep all your existing modal functions)
// ============================================

function openCreatePledgeModal() {
    const modal = document.getElementById('createPledgeModal');
    if (!modal) {
        console.error('Create pledge modal not found');
        return;
    }
    
    const memberSelect = document.getElementById('pledgeMemberSelect');
    if (memberSelect) {
        memberSelect.innerHTML = '<option value="">Select Member</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.name;
            option.textContent = member.name;
            memberSelect.appendChild(option);
        });
    }
    
    document.getElementById('pledgeStartDate').value = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    document.getElementById('pledgeEndDate').value = oneYearLater.toISOString().split('T')[0];
    
    modal.classList.add('active');
}

async function createPledgeFromModal() {
    const memberName = document.getElementById('pledgeMemberSelect').value;
    const category = document.getElementById('pledgeCategory').value;
    const amount = parseFloat(document.getElementById('pledgeAmount').value);
    const startDate = document.getElementById('pledgeStartDate').value;
    const endDate = document.getElementById('pledgeEndDate').value;
    const frequency = document.getElementById('pledgeFrequency').value;
    const notes = document.getElementById('pledgeNotes')?.value || '';
    
    if (!memberName || !amount || !startDate || !endDate) {
        alert('Please fill all required fields');
        return;
    }
    
    if (amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (new Date(endDate) <= new Date(startDate)) {
        alert('End date must be after start date');
        return;
    }
    
    try {
        const member = members.find(m => m.name === memberName);
        const memberId = member ? member.id : 'unknown';
        
        const pledgeData = {
            memberId: memberId,
            memberName: memberName,
            category: category,
            totalAmount: amount,
            paidAmount: 0,
            remainingAmount: amount,
            startDate: startDate,
            endDate: endDate,
            status: 'Active',
            paymentFrequency: frequency,
            notes: notes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('pledges').add(pledgeData);
        
        alert('✅ Pledge created successfully!');
        closeModal('createPledgeModal');
        await loadPledgesData();
        
    } catch (error) {
        console.error('❌ Error creating pledge:', error);
        alert('Failed to create pledge. Please try again.');
    }
}
// ============================================
// EXPORT PLEDGES REPORT
// ============================================

function exportPledgesReport() {
    try {
        console.log('📊 Exporting pledges report...');
        
        // Get the filtered pledges based on current filters
        const pledgesToExport = pledgesPaginationState.filteredPledges.length > 0 
            ? pledgesPaginationState.filteredPledges 
            : pledges;
        
        if (!pledgesToExport || pledgesToExport.length === 0) {
            alert('No pledges to export');
            return;
        }

        // Create CSV content with proper headers
        let csvContent = "Member,Category,Total Amount,Paid Amount,Remaining Amount,Progress,Status,Start Date,End Date,Payment Frequency\n";
        
        pledgesToExport.forEach(pledge => {
            const progress = pledge.totalAmount > 0 
                ? Math.round((pledge.paidAmount / pledge.totalAmount) * 100) 
                : 0;
            
            const row = [
                pledge.memberName || '',
                pledge.category || '',
                pledge.totalAmount || 0,
                pledge.paidAmount || 0,
                pledge.remainingAmount || 0,
                progress + '%',
                pledge.status || '',
                pledge.startDate || '',
                pledge.endDate || '',
                pledge.paymentFrequency || ''
            ].map(field => `"${field}"`).join(',');
            
            csvContent += row + "\n";
        });

        // Add summary row
        const totalPledged = pledgesToExport.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalPaid = pledgesToExport.reduce((sum, p) => sum + p.paidAmount, 0);
        const totalRemaining = pledgesToExport.reduce((sum, p) => sum + p.remainingAmount, 0);
        const overallProgress = totalPledged > 0 ? Math.round((totalPaid / totalPledged) * 100) : 0;
        
        csvContent += `\n"TOTAL","",${totalPledged},${totalPaid},${totalRemaining},"${overallProgress}%","","","",""\n`;

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `pledges_report_${timestamp}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        console.log('✅ Report exported successfully:', filename);
        alert(`✅ Report exported successfully!\n${pledgesToExport.length} pledges exported to ${filename}`);
        
    } catch (error) {
        console.error('❌ Error exporting report:', error);
        alert('Failed to export report. Please check the console for details.');
    }
}
function openRecordPaymentModal(pledgeId) {
    currentPledgeId = pledgeId;
    const pledge = pledges.find(p => p.id === pledgeId);
    if (!pledge) return;
    
    const modal = document.getElementById('recordPaymentModal');
    if (!modal) return;
    
    document.getElementById('paymentPledgeMember').textContent = pledge.memberName;
    document.getElementById('paymentPledgeCategory').textContent = pledge.category;
    document.getElementById('paymentPledgeTotal').textContent = `KSh ${pledge.totalAmount.toLocaleString()}`;
    document.getElementById('paymentPledgeRemaining').textContent = `KSh ${pledge.remainingAmount.toLocaleString()}`;
    
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentReference').value = '';
    if (document.getElementById('paymentNotes')) {
        document.getElementById('paymentNotes').value = '';
    }
    
    modal.classList.add('active');
}

async function submitPayment() {
    const pledge = pledges.find(p => p.id === currentPledgeId);
    if (!pledge) return;
    
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    const method = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('paymentReference')?.value || '';
    const notes = document.getElementById('paymentNotes')?.value || '';
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (amount > pledge.remainingAmount) {
        alert(`Payment amount cannot exceed remaining balance of KSh ${pledge.remainingAmount.toLocaleString()}`);
        return;
    }
    
    try {
        const payment = {
            pledgeId: currentPledgeId,
            memberId: pledge.memberId,
            memberName: pledge.memberName,
            amount: amount,
            paymentDate: date,
            paymentMethod: method,
            reference: reference,
            notes: notes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('pledge_payments').add(payment);
        
        const newPaid = pledge.paidAmount + amount;
        const newRemaining = pledge.totalAmount - newPaid;
        const newStatus = newRemaining <= 0 ? 'Completed' : pledge.status;
        
        await db.collection('pledges').doc(currentPledgeId).update({
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus
        });
        
        alert('✅ Payment recorded successfully!');
        closeModal('recordPaymentModal');
        await loadPledgesData();
        
    } catch (error) {
        console.error('❌ Error recording payment:', error);
        alert('Failed to record payment. Please try again.');
    }
}

function openPaymentHistoryModal(pledgeId) {
    const pledge = pledges.find(p => p.id === pledgeId);
    if (!pledge) return;
    
    const modal = document.getElementById('paymentHistoryModal');
    if (!modal) return;
    
    document.getElementById('historyPledgeMember').textContent = pledge.memberName + ' - ' + pledge.category;
    document.getElementById('historyPledgeTotal').textContent = `KSh ${pledge.totalAmount.toLocaleString()}`;
    document.getElementById('historyPledgePaid').textContent = `KSh ${pledge.paidAmount.toLocaleString()}`;
    document.getElementById('historyPledgeRemaining').textContent = `KSh ${pledge.remainingAmount.toLocaleString()}`;
    
    const payments = pledgePayments.filter(p => p.pledgeId === pledgeId);
    
    const container = document.getElementById('paymentsListContainer');
    if (payments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No payments recorded yet.</p>';
    } else {
        container.innerHTML = payments.map(p => `
            <div style="border-left: 4px solid #16a34a; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <div style="font-size: 18px; font-weight: bold; color: #16a34a;">KSh ${p.amount.toLocaleString()}</div>
                        <div style="font-size: 12px; color: #6b7280;">${p.paymentDate}</div>
                    </div>
                    <span class="badge badge-success">${p.paymentMethod}</span>
                </div>
                ${p.reference ? `<div style="font-size: 13px; color: #6b7280;">Ref: ${p.reference}</div>` : ''}
                ${p.notes ? `<div style="font-size: 13px; color: #374151; margin-top: 5px;">${p.notes}</div>` : ''}
            </div>
        `).join('');
    }
    
    modal.classList.add('active');
}

function sendPledgeReminder(pledgeId) {
    const pledge = pledges.find(p => p.id === pledgeId);
    if (!pledge) return;
    
    const member = members.find(m => m.name === pledge.memberName);
    if (!member) {
        alert('Member not found!');
        return;
    }
    
    let phone = member.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
        phone = '254' + phone.substring(1);
    } else if (!phone.startsWith('254')) {
        phone = '254' + phone;
    }
    
    const message = ` *Pledge Reminder*

Dear ${pledge.memberName},

This is a friendly reminder about your ${pledge.category} pledge.

*Pledge Details:*
Total Amount: KSh ${pledge.totalAmount.toLocaleString()}
Paid So Far: KSh ${pledge.paidAmount.toLocaleString()}
Balance: KSh ${pledge.remainingAmount.toLocaleString()}
Due Date: ${pledge.endDate}

*Payment Options:*
 M-Pesa: [Your Paybill]
 Bank: [Your Account]
 Cash: During service

Thank you for your commitment!
SimamiaKanisa Church`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

function showPledgeError(message) {
    const container = document.querySelector('.pledges-container');
    if (container) {
        container.innerHTML = `
            <div style="background: #fee2e2; padding: 30px; border-radius: 15px; text-align: center;">
                <h2 style="color: #991b1b;">❌ Error</h2>
                <p style="color: #991b1b;">${message}</p>
            </div>
        `;
    }
}

console.log('✅ Pledges module loaded successfully!');