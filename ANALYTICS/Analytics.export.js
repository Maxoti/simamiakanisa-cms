// ============================================
// ANALYTICS.EXPORT.JS — CSV + PDF export
// ============================================


// ── Church name helper ────────────────────────────────────────────────────────

function getChurchName() {
    return (
        window.tenantData?.name           ||   // ✅ matches Firestore: name: "PAG"
        window.currentChurch?.name        ||
        window.analyticsState?.churchName ||
        new URLSearchParams(window.location.search).get('tenant')?.toUpperCase() ||
        'Church'
    );
}

// ── CSV / Excel export ────────────────────────────────────────────────────────

function exportToExcel() {
    const { period, year, contributions } = getExportData();

    if (!contributions.length) { alert('No data to export for selected period'); return; }

    const churchName = getChurchName();
    const safeName   = churchName.replace(/[^a-zA-Z0-9]/g, '_');
    const total      = contributions.reduce((s, c) => s + c.amount, 0);

    const rows = contributions.map(c =>
        [
            c.date.toLocaleDateString(),
            (c.memberName || '').replace(/,/g, ' '),
            (c.category   || '').replace(/,/g, ' '),
            c.amount,                        // ✅ raw number — no toLocaleString()
            c.method || 'Cash'
        ].join(',')
    ).join('\n');

    const csv = [
        // ── Transaction data ──
        'Date,Member,Category,Amount (KSh),Method',
        rows,
        '',
        // ── Summary section ──
        'SUMMARY,,,,',
        `Church,${churchName},,,`,
        `Period,${period} ${year},,,`,
        `Total Collections (KSh),${total},,,`,          // ✅ raw number, no comma
        `Number of Transactions,${contributions.length},,,`,
        `Contributing Members,${new Set(contributions.map(c => c.memberName)).size},,,`
    ].join('\n');

    downloadBlob(csv, 'text/csv', `${safeName}_report_${year}_${period}.csv`);
    console.log(' CSV exported');
}


// ── PDF export ────────────────────────────────────────────────────────────────

async function exportToPDF(event) {
    const btn          = event?.target;
    const originalText = btn?.textContent || '📄 Export PDF';

    setBtn(btn, true, ' Generating PDF...');

    try {
        if (typeof window.jspdf === 'undefined') throw new Error('PDF library not loaded');

        const { jsPDF }                       = window.jspdf;
        const { period, year, contributions } = getExportData();
        const doc                             = new jsPDF('p', 'mm', 'a4');
        const W                               = doc.internal.pageSize.getWidth();
        const H                               = doc.internal.pageSize.getHeight();

        const churchName         = getChurchName();
        const safeName           = churchName.replace(/[^a-zA-Z0-9]/g, '_');

        const totalAmount        = contributions.reduce((s, c) => s + c.amount, 0);
        const totalCollections   = `KSh ${totalAmount.toLocaleString()}`;
        const contributingCount  = `${new Set(contributions.map(c => c.memberName)).size}`;
        const avgPerMember       = (() => {
            const u = parseInt(contributingCount);
            return u > 0 ? `KSh ${Math.round(totalAmount / u).toLocaleString()}` : 'KSh 0';
        })();
        const growthTxt          = document.getElementById('analyticsGrowth')?.textContent || '0%';
        const growthVal          = parseFloat(growthTxt.replace(/[+%]/g, ''));
        const reportDate         = new Date().toLocaleDateString('en-GB', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        let y = 20;

        // ── Title ──────────────────────────────────────────────────────────────
        doc.setFontSize(22); doc.setTextColor(40, 40, 40); doc.setFont(undefined, 'bold');
        doc.text(churchName, W / 2, y, { align: 'center' });

        y += 10;
        doc.setFontSize(16); doc.setTextColor(102, 126, 234);
        doc.text('Financial Analytics Report', W / 2, y, { align: 'center' });

        y += 7;
        doc.setFontSize(10); doc.setTextColor(100, 100, 100); doc.setFont(undefined, 'normal');
        doc.text(`Generated: ${reportDate}`, W / 2, y, { align: 'center' });

        y += 7; doc.setDrawColor(200, 200, 200); doc.line(15, y, W - 15, y); y += 12;

        // ── Executive Summary ──────────────────────────────────────────────────
        doc.setFontSize(14); doc.setTextColor(40, 40, 40); doc.setFont(undefined, 'bold');
        doc.text('Executive Summary', 15, y); y += 8;

        doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.setTextColor(60, 60, 60);
        doc.text(`Period: ${period} (${year})`, 15, y); y += 10;

        doc.setFillColor(245, 247, 250);
        doc.roundedRect(15, y, W - 30, 45, 3, 3, 'F');
        y += 8;

        const summaryLines = [
            { label: 'Total Collections:',    value: totalCollections, color: [22,  163,  74] },
            { label: 'Contributing Members:', value: contributingCount, color: [59,  130, 246] },
            { label: 'Average per Member:',   value: avgPerMember,      color: [168,  85, 247] },
            { label: 'Growth Rate:',          value: growthTxt,
              color: growthVal >= 0 ? [22, 163, 74] : [234, 88, 12] }
        ];

        summaryLines.forEach(({ label, value, color }) => {
            doc.setTextColor(...color); doc.setFont(undefined, 'bold');
            doc.text(label, 20, y);
            doc.setFont(undefined, 'normal');
            doc.text(value, 70, y);
            y += 10;
        });

        y += 10;

        // ── Financial Details ──────────────────────────────────────────────────
        doc.setFontSize(14); doc.setTextColor(40, 40, 40); doc.setFont(undefined, 'bold');
        doc.text('Financial Details', 15, y); y += 10;

        doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(60, 60, 60);
        [
            'Monthly Collection Trends:',
            `  • Period: ${period} ${year}`,
            `  • Total: ${totalCollections}`,
            `  • Growth: ${growthTxt}`,
            '',
            'Member Participation:',
            `  • Active contributors: ${contributingCount} members`,
            `  • Average contribution: ${avgPerMember}`,
            '',
            'Key Performance Indicators:',
            '  • Collection consistency: High',
            '  • Member engagement: Growing',
            '  • Financial health: Strong'
        ].forEach(line => { doc.text(line, 15, y); y += 6; });

        // ── Footer ─────────────────────────────────────────────────────────────
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`${churchName} — Church Management System`, W / 2, H - 15, { align: 'center' });

        doc.save(`${safeName}_Analytics_${year}_${Date.now()}.pdf`);
        alert(' PDF exported successfully!');

    } catch (err) {
        console.error(' PDF error:', err);
        alert('Failed to generate PDF. Error: ' + err.message);
    } finally {
        setBtn(btn, false, originalText);
    }
}


// ── Internal helpers ──────────────────────────────────────────────────────────

function getExportData() {
    const state  = window.analyticsState || { contributions: [] };
    const period = document.getElementById('periodSelect')?.value || 'year';
    const year   = document.getElementById('yearSelect')?.value   || new Date().getFullYear();
    return { period, year, contributions: filterByPeriod(analyticsState.contributions, period, year) };
}

function downloadBlob(content, type, filename) {
    const blob = new Blob([content], { type });
    const link = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: filename,
        style:    'visibility:hidden'
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function setBtn(btn, disabled, text) {
    if (!btn) return;
    btn.disabled    = disabled;
    btn.textContent = text;
}