// events.js â€” render, add, delete events
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
          <div class="card-info-row"><span class="card-label">ðŸ‘¥ Expected</span><span class="card-value">${e.expected} people</span></div>
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
    alert('âœ… Event added successfully!');
  } catch (error) {
    console.error('âŒ addEvent error:', error);
    alert('Error adding event. Please try again.');
  }
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  try {
    await eventsCollection().doc(id).delete();
    await loadAllData();
    alert('âœ… Event deleted successfully!');
  } catch (error) {
    console.error('âŒ deleteEvent error:', error);
    alert('Error deleting event. Please try again.');
  }
}
