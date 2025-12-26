// SimamiaKanisa - Church Management System with Firebase
// Main JavaScript File

// Global arrays to cache data
let members = [];
let contributions = [];
let events = [];


// Pagination state (existing + new merged)
const paginationState = {
    members: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        searchQuery: ''
    },
    contributions: {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        searchQuery: ''
    },
    events: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        searchQuery: ''
    },
    pledges: {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0
    }
};

/**
 * Load all data from Firebase on startup
 */
async function loadAllData() {
    try {
        console.log('🔄 Loading data from Firebase...');
        
        // Load members
        const membersSnapshot = await membersCollection.orderBy('joined', 'desc').get();
        members = membersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Load contributions
        const contribSnapshot = await contributionsCollection.orderBy('date', 'desc').get();
        contributions = contribSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Load events
        const eventsSnapshot = await eventsCollection.orderBy('date', 'asc').get();
        events = eventsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Load pledges if collection exists
        try {
            const pledgesSnapshot = await db.collection('pledges').orderBy('createdAt', 'desc').get();
            pledges = pledgesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.log('ℹ️ No pledges collection yet');
            pledges = [];
        }
        
        console.log('✅ Data loaded successfully!');
        console.log(`📊 Loaded: ${members.length} members, ${contributions.length} contributions, ${events.length} events, ${pledges.length} pledges`);
        
        // Set pagination totals
        paginationState.members.totalItems = members.length;
        paginationState.contributions.totalItems = contributions.length;
        paginationState.events.totalItems = events.length;
        paginationState.pledges.totalItems = pledges.length;
        
        // Render initial view - show dashboard by default
        updateDashboard();
        renderMembers();
        
        // Switch to dashboard tab
        switchTab('dashboard');
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        alert('Error loading data from database. Please check console and refresh the page.');
    }
}

/**
 * Switch between tabs - FIXED VERSION
 */
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all content
    document.querySelectorAll('.content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Show selected content
    const selectedSection = document.getElementById(tabName);
    if (selectedSection) {
        selectedSection.classList.add('active');
        selectedSection.style.display = 'block';
    }
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[onclick*="switchTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    // Refresh data based on tab
    if (tabName === 'dashboard') {
        updateDashboard();
    } else if (tabName === 'members') {
        renderMembers();
    } else if (tabName === 'contributions') {
        renderContributions();
    } else if (tabName === 'events') {
        renderEvents();
    } else if (tabName === 'pledges') {
        // ✅ FIX: Use pledges.js function
        if (typeof renderPledgesTab === 'function') {
            renderPledgesTab();
        } else {
            console.error('❌ renderPledgesTab not found! Check if pledges.js is loaded.');
            loadPledgesPage(); // Fallback
        }
    } else if (tabName === 'analytics') {
        console.log('Loading analytics...');
        if (typeof initAnalyticsTab === 'function') {
            initAnalyticsTab();
        } else {
            console.error('❌ Analytics module not loaded!');
            alert('Analytics module failed to load. Check if analytics.js is present.');
        }
    } else if (tabName === 'admin') {
        if (typeof loadUsers === 'function') {
            loadUsers();
            if (typeof loadAuditLogs === 'function') {
                loadAuditLogs();
            }
        }
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboard() {
    // Calculate main stats
    document.getElementById('totalMembers').textContent = members.length;
    
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    document.getElementById('monthlyTotal').textContent = `KSh ${total.toLocaleString()}`;
    
    // Calculate totals for each contribution type
    const tithes = contributions.filter(c => c.type === 'Tithe').reduce((sum, c) => sum + c.amount, 0);
    const offerings = contributions.filter(c => c.type === 'Offering').reduce((sum, c) => sum + c.amount, 0);
    const building = contributions.filter(c => c.type === 'Building Fund').reduce((sum, c) => sum + c.amount, 0);
    const mission = contributions.filter(c => c.type === 'Mission').reduce((sum, c) => sum + c.amount, 0);
    const other = contributions.filter(c => c.type === 'Other').reduce((sum, c) => sum + c.amount, 0);
    
    // Update main stat cards
    document.getElementById('tithesTotal').textContent = `KSh ${tithes.toLocaleString()}`;
    document.getElementById('activeEvents').textContent = events.length;
    
    // Update contribution breakdown cards
    document.getElementById('offeringsTotal').textContent = `KSh ${offerings.toLocaleString()}`;
    document.getElementById('buildingTotal').textContent = `KSh ${building.toLocaleString()}`;
    document.getElementById('missionTotal').textContent = `KSh ${mission.toLocaleString()}`;
    document.getElementById('otherTotal').textContent = `KSh ${other.toLocaleString()}`;

    // Quick stats
    const avgContribution = total / (contributions.length || 1);
    const uniqueGroups = [...new Set(members.map(m => m.group))].length;
    const latestEvent = events[0]?.name || 'None scheduled';
    
    const stats = `
        <p style="margin-bottom: 10px;">📊 Average Contribution: <strong>KSh ${Math.round(avgContribution).toLocaleString()}</strong></p>
        <p style="margin-bottom: 10px;">👥 Active Groups: <strong>${uniqueGroups}</strong></p>
        <p style="margin-bottom: 10px;"> Total Contributions: <strong>${contributions.length} transactions</strong></p>
        <p>📅 Latest Event: <strong>${latestEvent}</strong></p>
    `;
    document.getElementById('quickStats').innerHTML = stats;
}

/* ===================================
   NEW: MOBILE CARD RENDER FUNCTIONS
   =================================== */

/**
 * Render members with pagination and mobile cards
 */
function renderMembers() {
    const container = document.getElementById('membersTable');
    const state = paginationState.members;
    
    if (members.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No members yet. Add your first member!</p></div>';
        return;
    }

    // Filter members based on search
    const filteredMembers = members.filter(member => {
        const query = state.searchQuery.toLowerCase();
        return member.name.toLowerCase().includes(query) ||
               member.phone.includes(query) ||
               member.group.toLowerCase().includes(query);
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredMembers.length / state.itemsPerPage);
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

    // Build pagination controls
    let paginationHTML = `
        <div class="pagination-container">
            <div class="pagination-top">
                <div class="items-per-page">
                    <label>Show:</label>
                    <select onchange="changeItemsPerPage('members', this.value)">
                        <option value="5" ${state.itemsPerPage === 5 ? 'selected' : ''}>5</option>
                        <option value="10" ${state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="25" ${state.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${state.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${state.itemsPerPage === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
                <div class="search-box">
                    <input type="text" 
                           placeholder=" Search members..." 
                           value="${state.searchQuery}"
                           oninput="searchItems('members', this.value)">
                </div>
            </div>
            <div class="pagination-controls">
                <button onclick="changePage('members', ${state.currentPage - 1})" 
                        ${state.currentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                </button>
                <span class="page-info">Page ${state.currentPage} of ${totalPages || 1}</span>
                <button onclick="changePage('members', ${state.currentPage + 1})" 
                        ${state.currentPage >= totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
    `;

    // Build desktop table
    let tableHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Group</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    paginatedMembers.forEach(member => {
        tableHTML += `
            <tr>
                <td><strong>${member.name}</strong></td>
                <td>${member.phone}</td>
                <td><span class="badge badge-primary">${member.group}</span></td>
                <td>${member.joined}</td>
                <td><span class="badge badge-success">${member.status}</span></td>
                <td style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${member.name}', '${member.phone}', 'tithe')">
                        💬 Tithe
                    </button>
                    <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${member.name}', '${member.phone}', 'building')">
                         Building
                    </button>
                    <button class="btn btn-danger" onclick="deleteMember('${member.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table></div>';

    // Build mobile cards
    let cardsHTML = '<div class="cards-container" style="display: none;">';
    
    if (paginatedMembers.length === 0) {
        cardsHTML += `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>No members found matching "${state.searchQuery}"</p>
            </div>
        `;
    } else {
        paginatedMembers.forEach(member => {
            cardsHTML += `
                <div class="member-card">
                    <div class="card-name">${member.name}</div>
                    
                    <div class="card-info-row">
                        <span class="card-label">📱 Phone</span>
                        <span class="card-value card-phone">
                            <a href="tel:${member.phone}" style="color: inherit; text-decoration: none;">
                                ${member.phone}
                            </a>
                        </span>
                    </div>
                    
                    <div class="card-info-row">
                        <span class="card-label">👥 Group</span>
                        <span class="card-value">
                            <span class="badge badge-primary">${member.group}</span>
                        </span>
                    </div>
                    
                    <div class="card-info-row">
                        <span class="card-label">📅 Joined</span>
                        <span class="card-value">${member.joined}</span>
                    </div>
                    
                    <div class="card-info-row">
                        <span class="card-label">✅ Status</span>
                        <span class="card-value">
                            <span class="badge badge-success">${member.status}</span>
                        </span>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${member.name}', '${member.phone}', 'tithe')">
                            💬 Send Tithe Reminder
                        </button>
                        <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${member.name}', '${member.phone}', 'building')">
                             Send Building Fund Reminder
                        </button>
                        <button class="btn btn-danger" onclick="deleteMember('${member.id}')">
                             Delete Member
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    cardsHTML += '</div>';

    // Combine everything
    container.innerHTML = paginationHTML + tableHTML + cardsHTML;
}

/**
 * Render events with pagination and mobile cards
 */
function renderEvents() {
    const container = document.getElementById('eventsTable');
    const state = paginationState.events;
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><p>No events scheduled.</p></div>';
        return;
    }

    // Filter events
    const filteredEvents = events.filter(event => {
        const query = state.searchQuery.toLowerCase();
        return event.name.toLowerCase().includes(query) ||
               event.date.includes(query);
    });

    // Pagination
    const totalPages = Math.ceil(filteredEvents.length / state.itemsPerPage);
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    // Pagination controls
    let paginationHTML = `
        <div class="pagination-container">
            <div class="pagination-top">
                <div class="items-per-page">
                    <label>Show:</label>
                    <select onchange="changeItemsPerPage('events', this.value)">
                        <option value="5" ${state.itemsPerPage === 5 ? 'selected' : ''}>5</option>
                        <option value="10" ${state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="25" ${state.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                    </select>
                </div>
                <div class="search-box">
                    <input type="text" 
                           placeholder="🔍 Search events..." 
                           value="${state.searchQuery}"
                           oninput="searchItems('events', this.value)">
                </div>
            </div>
            <div class="pagination-controls">
                <button onclick="changePage('events', ${state.currentPage - 1})" 
                        ${state.currentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                </button>
                <span class="page-info">Page ${state.currentPage} of ${totalPages || 1}</span>
                <button onclick="changePage('events', ${state.currentPage + 1})" 
                        ${state.currentPage >= totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
    `;

    // Desktop table
    let tableHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Event Name</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Expected</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    paginatedEvents.forEach(event => {
        tableHTML += `
            <tr>
                <td><strong>${event.name}</strong></td>
                <td>${event.date}</td>
                <td>${event.time}</td>
                <td>${event.expected} people</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table></div>';

    // Mobile cards
    let cardsHTML = '<div class="cards-container" style="display: none;">';
    
    paginatedEvents.forEach(event => {
        cardsHTML += `
            <div class="event-card">
                <div class="card-name">📅 ${event.name}</div>
                
                <div class="card-info-row">
                    <span class="card-label">📆 Date</span>
                    <span class="card-value">${event.date}</span>
                </div>
                
                <div class="card-info-row">
                    <span class="card-label">🕐 Time</span>
                    <span class="card-value">${event.time}</span>
                </div>
                
                <div class="card-info-row">
                    <span class="card-label">👥 Expected</span>
                    <span class="card-value">${event.expected} people</span>
                </div>
                
                <div class="card-actions">
                    <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">
                        🗑️ Delete Event
                    </button>
                </div>
            </div>
        `;
    });
    
    cardsHTML += '</div>';

    container.innerHTML = paginationHTML + tableHTML + cardsHTML;
}

/**
 * Render contributions with pagination and mobile cards
 */
function renderContributions() {
    const container = document.getElementById('contributionsTable');
    const state = paginationState.contributions;
    
    if (contributions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><p>No contributions recorded yet.</p></div>';
        return;
    }

    // Filter contributions
    const filteredContributions = contributions.filter(contrib => {
        const query = state.searchQuery.toLowerCase();
        return contrib.member.toLowerCase().includes(query) ||
               contrib.type.toLowerCase().includes(query);
    });

    // Pagination
    const totalPages = Math.ceil(filteredContributions.length / state.itemsPerPage);
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedContributions = filteredContributions.slice(startIndex, endIndex);

    // Pagination controls
    let paginationHTML = `
        <div class="pagination-container">
            <div class="pagination-top">
                <div class="items-per-page">
                    <label>Show:</label>
                    <select onchange="changeItemsPerPage('contributions', this.value)">
                        <option value="10" ${state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="20" ${state.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                        <option value="50" ${state.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${state.itemsPerPage === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
                <div class="search-box">
                    <input type="text" 
                           placeholder="🔍 Search contributions..." 
                           value="${state.searchQuery}"
                           oninput="searchItems('contributions', this.value)">
                </div>
            </div>
            <div class="pagination-controls">
                <button onclick="changePage('contributions', ${state.currentPage - 1})" 
                        ${state.currentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                </button>
                <span class="page-info">Page ${state.currentPage} of ${totalPages || 1}</span>
                <button onclick="changePage('contributions', ${state.currentPage + 1})" 
                        ${state.currentPage >= totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
    `;

    // Desktop table
    let tableHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    paginatedContributions.forEach(contrib => {
        tableHTML += `
            <tr>
                <td><strong>${contrib.member}</strong></td>
                <td><span class="badge badge-primary">${contrib.type}</span></td>
                <td style="color: #16a34a; font-weight: bold;">KSh ${contrib.amount.toLocaleString()}</td>
                <td>${contrib.method}</td>
                <td>${contrib.date}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteContribution('${contrib.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table></div>';

    // Mobile cards
    let cardsHTML = '<div class="cards-container" style="display: none;">';
    
    paginatedContributions.forEach(contrib => {
        cardsHTML += `
            <div class="contribution-card">
                <div class="card-name">💰 ${contrib.member}</div>
                
                <div class="card-info-row">
                    <span class="card-label">📋 Type</span>
                    <span class="card-value">
                        <span class="badge badge-primary">${contrib.type}</span>
                    </span>
                </div>
                
                <div class="card-info-row">
                    <span class="card-label"> Amount</span>
                    <span class="card-value contribution-amount">KSh ${contrib.amount.toLocaleString()}</span>
                </div>
                
                <div class="card-info-row">
                    <span class="card-label"> Method</span>
                    <span class="card-value">${contrib.method}</span>
                </div>
                
                <div class="card-info-row">
                    <span class="card-label">📅 Date</span>
                    <span class="card-value">${contrib.date}</span>
                </div>
                
                <div class="card-actions">
                    <button class="btn btn-danger" onclick="deleteContribution('${contrib.id}')">
                         Delete Contribution
                    </button>
                </div>
            </div>
        `;
    });
    
    cardsHTML += '</div>';

    container.innerHTML = paginationHTML + tableHTML + cardsHTML;
}

/**
 * Change page (NEW UNIFIED FUNCTION)
 */
function changePage(section, page) {
    paginationState[section].currentPage = page;
    
    if (section === 'members') renderMembers();
    else if (section === 'contributions') renderContributions();
    else if (section === 'events') renderEvents();
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Change items per page (NEW UNIFIED FUNCTION)
 */
function changeItemsPerPage(section, value) {
    paginationState[section].itemsPerPage = parseInt(value);
    paginationState[section].currentPage = 1; // Reset to first page
    
    if (section === 'members') renderMembers();
    else if (section === 'contributions') renderContributions();
    else if (section === 'events') renderEvents();
}

/**
 * Search items (NEW UNIFIED FUNCTION)
 */
function searchItems(section, query) {
    paginationState[section].searchQuery = query;
    paginationState[section].currentPage = 1; // Reset to first page
    
    if (section === 'members') renderMembers();
    else if (section === 'contributions') renderContributions();
    else if (section === 'events') renderEvents();
}

/* ===================================
   EXISTING FUNCTIONS - KEPT INTACT
   =================================== */

/**
 * Legacy search function for compatibility
 */
function searchMembers() {
    const searchTerm = document.getElementById('memberSearch')?.value || '';
    searchItems('members', searchTerm);
}

function searchEvents() {
    const searchTerm = document.getElementById('eventSearch')?.value || '';
    searchItems('events', searchTerm);
}

// OLD PAGINATION FUNCTIONS - Keep for pledges compatibility
function changeContributionsPerPage() {
    const select = document.getElementById('contributionsPerPage');
    if (select) {
        paginationState.contributions.itemsPerPage = parseInt(select.value);
        paginationState.contributions.currentPage = 1;
        loadContributionsPage();
    }
}

function changePledgesPerPage() {
    const select = document.getElementById('pledgesPerPage');
    if (select) {
        paginationState.pledges.itemsPerPage = parseInt(select.value);
        paginationState.pledges.currentPage = 1;
        loadPledgesPage();
    }
}

function nextContributionsPage() {
    changePage('contributions', paginationState.contributions.currentPage + 1);
}

function previousContributionsPage() {
    changePage('contributions', paginationState.contributions.currentPage - 1);
}

function nextPledgesPage() {
    const state = paginationState.pledges;
    const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
    
    if (state.currentPage < totalPages) {
        state.currentPage++;
        loadPledgesPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function previousPledgesPage() {
    const state = paginationState.pledges;
    
    if (state.currentPage > 1) {
        state.currentPage--;
        loadPledgesPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function loadContributionsPage() {
    renderContributions(); // Use new render function
}

function loadPledgesPage() {
    const state = paginationState.pledges;
    const container = document.getElementById('pledgesTable');
    
    if (!container) return;
    
    const totalCountEl = document.getElementById('pledgesTotalCount');
    if (totalCountEl) {
        totalCountEl.textContent = pledges.length;
    }
    
    if (pledges.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤝</div><p>No pledges recorded yet.</p></div>';
        updatePaginationControls('pledges');
        return;
    }
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const pageData = pledges.slice(startIndex, endIndex);
    
    let html = '<div class="table-wrapper"><table><thead><tr><th>Member</th><th>Category</th><th>Amount</th><th>Progress</th><th>Status</th><th>End Date</th><th>Actions</th></tr></thead><tbody>';
    
    pageData.forEach(pledge => {
        const progress = Math.round(((pledge.paidAmount || 0) / pledge.amount) * 100);
        html += `
            <tr>
                <td data-label="Member"><strong>${pledge.memberName}</strong></td>
                <td data-label="Category"><span class="badge badge-primary">${pledge.category}</span></td>
                <td data-label="Amount" style="color: #f44336; font-weight: bold;">KSh ${pledge.amount.toLocaleString()}</td>
                <td data-label="Progress">
                    <div style="background: #e5e7eb; border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 4px;">
                        <div style="background: #22c55e; width: ${progress}%; height: 100%;"></div>
                    </div>
                    <small>${progress}%</small>
                </td>
                <td data-label="Status"><span class="badge ${pledge.status === 'Active' ? 'badge-success' : 'badge-secondary'}">${pledge.status}</span></td>
                <td data-label="End Date">${pledge.endDate}</td>
                <td data-label="Actions" style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="btn btn-success" style="padding: 6px 12px; font-size: 12px;" onclick="recordPledgePayment('${pledge.id}')">💰 Pay</button>
                    <button class="btn btn-whatsapp" onclick="sendWhatsApp('${pledge.phone || ''}')">💬 WhatsApp</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    updatePaginationControls('pledges');
}

function updatePaginationControls(section) {
    const state = paginationState[section];
    const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
    
    const pageInfo = document.getElementById(`${section}PageInfo`);
    if (pageInfo) {
        pageInfo.textContent = `Page ${state.currentPage} of ${totalPages || 1}`;
    }
    
    const prevBtn = document.getElementById(`${section}PrevBtn`);
    const nextBtn = document.getElementById(`${section}NextBtn`);
    
    if (prevBtn) {
        prevBtn.disabled = state.currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = state.currentPage === totalPages || totalPages === 0;
    }
}

/* ===================================
   WHATSAPP FUNCTIONS
   =================================== */

function sendWhatsAppReminder(name, phone, type) {
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.substring(1);
    }
    
    if (!cleanPhone.startsWith('254')) {
        cleanPhone = '254' + cleanPhone;
    }
    
    let message = '';
    const churchName = 'SimamiaKanisa Church';
    
    if (type === 'tithe') {
        message = `🙏 *Reminder: Tithe Contribution*

Dear ${name},

This is a friendly reminder from ${churchName} about your tithe contribution.

*"Bring the whole tithe into the storehouse..."* - Malachi 3:10

Your faithful giving helps us continue God's work in our community.

Payment Options:
 M-Pesa: [Your Paybill/Till]
 Bank: [Your Account]
 Cash: During service

God bless you!
${churchName}`;
    } else if (type === 'building') {
        message = `🏗️ *Reminder: Building Fund*

Dear ${name},

This is a friendly reminder from ${churchName} about your Building Fund pledge.

Together we are building God's house! Your contribution is making our vision a reality.

Payment Options:
 M-Pesa: [Your Paybill/Till]
 Bank: [Your Account]
 Cash: During service

Thank you for your partnership!
${churchName}`;
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    console.log(`📱 Opening WhatsApp for ${name} (${cleanPhone})...`);
    window.open(whatsappUrl, '_blank');
}

/* ===================================
   MODAL FUNCTIONS
   =================================== */

function openAddMemberModal() {
    document.getElementById('addMemberModal').classList.add('active');
}

function openAddContributionModal() {
    document.getElementById('addContributionModal').classList.add('active');
}

function openAddEventModal() {
    document.getElementById('addEventModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/* ===================================
   CRUD OPERATIONS
   =================================== */

async function addMember() {
    const name = document.getElementById('memberName').value;
    const phone = document.getElementById('memberPhone').value;
    const group = document.getElementById('memberGroup').value;

    if (!name || !phone) {
        alert('Please fill all required fields');
        return;
    }

    try {
        console.log('➕ Adding member to Firebase...');
        
        const newMember = {
            name: name,
            phone: phone,
            group: group,
            joined: new Date().toISOString().split('T')[0],
            status: 'Active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await membersCollection.add(newMember);
        
        console.log('✅ Member added successfully!');
        
        document.getElementById('memberName').value = '';
        document.getElementById('memberPhone').value = '';
        document.getElementById('memberGroup').value = 'General';
        
        closeModal('addMemberModal');
        await loadAllData();
        alert('✅ Member added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding member:', error);
        alert('Error adding member. Please try again.');
    }
}

async function addContribution() {
    const member = document.getElementById('contribMember').value;
    const type = document.getElementById('contribType').value;
    const amount = parseFloat(document.getElementById('contribAmount').value);
    const method = document.getElementById('contribMethod').value;

    if (!member || !amount || amount <= 0) {
        alert('Please fill all required fields correctly');
        return;
    }

    try {
        console.log('➕ Adding contribution to Firebase...');
        
        const newContrib = {
            member: member,
            type: type,
            amount: amount,
            method: method,
            date: new Date().toISOString().split('T')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await contributionsCollection.add(newContrib);
        
        console.log('✅ Contribution added successfully!');
        
        document.getElementById('contribMember').value = '';
        document.getElementById('contribAmount').value = '';
        
        closeModal('addContributionModal');
        await loadAllData();
        alert('✅ Contribution recorded successfully!');
        
    } catch (error) {
        console.error('❌ Error adding contribution:', error);
        alert('Error recording contribution. Please try again.');
    }
}

async function addEvent() {
    const name = document.getElementById('eventName').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const expected = parseInt(document.getElementById('eventExpected').value);

    if (!name || !date || !time) {
        alert('Please fill all required fields');
        return;
    }

    try {
        console.log('➕ Adding event to Firebase...');
        
        const newEvent = {
            name: name,
            date: date,
            time: time,
            expected: expected,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await eventsCollection.add(newEvent);
        
        console.log('✅ Event added successfully!');
        
        document.getElementById('eventName').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventExpected').value = '50';
        
        closeModal('addEventModal');
        await loadAllData();
        alert('✅ Event added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding event:', error);
        alert('Error adding event. Please try again.');
    }
}

async function deleteMember(id) {
    if (confirm('Are you sure you want to delete this member?')) {
        try {
            console.log('🗑️ Deleting member from Firebase...');
            await membersCollection.doc(id).delete();
            console.log('✅ Member deleted successfully!');
            await loadAllData();
            alert('✅ Member deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting member:', error);
            alert('Error deleting member. Please try again.');
        }
    }
}

async function deleteContribution(id) {
    if (confirm('Are you sure you want to delete this contribution?')) {
        try {
            console.log('🗑️ Deleting contribution from Firebase...');
            await contributionsCollection.doc(id).delete();
            console.log('✅ Contribution deleted successfully!');
            await loadAllData();
            alert('✅ Contribution deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting contribution:', error);
            alert('Error deleting contribution. Please try again.');
        }
    }
}

async function deleteEvent(id) {
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            console.log('🗑️ Deleting event from Firebase...');
            await eventsCollection.doc(id).delete();
            console.log('✅ Event deleted successfully!');
            await loadAllData();
            alert('✅ Event deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting event:', error);
            alert('Error deleting event. Please try again.');
        }
    }
}

/* ===================================
   INITIALIZATION
   =================================== */

// CRITICAL: Initialize app AFTER authentication
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 SimamiaKanisa starting...');
    console.log('🔗 Connecting to Firebase...');
    
    // Wait for auth to complete
    console.log('⏳ Waiting for authentication...');
    
    // Give auth.js time to initialize
    setTimeout(async () => {
        // Check if user is authenticated by checking if currentUser exists
        if (typeof currentUser !== 'undefined' && currentUser !== null) {
            console.log('✅ User authenticated:', currentUser.email);
            await loadAllData();
        } else {
            console.log('⚠️ User not authenticated or auth not loaded yet');
        }
    }, 1000);
});