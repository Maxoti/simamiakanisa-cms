// ============================================
// ANALYTICS.UI.JS — Layout HTML + error display
// ============================================

// ── Build the full analytics tab layout ───────────────────────────────────────

function buildAnalyticsHTML() {
    const container = document.querySelector('.analytics-container');
    if (!container) { console.error('Analytics container not found!'); return; }

    container.innerHTML = `
        <div class="analytics-header">
            <h1 class="analytics-title">Financial Analytics & Reports</h1>

            <div class="analytics-controls">
                <select id="periodSelect" onchange="updateAnalytics()">
                    <option value="month">This Month</option>
                    <option value="quarter">Last 3 Months</option>
                    <option value="year" selected>This Year</option>
                    <option value="all">All Time</option>
                </select>

                <select id="yearSelect" onchange="updateAnalytics()"></select>

                <button onclick="exportToExcel()">Export Excel</button>
                <button onclick="exportToPDF(event)">Export PDF</button>
            </div>
        </div>

        <div class="analytics-summary">
            <div class="analytics-card gold">
                <h4>Total Collections</h4>
                <div class="value" id="analyticsTotal">KSh 0</div>
                <div class="subtitle" id="analyticsChange">+0% vs last period</div>
            </div>
            <div class="analytics-card teal">
                <h4>Contributing Members</h4>
                <div class="value" id="analyticsMembers">0</div>
                <div class="subtitle" id="analyticsMembersPercent">0% participation</div>
            </div>
            <div class="analytics-card blue">
                <h4>Average Per Member</h4>
                <div class="value" id="analyticsAverage">KSh 0</div>
                <div class="subtitle">monthly average</div>
            </div>
            <div class="analytics-card coral">
                <h4>Growth Rate</h4>
                <div class="value" id="analyticsGrowth">+0%</div>
                <div class="subtitle">compared to last period</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-card chart-full-width">
                <h3>Monthly Collection Trends</h3>
                <canvas id="monthlyTrendsChart" height="80"></canvas>
            </div>
            <div class="chart-card">
                <h3>Collection by Category</h3>
                <canvas id="categoryChart"></canvas>
            </div>
            <div class="chart-card">
                <h3>Top 5 Contributors</h3>
                <canvas id="topContributorsChart"></canvas>
            </div>
            <div class="chart-card">
                <h3>Weekly Comparison</h3>
                <canvas id="weeklyChart"></canvas>
            </div>
            <div class="chart-card">
                <h3>Member Participation Rate</h3>
                <canvas id="participationChart"></canvas>
            </div>
        </div>
    `;

    // Populate year dropdown after HTML is in the DOM
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) yearSelect.innerHTML = generateYearOptions();
}

// ── Error display ──────────────────────────────────────────────────────────────
// Named showAnalyticsError to avoid clashing with showPledgeError (pledges.ui.js)

function showAnalyticsError(message) {
    const container = document.querySelector('.analytics-container');
    if (container) {
        container.innerHTML = `
            <div style="background:#1a0f0f;border:1px solid #7a1c1c;padding:30px;
                        border-radius:15px;text-align:center;margin:20px 0">
                <h2 style="color:#c9a84c;margin-bottom:15px">Error</h2>
                <p style="color:#e8e6df">${message}</p>
                <button onclick="location.reload()"
                    style="margin-top:20px;padding:10px 24px;
                           background:linear-gradient(135deg,#c9a84c,#e8c97a);
                           color:#0f1117;border:none;border-radius:8px;
                           cursor:pointer;font-weight:700">
                    Reload Page
                </button>
            </div>`;
    }
}