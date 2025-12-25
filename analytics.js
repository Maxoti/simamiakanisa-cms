// ============================================
// ANALYTICS.JS - SimamiaKanisa Analytics Module
// FIXED VERSION - Compatible with your Firebase setup
// ============================================

console.log('📊 Analytics.js loading...');

let analyticsData = {
    contributions: [],
    members: [],
    events: []
};

let analyticsCharts = {};
let analyticsInitialized = false;

// ============================================
// INITIALIZE WHEN TAB IS OPENED
// ============================================

function initAnalyticsTab() {
    console.log('✅ Analytics tab opened!');
    
    // Check if required globals exist
    if (typeof members === 'undefined' || typeof contributions === 'undefined') {
        console.error('❌ Global data arrays not found!');
        showError('Data not loaded. Please reload the page.');
        return;
    }
    
    console.log('📥 Using global data:', {
        members: members.length,
        contributions: contributions.length,
        events: events.length
    });
    
    // Copy global data to analytics
    analyticsData.members = [...members];
    analyticsData.contributions = contributions.map(c => ({
        ...c,
        // Ensure date is a Date object
        date: c.date instanceof Date ? c.date : new Date(c.date),
        // Normalize field names
        category: c.category || c.type || 'Other',
        memberName: c.memberName || c.member || 'Unknown',
        amount: parseFloat(c.amount) || 0
    }));
    analyticsData.events = [...events];
    
    console.log('✅ Data copied to analytics');
    
    // Build the analytics UI
    rebuildAnalyticsHTML();
    
    // Initialize controls
    initializeAnalytics();
    
    // Show the data
    updateAnalytics();
}

// ============================================
// SHOW ERROR MESSAGE
// ============================================

function showError(message) {
    const container = document.querySelector('.analytics-container');
    if (container) {
        container.innerHTML = `
            <div style="background: #fee2e2; padding: 30px; border-radius: 15px; text-align: center; margin: 20px 0;">
                <h2 style="color: #991b1b; margin-bottom: 15px;">⚠️ Error</h2>
                <p style="color: #991b1b;">${message}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// ============================================
// GET EARLIEST YEAR FROM DATA
// ============================================

function getEarliestYear() {
    let earliestYear = new Date().getFullYear();
    
    // Check contributions
    if (analyticsData.contributions.length > 0) {
        analyticsData.contributions.forEach(c => {
            const year = c.date.getFullYear();
            if (year < earliestYear) earliestYear = year;
        });
    }
    
    // Check pledges if available
    if (typeof pledges !== 'undefined' && pledges.length > 0) {
        pledges.forEach(p => {
            if (p.startDate) {
                const year = new Date(p.startDate).getFullYear();
                if (year < earliestYear) earliestYear = year;
            }
        });
    }
    
    // Default to 2020 if no data or year is too old
    return earliestYear < 2020 ? 2020 : earliestYear;
}

// ============================================
// GENERATE DYNAMIC YEAR OPTIONS
// ============================================

function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startYear = getEarliestYear(); // Auto-detect from data
    const futureYears = 10; // Next 10 years for planning
    
    let options = '';
    
    // Generate from future to past
    for (let year = currentYear + futureYears; year >= startYear; year--) {
        const selected = year === currentYear ? 'selected' : '';
        options += `<option value="${year}" ${selected}>${year}</option>`;
    }
    
    return options;
}

// ============================================
// REBUILD HTML
// ============================================

function rebuildAnalyticsHTML() {
    const container = document.querySelector('.analytics-container');
    if (!container) {
        console.error('❌ Analytics container not found!');
        return;
    }
    
    container.innerHTML = `
        <!-- Header with Controls -->
        <div class="analytics-header">
            <h1 class="analytics-title">📊 Financial Analytics & Reports</h1>
            
            <div class="analytics-controls">
                <select id="periodSelect" onchange="updateAnalytics()">
                    <option value="month">This Month</option>
                    <option value="quarter">Last 3 Months</option>
                    <option value="year" selected>This Year</option>
                    <option value="all">All Time</option>
                </select>
                
                <select id="yearSelect" onchange="updateAnalytics()">
                    <!-- Populated dynamically -->
                </select>
                
                <button onclick="exportToExcel()">
                    📊 Export Excel
                </button>
                
                <button onclick="exportToPDF()">
                    📄 Export PDF
                </button>
            </div>
        </div>
        
        <!-- Summary Statistics -->
        <div class="analytics-summary">
            <div class="analytics-card purple">
                <h4> Total Collections</h4>
                <div class="value" id="analyticsTotal">KSh 0</div>
                <div class="subtitle" id="analyticsChange">+0% vs last period</div>
            </div>
            
            <div class="analytics-card pink">
                <h4>Contributing Members</h4>
                <div class="value" id="analyticsMembers">0</div>
                <div class="subtitle" id="analyticsMembersPercent">0% participation</div>
            </div>
            
            <div class="analytics-card blue">
                <h4> Average Per Member</h4>
                <div class="value" id="analyticsAverage">KSh 0</div>
                <div class="subtitle">monthly average</div>
            </div>
            
            <div class="analytics-card green">
                <h4> Growth Rate</h4>
                <div class="value" id="analyticsGrowth">+0%</div>
                <div class="subtitle">compared to last period</div>
            </div>
        </div>
        
        <!-- Charts Grid -->
        <div class="charts-grid">
            <!-- Monthly Trends Chart -->
            <div class="chart-card chart-full-width">
                <h3> Monthly Collection Trends</h3>
                <canvas id="monthlyTrendsChart" height="80"></canvas>
            </div>
            
            <!-- Category Breakdown -->
            <div class="chart-card">
                <h3> Collection by Category</h3>
                <canvas id="categoryChart"></canvas>
            </div>
            
            <!-- Top Contributors -->
            <div class="chart-card">
                <h3> Top 5 Contributors</h3>
                <canvas id="topContributorsChart"></canvas>
            </div>
            
            <!-- Weekly Comparison -->
            <div class="chart-card">
                <h3> Weekly Comparison</h3>
                <canvas id="weeklyChart"></canvas>
            </div>
            
            <!-- Member Participation -->
            <div class="chart-card">
                <h3> Member Participation Rate</h3>
                <canvas id="participationChart"></canvas>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZE CONTROLS WITH DYNAMIC YEARS
// ============================================

function initializeAnalytics() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;
    
    // Populate year dropdown with dynamic years
    yearSelect.innerHTML = generateYearOptions();
    
    console.log('✅ Year options generated from', getEarliestYear(), 'to', new Date().getFullYear() + 10);
    
    analyticsInitialized = true;
}

// ============================================
// DATA FILTERING
// ============================================

function filterDataByPeriod(contributions, period, year) {
    const selectedYear = parseInt(year);
    const now = new Date();
    
    return contributions.filter(item => {
        const itemDate = item.date;
        const itemYear = itemDate.getFullYear();
        
        if (period === 'year') {
            return itemYear === selectedYear;
        } else if (period === 'month') {
            return itemYear === selectedYear && 
                   itemDate.getMonth() === now.getMonth();
        } else if (period === 'quarter') {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return itemDate >= threeMonthsAgo;
        } else {
            return true; // all time
        }
    });
}

// ============================================
// UPDATE ANALYTICS
// ============================================

function updateAnalytics() {
    console.log('🔄 Updating analytics...');
    
    const period = document.getElementById('periodSelect')?.value || 'year';
    const year = document.getElementById('yearSelect')?.value || new Date().getFullYear();
    
    const filtered = filterDataByPeriod(analyticsData.contributions, period, year);
    
    console.log('E  Filtered data:', filtered.length, 'contributions');
    
    // Update summary cards
    updateSummaryCards(filtered);
    
    // Update charts
    if (typeof Chart !== 'undefined') {
        updateMonthlyTrendsChart(filtered);
        updateCategoryChart(filtered);
        updateTopContributorsChart(filtered);
        updateWeeklyChart(filtered);
        updateParticipationChart(filtered);
    } else {
        console.error('❌ Chart.js not loaded!');
        alert('Chart.js not loaded. Please check your internet connection and reload.');
    }
}

// ============================================
// UPDATE SUMMARY CARDS
// ============================================

function updateSummaryCards(contributions) {
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    const uniqueMembers = new Set(contributions.map(c => c.memberName)).size;
    const average = uniqueMembers > 0 ? Math.round(total / uniqueMembers) : 0;
    
    document.getElementById('analyticsTotal').textContent = `KSh ${total.toLocaleString()}`;
    document.getElementById('analyticsMembers').textContent = uniqueMembers;
    document.getElementById('analyticsAverage').textContent = `KSh ${average.toLocaleString()}`;
    
    const participationRate = analyticsData.members.length > 0 
        ? Math.round((uniqueMembers / analyticsData.members.length) * 100) 
        : 0;
    document.getElementById('analyticsMembersPercent').textContent = 
        `${participationRate}% participation`;
    
    // Calculate growth
    const growthRate = calculateGrowthRate(contributions);
    document.getElementById('analyticsGrowth').textContent = `${growthRate >= 0 ? '+' : ''}${growthRate}%`;
    document.getElementById('analyticsChange').textContent = `${growthRate >= 0 ? '+' : ''}${growthRate}% vs last period`;
}

function calculateGrowthRate(contributions) {
    if (contributions.length < 2) return 0;
    
    const sorted = [...contributions].sort((a, b) => a.date - b.date);
    const midPoint = Math.floor(sorted.length / 2);
    
    const firstHalf = sorted.slice(0, midPoint);
    const secondHalf = sorted.slice(midPoint);
    
    const firstTotal = firstHalf.reduce((sum, c) => sum + c.amount, 0);
    const secondTotal = secondHalf.reduce((sum, c) => sum + c.amount, 0);
    
    if (firstTotal === 0) return 0;
    return Math.round(((secondTotal - firstTotal) / firstTotal) * 100);
}

// ============================================
// CHART FUNCTIONS
// ============================================

function updateMonthlyTrendsChart(contributions) {
    const monthlyData = {};
    
    contributions.forEach(c => {
        const key = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = (monthlyData[key] || 0) + c.amount;
    });
    
    const sorted = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b));
    const labels = sorted.map(([key]) => {
        const [y, m] = key.split('-');
        return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
    });
    const values = sorted.map(([, value]) => value);
    
    const ctx = document.getElementById('monthlyTrendsChart')?.getContext('2d');
    if (!ctx) return;
    
    if (analyticsCharts.monthly) analyticsCharts.monthly.destroy();
    
    analyticsCharts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Collections (KSh)',
                data: values,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#4361ee'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `KSh ${context.parsed.y.toLocaleString()}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `KSh ${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

function updateCategoryChart(contributions) {
    const categories = {};
    contributions.forEach(c => {
        const cat = c.category || 'Other';
        categories[cat] = (categories[cat] || 0) + c.amount;
    });
    
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    
    if (analyticsCharts.category) analyticsCharts.category.destroy();
    
    analyticsCharts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#4361ee', '#f72585', '#4cc9f0', '#7209b7', '#06d6a0', '#ffd60a'],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: KSh ${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateTopContributorsChart(contributions) {
    const members = {};
    contributions.forEach(c => {
        const name = c.memberName || 'Unknown';
        members[name] = (members[name] || 0) + c.amount;
    });
    
    const top5 = Object.entries(members)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
    
    const ctx = document.getElementById('topContributorsChart')?.getContext('2d');
    if (!ctx) return;
    
    if (analyticsCharts.top) analyticsCharts.top.destroy();
    
    analyticsCharts.top = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top5.map(([name]) => name),
            datasets: [{
                label: 'Total (KSh)',
                data: top5.map(([, amount]) => amount),
                backgroundColor: '#7209b7',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `KSh ${context.parsed.x.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `KSh ${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

function updateWeeklyChart(contributions) {
    const weeks = {};
    contributions.forEach(c => {
        const week = Math.ceil(c.date.getDate() / 7);
        const key = `Week ${week}`;
        weeks[key] = (weeks[key] || 0) + c.amount;
    });
    
    const ctx = document.getElementById('weeklyChart')?.getContext('2d');
    if (!ctx) return;
    
    if (analyticsCharts.weekly) analyticsCharts.weekly.destroy();
    
    analyticsCharts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(weeks),
            datasets: [{
                label: 'Weekly Collections (KSh)',
                data: Object.values(weeks),
                backgroundColor: '#06d6a0',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `KSh ${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

function updateParticipationChart(contributions) {
    const participating = new Set(contributions.map(c => c.memberName)).size;
    const total = analyticsData.members.length;
    const notParticipating = Math.max(0, total - participating);
    
    const ctx = document.getElementById('participationChart')?.getContext('2d');
    if (!ctx) return;
    
    if (analyticsCharts.participation) analyticsCharts.participation.destroy();
    
    analyticsCharts.participation = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Contributing', 'Not Contributing'],
            datasets: [{
                data: [participating, notParticipating],
                backgroundColor: ['#06d6a0', '#e0e0e0'],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToExcel() {
    const period = document.getElementById('periodSelect')?.value || 'year';
    const year = document.getElementById('yearSelect')?.value || new Date().getFullYear();
    const contributions = filterDataByPeriod(analyticsData.contributions, period, year);
    
    if (contributions.length === 0) {
        alert('No data to export for selected period');
        return;
    }
    
    let csv = 'Date,Member,Category,Amount,Method\n';
    contributions.forEach(c => {
        const date = c.date.toLocaleDateString();
        const member = (c.memberName || '').replace(/,/g, ' ');
        const category = (c.category || '').replace(/,/g, ' ');
        const method = c.method || 'Cash';
        csv += `${date},${member},${category},${c.amount},${method}\n`;
    });
    
    csv += '\n\nSUMMARY\n';
    csv += `Period,${period} ${year}\n`;
    csv += `Total Collections,KSh ${contributions.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}\n`;
    csv += `Number of Transactions,${contributions.length}\n`;
    csv += `Contributing Members,${new Set(contributions.map(c => c.memberName)).size}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simamiakanisa_report_${year}_${period}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Excel exported successfully');
}

function exportToPDF() {
    alert('📄 PDF Export: Use your browser Print function (Ctrl+P) and select "Save as PDF"');
}

console.log('✅ Analytics module loaded successfully!');