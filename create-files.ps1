# ── state.js ──────────────────────────────────────────────────────────────────
@'
// state.js — global data cache & pagination state (loaded first)

let members       = [];
let contributions = [];
let events        = [];
let pledges       = [];

const paginationState = {
  members:       { currentPage: 1, itemsPerPage: 10,  totalItems: 0, searchQuery: '' },
  contributions: { currentPage: 1, itemsPerPage: 20,  totalItems: 0, searchQuery: '' },
  events:        { currentPage: 1, itemsPerPage: 10,  totalItems: 0, searchQuery: '' },
  pledges:       { currentPage: 1, itemsPerPage: 20,  totalItems: 0 }
};
'@ | Set-Content -Encoding UTF8 state.js
Write-Host "✅ state.js created"

# ── pagination.js ─────────────────────────────────────────────────────────────
@'
// pagination.js — shared paginator + controls
// Depends on: state.js

function _paginate(filtered, state, section, pageSizes, placeholder) {
  const totalPages     = Math.ceil(filtered.length / state.itemsPerPage);
  const startIndex     = (state.currentPage - 1) * state.itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + state.itemsPerPage);

  const sizeOptions = pageSizes.map(n =>
    `<option value="${n}" ${state.itemsPerPage === n ? 'selected' : ''}>${n}</option>`
  ).join('');

  const paginationHTML = `
    <div class="pagination-container">
      <div class="pagination-top">
        <div class="items-per-page">
          <label>Show:</label>
          <select onchange="changeItemsPerPage('${section}', this.value)">${sizeOptions}</select>
        </div>
        <div class="search-box">
          <input type="text" placeholder=" ${placeholder}"
                 value="${state.searchQuery}"
                 oninput="searchItems('${section}', this.value)">
        </div>
      </div>
      <div class="pagination-controls">
        <button onclick="changePage('${section}', ${state.currentPage - 1})"
                ${state.currentPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span class="page-info">Page ${state.currentPage} of ${totalPages || 1}</span>
        <button onclick="changePage('${section}', ${state.currentPage + 1})"
                ${state.currentPage >= totalPages ? 'disabled' : ''}>Next →</button>
      </div>
    </div>`;

  return { paginatedItems, paginationHTML };
}

function changePage(section, page) {
  paginationState[section].currentPage = page;
  ({ members: renderMembers, contributions: renderContributions, events: renderEvents }[section] ?? (() => {}))();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changeItemsPerPage(section, value) {
  paginationState[section].itemsPerPage = parseInt(value);
  paginationState[section].currentPage  = 1;
  changePage(section, 1);
}

function searchItems(section, query) {
  paginationState[section].searchQuery = query;
  paginationState[section].currentPage = 1;
  changePage(section, 1);
}

function updatePaginationControls(section) {
  const state      = paginationState[section];
  const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
  const el = (id) => document.getElementById(id);
  if (el(`${section}PageInfo`)) el(`${section}PageInfo`).textContent = `Page ${state.currentPage} of ${totalPages || 1}`;
  if (el(`${section}PrevBtn`)) el(`${section}PrevBtn`).disabled = state.currentPage === 1;
  if (el(`${section}NextBtn`)) el(`${section}NextBtn`).disabled = state.currentPage >= totalPages || totalPages === 0;
}

// Legacy aliases
const searchMembers          = () => searchItems('members',       document.getElementById('memberSearch')?.value ?? '');
const searchEvents           = () => searchItems('events',        document.getElementById('eventSearch')?.value  ?? '');
const loadContributionsPage  = () => renderContributions();
const nextPledgesPage        = () => { const s = paginationState.pledges; if (s.currentPage < Math.ceil(s.totalItems / s.itemsPerPage)) { s.currentPage++; loadPledgesPage(); window.scrollTo({ top:0, behavior:'smooth' }); } };
const previousPledgesPage    = () => { const s = paginationState.pledges; if (s.currentPage > 1) { s.currentPage--; loadPledgesPage(); window.scrollTo({ top:0, behavior:'smooth' }); } };
'@ | Set-Content -Encoding UTF8 pagination.js
Write-Host "✅ pagination.js created"

# ── members.js ────────────────────────────────────────────────────────────────
@'
// members.js — render, add, delete members
// Depends on: state.js, pagination.js, firebase-config.js

function renderMembers() {
  const container = document.getElementById('membersTable');
  const state     = paginationState.members;

  if (members.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No members yet. Add your first member!</p></div>';
    return;
  }

  const filtered = members.filter(m => {
    const q = state.searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) ||
           m.phone.includes(q) ||
           m.group.toLowerCase().includes(q);
  });

  const { paginatedItems, paginationHTML } = _paginate(filtered, state, 'members', [5, 10, 25, 50, 100], 'Search members...');

  const tableHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Name</th><th>Phone</th><th>Group</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${paginatedItems.map(m => `
          <tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.phone}</td>
            <td><span class="badge badge-primary">${m.group}</span></td>
            <td>${m.joined}</td>
            <td><span class="badge badge-success">${m.status}</span></td>
            <td style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${m.name}','${m.phone}','tithe')"> Tithe</button>
              <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${m.name}','${m.phone}','building')"> Building</button>
              <button class="btn btn-danger"   onclick="deleteMember('${m.id}')">Delete</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  const cardsHTML = `
    <div class="cards-container" style="display:none">
      ${paginatedItems.map(m => `
        <div class="member-card">
          <div class="card-name">${m.name}</div>
          <div class="card-info-row">
            <span class="card-label"> Phone</span>
            <span class="card-value card-phone">
              <a href="tel:${m.phone}" style="color:inherit;text-decoration:none">${m.phone}</a>
            </span>
          </div>
          <div class="card-info-row">
            <span class="card-label"> Group</span>
            <span class="card-value"><span class="badge badge-primary">${m.group}</span></span>
          </div>
          <div class="card-info-row"><span class="card-label">Joined</span><span class="card-value">${m.joined}</span></div>
          <div class="card-info-row">
            <span class="card-label">Status</span>
            <span class="card-value"><span class="badge badge-success">${m.status}</span></span>
          </div>
          <div class="card-actions">
            <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${m.name}','${m.phone}','tithe')"> Send Tithe Reminder</button>
            <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${m.name}','${m.phone}','building')"> Send Building Fund Reminder</button>
            <button class="btn btn-danger"   onclick="deleteMember('${m.id}')"> Delete Member</button>
          </div>
        </div>`).join('')}
    </div>`;

  container.innerHTML = paginationHTML + tableHTML + cardsHTML;
}

async function addMember() {
  const name  = document.getElementById('memberName').value.trim();
  const phone = document.getElementById('memberPhone').value.trim();
  const group = document.getElementById('memberGroup').value;

  if (!name || !phone) { alert('Please fill all required fields'); return; }

  try {
    await membersCollection().add({
      name, phone, group,
      tenantId:  TENANT_ID,
      joined:    new Date().toISOString().split('T')[0],
      status:    'Active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('memberName').value  = '';
    document.getElementById('memberPhone').value = '';
    document.getElementById('memberGroup').value = 'General';
    closeModal('addMemberModal');
    await loadAllData();
    alert('✅ Member added successfully!');
  } catch (error) {
    console.error('❌ addMember error:', error);
    alert('Error adding member. Please try again.');
  }
}

async function deleteMember(id) {
  if (!confirm('Are you sure you want to delete this member?')) return;
  try {
    await membersCollection().doc(id).delete();
    await loadAllData();
    alert('✅ Member deleted successfully!');
  } catch (error) {
    console.error('❌ deleteMember error:', error);
    alert('Error deleting member. Please try again.');
  }
}
'@ | Set-Content -Encoding UTF8 members.js
Write-Host "✅ members.js created"

# ── contributions.js ──────────────────────────────────────────────────────────
@'
// contributions.js — render, add, delete contributions
// Depends on: state.js, pagination.js, firebase-config.js

function renderContributions() {
  const container = document.getElementById('contributionsTable');
  const state     = paginationState.contributions;

  if (contributions.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><p>No contributions recorded yet.</p></div>';
    return;
  }

  const filtered = contributions.filter(c => {
    const q = state.searchQuery.toLowerCase();
    return c.member.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
  });

  const { paginatedItems, paginationHTML } = _paginate(filtered, state, 'contributions', [10, 20, 50, 100], 'Search contributions...');

  const tableHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Member</th><th>Type</th><th>Amount</th><th>Method</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        ${paginatedItems.map(c => `
          <tr>
            <td><strong>${c.member}</strong></td>
            <td><span class="badge badge-primary">${c.type}</span></td>
            <td style="color:#16a34a;font-weight:bold">KSh ${c.amount.toLocaleString()}</td>
            <td>${c.method}</td>
            <td>${c.date}</td>
            <td><button class="btn btn-danger" onclick="deleteContribution('${c.id}')">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  const cardsHTML = `
    <div class="cards-container" style="display:none">
      ${paginatedItems.map(c => `
        <div class="contribution-card">
          <div class="card-name"> ${c.member}</div>
          <div class="card-info-row">
            <span class="card-label"> Type</span>
            <span class="card-value"><span class="badge badge-primary">${c.type}</span></span>
          </div>
          <div class="card-info-row">
            <span class="card-label"> Amount</span>
            <span class="card-value contribution-amount">KSh ${c.amount.toLocaleString()}</span>
          </div>
          <div class="card-info-row"><span class="card-label"> Method</span><span class="card-value">${c.method}</span></div>
          <div class="card-info-row"><span class="card-label"> Date</span><span class="card-value">${c.date}</span></div>
          <div class="card-actions">
            <button class="btn btn-danger" onclick="deleteContribution('${c.id}')"> Delete Contribution</button>
          </div>
        </div>`).join('')}
    </div>`;

  container.innerHTML = paginationHTML + tableHTML + cardsHTML;
}

async function addContribution() {
  const member = document.getElementById('contribMember').value.trim();
  const type   = document.getElementById('contribType').value;
  const amount = parseFloat(document.getElementById('contribAmount').value);
  const method = document.getElementById('contribMethod').value;

  if (!member || !amount || amount <= 0) { alert('Please fill all required fields correctly'); return; }

  try {
    await contributionsCollection().add({
      member, type, amount, method,
      tenantId:  TENANT_ID,
      date:      new Date().toISOString().split('T')[0],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('contribMember').value = '';
    document.getElementById('contribAmount').value = '';
    closeModal('addContributionModal');
    await loadAllData();
    alert('✅ Contribution recorded successfully!');
  } catch (error) {
    console.error('❌ addContribution error:', error);
    alert('Error recording contribution. Please try again.');
  }
}

async function deleteContribution(id) {
  if (!confirm('Are you sure you want to delete this contribution?')) return;
  try {
    await contributionsCollection().doc(id).delete();
    await loadAllData();
    alert('✅ Contribution deleted successfully!');
  } catch (error) {
    console.error('❌ deleteContribution error:', error);
    alert('Error deleting contribution. Please try again.');
  }
}
'@ | Set-Content -Encoding UTF8 contributions.js
Write-Host "✅ contributions.js created"

# ── events.js ─────────────────────────────────────────────────────────────────
@'
// events.js — render, add, delete events
// Depends on: state.js, pagination.js, firebase-config.js

function renderEvents() {
  const container = document.getElementById('eventsTable');
  const state     = paginationState.events;

  if (events.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><p>No events scheduled.</p></div>';
    return;
  }

  const filtered = events.filter(e => {
    const q = state.searchQuery.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.date.includes(q);
  });

  const { paginatedItems, paginationHTML } = _paginate(filtered, state, 'events', [5, 10, 25], 'Search events...');

  const tableHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Event Name</th><th>Date</th><th>Time</th><th>Expected</th><th>Actions</th></tr></thead>
      <tbody>
        ${paginatedItems.map(e => `
          <tr>
            <td><strong>${e.name}</strong></td>
            <td>${e.date}</td>
            <td>${e.time}</td>
            <td>${e.expected} people</td>
            <td><button class="btn btn-danger" onclick="deleteEvent('${e.id}')">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  const cardsHTML = `
    <div class="cards-container" style="display:none">
      ${paginatedItems.map(e => `
        <div class="event-card">
          <div class="card-name"> ${e.name}</div>
          <div class="card-info-row"><span class="card-label"> Date</span><span class="card-value">${e.date}</span></div>
          <div class="card-info-row"><span class="card-label"> Time</span><span class="card-value">${e.time}</span></div>
          <div class="card-info-row"><span class="card-label">👥 Expected</span><span class="card-value">${e.expected} people</span></div>
          <div class="card-actions">
            <button class="btn btn-danger" onclick="deleteEvent('${e.id}')"> Delete Event</button>
          </div>
        </div>`).join('')}
    </div>`;

  container.innerHTML = paginationHTML + tableHTML + cardsHTML;
}

async function addEvent() {
  const name     = document.getElementById('eventName').value.trim();
  const date     = document.getElementById('eventDate').value;
  const time     = document.getElementById('eventTime').value;
  const expected = parseInt(document.getElementById('eventExpected').value);

  if (!name || !date || !time) { alert('Please fill all required fields'); return; }

  try {
    await eventsCollection().add({
      name, date, time, expected,
      tenantId:  TENANT_ID,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('eventName').value     = '';
    document.getElementById('eventDate').value     = '';
    document.getElementById('eventTime').value     = '';
    document.getElementById('eventExpected').value = '50';
    closeModal('addEventModal');
    await loadAllData();
    alert('✅ Event added successfully!');
  } catch (error) {
    console.error('❌ addEvent error:', error);
    alert('Error adding event. Please try again.');
  }
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  try {
    await eventsCollection().doc(id).delete();
    await loadAllData();
    alert('✅ Event deleted successfully!');
  } catch (error) {
    console.error('❌ deleteEvent error:', error);
    alert('Error deleting event. Please try again.');
  }
}
'@ | Set-Content -Encoding UTF8 events.js
Write-Host "✅ events.js created"

# ── main.js ───────────────────────────────────────────────────────────────────
@'
// main.js — bootstrap, dashboard, tab switching, modals, WhatsApp
// Depends on: state.js, pagination.js, members.js, contributions.js, events.js

// ── Bootstrap ──────────────────────────────────────────────────────────────────
document.addEventListener('authReady', async ({ detail }) => {
  console.log(`✅ authReady — tenant: ${detail.member.tenantId}, role: ${detail.member.role}`);
  await loadAllData();
});

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    console.log(`📡 Loading data for tenant: ${TENANT_ID}`);

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

    console.log(`✅ ${members.length} members · ${contributions.length} contributions · ${events.length} events · ${pledges.length} pledges`);

    paginationState.members.totalItems       = members.length;
    paginationState.contributions.totalItems = contributions.length;
    paginationState.events.totalItems        = events.length;
    paginationState.pledges.totalItems       = pledges.length;

    updateDashboard();
    renderMembers();
    switchTab('dashboard');

  } catch (error) {
    console.error('❌ loadAllData error:', error);
    alert('Error loading data. Please refresh the page.');
  }
}

// ── Tab switching ──────────────────────────────────────────────────────────────
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

// ── Dashboard ──────────────────────────────────────────────────────────────────
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

// ── Pledges fallback (used when pledges.js is absent) ─────────────────────────
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

// ── WhatsApp ───────────────────────────────────────────────────────────────────
function sendWhatsAppReminder(name, phone, type) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0'))    clean = '254' + clean.substring(1);
  if (!clean.startsWith('254')) clean = '254' + clean;

  const churchName = 'SimamiaKanisa Church';
  const templates  = {
    tithe:    `🙏 *Reminder: Tithe Contribution*\n\nDear ${name},\n\nThis is a friendly reminder from ${churchName} about your tithe contribution.\n\n*"Bring the whole tithe into the storehouse..."* - Malachi 3:10\n\nPayment Options:\n📱 M-Pesa: [Your Paybill/Till]\n🏦 Bank: [Your Account]\n💵 Cash: During service\n\nGod bless you!\n${churchName}`,
    building: `🏗️ *Reminder: Building Fund*\n\nDear ${name},\n\nThis is a friendly reminder from ${churchName} about your Building Fund pledge.\n\nTogether we are building God'\''s house!\n\nPayment Options:\n📱 M-Pesa: [Your Paybill/Till]\n🏦 Bank: [Your Account]\n💵 Cash: During service\n\nThank you for your partnership!\n${churchName}`
  };
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(templates[type] ?? '')}`, '_blank');
}

// ── Modals ─────────────────────────────────────────────────────────────────────
const openAddMemberModal       = () => document.getElementById('addMemberModal').classList.add('active');
const openAddContributionModal = () => document.getElementById('addContributionModal').classList.add('active');
const openAddEventModal        = () => document.getElementById('addEventModal').classList.add('active');
const closeModal               = (id) => document.getElementById(id).classList.remove('active');
'@ | Set-Content -Encoding UTF8 main.js
Write-Host "✅ main.js created"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ All 6 files created successfully!"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Get-ChildItem state.js, pagination.js, members.js, contributions.js, events.js, main.js |
  Select-Object Name, @{N='Size';E={"$([math]::Round($_.Length/1KB,1)) KB"}}