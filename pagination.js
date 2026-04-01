// pagination.js â€” shared paginator + controls
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
                ${state.currentPage === 1 ? 'disabled' : ''}>â† Previous</button>
        <span class="page-info">Page ${state.currentPage} of ${totalPages || 1}</span>
        <button onclick="changePage('${section}', ${state.currentPage + 1})"
                ${state.currentPage >= totalPages ? 'disabled' : ''}>Next â†’</button>
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
