// ============================================
// PLEDGES.JS - Using HTML Templates
// ============================================

console.log('📋 Pledges.js loading...');

// Global pledge data
let pledges = [];
let pledgePayments = [];
let pledgesInitialized = false;
let currentPledgeId = null; // For modal operations

// ============================================
// TEMPLATE LOADER
// ============================================

async function loadPledge() {
    try {
        const response = await fetch('pledges.html');
        const html = await response.text();
        
        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Append all templates to document
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
    
    // Load templates if not already loaded
    if (!pledgesInitialized) {
        await loadPledge();
        pledgesInitialized = true;
    }
    
    // Check if Firebase is available
    if (typeof db === 'undefined') {
        console.error('❌ Firebase not initialized!');
        showPledgeError('Database not connected. Please reload the page.');
        return;
    }
    
    // Build the pledges UI using template
    buildPledgesHTML();
    
    // Load pledges data
    loadPledgesData();
}

// ============================================
// BUILD PLEDGES HTML FROM TEMPLATE
// ============================================

function buildPledgesHTML() {
    const container = document.querySelector('.pledges-container');
    if (!container) {
        console.error('❌ Pledges container not found!');
        return;
    }
    
    // Try to use template
    const template = getTemplate('pledges-dashboard-template');
    if (template) {
        container.innerHTML = '';
        container.appendChild(template);
    } else {
        // Fallback to inline HTML
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
                    <h4> Total Paid</h4>
                    <div class="value" id="totalPaid">KSh 0</div>
                    <div class="subtitle" id="completionRate">0% completion</div>
                </div>
                <div class="pledge-stat-card orange">
                    <h4> Remaining</h4>
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
    
    // Insert modal templates if they exist
    insertModalTemplates();
}

// ============================================
// INSERT MODAL TEMPLATES
// ============================================

function insertModalTemplates() {
    // Check if modals already exist
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
        
        // Load pledges
        const pledgesSnapshot = await db.collection('pledges')
            .orderBy('createdAt', 'desc')
            .get();
        
        pledges = pledgesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startDate: doc.data().startDate || new Date().toISOString().split('T')[0],
            endDate: doc.data().endDate || new Date().toISOString().split('T')[0]
        }));
        
        // Load pledge payments
        const paymentsSnapshot = await db.collection('pledge_payments')
            .orderBy('createdAt', 'desc')
            .get();
        
        pledgePayments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('✅ Loaded:', pledges.length, 'pledges,', pledgePayments.length, 'payments');
        
        // Update status for all pledges
        updateAllPledgeStatuses();
        
        // Render UI
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
// RENDER PLEDGES TABLE
// ============================================

function renderPledgesTable() {
    const container = document.getElementById('pledgesTable');
    
    if (pledges.length === 0) {
        const emptyTemplate = getTemplate('pledges-empty-template');
        if (emptyTemplate) {
            container.innerHTML = '';
            container.appendChild(emptyTemplate);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"></div>
                    <p>No pledges yet. Create your first pledge!</p>
                </div>
            `;
        }
        return;
    }
    
    let html = '<div class="table-wrapper"><table><thead><tr>';
    html += '<th>Member</th><th>Category</th><th>Total</th><th>Paid</th><th>Remaining</th>';
    html += '<th>Progress</th><th>Status</th><th>End Date</th><th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    pledges.forEach(pledge => {
        const progress = pledge.totalAmount > 0 
            ? Math.round((pledge.paidAmount / pledge.totalAmount) * 100) 
            : 0;
        
        const statusClass = pledge.status === 'Completed' ? 'badge-success' 
                          : pledge.status === 'Overdue' ? 'badge-danger'
                          : 'badge-primary';
        
html += `
            <tr>
                <td><strong>${pledge.memberName}</strong></td>
                <td><span class="badge badge-primary">${pledge.category}</span></td>
                <td style="font-weight: bold;">KSh ${pledge.totalAmount.toLocaleString()}</td>
                <td style="color: #16a34a;">KSh ${pledge.paidAmount.toLocaleString()}</td>
                <td style="color: #ea580c;">KSh ${pledge.remainingAmount.toLocaleString()}</td>
                <td>
                    <div style="background: #e5e7eb; border-radius: 10px; height: 20px; width: 100px; overflow: hidden;">
                        <div style="background: #16a34a; height: 100%; width: ${progress}%;"></div>
                    </div>
                    <small>${progress}%</small>
                </td>
                <td><span class="badge ${statusClass}">${pledge.status}</span></td>
                <td>${pledge.endDate}</td>
                <td style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="openRecordPaymentModal('${pledge.id}')" 
                            style="padding: 5px 10px; font-size: 12px;"
                            ${pledge.status === 'Completed' ? 'disabled' : ''}>
                         Pay
                    </button>
                    <button class="btn btn-whatsapp" onclick="sendPledgeReminder('${pledge.id}')"
                            style="padding: 5px 10px; font-size: 12px; background: #25D366; color: white; border: none;">
                         WhatsApp
                    </button>
                    <button class="btn btn-primary" onclick="openPaymentHistoryModal('${pledge.id}')"
                            style="padding: 5px 10px; font-size: 12px;">
                         History
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ============================================
// OPEN CREATE PLEDGE MODAL
// ============================================

function openCreatePledgeModal() {
    const modal = document.getElementById('createPledgeModal');
    if (!modal) {
        console.error('Create pledge modal not found');
        return;
    }
    
    // Populate member dropdown
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
    
    // Set default dates
    document.getElementById('pledgeStartDate').value = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    document.getElementById('pledgeEndDate').value = oneYearLater.toISOString().split('T')[0];
    
    // Show modal
    modal.classList.add('active');
}

// ============================================
// CREATE PLEDGE FROM MODAL
// ============================================

async function createPledgeFromModal() {
    const memberName = document.getElementById('pledgeMemberSelect').value;
    const category = document.getElementById('pledgeCategory').value;
    const amount = parseFloat(document.getElementById('pledgeAmount').value);
    const startDate = document.getElementById('pledgeStartDate').value;
    const endDate = document.getElementById('pledgeEndDate').value;
    const frequency = document.getElementById('pledgeFrequency').value;
    const notes = document.getElementById('pledgeNotes')?.value || '';
    
    // Validation
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
        
        alert(' Pledge created successfully!');
        closeModal('createPledgeModal');
        await loadPledgesData();
        
    } catch (error) {
        console.error('❌ Error creating pledge:', error);
        alert('Failed to create pledge. Please try again.');
    }
}

// ============================================
// OPEN RECORD PAYMENT MODAL
// ============================================

function openRecordPaymentModal(pledgeId) {
    currentPledgeId = pledgeId;
    const pledge = pledges.find(p => p.id === pledgeId);
    if (!pledge) return;
    
    const modal = document.getElementById('recordPaymentModal');
    if (!modal) return;
    
    // Populate pledge info
    document.getElementById('paymentPledgeMember').textContent = pledge.memberName;
    document.getElementById('paymentPledgeCategory').textContent = pledge.category;
    document.getElementById('paymentPledgeTotal').textContent = `KSh ${pledge.totalAmount.toLocaleString()}`;
    document.getElementById('paymentPledgeRemaining').textContent = `KSh ${pledge.remainingAmount.toLocaleString()}`;
    
    // Set default date to today
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    
    // Clear form
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentReference').value = '';
    if (document.getElementById('paymentNotes')) {
        document.getElementById('paymentNotes').value = '';
    }
    
    modal.classList.add('active');
}

// ============================================
// SUBMIT PAYMENT
// ============================================

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

// ============================================
// OPEN PAYMENT HISTORY MODAL
// ============================================

function openPaymentHistoryModal(pledgeId) {
    const pledge = pledges.find(p => p.id === pledgeId);
    if (!pledge) return;
    
    const modal = document.getElementById('paymentHistoryModal');
    if (!modal) return;
    
    // Populate pledge info
    document.getElementById('historyPledgeMember').textContent = pledge.memberName + ' - ' + pledge.category;
    document.getElementById('historyPledgeTotal').textContent = `KSh ${pledge.totalAmount.toLocaleString()}`;
    document.getElementById('historyPledgePaid').textContent = `KSh ${pledge.paidAmount.toLocaleString()}`;
    document.getElementById('historyPledgeRemaining').textContent = `KSh ${pledge.remainingAmount.toLocaleString()}`;
    
    // Get payments for this pledge
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
                        <div style="font-size: 12px; color: #806b72ff;">${p.paymentDate}</div>
                    </div>
                    <span class="badge badge-success">${p.paymentMethod}</span>
                </div>
                ${p.reference ? `<div style="font-size: 13px; color: #6b7280;">Ref: ${p.reference}</div>` : ''}
                ${p.notes ? `<div style="font-size: 13px; color: #51373bff; margin-top: 5px;">${p.notes}</div>` : ''}
            </div>
        `).join('');
    }
    
    modal.classList.add('active');
}

// ============================================
// SEND PLEDGE REMINDER
// ============================================

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
    
    const message = `🙏 *Pledge Reminder*

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

// ============================================
// FILTER PLEDGES
// ============================================

function filterPledges() {
    // Future implementation
    renderPledgesTable();
}

// Export pledges report to PDF
function exportPledgesReport() {
    console.log('Exporting pledges report to PDF...');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(18);
    doc.text('SimamiaKanisa - Pledges Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Get pledges data
    db.collection('pledges').get().then(snapshot => {
        const pledgesData = [];
        
        snapshot.forEach(doc => {
            const pledge = doc.data();
            const completion = Math.round((pledge.paidAmount / pledge.totalAmount) * 100);
            
            pledgesData.push([
                pledge.memberName,
                pledge.category,
                `KSh ${pledge.totalAmount.toLocaleString()}`,
                `KSh ${pledge.paidAmount.toLocaleString()}`,
                `KSh ${pledge.remainingAmount.toLocaleString()}`,
                completion + '%',
                pledge.status
            ]);
        });
        
        // Add table
        doc.autoTable({
            head: [['Member', 'Category', 'Total', 'Paid', 'Remaining', 'Progress', 'Status']],
            body: pledgesData,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 9 }
        });
        
        // Add summary
        const totalPledged = pledgesData.reduce((sum, row) => {
            return sum + parseFloat(row[2].replace(/[^\d]/g, ''));
        }, 0);
        
        const totalPaid = pledgesData.reduce((sum, row) => {
            return sum + parseFloat(row[3].replace(/[^\d]/g, ''));
        }, 0);
        
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Pledged: KSh ${totalPledged.toLocaleString()}`, 14, finalY);
        doc.text(`Total Paid: KSh ${totalPaid.toLocaleString()}`, 14, finalY + 7);
        doc.text(`Overall Completion: ${Math.round((totalPaid/totalPledged)*100)}%`, 14, finalY + 14);
        
        // Save PDF
        doc.save(`Pledges_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        alert('✅ PDF report exported successfully!');
    }).catch(error => {
        console.error('Export error:', error);
        alert('❌ Error exporting report');
    });
}

// ============================================
// ERROR HANDLING
// ============================================

function showPledgeError(message) {
    const container = document.querySelector('.pledges-container');
    if (container) {
        const errorTemplate = getTemplate('pledges-error-template');
        if (errorTemplate) {
            container.innerHTML = '';
            container.appendChild(errorTemplate);
            container.querySelector('.error-message').textContent = message;
        } else {
            container.innerHTML = `
                <div style="background: #fee2e2; padding: 30px; border-radius: 15px; text-align: center;">
                    <h2 style="color: #991b1b;"> Error</h2>
                    <p style="color: #991b1b;">${message}</p>
                </div>
            `;
        }
    }
}

console.log('✅ Pledges module loaded successfully!');