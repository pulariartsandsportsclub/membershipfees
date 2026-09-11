/**
 * Pulari Arts & Sports Club - Membership Management System
 * Monthly Reports & Export Module (js/reports.js)
 */

function renderReportsPage() {
  const monthSelect = document.getElementById('report-month-select');
  const yearSelect = document.getElementById('report-year-select');

  if (monthSelect) monthSelect.value = AppState.selectedMonth;
  if (yearSelect) yearSelect.value = AppState.selectedYear;

  const { members, payments, selectedMonth, selectedYear } = AppState;

  // Active members sorted alphabetically by name
  const activeMembers = members
    .filter(m => m.status === 'Active')
    .slice()
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' }));
  const totalActive = activeMembers.length;

  // Paid members for month/year
  const paidPayments = payments.filter(p => 
    p.month === selectedMonth && 
    Number(p.year) === Number(selectedYear) && 
    p.status === 'Paid'
  );

  const paidMemberIds = new Set(paidPayments.map(p => p.memberId));
  const paidList = activeMembers.filter(m => paidMemberIds.has(m.memberId));
  const unpaidList = activeMembers.filter(m => !paidMemberIds.has(m.memberId));

  const totalCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const collectionRate = totalActive > 0 ? ((paidList.length / totalActive) * 100).toFixed(1) : 0;

  // Update Summary Stats Box
  document.getElementById('report-total-active').textContent = totalActive;
  document.getElementById('report-paid-count').textContent = paidList.length;
  document.getElementById('report-unpaid-count').textContent = unpaidList.length;
  document.getElementById('report-total-collected').textContent = formatCurrency(totalCollected);
  document.getElementById('report-collection-rate').textContent = `${collectionRate}%`;

  // Render Paid Members List
  const paidTbody = document.getElementById('report-paid-table-body');
  if (paidTbody) {
    if (paidList.length === 0) {
      paidTbody.innerHTML = `<tr><td colspan="3" class="empty-state">No paid members recorded.</td></tr>`;
    } else {
      paidTbody.innerHTML = paidList.map(m => {
        const pay = paidPayments.find(p => p.memberId === m.memberId);
        return `
          <tr>
            <td><strong>${m.memberId}</strong></td>
            <td>${m.fullName}</td>
            <td>${pay ? pay.paymentDate : '—'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Unpaid Members List
  const unpaidTbody = document.getElementById('report-unpaid-table-body');
  if (unpaidTbody) {
    if (unpaidList.length === 0) {
      unpaidTbody.innerHTML = `<tr><td colspan="3" class="empty-state">All members have paid! 🎉</td></tr>`;
    } else {
      unpaidTbody.innerHTML = unpaidList.map(m => `
        <tr>
          <td><strong>${m.memberId}</strong></td>
          <td>${m.fullName}</td>
          <td>${m.phone || '—'}</td>
        </tr>
      `).join('');
    }
  }
}

/**
 * Report Event Listeners (Month Picker, Print, CSV Export)
 */
document.addEventListener('DOMContentLoaded', () => {
  const monthSelect = document.getElementById('report-month-select');
  const yearSelect = document.getElementById('report-year-select');
  const printBtn = document.getElementById('btn-print-report');
  const exportCsvBtn = document.getElementById('btn-export-csv');
  const exportYearlyCsvBtn = document.getElementById('btn-export-yearly-csv');
  const downloadYearlyPdfBtn = document.getElementById('btn-download-yearly-report');

  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      AppState.selectedMonth = e.target.value;
      updateHeaderMonthBadge();
      renderReportsPage();
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      AppState.selectedYear = parseInt(e.target.value, 10);
      updateHeaderMonthBadge();
      renderReportsPage();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportReportToCSV);
  }

  if (exportYearlyCsvBtn) {
    exportYearlyCsvBtn.addEventListener('click', exportYearlyReportToCSV);
  }

  if (downloadYearlyPdfBtn) {
    downloadYearlyPdfBtn.addEventListener('click', exportYearlyReportToPDF);
  }
});

/**
 * Helper to escape HTML characters safely
 */
function escapeReportHtml(str) {
  return String(str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Client-side Monthly CSV File Generation & Download
 */
function exportReportToCSV() {
  const { members, payments, selectedMonth, selectedYear } = AppState;
  const activeMembers = members.filter(m => m.status === 'Active');

  const rows = [
    ["Pulari Arts & Sports Club - Monthly Payment Report"],
    [`Period: ${selectedMonth} ${selectedYear}`],
    [`Generated Date: ${new Date().toLocaleDateString()}`],
    [],
    ["Member ID", "Member Name", "Phone", "Monthly Fee", "Payment Status", "Payment Date", "Payment Method"]
  ];

  activeMembers.forEach(m => {
    const pay = payments.find(p => 
      p.memberId === m.memberId && 
      p.month === selectedMonth && 
      Number(p.year) === Number(selectedYear) && 
      p.status === 'Paid'
    );

    rows.push([
      `"${m.memberId}"`,
      `"${m.fullName}"`,
      `"${m.phone || ''}"`,
      m.monthlyFee || AppState.settings.monthly_fee || 30,
      pay ? "Paid" : "Unpaid",
      pay ? pay.paymentDate : "",
      pay ? (pay.paymentMethod || "Cash") : ""
    ]);
  });

  const csvContent = rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Pulari_Club_Report_${selectedMonth}_${selectedYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Monthly report exported as CSV successfully!', 'success');
}

/**
 * Client-side Yearly Collection Report CSV Download
 */
function exportYearlyReportToCSV() {
  const { members, payments, selectedYear } = AppState;
  const targetYear = Number(selectedYear) || new Date().getFullYear();

  const sortedActiveMembers = (members || [])
    .filter(m => m.status === 'Active')
    .slice()
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' }));

  if (sortedActiveMembers.length === 0) {
    showToast('No active members found to export.', 'warning');
    return;
  }

  const rows = [
    [`Pulari Arts & Sports Club - Yearly Collection Report (${targetYear})`],
    [`Generated Date: ${new Date().toLocaleDateString()}`],
    [],
    ["SI No", "Member Name", "Paid Months", "Amount"]
  ];

  let totalYearlyCollected = 0;

  sortedActiveMembers.forEach((m, idx) => {
    const memberPaidPayments = (payments || []).filter(p =>
      p.memberId === m.memberId &&
      Number(p.year) === targetYear &&
      p.status === 'Paid'
    );

    const paidMonthsList = memberPaidPayments.map(p => p.month).filter(Boolean);
    const monthsPaidCount = new Set(paidMonthsList).size;
    const memberTotalPaid = memberPaidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    totalYearlyCollected += memberTotalPaid;

    const monthsText = monthsPaidCount > 0 ? `${monthsPaidCount} (${paidMonthsList.join(', ')})` : '0';

    rows.push([
      idx + 1,
      `"${m.fullName}"`,
      `"${monthsText}"`,
      memberTotalPaid
    ]);
  });

  rows.push([]);
  rows.push(["", "Grand Total Collected:", "", totalYearlyCollected]);

  const csvContent = rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Pulari_Club_Yearly_Collection_Report_${targetYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Yearly report for ${targetYear} exported as CSV successfully!`, 'success');
}

/**
 * Helper to convert local logo image to base64 Data URL for html2pdf canvas rendering
 */
function getLogoBase64() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve('PULARI.png');
      }
    };
    img.onerror = function () {
      resolve('PULARI.png');
    };
    img.src = 'PULARI.png';
  });
}

/**
 * Client-side PDF Generation for Yearly Collection Report
 * Features:
 * - Proper Header with Club Logo and Theme Styling
 * - Color Theme matching Pulari Club palette (#1e3a8a Deep Blue, #0f172a Slate, #10b981 Emerald)
 * - Required Columns: SI No, Name (alphabetical A-Z), Paid Months, Amount
 * - Proper Footer with timestamp, signature line, and branding accent
 */
async function exportYearlyReportToPDF() {
  const { members, payments, selectedYear, settings } = AppState;
  const targetYear = Number(selectedYear) || new Date().getFullYear();
  const clubName = (settings && settings.club_name) || "Pulari Arts & Sports Club";
  const currencySymbol = (settings && settings.currency) || "₹";

  const sortedActiveMembers = (members || [])
    .filter(m => m.status === 'Active')
    .slice()
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' }));

  if (sortedActiveMembers.length === 0) {
    showToast('No active members found to generate PDF report.', 'warning');
    return;
  }

  showToast('Preparing PDF report with logo...', 'info');

  const logoSrc = await getLogoBase64();
  let totalYearlyCollected = 0;

  const tableRows = sortedActiveMembers.map((m, idx) => {
    const memberPaidPayments = (payments || []).filter(p =>
      p.memberId === m.memberId &&
      Number(p.year) === targetYear &&
      p.status === 'Paid'
    );

    const paidMonthsList = memberPaidPayments.map(p => p.month).filter(Boolean);
    const monthsPaidCount = new Set(paidMonthsList).size;
    const memberTotalPaid = memberPaidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    totalYearlyCollected += memberTotalPaid;

    const monthsStr = monthsPaidCount > 0 
      ? `${monthsPaidCount} Month${monthsPaidCount > 1 ? 's' : ''} (${paidMonthsList.join(', ')})`
      : `0 Months`;

    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background-color: ${bgColor};">
        <td style="text-align: center; padding: 10px 8px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #475569;">${idx + 1}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f172a;">${escapeReportHtml(m.fullName)}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 12px; color: #334155;">${escapeReportHtml(monthsStr)}</td>
        <td style="text-align: right; padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #059669;">${currencySymbol}${memberTotalPaid.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  const reportWrapper = document.createElement('div');
  reportWrapper.style.padding = '25px';
  reportWrapper.style.fontFamily = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  reportWrapper.style.color = '#0f172a';
  reportWrapper.style.backgroundColor = '#ffffff';

  reportWrapper.innerHTML = `
    <!-- Top Brand Theme Strip -->
    <div style="height: 6px; background: linear-gradient(90deg, #1e3a8a 0%, #10b981 100%); margin-bottom: 20px; border-radius: 3px;"></div>

    <!-- Header Section with Logo -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 18px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <img src="${logoSrc}" alt="Pulari Club Logo" style="width: 64px; height: 64px; object-fit: contain; border-radius: 8px; background: #ffffff; padding: 2px; border: 1px solid #e2e8f0;">
        <div>
          <h1 style="margin: 0; font-size: 22px; color: #1e3a8a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${escapeReportHtml(clubName)}</h1>
          <h2 style="margin: 3px 0 0 0; font-size: 14px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Yearly Collection Report — ${targetYear}</h2>
          <span style="font-size: 11px; color: #64748b;">Official Statement • Membership Management System</span>
        </div>
      </div>
      <div style="text-align: right; background: #eff6ff; padding: 10px 16px; border-radius: 8px; border: 1px solid #bfdbfe;">
        <div style="font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">Report Year</div>
        <div style="font-size: 20px; font-weight: 800; color: #1e3a8a; line-height: 1.1;">${targetYear}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div style="display: flex; gap: 12px; margin-bottom: 22px;">
      <div style="flex: 1; background-color: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #1e3a8a;">
        <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; letter-spacing: 0.5px;">Total Active Members</span>
        <strong style="font-size: 16px; color: #1e3a8a;">${sortedActiveMembers.length} Members</strong>
      </div>
      <div style="flex: 1; background-color: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #0f172a;">
        <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; letter-spacing: 0.5px;">Ordering Format</span>
        <strong style="font-size: 14px; color: #0f172a;">Alphabetical (A to Z)</strong>
      </div>
      <div style="flex: 1; background-color: #ecfdf5; padding: 10px 14px; border-radius: 8px; border: 1px solid #a7f3d0; border-left: 4px solid #10b981; text-align: right;">
        <span style="font-size: 10px; text-transform: uppercase; color: #047857; font-weight: 700; display: block; letter-spacing: 0.5px;">Total Yearly Collection</span>
        <strong style="font-size: 18px; color: #059669;">${currencySymbol}${totalYearlyCollected.toLocaleString('en-IN')}</strong>
      </div>
    </div>

    <!-- Collection Data Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <thead>
        <tr style="background-color: #0f172a; color: #ffffff;">
          <th style="padding: 11px 8px; border: 1px solid #0f172a; width: 9%; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">SI No</th>
          <th style="padding: 11px 12px; border: 1px solid #0f172a; width: 36%; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Name</th>
          <th style="padding: 11px 12px; border: 1px solid #0f172a; width: 37%; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Paid Months</th>
          <th style="padding: 11px 12px; border: 1px solid #0f172a; width: 18%; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr style="background-color: #ecfdf5; font-weight: 700;">
          <td colspan="3" style="padding: 12px; border: 1px solid #a7f3d0; font-size: 13px; text-align: right; color: #065f46;">Grand Total Collection:</td>
          <td style="padding: 12px; border: 1px solid #a7f3d0; font-size: 15px; text-align: right; color: #047857; font-weight: 800;">${currencySymbol}${totalYearlyCollected.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Proper Footer Section -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px;">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #1e3a8a;">${escapeReportHtml(clubName)}</div>
          <div style="font-size: 10px; color: #64748b;">Generated on ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div style="text-align: center;">
          <div style="border-bottom: 1px dashed #64748b; width: 170px; margin-bottom: 6px;"></div>
          <p style="margin: 0; font-size: 11px; font-weight: 700; color: #334155;">Authorized Signatory</p>
        </div>
      </div>

      <!-- Bottom Theme Footer Accent Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; background-color: #0f172a; padding: 8px 16px; border-radius: 6px; color: #94a3b8; font-size: 10px;">
        <span>Pulari Arts & Sports Club • Membership Fee System</span>
        <span>Page 1 of 1 • Confidential Record</span>
      </div>
    </div>
  `;

  if (typeof html2pdf !== 'undefined') {
    showToast('Generating PDF report...', 'info');
    const opt = {
      margin:       [8, 8, 8, 8],
      filename:     `Pulari_Club_Yearly_Collection_Report_${targetYear}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, logging: false, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(reportWrapper).save().then(() => {
      showToast(`Yearly PDF report for ${targetYear} downloaded successfully!`, 'success');
    }).catch(err => {
      console.error('PDF export error:', err);
      fallbackPrintPDF(reportWrapper, targetYear);
    });
  } else {
    fallbackPrintPDF(reportWrapper, targetYear);
  }
}

function fallbackPrintPDF(containerElement, targetYear) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Please allow popups to print/download PDF.', 'warning');
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Yearly Collection Report ${targetYear} - Pulari Club</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; padding: 0; background: #fff; }
        </style>
      </head>
      <body>
        ${containerElement.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
