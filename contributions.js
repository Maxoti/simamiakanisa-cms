// contributions.js â€” render, add, delete contributions
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
    alert('âœ… Contribution recorded successfully!');
  } catch (error) {
    console.error('âŒ addContribution error:', error);
    alert('Error recording contribution. Please try again.');
  }
}

async function deleteContribution(id) {
  if (!confirm('Are you sure you want to delete this contribution?')) return;
  try {
    await contributionsCollection().doc(id).delete();
    await loadAllData();
    alert('âœ… Contribution deleted successfully!');
  } catch (error) {
    console.error('âŒ deleteContribution error:', error);
    alert('Error deleting contribution. Please try again.');
  }
}
