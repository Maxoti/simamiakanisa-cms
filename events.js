// events.js — render, add, delete events, notify members via SMS
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
            <td class="action-btns">
              <button class="btn btn-notify "
                onclick="sendEventSMS('${e.id}', '${e.name.replace(/'/g, "\\'")}')">
                 Notify
              </button>
              <button class="btn btn-danger"
                onclick="deleteEvent('${e.id}')">
                Delete
              </button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  const cardsHTML = `
    <div class="cards-container" style="display:none">
      ${paginatedItems.map(e => `
        <div class="event-card">
          <div class="card-name">${e.name}</div>
          <div class="card-info-row"><span class="card-label">Date</span><span class="card-value">${e.date}</span></div>
          <div class="card-info-row"><span class="card-label">Time</span><span class="card-value">${e.time}</span></div>
          <div class="card-info-row"><span class="card-label">👥 Expected</span><span class="card-value">${e.expected} people</span></div>
          <div class="card-actions">
            <button class="btn btn-notify"
              onclick="sendEventSMS('${e.id}', '${e.name.replace(/'/g, "\\'")}')">
               Notify Members
            </button>
            <button class="btn btn-danger"
              onclick="deleteEvent('${e.id}')">
              Delete Event
            </button>
          </div>
        </div>`).join('')}
    </div>`;

  container.innerHTML = paginationHTML + tableHTML + cardsHTML;
}

// ── Send SMS notification to all church members for an event ─────────────────
async function sendEventSMS(eventId, eventName) {
  if (!confirm(`Send SMS about "${eventName}" to ALL church members?`)) return;

  const btn = document.querySelector(`button[onclick="sendEventSMS('${eventId}', '${eventName.replace(/'/g, "\\'")}')"]`);
  if (btn) { btn.disabled = true; btn.textContent = ' Sending...'; }

  try {
    //  Wait for auth to be ready before getting token
    const user = await new Promise((resolve, reject) => {
      const unsubscribe = firebase.auth().onAuthStateChanged(user => {
        unsubscribe();
        if (user) resolve(user);
        else reject(new Error('Not authenticated'));
      });
    });

    const token = await user.getIdToken(true);  // true = force refresh

    const res = await fetch(`${API_BASE_URL}/api/sms/event/${eventId}/notify`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        tenantId: TENANT_ID,
        sentBy:   user.uid
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert(` Queued ${data.queued} SMS message(s) for "${data.event}"`);
    } else {
      alert(` ${data.error || 'Failed to send notifications'}`);
    }

  } catch (error) {
    console.error(' sendEventSMS error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📲 Notify'; }
  }
}

// ── Add event ────────────────────────────────────────────────────────────────
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
    console.error(' addEvent error:', error);
    alert('Error adding event. Please try again.');
  }
}

// ── Delete event ─────────────────────────────────────────────────────────────
async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  try {
    await eventsCollection().doc(id).delete();
    await loadAllData();
    alert('✅ Event deleted successfully!');
  } catch (error) {
    console.error(' deleteEvent error:', error);
    alert('Error deleting event. Please try again.');
  }
}