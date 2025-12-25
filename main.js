// SimamiaKanisa - Church Management System with Firebase
// Main JavaScript File

// Global arrays to cache data
let members = [];
let contributions = [];
let events = [];

/**
 * Load all data from Firebase on startup
 */
async function loadAllData() {
    try {
        console.log(' Loading data from Firebase...');
        
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
        
        console.log(' Data loaded successfully!');
        console.log(` Loaded: ${members.length} members, ${contributions.length} contributions, ${events.length} events`);
        
        // Render initial view
        updateDashboard();
        renderMembers();
        
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
    if (event && event.target) {
        event.target.classList.add('active');
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

    }  else if (tabName==='pledges'){
        renderPledgesTab();
    
    } else if (tabName === 'analytics') {
        // Initialize analytics tab
        console.log('Loading analytics...');
        if (typeof initAnalyticsTab === 'function') {
            initAnalyticsTab();
        } else {
            console.error('❌ Analytics module not loaded!');
            alert('Analytics module failed to load. Check if analytics.js is present.');
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
        <p style="margin-bottom: 10px;"> Average Contribution: <strong>KSh ${Math.round(avgContribution).toLocaleString()}</strong></p>
        <p style="margin-bottom: 10px;"> Active Groups: <strong>${uniqueGroups}</strong></p>
        <p style="margin-bottom: 10px;"> Total Contributions: <strong>${contributions.length} transactions</strong></p>
        <p> Latest Event: <strong>${latestEvent}</strong></p>
    `;
    document.getElementById('quickStats').innerHTML = stats;
}

/**
 * Render members table with WhatsApp integration
 */
function renderMembers() {
    const container = document.getElementById('membersTable');
    
    if (members.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No members yet. Add your first member!</p></div>';
        return;
    }

    let html = '<div class="table-wrapper"><table><thead><tr><th>Name</th><th>Phone</th><th>Group</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    
    members.forEach(member => {
        html += `
            <tr>
                <td><strong>${member.name}</strong></td>
                <td>${member.phone}</td>
                <td><span class="badge badge-primary">${member.group}</span></td>
                <td>${member.joined}</td>
                <td><span class="badge badge-success">${member.status}</span></td>
                <td style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${member.name}', '${member.phone}', 'tithe')" title="Send Tithe Reminder">
                        💬 Tithe
                    </button>
                    <button class="btn btn-whatsapp" onclick="sendWhatsAppReminder('${member.name}', '${member.phone}', 'building')" title="Send Building Fund Reminder">
                        🏗️ Building
                    </button>
                    <button class="btn btn-danger" onclick="deleteMember('${member.id}')" title="Delete member">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

/**
 * Send WhatsApp reminder to member
 */
function sendWhatsAppReminder(name, phone, type) {
    // Clean phone number (remove spaces, dashes, etc.)
    let cleanPhone = phone.replace(/\D/g, '');
    
    // If phone starts with 0, replace with 254 (Kenya country code)
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.substring(1);
    }
    
    // If phone doesn't start with country code, add Kenya code
    if (!cleanPhone.startsWith('254')) {
        cleanPhone = '254' + cleanPhone;
    }
    
    // Generate message based on reminder type
    let message = '';
    const churchName = 'SimamiaKanisa Church'; // You can customize this
    
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
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    console.log(`📱 Opening WhatsApp for ${name} (${cleanPhone})...`);
    window.open(whatsappUrl, '_blank');
}

/**
 * Render contributions table
 */
function renderContributions() {
    const container = document.getElementById('contributionsTable');
    
    if (contributions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><p>No contributions recorded yet.</p></div>';
        return;
    }

    let html = '<div class="table-wrapper"><table><thead><tr><th>Member</th><th>Type</th><th>Amount</th><th>Method</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
    
    contributions.forEach(contrib => {
        html += `
            <tr>
                <td><strong>${contrib.member}</strong></td>
                <td><span class="badge badge-primary">${contrib.type}</span></td>
                <td style="color: #16a34a; font-weight: bold;">KSh ${contrib.amount.toLocaleString()}</td>
                <td>${contrib.method}</td>
                <td>${contrib.date}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteContribution('${contrib.id}')" title="Delete contribution">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

/**
 * Render events table
 */
function renderEvents() {
    const container = document.getElementById('eventsTable');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><p>No events scheduled.</p></div>';
        return;
    }

    let html = '<div class="table-wrapper"><table><thead><tr><th>Event Name</th><th>Date</th><th>Time</th><th>Expected</th><th>Actions</th></tr></thead><tbody>';
    
    events.forEach(event => {
        html += `
            <tr>
                <td><strong>${event.name}</strong></td>
                <td>${event.date}</td>
                <td>${event.time}</td>
                <td>${event.expected} people</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteEvent('${event.id}')" title="Delete event">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

/**
 * Open modal to add member
 */
function openAddMemberModal() {
    document.getElementById('addMemberModal').classList.add('active');
}

/**
 * Open modal to add contribution
 */
function openAddContributionModal() {
    document.getElementById('addContributionModal').classList.add('active');
}

/**
 * Open modal to add event
 */
function openAddEventModal() {
    document.getElementById('addEventModal').classList.add('active');
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * Add new member to Firebase
 */
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

        // Add to Firebase
        await membersCollection.add(newMember);
        
        console.log(' Member added successfully!');
        
        // Clear form
        document.getElementById('memberName').value = '';
        document.getElementById('memberPhone').value = '';
        document.getElementById('memberGroup').value = 'General';
        
        closeModal('addMemberModal');
        
        // Reload data
        await loadAllData();
        
        alert(' Member added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding member:', error);
        alert('Error adding member. Please try again.');
    }
}

/**
 * Add new contribution to Firebase
 */
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

        // Add to Firebase
        await contributionsCollection.add(newContrib);
        
        console.log(' Contribution added successfully!');
        
        // Clear form
        document.getElementById('contribMember').value = '';
        document.getElementById('contribAmount').value = '';
        
        closeModal('addContributionModal');
        
        // Reload data
        await loadAllData();
        
        alert(' Contribution recorded successfully!');
        
    } catch (error) {
        console.error('❌ Error adding contribution:', error);
        alert('Error recording contribution. Please try again.');
    }
}

/**
 * Add new event to Firebase
 */
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

        // Add to Firebase
        await eventsCollection.add(newEvent);
        
        console.log('✅ Event added successfully!');
        
        // Clear form
        document.getElementById('eventName').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventExpected').value = '50';
        
        closeModal('addEventModal');
        
        // Reload data
        await loadAllData();
        
        alert('✅ Event added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding event:', error);
        alert('Error adding event. Please try again.');
    }
}

/**
 * Delete member from Firebase
 */
async function deleteMember(id) {
    if (confirm('Are you sure you want to delete this member?')) {
        try {
            console.log(' Deleting member from Firebase...');
            await membersCollection.doc(id).delete();
            console.log(' Member deleted successfully!');
            await loadAllData();
            alert(' Member deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting member:', error);
            alert('Error deleting member. Please try again.');
        }
    }
}

/**
 * Delete contribution from Firebase
 */
async function deleteContribution(id) {
    if (confirm('Are you sure you want to delete this contribution?')) {
        try {
            console.log(' Deleting contribution from Firebase...');
            await contributionsCollection.doc(id).delete();
            console.log(' Contribution deleted successfully!');
            await loadAllData();
            alert(' Contribution deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting contribution:', error);
            alert('Error deleting contribution. Please try again.');
        }
    }
}

/**
 * Delete event from Firebase
 */
async function deleteEvent(id) {
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            console.log(' Deleting event from Firebase...');
            await eventsCollection.doc(id).delete();
            console.log(' Event deleted successfully!');
            await loadAllData();
            alert(' Event deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting event:', error);
            alert('Error deleting event. Please try again.');
        }
    }
}

// Initialize app when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log(' SimamiaKanisa starting...');
    console.log(' Connecting to Firebase...');
    console.log(' Analytics module loaded:', typeof initAnalyticsTab !== 'undefined');
    console.log(' Chart.js loaded:', typeof Chart !== 'undefined');
    loadAllData();
});