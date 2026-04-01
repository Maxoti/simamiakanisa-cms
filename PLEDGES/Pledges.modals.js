// ============================================
// PLEDGES.MODALS.JS — Create, pay, history
// ============================================

import { state } from '../pledges.state.js';
import { createPledge, recordPayment, loadPledgesData } from '../pledges.data.js';

// ── Create pledge modal ───────────────────────────────────────────────────────

export function openCreatePledgeModal() {
    const modal = document.getElementById('createPledgeModal');
    if (!modal) return;

    const memberSelect = document.getElementById('pledgeMemberSelect');
    if (memberSelect) {
        memberSelect.innerHTML = '<option value="">Select Member</option>';
        (window.members || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = m.name;
            memberSelect.appendChild(opt);
        });
    }

    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    document.getElementById('pledgeStartDate').value = today;
    document.getElementById('pledgeEndDate').value   = nextYear.toISOString().split('T')[0];

    modal.classList.add('active');
}

export async function createPledgeFromModal() {
    const memberName = document.getElementById('pledgeMemberSelect').value;
    const category   = document.getElementById('pledgeCategory').value;
    const amount     = parseFloat(document.getElementById('pledgeAmount').value);
    const startDate  = document.getElementById('pledgeStartDate').value;
    const endDate    = document.getElementById('pledgeEndDate').value;
    const frequency  = document.getElementById('pledgeFrequency').value;
    const notes      = document.getElementById('pledgeNotes')?.value || '';

    if (!memberName || !amount || !startDate || !endDate) {
        alert('Please fill all required fields'); return;
    }
    if (amount <= 0) {
        alert('Please enter a valid amount'); return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
        alert('End date must be after start date'); return;
    }

    try {
        const member   = (window.members || []).find(m => m.name === memberName);
        const memberId = member?.id || 'unknown';

        await createPledge({ memberId, memberName, category, amount, startDate, endDate, frequency, notes });

        alert('✅ Pledge created successfully!');
        closeModal('createPledgeModal');
        await loadPledgesData();

    } catch (error) {
        console.error('❌ Error creating pledge:', error);
        alert('Failed to create pledge. Please try again.');
    }
}

// ── Record payment modal ──────────────────────────────────────────────────────

export function openRecordPaymentModal(pledgeId) {
    state.currentPledgeId = pledgeId;
    const pledge = state.pledges.find(p => p.id === pledgeId);
    if (!pledge) return;

    const modal = document.getElementById('recordPaymentModal');
    if (!modal) return;

    setText('paymentPledgeMember',    pledge.memberName);
    setText('paymentPledgeCategory',  pledge.category);
    setText('paymentPledgeTotal',     `KSh ${pledge.totalAmount.toLocaleString()}`);
    setText('paymentPledgeRemaining', `KSh ${pledge.remainingAmount.toLocaleString()}`);

    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    clearField('paymentAmount');
    clearField('paymentReference');
    clearField('paymentNotes');

    modal.classList.add('active');
}

export async function submitPayment() {
    const pledge = state.pledges.find(p => p.id === state.currentPledgeId);
    if (!pledge) return;

    const amount    = parseFloat(document.getElementById('paymentAmount').value);
    const date      = document.getElementById('paymentDate').value;
    const method    = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('paymentReference')?.value || '';
    const notes     = document.getElementById('paymentNotes')?.value     || '';

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount'); return;
    }
    if (amount > pledge.remainingAmount) {
        alert(`Payment cannot exceed remaining balance of KSh ${pledge.remainingAmount.toLocaleString()}`); return;
    }

    try {
        await recordPayment(pledge, { amount, date, method, reference, notes });
        alert('✅ Payment recorded successfully!');
        closeModal('recordPaymentModal');
        await loadPledgesData();
    } catch (error) {
        console.error('❌ Error recording payment:', error);
        alert('Failed to record payment. Please try again.');
    }
}

// ── Payment history modal ─────────────────────────────────────────────────────

export function openPaymentHistoryModal(pledgeId) {
    const pledge = state.pledges.find(p => p.id === pledgeId);
    if (!pledge) return;

    const modal = document.getElementById('paymentHistoryModal');
    if (!modal) return;

    setText('historyPledgeMember',    `${pledge.memberName} — ${pledge.category}`);
    setText('historyPledgeTotal',     `KSh ${pledge.totalAmount.toLocaleString()}`);
    setText('historyPledgePaid',      `KSh ${pledge.paidAmount.toLocaleString()}`);
    setText('historyPledgeRemaining', `KSh ${pledge.remainingAmount.toLocaleString()}`);

    const payments  = state.pledgePayments.filter(p => p.pledgeId === pledgeId);
    const container = document.getElementById('paymentsListContainer');

    container.innerHTML = payments.length === 0
        ? '<p style="text-align:center;color:#6b7280;padding:20px">No payments recorded yet.</p>'
        : payments.map(p => `
            <div style="border-left:4px solid #16a34a;padding:15px;background:#f9fafb;border-radius:8px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
                    <div>
                        <div style="font-size:18px;font-weight:bold;color:#16a34a">KSh ${p.amount.toLocaleString()}</div>
                        <div style="font-size:12px;color:#6b7280">${p.paymentDate}</div>
                    </div>
                    <span class="badge badge-success">${p.paymentMethod}</span>
                </div>
                ${p.reference ? `<div style="font-size:13px;color:#6b7280">Ref: ${p.reference}</div>` : ''}
                ${p.notes     ? `<div style="font-size:13px;color:#374151;margin-top:5px">${p.notes}</div>` : ''}
            </div>`).join('');

    modal.classList.add('active');
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function clearField(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
}