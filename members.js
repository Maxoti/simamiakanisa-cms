// members.js — render, add, delete members
// Depends on: state.js, pagination.js, firebase-config.js

function renderMembers() {
  const container = document.getElementById('membersTable');
  const state     = paginationState.members;

  if (members.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No members yet. Add your first member!</p></div>';
    return;
  }

  // Guard: skip any member doc missing required fields
  const valid = members.filter(m => m && m.name && m.phone && m.group);

  const filtered = valid.filter(m => {
    const q = state.searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) ||
           m.phone.toLowerCase().includes(q) ||
           m.group.toLowerCase().includes(q);
  });

  const { paginatedItems, paginationHTML } = _paginate(
    filtered, state, 'members', [5, 10, 25, 50, 100], 'Search members...'
  );

  const tableHTML = `
    <div class="table-wrapper"><table>
      <thead>
        <tr>
          <th>Name</th><th>Phone</th><th>Group</th>
          <th>Joined</th><th>Status</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${paginatedItems.map(m => `
          <tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.phone}</td>
            <td><span class="badge badge-primary">${m.group}</span></td>
            <td>${m.joined || '—'}</td>
            <td><span class="badge badge-success">${m.status || 'Active'}</span></td>
            <td style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-whatsapp"
                      onclick="sendWhatsAppReminder('${m.name}','${m.phone}','tithe')">Tithe</button>
              <button class="btn btn-whatsapp"
                      onclick="sendWhatsAppReminder('${m.name}','${m.phone}','building')">Building</button>
              <button class="btn btn-danger"
                      onclick="deleteMember('${m.id}')">Delete</button>
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
            <span class="card-label">Phone</span>
            <span class="card-value card-phone">
              <a href="tel:${m.phone}" style="color:inherit;text-decoration:none">${m.phone}</a>
            </span>
          </div>
          <div class="card-info-row">
            <span class="card-label">Group</span>
            <span class="card-value"><span class="badge badge-primary">${m.group}</span></span>
          </div>
          <div class="card-info-row">
            <span class="card-label">Joined</span>
            <span class="card-value">${m.joined || '—'}</span>
          </div>
          <div class="card-info-row">
            <span class="card-label">Status</span>
            <span class="card-value"><span class="badge badge-success">${m.status || 'Active'}</span></span>
          </div>
          <div class="card-actions">
            <button class="btn btn-whatsapp"
                    onclick="sendWhatsAppReminder('${m.name}','${m.phone}','tithe')">Send Tithe Reminder</button>
            <button class="btn btn-whatsapp"
                    onclick="sendWhatsAppReminder('${m.name}','${m.phone}','building')">Send Building Fund Reminder</button>
            <button class="btn btn-danger"
                    onclick="deleteMember('${m.id}')">Delete Member</button>
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
    alert(' Member added successfully!');
  } catch (error) {
    console.error(' addMember error:', error);
    alert('Error adding member. Please try again.');
  }
}

async function deleteMember(id) {
  if (!confirm('Are you sure you want to delete this member?')) return;
  try {
    await membersCollection().doc(id).delete();
    await loadAllData();
    alert(' Member deleted successfully!');
  } catch (error) {
    console.error(' deleteMember error:', error);
    alert('Error deleting member. Please try again.');
  }
}