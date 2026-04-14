// main.js — bootstrap, dashboard, tab switching, modals, WhatsApp
// Depends on: firebase-config.js, state.js, pagination.js,
//             members.js, contributions.js, events.js

// ── Bootstrap ──────────────────────────────────────────────────────────────────
let _dataLoaded = false; // guard against double-firing
let _activeTab  = 'dashboard'; // ✅ remember current tab across reloads

document.addEventListener('authReady', async ({ detail }) => {
  if (_dataLoaded) return;
  _dataLoaded = true;

  console.log(' authReady — tenant:', detail.member.tenantId, '| role:', detail.member.role);

  try {
    await auth.currentUser?.getIdToken(true);
    console.log(' Token refreshed — claims active');
  } catch (e) {
    console.warn('⚠ Token refresh failed:', e.message);
  }

  await loadAllData();
});

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    console.log(' Loading data for tenant:', TENANT_ID);

    const [membersSnap, contribSnap, eventsSnap] = await Promise.all([
      membersCollection().orderBy('joined', 'desc').get(),
      contributionsCollection().orderBy('date', 'desc').get(),
      eventsCollection().orderBy('date', 'asc').get()
    ]);

    members = membersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(m => m.name && m.phone);

    contributions = contribSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    events        = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    try {
      const pledgesSnap = await pledgesCollection().orderBy('createdAt', 'desc').get();
      pledges = pledgesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      console.log(' No pledges collection yet');
      pledges = [];
    }

    // Expose to window so PLEDGES + ANALYTICS modules can access them
    window.members       = members;
    window.contributions = contributions;
    window.events        = events;
    window.pledges       = pledges;

      try {
        const tenantDoc = await db.collection('tenants').doc(TENANT_ID).get();
        if (tenantDoc.exists) window.tenantData = tenantDoc.data();
    } catch (e) {
        console.warn(' Could not load tenant data:', e.message);
    }

    console.log(
      ' Loaded —',
      members.length,       'members ·',
      contributions.length, 'contributions ·',
      events.length,        'events ·',
      pledges.length,       'pledges'
    );

    paginationState.members.totalItems       = members.length;
    paginationState.contributions.totalItems = contributions.length;
    paginationState.events.totalItems        = events.length;
    paginationState.pledges.totalItems       = pledges.length;

    updateDashboard();
    renderMembers();

    // ✅ Stay on whatever tab the user is on — only default to dashboard on first load
    switchTab(_activeTab);

  } catch (error) {
    console.error(' loadAllData error:', error);
    alert('Error loading data. Please refresh the page.');
  }
}

// ── Tab switching ──────────────────────────────────────────────────────────────
function switchTab(tabName) {
  // ✅ Save so data reloads don't reset back to dashboard
  _activeTab = tabName;

  document.querySelectorAll('.content').forEach(c => {
    c.classList.remove('active');
    c.style.display = 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const section = document.getElementById(tabName);
  if (section) {
    section.classList.add('active');
    section.style.display = 'block';
  }

  const btn = document.querySelector(
    `.tab-btn[onclick*="'${tabName}'"], .tab-btn[onclick*='"${tabName}"']`
  );
  if (btn) btn.classList.add('active');

  const handlers = {
    dashboard:     updateDashboard,
    members:       renderMembers,
    contributions: renderContributions,
    events:        renderEvents,
    pledges:       () => typeof renderPledgesTab === 'function'
                           ? renderPledgesTab()
                           : loadPledgesPage(),
    analytics:     () => typeof initAnalyticsTab === 'function'
                           ? initAnalyticsTab()
                           : alert('Analytics module failed to load.'),
    admin:         () => { if (typeof loadUsers === 'function') { loadUsers(); loadAuditLogs?.(); } }
  };

  handlers[tabName]?.();
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function updateDashboard() {
  const total     = contributions.reduce((s, c) => s + (c.amount || 0), 0);
  const tithes    = contributions.filter(c => c.type === 'Tithe').reduce((s, c) => s + (c.amount || 0), 0);
  const offerings = contributions.filter(c => c.type === 'Offering').reduce((s, c) => s + (c.amount || 0), 0);
  const building  = contributions.filter(c => c.type === 'Building Fund').reduce((s, c) => s + (c.amount || 0), 0);
  const mission   = contributions.filter(c => c.type === 'Mission').reduce((s, c) => s + (c.amount || 0), 0);
  const other     = contributions.filter(c => c.type === 'Other').reduce((s, c) => s + (c.amount || 0), 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('totalMembers',   members.length);
  set('monthlyTotal',   `KSh ${total.toLocaleString()}`);
  set('tithesTotal',    `KSh ${tithes.toLocaleString()}`);
  set('activeEvents',   events.length);
  set('offeringsTotal', `KSh ${offerings.toLocaleString()}`);
  set('buildingTotal',  `KSh ${building.toLocaleString()}`);
  set('missionTotal',   `KSh ${mission.toLocaleString()}`);
  set('otherTotal',     `KSh ${other.toLocaleString()}`);

  const avg          = total / (contributions.length || 1);
  const uniqueGroups = [...new Set(members.map(m => m.group))].length;
  const latestEvent  = events[0]?.name || 'None scheduled';

  const qs = document.getElementById('quickStats');
  if (qs) {
    qs.innerHTML = `
      <p style="margin-bottom:10px">Average Contribution: <strong>KSh ${Math.round(avg).toLocaleString()}</strong></p>
      <p style="margin-bottom:10px">Active Groups: <strong>${uniqueGroups}</strong></p>
      <p style="margin-bottom:10px">Total Contributions: <strong>${contributions.length} transactions</strong></p>
      <p>Latest Event: <strong>${latestEvent}</strong></p>
    `;
  }
}

// ── Pledges fallback ───────────────────────────────────────────────────────────
function loadPledgesPage() {
  const state     = paginationState.pledges;
  const container = document.getElementById('pledgesTable');
  if (!container) return;

  const totalCountEl = document.getElementById('pledgesTotalCount');
  if (totalCountEl) totalCountEl.textContent = pledges.length;

  if (pledges.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"></div>
        <p>No pledges recorded yet.</p>
      </div>`;
    updatePaginationControls('pledges');
    return;
  }

  const pageData = pledges.slice(
    (state.currentPage - 1) * state.itemsPerPage,
    state.currentPage * state.itemsPerPage
  );

  const rows = pageData.map(p => {
    const pct = Math.round(((p.paidAmount || 0) / (p.amount || 1)) * 100);
    return `
      <tr>
        <td><strong>${p.memberName}</strong></td>
        <td><span class="badge badge-primary">${p.category}</span></td>
        <td style="color:#f44336;font-weight:bold">KSh ${(p.amount || 0).toLocaleString()}</td>
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
                  onclick="recordPledgePayment('${p.id}')">Pay</button>
          <button class="btn btn-whatsapp"
                  onclick="sendWhatsApp('${p.phone || ''}')">WhatsApp</button>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Member</th><th>Category</th><th>Amount</th>
            <th>Progress</th><th>Status</th><th>End Date</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  updatePaginationControls('pledges');
}

// ── WhatsApp ───────────────────────────────────────────────────────────────────
function sendWhatsAppReminder(name, phone, type) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0'))    clean = '254' + clean.substring(1);
  if (!clean.startsWith('254')) clean = '254' + clean;

  const churchName = window.tenantData?.churchName || 'TENANT_ID.toUpperCase()';
  const templates  = {
    tithe:    `Reminder: Tithe Contribution\n\nDear ${name},\n\nThis is a friendly reminder from ${churchName} about your tithe contribution.\n\n"Bring the whole tithe into the storehouse..." - Malachi 3:10\n\nPayment Options:\nM-Pesa: [Your Paybill/Till]\nBank: [Your Account]\nCash: During service\n\nGod bless you!\n${churchName}`,
    building: `Reminder: Building Fund\n\nDear ${name},\n\nThis is a friendly reminder from ${churchName} about your Building Fund pledge.\n\nTogether we are building God's house!\n\nPayment Options:\nM-Pesa: [Your Paybill/Till]\nBank: [Your Account]\nCash: During service\n\nThank you for your partnership!\n${churchName}`
  };

  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(templates[type] ?? '')}`, '_blank');
}

// ── Modals ─────────────────────────────────────────────────────────────────────
const openAddMemberModal       = () => document.getElementById('addMemberModal')?.classList.add('active');
const openAddContributionModal = () => document.getElementById('addContributionModal')?.classList.add('active');
const openAddEventModal        = () => document.getElementById('addEventModal')?.classList.add('active');

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}