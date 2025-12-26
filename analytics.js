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
// ============================================
// EXPORT ANALYTICS TO PDF - MOBILE FRIENDLY
// ============================================

async function exportToPDF() {
    try {
        console.log('📊 Generating Analytics PDF report...');
        
        // Show loading state
        const exportBtn = event?.target;
        const originalText = exportBtn?.textContent || 'Export PDF';
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.textContent = '⏳ Generating PDF...';
        }
        
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            alert('❌ PDF library not loaded. Please refresh the page and try again.');
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.textContent = originalText;
            }
            return;
        }
        
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;
        
        // ========== HEADER ==========
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('SimamiaKanisa Church', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 8;
        doc.setFontSize(16);
        doc.setTextColor(102, 126, 234);
        doc.text('Financial Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 6;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        const reportDate = new Date().toLocaleDateString('en-GB', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.text(`Generated: ${reportDate} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: 'center' });
        
        // Line separator
        yPosition += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 10;
        
        // ========== GET ANALYTICS DATA ==========
        const periodSelect = document.getElementById('analyticsPeriod');
        const yearSelect = document.getElementById('analyticsYear');
        const period = periodSelect ? periodSelect.options[periodSelect.selectedIndex].text : 'This Year';
        const year = yearSelect ? yearSelect.value : new Date().getFullYear();
        
        // Get statistics from the DOM
        const totalCollections = document.getElementById('totalCollections')?.textContent || 'KSh 0';
        const contributingMembers = document.getElementById('contributingMembers')?.textContent || '0';
        const avgPerMember = document.getElementById('avgPerMember')?.textContent || 'KSh 0';
        const growthRate = document.getElementById('growthRate')?.textContent || '0%';
        
        // ========== SUMMARY SECTION ==========
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('Executive Summary', 15, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(`Period: ${period} (${year})`, 15, yPosition);
        yPosition += 7;
        
        // Summary box
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(15, yPosition, pageWidth - 30, 45, 3, 3, 'F');
        
        yPosition += 8;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        
        // Total Collections
        doc.setTextColor(22, 163, 74);
        doc.text('Total Collections:', 20, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(totalCollections, 70, yPosition);
        
        yPosition += 10;
        
        // Contributing Members
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined, 'bold');
        doc.text('Contributing Members:', 20, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(contributingMembers, 70, yPosition);
        
        yPosition += 10;
        
        // Average per Member
        doc.setTextColor(168, 85, 247);
        doc.setFont(undefined, 'bold');
        doc.text('Average per Member:', 20, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(avgPerMember, 70, yPosition);
        
        yPosition += 10;
        
        // Growth Rate
        const growthValue = parseFloat(growthRate.replace('%', ''));
        doc.setTextColor(growthValue >= 0 ? 22 : 234, growthValue >= 0 ? 163 : 88, growthValue >= 0 ? 74 : 12);
        doc.setFont(undefined, 'bold');
        doc.text('Growth Rate:', 20, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(growthRate, 70, yPosition);
        
        yPosition += 15;
        
        // ========== MONTHLY BREAKDOWN TABLE ==========
        if (typeof monthlyData !== 'undefined' && monthlyData.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.setFont(undefined, 'bold');
            doc.text('Monthly Breakdown', 15, yPosition);
            yPosition += 5;
            
            // Prepare table data
            const tableData = monthlyData.map(item => [
                item.month || '',
                `KSh ${(item.amount || 0).toLocaleString()}`,
                item.contributors || '0',
                `KSh ${(item.average || 0).toLocaleString()}`
            ]);
            
            doc.autoTable({
                startY: yPosition,
                head: [['Month', 'Total Amount', 'Contributors', 'Average']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [102, 126, 234],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 10,
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: 50
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                columnStyles: {
                    0: { cellWidth: 40, halign: 'left' },
                    1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
                    2: { cellWidth: 35, halign: 'center' },
                    3: { cellWidth: 45, halign: 'right' }
                },
                margin: { left: 15, right: 15 }
            });
            
            yPosition = doc.lastAutoTable.finalY + 10;
        }
        
        // ========== TOP CONTRIBUTORS TABLE ==========
        if (typeof topContributors !== 'undefined' && topContributors.length > 0) {
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.setFont(undefined, 'bold');
            doc.text('Top Contributors', 15, yPosition);
            yPosition += 5;
            
            const contributorsData = topContributors.slice(0, 10).map((contributor, index) => [
                (index + 1).toString(),
                contributor.name || 'Unknown',
                `KSh ${(contributor.amount || 0).toLocaleString()}`,
                contributor.count || '0'
            ]);
            
            doc.autoTable({
                startY: yPosition,
                head: [['Rank', 'Member', 'Total Amount', 'Contributions']],
                body: contributorsData,
                theme: 'grid',
                headStyles: {
                    fillColor: [22, 163, 74],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 10,
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: 50
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 65, halign: 'left' },
                    2: { cellWidth: 45, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
                    3: { cellWidth: 35, halign: 'center' }
                },
                margin: { left: 15, right: 15 }
            });
            
            yPosition = doc.lastAutoTable.finalY + 10;
        }
        
        // ========== CONTRIBUTION CATEGORIES ==========
        if (typeof categoryBreakdown !== 'undefined' && categoryBreakdown.length > 0) {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.setFont(undefined, 'bold');
            doc.text('Contribution Categories', 15, yPosition);
            yPosition += 5;
            
            const categoryData = categoryBreakdown.map(cat => [
                cat.category || 'Other',
                `KSh ${(cat.amount || 0).toLocaleString()}`,
                `${cat.percentage || 0}%`
            ]);
            
            doc.autoTable({
                startY: yPosition,
                head: [['Category', 'Amount', 'Percentage']],
                body: categoryData,
                theme: 'grid',
                headStyles: {
                    fillColor: [168, 85, 247],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 10,
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: 50
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                columnStyles: {
                    0: { cellWidth: 70, halign: 'left' },
                    1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
                    2: { cellWidth: 35, halign: 'center' }
                },
                margin: { left: 15, right: 15 }
            });
        }
        
        // ========== FOOTER ==========
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `SimamiaKanisa Church - Analytics Report - Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }
        
        // ========== SAVE PDF ==========
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `SimamiaKanisa_Analytics_${year}_${timestamp}.pdf`;
        doc.save(filename);
        
        console.log('✅ Analytics PDF generated successfully:', filename);
        
        // Show success message
        alert(`✅ Analytics report exported successfully!\n\nFile: ${filename}\n\nCheck your Downloads folder.`);
        
        // Reset button
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = originalText;
        }
        
    } catch (error) {
        console.error('❌ Error generating analytics PDF:', error);
        alert('Failed to generate PDF. Error: ' + error.message);
        
        // Reset button on error
        if (event?.target) {
            event.target.disabled = false;
            event.target.textContent = '📄 Export PDF';
        }
    }
}