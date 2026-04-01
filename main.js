// main.js â€” bootstrap, dashboard, tab switching, modals, WhatsApp
// Depends on: state.js, pagination.js, members.js, contributions.js, events.js

// â”€â”€ Bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('authReady', async ({ detail }) => {
  console.log(`âœ… authReady â€” tenant: ${detail.member.tenantId}, role: ${detail.member.role}`);
  await loadAllData();
});

// â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadAllData() {
  try {
    console.log(`ðŸ“¡ Loading data for tenant: ${TENANT_ID}`);

    const [membersSnap, contribSnap, eventsSnap] = await Promise.all([
      membersCollection().orderBy('joined', 'desc').get(),
      contributionsCollection().orderBy('date', 'desc').get(),
      eventsCollection().orderBy('date', 'asc').get()
    ]);

    members       = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    contributions = contribSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    events        = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    try {
      const pledgesSnap = await pledgesCollection().orderBy('createdAt', 'desc').get();
      pledges = pledgesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      pledges = [];
    }

    console.log(`âœ… ${members.length} members Â· ${contributions.length} contributions Â· ${events.length} events Â· ${pledges.length} pledges`);

    paginationState.members.totalItems       = members.length;
    paginationState.contributions.totalItems = contributions.length;
    paginationState.events.totalItems        = events.length;
    paginationState.pledges.totalItems       = pledges.length;

    updateDashboard();
    renderMembers();
    switchTab('dashboard');

  } catch (error) {
    console.error('âŒ loadAllData error:', error);
    alert('Error loading data. Please refresh the page.');
  }
}

// â”€â”€ Tab switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function switchTab(tabName) {
  document.querySelectorAll('.content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const section = document.getElementById(tabName);
  if (section) { section.classList.add('active'); section.style.display = 'block'; }

  const btn = document.querySelector(`[onclick*="switchTab('${tabName}')"]`);
  if (btn) btn.classList.add('active');

  const handlers = {
    dashboard:     updateDashboard,
    members:       renderMembers,
    contributions: renderContributions,
    events:        renderEvents,
    pledges:       () => typeof renderPledgesTab === 'function' ? renderPledgesTab() : loadPledgesPage(),
    analytics:     () => typeof initAnalyticsTab === 'function' ? initAnalyticsTab() : alert('Analytics module failed to load.'),
    admin:         () => { if (typeof loadUsers === 'function') { loadUsers(); loadAuditLogs?.(); } }
  };
  handlers[tabName]?.();
}

// â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateDashboard() {
  const total     = contributions.reduce((s, c) => s + c.amount, 0);
  const tithes    = contributions.filter(c => c.type === 'Tithe').reduce((s, c) => s + c.amount, 0);
  const offerings = contributions.filter(c => c.type === 'Offering').reduce((s, c) => s + c.amount, 0);
  const building  = contributions.filter(c => c.type === 'Building Fund').reduce((s, c) => s + c.amount, 0);
  const mission   = contributions.filter(c => c.type === 'Mission').reduce((s, c) => s + c.amount, 0);
  const other     = contributions.filter(c => c.type === 'Other').reduce((s, c) => s + c.amount, 0);

  document.getElementById('totalMembers').textContent   = members.length;
  document.getElementById('monthlyTotal').textContent   = `KSh ${total.toLocaleString()}`;
  document.getElementById('tithesTotal').textContent    = `KSh ${tithes.toLocaleString()}`;
  document.getElementById('activeEvents').textContent   = events.length;
  document.getElementById('offeringsTotal').textContent = `KSh ${offerings.toLocaleString()}`;
  document.getElementById('buildingTotal').textContent  = `KSh ${building.toLocaleString()}`;
  document.getElementById('missionTotal').textContent   = `KSh ${mission.toLocaleString()}`;
  document.getElementById('otherTotal').textContent     = `KSh ${other.toLocaleString()}`;

  const avg          = total / (contributions.length || 1);
  const uniqueGroups = [...new Set(members.map(m => m.group))].length;
  document.getElementById('quickStats').innerHTML = `
    <p style="margin-bottom:10px"> Average Contribution: <strong>KSh ${Math.round(avg).toLocaleString()}</strong></p>
    <p style="margin-bottom:10px"> Active Groups: <strong>${uniqueGroups}</strong></p>
    <p style="margin-bottom:10px"> Total Contributions: <strong>${contributions.length} transactions</strong></p>
    <p> Latest Event: <strong>${events[0]?.name || 'None scheduled'}</strong></p>
  `;
}

// â”€â”€ Pledges fallback (used when pledges.js is absent) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadPledgesPage() {
  const state     = paginationState.pledges;
  const container = document.getElementById('pledgesTable');
  if (!container) return;

  const totalCountEl = document.getElementById('pledgesTotalCount');
  if (totalCountEl) totalCountEl.textContent = pledges.length;

  if (pledges.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><p>No pledges recorded yet.</p></div>';
    updatePaginationControls('pledges');
    return;
  }

  const pageData = pledges.slice(
    (state.currentPage - 1) * state.itemsPerPage,
    state.currentPage * state.itemsPerPage
  );

  container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Member</th><th>Category</th><th>Amount</th><th>Progress</th><th>Status</th><th>End Date</th><th>Actions</th></tr></thead>
      <tbody>
        ${pageData.map(p => {
          const pct = Math.round(((p.paidAmount || 0) / p.amount) * 100);
          return `
            <tr>
              <td><strong>${p.memberName}</strong></td>
              <td><span class="badge badge-primary">${p.category}</span></td>
              <td style="color:#f44336;font-weight:bold">KSh ${p.amount.toLocaleString()}</td>
              <td>
                <div style="background:#e5e7eb;border-radius:10px;height:8px;overflow:hidden;margin-bottom:4px">
                  <div style="background:#22c55e;width:${pct}%;height:100%"></div>
                </div>
                <small>${pct}%</small>
              </td>
              <td><span class="badge ${p.status === 'Active' ? 'badge-success' : 'badge-secondary'}">${p.status}</span></td>
              <td>${p.endDate}</td>
              <td style="display:flex;gap:5px;flex-wrap:wrap">
                <button class="btn btn-success" style="padding:6px 12px;font-size:12px"
                        onclick="recordPledgePayment('${p.id}')"> Pay</button>
                <button class="btn btn-whatsapp" onclick="sendWhatsApp('${p.phone || ''}')"> WhatsApp</button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;

  updatePaginationControls('pledges');
}

// â”€â”€ WhatsApp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function sendWhatsAppReminder(name, phone, type) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0'))    clean = '254' + clean.substring(1);
  if (!clean.startsWith('254')) clean = '254' + clean;

  const churchName = 'SimamiaKanisa Church';
  const templates  = {
    tithe:    `ðŸ™ *Reminder: Tithe Contribution*\n\nDear ${name},\n\nThis is a friendly reminder from ${churchName} about your tithe contribution.\n\n*"Bring the whole tithe into the storehouse..."* - Malachi 3:10\n\nPayment Options:\nðŸ“± M-Pesa: [Your Paybill/Till]\nðŸ¦ Bank: [Your Account]\nðŸ’µ Cash: During service\n\nGod bless you!\n${churchName}`,
    building: `ðŸ—ï¸ *Reminder: Building Fund*\n\nDear ${name},\n\nThis is a friendly reminder from ${churchName} about your Building Fund pledge.\n\nTogether we are building God'\''s house!\n\nPayment Options:\nðŸ“± M-Pesa: [Your Paybill/Till]\nðŸ¦ Bank: [Your Account]\nðŸ’µ Cash: During service\n\nThank you for your partnership!\n${churchName}`
  };
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(templates[type] ?? '')}`, '_blank');
}

// â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const openAddMemberModal       = () => document.getElementById('addMemberModal').classList.add('active');
const openAddContributionModal = () => document.getElementById('addContributionModal').classList.add('active');
const openAddEventModal        = () => document.getElementById('addEventModal').classList.add('active');
const closeModal               = (id) => document.getElementById(id).classList.remove('active');
