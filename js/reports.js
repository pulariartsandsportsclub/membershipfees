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
            <td>${pay ? `${pay.month || selectedMonth} (${pay.paymentDate || 'Recorded'})` : '—'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Unpaid Members List
  const unpaidTbody = document.getElementById('report-unpaid-table-body');
  if (unpaidTbody) {
    if (unpaidList.length === 0) {
      unpaidTbody.innerHTML = `<tr><td colspan="4" class="empty-state">All members have paid! 🎉</td></tr>`;
    } else {
      unpaidTbody.innerHTML = unpaidList.map(m => {
        const phone = (m.phone || '').trim();
        return `
          <tr>
            <td><strong>${escapeReportHtml(m.memberId)}</strong></td>
            <td>${escapeReportHtml(m.fullName)}</td>
            <td>${phone ? escapeReportHtml(phone) : '<span style="color:var(--text-light); font-style:italic;">No phone</span>'}</td>
            <td style="text-align:center;">
              <button 
                class="btn btn-whatsapp btn-sm" 
                onclick="sendWhatsAppReminder('${escapeReportHtml(m.memberId)}')" 
                title="Send WhatsApp payment reminder to ${escapeReportHtml(m.fullName)}"
                type="button"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                WhatsApp
              </button>
            </td>
          </tr>
        `;
      }).join('');
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
 * Helper to convert local Shijas signature image to base64 Data URL for html2canvas rendering
 */
let cachedSignBase64 = null;
function getSignBase64() {
  if (cachedSignBase64) return Promise.resolve(cachedSignBase64);
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
        cachedSignBase64 = canvas.toDataURL('image/png');
        resolve(cachedSignBase64);
      } catch (e) {
        resolve('shijas.png');
      }
    };
    img.onerror = function () {
      resolve('shijas.png');
    };
    img.src = 'shijas.png';
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
      margin: [8, 8, 8, 8],
      filename: `Pulari_Club_Yearly_Collection_Report_${targetYear}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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

/**
 * Clean & format phone numbers to international standard for WhatsApp
 */
function formatWhatsAppPhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  // Already has UAE country code (e.g. 971501234567)
  if (digits.startsWith('971') && digits.length >= 11) {
    return digits;
  }
  // Already has India country code (e.g. 919876543210)
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  // UAE local format starting with 05 (e.g. 0547528521 -> 971547528521)
  if (digits.startsWith('05') && digits.length === 10) {
    return '971' + digits.substring(1);
  }
  // UAE local format starting with 5 without leading 0 (e.g. 547528521 -> 971547528521)
  if (digits.startsWith('5') && digits.length === 9) {
    return '971' + digits;
  }
  // Indian 11-digit starting with 0 (e.g. 09876543210 -> 919876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return '91' + digits.substring(1);
  }
  // Indian standard 10-digit mobile number (starts with 6, 7, 8, or 9)
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return '91' + digits;
  }

  return digits;
}

/**
 * WhatsApp Reminder Message Generator & Direct Chat Opener
 * Membership cycle strictly begins from September 2026 (ignores Jan-Aug 2026).
 */
function sendWhatsAppReminder(memberId) {
  const member = (AppState.members || []).find(m => m.memberId === memberId);
  if (!member) {
    showToast('Member details not found.', 'error');
    return;
  }

  const phone = formatWhatsAppPhone(member.phone);
  if (!phone) {
    showToast(`${member.fullName}ന്റെ ഫോൺ നമ്പർ ലഭ്യമല്ല. ദയവായി ഫോൺ നമ്പർ ചേർക്കുക.`, 'warning');
    return;
  }

  const { payments, selectedMonth, selectedYear, settings } = AppState;
  const clubName = (settings && settings.club_name) || "പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ്";
  const currencySymbol = (settings && settings.currency) || "₹";
  const monthlyFee = Number(member.monthlyFee || (settings && settings.monthly_fee) || 30);
  const targetYear = Number(selectedYear) || new Date().getFullYear();

  const malMonthNames = {
    "September": "സെപ്റ്റംബർ",
    "October": "ഒക്ടോബർ",
    "November": "നവംബർ",
    "December": "ഡിസംബർ",
    "January": "ജനുവരി",
    "February": "ഫെബ്രുവരി",
    "March": "മാർച്ച്",
    "April": "ഏപ്രിൽ",
    "May": "മേയ്",
    "June": "ജൂൺ",
    "July": "ജൂലൈ",
    "August": "ഓഗസ്റ്റ്"
  };

  // Pulari Club membership strictly starts from September 2026 (Month 1)
  const allCycleMonths = [
    { name: "September", year: 2026 },
    { name: "October", year: 2026 },
    { name: "November", year: 2026 },
    { name: "December", year: 2026 },
    { name: "January", year: 2027 },
    { name: "February", year: 2027 },
    { name: "March", year: 2027 },
    { name: "April", year: 2027 },
    { name: "May", year: 2027 },
    { name: "June", year: 2027 },
    { name: "July", year: 2027 },
    { name: "August", year: 2027 }
  ];

  // If selected month is before September 2026, no cycle month applies
  const selIdx = allCycleMonths.findIndex(m =>
    m.name.toLowerCase() === (selectedMonth || '').toLowerCase() &&
    m.year === targetYear
  );

  let evaluatedMonths = [];
  if (selIdx >= 0) {
    // Only evaluate from September 2026 up to the currently selected cycle month
    evaluatedMonths = allCycleMonths.slice(0, selIdx + 1);
  } else {
    // If viewing September 2026 or a month within 2026 starting from September
    evaluatedMonths = allCycleMonths.filter(m => m.year <= targetYear);
    if (evaluatedMonths.length === 0) {
      evaluatedMonths = [{ name: "September", year: 2026 }];
    }
  }

  // Check which of these months (from Sep 2026 onwards) remain unpaid for this member
  const pendingMonths = evaluatedMonths.filter(cm => {
    const isPaid = (payments || []).some(p =>
      p.memberId === memberId &&
      p.month && p.month.toLowerCase() === cm.name.toLowerCase() &&
      Number(p.year) === cm.year &&
      p.status === 'Paid'
    );
    return !isPaid;
  });

  let message = '';
  if (pendingMonths.length === 0) {
    message =
      `
\nപ്രിയപ്പെട്ട *${member.fullName}*,

പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബിൽ നിന്നുള്ള സ്നേഹാശംസകൾ.
താങ്കളുടെ ക്ലബ്ബ് മാസവരി അടവുകൾ നിലവിൽ പൂർണ്ണമായി അടച്ചുതീർത്തിട്ടുണ്ട്.

നിങ്ങളുടെ സഹകരണത്തിന് നന്ദി. 🙏
_${clubName}_`;
  } else if (pendingMonths.length === 1) {
    const item = pendingMonths[0];
    const malMonth = malMonthNames[item.name] || item.name;
    message =
      `
\nപ്രിയപ്പെട്ട *${member.fullName}*,

പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബിൽ നിന്നുള്ള അറിയിപ്പ്.
താങ്കളുടെ ക്ലബ്ബ് മാസവരി കുടിശ്ശിക താഴെ നൽകുന്നു:

📌 *കുടിശ്ശികയുള്ള മാസം:* ${malMonth} ${item.year}
💰 *അടയ്ക്കാനുള്ള തുക:* ${currencySymbol}${monthlyFee}

ക്ലബ്ബിന്റെ സുഗമമായ പ്രവർത്തനത്തിനായി, മാസവരി എത്രയും വേഗം അടച്ച് തീർക്കണമെന്ന് സ്നേഹപൂർവ്വം അഭ്യർത്ഥിക്കുന്നു.

നിങ്ങളുടെ സഹകരണത്തിന് നന്ദി. 🙏
_${clubName}_`;
  } else {
    const totalDue = pendingMonths.length * monthlyFee;
    const monthsText = pendingMonths.map(p => `${malMonthNames[p.name] || p.name} ${p.year}`).join(', ');
    message =
      `
\nപ്രിയപ്പെട്ട *${member.fullName}*,

പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബിൽ നിന്നുള്ള അറിയിപ്പ്.
താങ്കളുടെ ക്ലബ്ബ് മാസവരി കുടിശ്ശിക വിവരങ്ങൾ താഴെ നൽകുന്നു:

📌 *കുടിശ്ശികയുള്ള മാസങ്ങൾ:* ${monthsText} (${pendingMonths.length} മാസം)
💰 *പ്രതിമാസ വരിസംഖ്യ:* ${currencySymbol}${monthlyFee}
💵 *ആകെ അടയ്ക്കാനുള്ള തുക:* ${currencySymbol}${totalDue}

ക്ലബ്ബിന്റെ സുഗമമായ പ്രവർത്തനത്തിനായി, മാസവരി എത്രയും വേഗം അടച്ച് തീർക്കണമെന്ന് സ്നേഹപൂർവ്വം അഭ്യർത്ഥിക്കുന്നു.

നിങ്ങളുടെ സഹകരണത്തിന് നന്ദി. 🙏
_${clubName}_`;
  }

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  showToast(`${member.fullName}ന്റെ വാട്ട്‌സ്ആപ്പ് ചാറ്റ് തുറക്കുന്നു...`, 'info');
}

/**
 * Safe HTML escaping helper
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format Payment Method into Malayalam (Zero English)
 */
function formatPaymentMethodMalayalam(method) {
  if (!method) return 'പണം';
  const m = String(method).trim().toLowerCase();
  if (m === 'cash') return 'പണം';
  if (m === 'upi' || m === 'gpay' || m === 'phonepe' || m === 'paytm' || m === 'online') return 'യു.പി.ഐ / ഓൺലൈൻ';
  if (m === 'bank' || m.includes('transfer')) return 'ബാങ്ക് ട്രാൻസ്ഫർ';
  if (m === 'cheque') return 'ചെക്ക്';
  return 'പണം';
}

/**
 * Convert any month representation into Malayalam
 */
function getMalayalamMonth(monthStr) {
  if (!monthStr) return '';
  const monthMap = {
    "january": "ജനുവരി", "jan": "ജനുവരി", "1": "ജനുവരി", "01": "ജനുവരി",
    "february": "ഫെബ്രുവരി", "feb": "ഫെബ്രുവരി", "2": "ഫെബ്രുവരി", "02": "ഫെബ്രുവരി",
    "march": "മാർച്ച്", "mar": "മാർച്ച്", "3": "മാർച്ച്", "03": "മാർച്ച്",
    "april": "ഏപ്രിൽ", "apr": "ഏപ്രിൽ", "4": "ഏപ്രിൽ", "04": "ഏപ്രിൽ",
    "may": "മേയ്", "5": "മേയ്", "05": "മേയ്",
    "june": "ജൂൺ", "jun": "ജൂൺ", "6": "ജൂൺ", "06": "ജൂൺ",
    "july": "ജൂലൈ", "jul": "ജൂലൈ", "7": "ജൂലൈ", "07": "ജൂലൈ",
    "august": "ഓഗസ്റ്റ്", "aug": "ഓഗസ്റ്റ്", "8": "ഓഗസ്റ്റ്", "08": "ഓഗസ്റ്റ്",
    "september": "സെപ്റ്റംബർ", "sep": "സെപ്റ്റംബർ", "9": "സെപ്റ്റംബർ", "09": "സെപ്റ്റംബർ",
    "october": "ഒക്ടോബർ", "oct": "ഒക്ടോബർ", "10": "ഒക്ടോബർ",
    "november": "നവംബർ", "nov": "നവംബർ", "11": "നവംബർ",
    "december": "ഡിസംബർ", "dec": "ഡിസംബർ", "12": "ഡിസംബർ"
  };
  return monthMap[String(monthStr).toLowerCase().trim()] || monthStr;
}

/**
 * Format date into Indian numeric standard DD/MM/YYYY
 */
function formatVoucherDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Convert Indian Rupee numbers to Malayalam Words (e.g. 30 -> മുപ്പത് രൂപ മാത്രം)
 */
function convertNumberToWordsMalayalam(amount) {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return "പൂജ്യം രൂപ മാത്രം";

  const ones = [
    '', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒൻപത്',
    'പത്ത്', 'പതിനൊന്ന്', 'പന്ത്രണ്ട്', 'പതിമൂന്ന്', 'പതിനാല്', 'പതിനഞ്ച്', 'പതിനാറ്', 'പതിനേഴ്', 'പതിനെട്ട്', 'പത്തൊൻപത്'
  ];

  const tens = ['', '', 'ഇരുപത്', 'മുപ്പത്', 'നാൽപ്പത്', 'അൻപത്', 'അറുപത്', 'എഴുപത്', 'എൺപത്', 'തൊണ്ണൂറ്'];
  const tensPrefix = ['', '', 'ഇരുപത്തി', 'മുപ്പത്തി', 'നാൽപ്പത്തി', 'അൻപത്തി', 'അറുപത്തി', 'എഴുപത്തി', 'എൺപത്തി', 'തൊണ്ണൂറ്റി'];

  const hundredsExact = ['', 'നൂറ്', 'ഇരുനൂറ്', 'മുന്നൂറ്', 'നാനൂറ്', 'അഞ്ഞൂറ്', 'അറുന്നൂറ്', 'എഴുന്നൂറ്', 'എണ്ണൂറ്', 'തൊള്ളായിരം'];
  const hundredsPrefix = ['', 'നൂറ്റി', 'ഇരുനൂറ്റി', 'മുന്നൂറ്റി', 'നാനൂറ്റി', 'അഞ്ഞൂറ്റി', 'അറുന്നൂറ്റി', 'എഴുന്നൂറ്റി', 'എണ്ണൂറ്റി', 'തൊള്ളായിരത്തി'];

  function convertBelowThousand(n) {
    if (n === 0) return '';
    let result = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) {
      if (rem === 0) {
        return hundredsExact[h];
      } else {
        result += hundredsPrefix[h] + ' ';
      }
    }
    if (rem < 20) {
      result += ones[rem];
    } else {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      if (o === 0) {
        result += tens[t];
      } else {
        result += tensPrefix[t] + ones[o];
      }
    }
    return result.trim();
  }

  function convertNumber(n) {
    if (n < 1000) return convertBelowThousand(n);
    if (n < 100000) {
      const thousands = Math.floor(n / 1000);
      const rem = n % 1000;
      let thStr = (thousands === 1) ? 'ആയിരം' : convertBelowThousand(thousands) + ' ആയിരം';
      if (rem > 0) {
        thStr = ((thousands === 1) ? 'ആയിരത്തി' : convertBelowThousand(thousands) + ' ആയിരത്തി') + ' ' + convertBelowThousand(rem);
      }
      return thStr.trim();
    }
    if (n < 10000000) {
      const lakhs = Math.floor(n / 100000);
      const rem = n % 100000;
      let lkStr = convertBelowThousand(lakhs) + ' ലക്ഷം';
      if (rem > 0) {
        lkStr += ' ' + convertNumber(rem);
      }
      return lkStr.trim();
    }
    return n.toString();
  }

  const malWords = convertNumber(num);
  return `${malWords} രൂപ മാത്രം`;
}

/**
 * Convert Indian Rupee numbers to English Words (fallback)
 */
function convertNumberToWordsINR(amount) {
  return convertNumberToWordsMalayalam(amount);
}

/**
 * Generate Formatted Pure Malayalam Payment Receipt Voucher Message
 */
function formatWhatsAppReceiptVoucher(member, paymentInfo = {}) {
  const { settings, selectedMonth, selectedYear } = AppState;
  const clubName = (settings && settings.club_name) || "പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ്";
  const currencySymbol = (settings && settings.currency) || "₹";
  const amount = paymentInfo.amount || member.monthlyFee || (settings && settings.monthly_fee) || 30;
  const payMonth = paymentInfo.month || selectedMonth;
  const payYear = paymentInfo.year || selectedYear;
  const paymentDate = paymentInfo.paymentDate || new Date().toISOString().split('T')[0];
  const formattedDate = formatVoucherDate(paymentDate);

  const rawReceiptId = String(paymentInfo.paymentId || `${payYear}${String((MONTHS_LIST.indexOf(payMonth) >= 0 ? MONTHS_LIST.indexOf(payMonth) + 1 : 1)).padStart(2, '0')}-${String(member.memberId || '01').replace(/\D/g, '') || '01'}`);
  const cleanReceiptNo = rawReceiptId.replace(/^PAY[-]?/i, '');

  const malMonth = getMalayalamMonth(payMonth);
  const payMethodMal = formatPaymentMethodMalayalam(paymentInfo.paymentMethod);

  return `
🧾 *${clubName}*
*മാസവരി രസീത്*
━━━━━━━━━━━━━━━━━━━━
👤 *അംഗത്തിന്റെ പേര്:* ${member.fullName}
🆔 *മെമ്പർ ഐഡി:* ${member.memberId}
📅 *അടച്ച മാസം:* ${malMonth} ${payYear}
💰 *അടച്ച തുക:* ${currencySymbol}${amount}
💳 *രീതി:* ${payMethodMal}
📆 *തീയതി:* ${formattedDate}
🔢 *രസീത് നമ്പർ:* #${cleanReceiptNo}
━━━━━━━━━━━━━━━━━━━━
✅ താങ്കളുടെ ഈ മാസത്തെ ക്ലബ്ബ് മാസവരി വിജയകരമായി ലഭിച്ചിരിക്കുന്നു. ക്ലബ്ബിന്റെ പ്രവർത്തനങ്ങളിലുള്ള താങ്കളുടെ വിലയേറിയ സഹകരണത്തിന് നന്ദി! 🙏

_${clubName} ഭരണസമിതി_`;
}

/**
 * Render High-Resolution Official Membership Voucher Card HTML (100% Pure Malayalam - ZERO English)
 */
function renderMembershipVoucherHTML(member, paymentInfo = {}, logoBase64 = 'PULARI.png', signBase64 = 'shijas.png') {
  const { settings, selectedMonth, selectedYear } = AppState;
  const clubName = (settings && settings.club_name) || "പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ്";
  const currencySymbol = (settings && settings.currency) || "₹";
  const amount = Number(paymentInfo.amount || member.monthlyFee || (settings && settings.monthly_fee) || 30);
  const payMonth = paymentInfo.month || selectedMonth;
  const payYear = paymentInfo.year || selectedYear;
  const paymentDate = paymentInfo.paymentDate || new Date().toISOString().split('T')[0];
  const formattedDate = formatVoucherDate(paymentDate);

  const rawReceiptId = String(paymentInfo.paymentId || `${payYear}${String((MONTHS_LIST.indexOf(payMonth) >= 0 ? MONTHS_LIST.indexOf(payMonth) + 1 : 1)).padStart(2, '0')}-${String(member.memberId || '01').replace(/\D/g, '') || '01'}`);
  const cleanReceiptNo = rawReceiptId.replace(/^PAY[-]?/i, '');

  const malMonth = getMalayalamMonth(payMonth);
  const malWords = convertNumberToWordsMalayalam(amount);
  const payMethodMal = formatPaymentMethodMalayalam(paymentInfo.paymentMethod);

  let handledByText = String(paymentInfo.handledBy || 'പ്രസിഡന്റ്').trim();
  const lowerHandled = handledByText.toLowerCase();
  if (!handledByText || ['admin', 'administrator', 'shijas'].includes(lowerHandled)) {
    handledByText = 'പ്രസിഡന്റ്';
  } else if (['treasurer', 'secretary', 'cashier'].includes(lowerHandled)) {
    const roleMap = {
      'treasurer': 'ഖജാൻജി',
      'secretary': 'സെക്രട്ടറി',
      'cashier': 'ക്യാഷിയർ'
    };
    handledByText = roleMap[lowerHandled] || handledByText;
  }

  return `
    <div class="membership-voucher-card" id="membership-voucher-card">
      <div class="vcard-inner">
        <div class="vcard-accent-bar"></div>

        <div class="vcard-header">
          <div class="vcard-brand">
            <img src="${logoBase64}" alt="പുലരി ക്ലബ്ബ് ലോഗോ" class="vcard-logo">
            <div class="vcard-titles">
              <h2 class="vcard-club-ml-main">പുലരി ആർട്സ് &amp; സ്പോർട്സ് ക്ലബ്ബ്</h2>
              <p class="vcard-club-sub">രജി. നമ്പർ: MPM/CA/355/2017 • പോരൂർ, മലപ്പുറം • സ്ഥാപിതം: 1985</p>
            </div>
          </div>
          <div class="vcard-receipt-meta">
            <div class="vcard-badge">മാസവരി രസീത്</div>
            <div class="vcard-meta-line">
              <span class="vcard-meta-label">രസീത് നമ്പർ:</span>
              <span class="vcard-meta-val vcard-receipt-no">#${escapeHtml(cleanReceiptNo)}</span>
            </div>
            <div class="vcard-meta-line">
              <span class="vcard-meta-label">തീയതി:</span>
              <span class="vcard-meta-val">${escapeHtml(formattedDate)}</span>
            </div>
          </div>
        </div>

        <div class="vcard-divider"></div>

        <div class="vcard-member-grid">
          <div class="vcard-field">
            <span class="vcard-lbl">അംഗത്തിന്റെ പേര്</span>
            <span class="vcard-val vcard-name">${escapeHtml(member.fullName)}</span>
          </div>
          <div class="vcard-field">
            <span class="vcard-lbl">മെമ്പർ ഐഡി</span>
            <span class="vcard-val"><span class="vcard-id-pill">${escapeHtml(member.memberId)}</span></span>
          </div>
          <div class="vcard-field">
            <span class="vcard-lbl">ഫോൺ നമ്പർ</span>
            <span class="vcard-val">${escapeHtml(member.phone || 'ലഭ്യമല്ല')}</span>
          </div>
          <div class="vcard-field">
            <span class="vcard-lbl">അടച്ച മാസം</span>
            <span class="vcard-val vcard-period">${malMonth} ${payYear}</span>
          </div>
         
          
        </div>

        <table class="vcard-table">
          <thead>
            <tr>
              <th style="width: 45px;">നം.</th>
              <th>വിവരണം</th>
              <th>കാലയളവ്</th>
              <th class="text-right">തുക</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                <strong>പ്രതിമാസ മെമ്പർഷിപ്പ് മാസവരി</strong>
              </td>
              <td>${malMonth} ${payYear}</td>
              <td class="text-right"><strong>${currencySymbol}${amount.toFixed(2)}</strong></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="vcard-words-cell">
                <span style="font-size:0.72rem; color:#64748b; font-weight:700;">തുക അക്ഷരത്തിൽ:</span><br>
                <em>${escapeHtml(malWords)}</em>
              </td>
              <td class="text-right vcard-total-cell">
                <span style="font-size:0.7rem; color:#64748b; font-weight:700;">ആകെ തുക</span>
                <div class="vcard-total-amt">${currencySymbol}${amount.toFixed(2)}</div>
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="vcard-footer-auth">
          <div class="vcard-auth-col">
            <div class="vcard-sign-wrap">
              <img src="${signBase64}" alt="പ്രസിഡന്റ് ഒപ്പ്" class="vcard-sign-img">
            </div>
            <div class="vcard-sign-line"></div>
            <span class="vcard-sign-title">തുക സ്വീകരിച്ചത്</span>
            <span class="vcard-sign-name">${escapeHtml(handledByText)}</span>
          </div>

          <div class="vcard-stamp-col">
            <div class="vcard-seal">
              <svg viewBox="0 0 100 100" class="vcard-seal-svg">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#059669" stroke-width="2" stroke-dasharray="3 2"/>
                <circle cx="50" cy="50" r="41" fill="none" stroke="#059669" stroke-width="1.2"/>
                <path id="seal-curve-top" d="M 18,50 A 32,32 0 1,1 82,50" fill="none"/>
                <path id="seal-curve-bottom" d="M 82,50 A 32,32 0 1,1 18,50" fill="none"/>
                <text font-size="6.5" font-weight="bold" fill="#059669" letter-spacing="0.5">
                  <textPath href="#seal-curve-top" startOffset="50%" text-anchor="middle">പുലരി ആർട്സ് &amp; സ്പോർട്സ് ക്ലബ്ബ്</textPath>
                </text>
                <text font-size="6" font-weight="bold" fill="#059669" letter-spacing="0.4">
                  <textPath href="#seal-curve-bottom" startOffset="50%" text-anchor="middle">ഔദ്യോഗിക രസീത് • സ്ഥാപിതം 1985</textPath>
                </text>
                <circle cx="50" cy="50" r="18" fill="#ecfdf5" stroke="#059669" stroke-width="1"/>
                <text x="50" y="47" font-size="7" font-weight="900" fill="#065f46" text-anchor="middle">അടച്ചു</text>
                <text x="50" y="56" font-size="5.5" font-weight="bold" fill="#059669" text-anchor="middle">✓ അംഗീകൃതം</text>
              </svg>
            </div>
          </div>

          <div class="vcard-auth-col">
            <div class="vcard-sign-wrap"></div>
            <div class="vcard-sign-line"></div>
            <span class="vcard-sign-title">ഖജാൻജി / സെക്രട്ടറി</span>
            <span class="vcard-sign-name">പുലരി ഭരണസമിതി</span>
          </div>
        </div>

        <div class="vcard-note-box">
          <p class="vcard-note-ml">
            ✅ താങ്കളുടെ ഈ മാസത്തെ ക്ലബ്ബ് മാസവരി വിജയകരമായി ലഭിച്ചിരിക്കുന്നു. ക്ലബ്ബിന്റെ പ്രവർത്തനങ്ങളിലുള്ള താങ്കളുടെ വിലയേറിയ സഹകരണത്തിന് നന്ദി! 🙏
          </p>
          <div class="vcard-security-bar">
            <span>പുലരി ആർട്സ് &amp; സ്പോർട്സ് ക്ലബ്ബ് • ഔദ്യോഗിക ഡിജിറ്റൽ രസീത്</span>
            <span>കമ്പ്യൂട്ടർ നിർമ്മിത ഔദ്യോഗിക രസീത് • രജി. നമ്പർ: MPM/CA/355/2017</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Global Tracking of Currently Inspected Voucher
 */
let currentVoucherMember = null;
let currentVoucherPayment = null;

/**
 * Generate PDF of Membership Voucher
 * Returns: { pdf, blob, base64, filename, file }
 */
async function generateMembershipVoucherPDF(member, paymentInfo = {}, options = {}) {
  const { selectedMonth, selectedYear } = AppState;
  const payMonth = paymentInfo.month || selectedMonth;
  const payYear = paymentInfo.year || selectedYear;
  const safeName = (member.fullName || 'Member').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = options.filename || `Pulari_Voucher_${member.memberId || 'ID'}_${payMonth}_${payYear}_${safeName}.pdf`;

  const logoBase64 = await getLogoBase64().catch(() => 'PULARI.png');
  const signBase64 = await getSignBase64().catch(() => 'shijas.png');

  // Always use a clean, isolated off-screen capture container to prevent scroll or viewport clipping
  tempWrapper = document.createElement('div');
  tempWrapper.style.position = 'fixed';
  tempWrapper.style.left = '-9999px';
  tempWrapper.style.top = '0';
  tempWrapper.style.width = '750px';
  tempWrapper.style.background = '#ffffff';
  tempWrapper.style.zIndex = '-9999';
  tempWrapper.innerHTML = renderMembershipVoucherHTML(member, paymentInfo, logoBase64, signBase64);
  document.body.appendChild(tempWrapper);
  cardElement = tempWrapper.querySelector('.membership-voucher-card') || tempWrapper;

  try {
    const html2canvasFunc = window.html2canvas || (typeof html2pdf !== 'undefined' && html2pdf.Worker && window.html2canvas);
    if (!html2canvasFunc) {
      throw new Error('html2canvas library is not loaded');
    }

    const canvas = await html2canvasFunc(cardElement, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1200
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const jsPdfConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A5 Landscape page dimensions: 210mm x 148mm
    const pdfPageWidth = 210;
    const pdfPageHeight = 148;
    const margin = 6; // 6mm clean margins
    const maxWidth = pdfPageWidth - (margin * 2); // 198mm
    const maxHeight = pdfPageHeight - (margin * 2); // 136mm

    // Aspect-fit: Scale so image fits completely within BOTH maxWidth and maxHeight without clipping
    const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;
    const renderX = (pdfPageWidth - renderWidth) / 2;
    const renderY = (pdfPageHeight - renderHeight) / 2;

    let pdf;
    if (jsPdfConstructor) {
      pdf = new jsPdfConstructor({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5',
        compress: true
      });
      pdf.addImage(imgData, 'JPEG', renderX, renderY, renderWidth, renderHeight, undefined, 'FAST');
    } else if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [margin, margin, margin, margin],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'landscape' }
      };
      const worker = html2pdf().set(opt).from(cardElement);
      if (options.download !== false) {
        await worker.save();
      }
      return { filename };
    } else {
      throw new Error('PDF generator libraries not found.');
    }

    if (options.download !== false) {
      pdf.save(filename);
    }

    const blob = pdf.output('blob');
    const base64Uri = pdf.output('datauristring');
    const base64 = (base64Uri.indexOf(',') >= 0) ? base64Uri.split(',')[1] : base64Uri;
    const file = (typeof File !== 'undefined') ? new File([blob], filename, { type: 'application/pdf' }) : null;

    return { pdf, blob, base64, filename, file };
  } finally {
    if (tempWrapper && tempWrapper.parentNode) {
      tempWrapper.parentNode.removeChild(tempWrapper);
    }
  }
}

/**
 * Direct 1-Click PDF Download for a Member
 */
async function downloadMembershipVoucherPDF(memberId, paymentOverride = null) {
  const member = (AppState.members || []).find(m => m.memberId === memberId);
  if (!member) {
    showToast('Member not found.', 'error');
    return;
  }

  const payment = paymentOverride || (AppState.payments || []).find(p =>
    p.memberId === memberId &&
    p.month === AppState.selectedMonth &&
    Number(p.year) === Number(AppState.selectedYear) &&
    p.status === 'Paid'
  ) || {
    month: AppState.selectedMonth,
    year: AppState.selectedYear,
    amount: member.monthlyFee || AppState.settings.monthly_fee || 30,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash'
  };

  showToast(`Generating PDF voucher for ${member.fullName}...`, 'info');
  try {
    await generateMembershipVoucherPDF(member, payment, { download: true });
    showToast(`PDF voucher for ${member.fullName} downloaded successfully! 📄`, 'success');
  } catch (err) {
    console.error('Error generating PDF voucher:', err);
    showToast('Failed to generate PDF voucher. Please try again.', 'error');
  }
}

/**
 * Open Interactive Membership Voucher Preview Modal
 */
async function openMembershipVoucherModal(memberId, paymentOverride = null) {
  const member = (AppState.members || []).find(m => m.memberId === memberId);
  if (!member) {
    showToast('Member not found.', 'error');
    return;
  }

  const payment = paymentOverride || (AppState.payments || []).find(p =>
    p.memberId === memberId &&
    p.month === AppState.selectedMonth &&
    Number(p.year) === Number(AppState.selectedYear) &&
    p.status === 'Paid'
  ) || {
    month: AppState.selectedMonth,
    year: AppState.selectedYear,
    amount: member.monthlyFee || AppState.settings.monthly_fee || 30,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash'
  };

  currentVoucherMember = member;
  currentVoucherPayment = payment;

  const container = document.getElementById('membership-voucher-preview-container');
  if (container) {
    container.innerHTML = '<div style="padding:2.5rem; text-align:center; color:#64748b; font-weight:600;">ഔദ്യോഗിക രസീത് തയ്യാറാക്കുന്നു...</div>';
  }

  const logoBase64 = await getLogoBase64().catch(() => 'PULARI.png');
  const signBase64 = await getSignBase64().catch(() => 'shijas.png');
  if (container) {
    container.innerHTML = renderMembershipVoucherHTML(member, payment, logoBase64, signBase64);
  }

  const subtitle = document.getElementById('voucher-modal-subtitle');
  if (subtitle) {
    const malMonth = getMalayalamMonth(payment.month || AppState.selectedMonth);
    const payYear = payment.year || AppState.selectedYear;
    subtitle.textContent = `${member.fullName} (${member.memberId}) • ${malMonth} ${payYear}`;
  }

  const phonePreview = document.getElementById('voucher-phone-preview');
  if (phonePreview) {
    phonePreview.textContent = member.phone ? `വാട്ട്‌സ്ആപ്പ്: ${member.phone}` : 'ഫോൺ നമ്പർ നൽകിയിട്ടില്ല';
  }

  // Show/hide mobile share button if Web Share is supported
  const shareBtn = document.getElementById('btn-voucher-share');
  if (shareBtn) {
    if (navigator.share) {
      shareBtn.style.display = 'inline-flex';
    } else {
      shareBtn.style.display = 'none';
    }
  }

  openModal('membership-voucher-modal');
}

/**
 * Send WhatsApp Voucher WITH PDF:
 * 1. Downloads the PDF voucher file to the user's device
 * 2. Copies formatted bilingual message to clipboard
 * 3. Dispatches via background gateway if active (with document attachment)
 * 4. Fallback: Opens WhatsApp Web with prefilled message
 */
async function sendMembershipVoucherWithPDF(member, paymentInfo = {}) {
  const targetMember = member || currentVoucherMember;
  const targetPayment = paymentInfo || currentVoucherPayment || {};
  if (!targetMember) {
    showToast('Member not found.', 'error');
    return;
  }

  showToast(`Generating official PDF voucher for ${targetMember.fullName}...`, 'info');
  try {
    const pdfData = await generateMembershipVoucherPDF(targetMember, targetPayment, { download: true });

    // Copy bilingual message to clipboard
    const message = formatWhatsAppReceiptVoucher(targetMember, targetPayment);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(message).catch(() => { });
    }

    // Try background gateway delivery if enabled
    const provider = localStorage.getItem('pulari_wa_provider') || 'evolution';
    const url = (localStorage.getItem('pulari_wa_url') || '').trim();
    if (provider !== 'disabled' && url) {
      const gwRes = await sendWhatsAppVoucher({
        member: targetMember,
        paymentInfo: targetPayment,
        pdfBase64: pdfData.base64,
        filename: pdfData.filename,
        background: true,
        silent: false
      });
      if (gwRes && gwRes.success && gwRes.method === 'gateway') {
        showToast(`PDF Voucher delivered automatically to ${targetMember.fullName} via WhatsApp Gateway! 🚀`, 'success');
        return;
      }
    }

    // Open WhatsApp Web with prefilled message
    const phone = formatWhatsAppPhone(targetMember.phone);
    if (phone) {
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      showToast(`📄 PDF downloaded & WhatsApp chat opened! Simply attach the downloaded PDF along with the text. 📎`, 'success');
    } else {
      showToast(`📄 PDF downloaded! (No phone number saved to open WhatsApp)`, 'info');
    }
  } catch (err) {
    console.error('sendMembershipVoucherWithPDF error:', err);
    showToast('Could not complete PDF voucher generation: ' + err.message, 'warning');
    sendWhatsAppVoucher({ member: targetMember, paymentInfo: targetPayment, background: false });
  }
}

/**
 * Mobile Web Share API Integration
 */
async function shareMembershipVoucherMobile(member, paymentInfo = {}) {
  const targetMember = member || currentVoucherMember;
  const targetPayment = paymentInfo || currentVoucherPayment || {};
  if (!targetMember) return;

  showToast('Preparing PDF for sharing...', 'info');
  try {
    const pdfData = await generateMembershipVoucherPDF(targetMember, targetPayment, { download: false });
    const message = formatWhatsAppReceiptVoucher(targetMember, targetPayment);

    if (navigator.share && pdfData.file && navigator.canShare && navigator.canShare({ files: [pdfData.file] })) {
      await navigator.share({
        files: [pdfData.file],
        title: `Pulari Membership Receipt - ${targetMember.fullName}`,
        text: message
      });
      showToast('Shared successfully!', 'success');
      return;
    }

    // Fallback if file sharing not supported: download PDF & open WhatsApp Web
    sendMembershipVoucherWithPDF(targetMember, targetPayment);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Share error:', err);
      sendMembershipVoucherWithPDF(targetMember, targetPayment);
    }
  }
}

/**
 * Print Membership Voucher
 */
function printMembershipVoucher() {
  const card = document.querySelector('#membership-voucher-preview-container .membership-voucher-card');
  if (!card) {
    showToast('No voucher preview to print.', 'warning');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Please allow popups to print voucher.', 'warning');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Membership Voucher - Pulari Club</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Noto+Sans+Malayalam:wght@500;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="css/style.css">
      <style>
        @page { size: A5 landscape; margin: 8mm; }
        body { margin: 0; padding: 10px; background: #fff; display: flex; justify-content: center; }
        .membership-voucher-card { width: 100% !important; max-width: 720px; box-shadow: none !important; border: 2px solid #065f46 !important; }
      </style>
    </head>
    <body>
      ${card.outerHTML}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 350);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Dispatch WhatsApp Voucher:
 * 1. If Free Gateway (Evolution API / WPPConnect) is configured: Sends 100% silently in background (with PDF if provided).
 * 2. Fallback: Opens WhatsApp Web (wa.me) pre-filled.
 */
async function sendWhatsAppVoucher(options = {}) {
  const { member, paymentInfo = {}, background = true, silent = false, pdfBase64, filename } = options;
  if (!member) return { success: false, message: 'Member not found' };

  const phone = formatWhatsAppPhone(member.phone);
  if (!phone) {
    if (!silent) showToast(`${member.fullName}ന് ഫോൺ നമ്പർ ലഭ്യമല്ല. ദയവായി ചേർക്കുക.`, 'warning');
    return { success: false, message: 'No phone number' };
  }

  const message = formatWhatsAppReceiptVoucher(member, paymentInfo);
  const provider = localStorage.getItem('pulari_wa_provider') || 'evolution';
  const url = (localStorage.getItem('pulari_wa_url') || '').trim().replace(/\/+$/, '');
  const instance = (localStorage.getItem('pulari_wa_instance') || 'pulari-club').trim();
  const token = (localStorage.getItem('pulari_wa_token') || '').trim();

  // Try background dispatch via Free Gateway if configured
  if (provider !== 'disabled' && url && background) {
    try {
      let endpoint = '';
      let fetchOpts = {};

      if (provider === 'evolution') {
        if (pdfBase64) {
          endpoint = `${url}/message/sendMedia/${instance}`;
          fetchOpts = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'apikey': token } : {})
            },
            body: JSON.stringify({
              number: phone,
              mediatype: 'document',
              mimetype: 'application/pdf',
              caption: message,
              media: pdfBase64,
              fileName: filename || `Pulari_Receipt_${member.memberId}.pdf`
            })
          };
        } else {
          endpoint = `${url}/message/sendText/${instance}`;
          fetchOpts = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'apikey': token } : {})
            },
            body: JSON.stringify({
              number: phone,
              text: message
            })
          };
        }
      } else if (provider === 'wppconnect') {
        if (pdfBase64) {
          endpoint = `${url}/api/${instance}/send-file-base64`;
          fetchOpts = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              phone: phone,
              base64: `data:application/pdf;base64,${pdfBase64}`,
              filename: filename || `Pulari_Receipt_${member.memberId}.pdf`,
              message: message
            })
          };
        } else {
          endpoint = `${url}/api/${instance}/send-message`;
          fetchOpts = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              phone: phone,
              message: message
            })
          };
        }
      } else {
        // Generic Webhook
        endpoint = url;
        fetchOpts = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            to: phone,
            message: message,
            pdfBase64: pdfBase64 || null
          })
        };
      }

      const res = await fetch(endpoint, fetchOpts);
      if (res.ok) {
        if (!silent) showToast(`WhatsApp voucher sent to ${member.fullName} in background! 🚀`, 'success');
        return { success: true, method: 'gateway' };
      }

      const errData = await res.json().catch(() => ({}));
      let errMsg = res.statusText || `HTTP ${res.status}`;
      if (errData?.response?.message?.[0]?.exists === false) {
        errMsg = `Phone number ${phone} is not on WhatsApp!`;
      } else if (errData?.message) {
        errMsg = typeof errData.message === 'string' ? errData.message : JSON.stringify(errData.message);
      }
      console.warn('WhatsApp gateway response error:', res.status, errMsg);
      if (!silent) showToast(`WhatsApp delivery: ${errMsg}`, 'warning');
    } catch (err) {
      console.warn('WhatsApp gateway background fetch failed:', err);
      if (!silent) showToast('Could not reach WhatsApp gateway server. Check connection.', 'warning');
    }
  }

  // Fallback to WhatsApp Web click-to-chat
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  if (!silent) showToast(`${member.fullName}ന്റെ വാട്ട്‌സ്ആപ്പ് വൗച്ചർ ചാറ്റ് തുറക്കുന്നു...`, 'info');
  return { success: true, method: 'web' };
}

/**
 * Bulk Dispatch Payment Vouchers to all Paid members for current month
 */
async function sendBulkVouchersForMonth(month, year) {
  const targetMonth = month || AppState.selectedMonth;
  const targetYear = Number(year || AppState.selectedYear);
  const { members, payments } = AppState;

  const paidPayments = payments.filter(p =>
    p.month === targetMonth &&
    Number(p.year) === targetYear &&
    p.status === 'Paid'
  );

  if (paidPayments.length === 0) {
    showToast(`No paid member records found for ${targetMonth} ${targetYear}.`, 'info');
    return;
  }

  const eligible = [];
  for (const pay of paidPayments) {
    const mem = members.find(m => m.memberId === pay.memberId);
    if (mem && formatWhatsAppPhone(mem.phone)) {
      eligible.push({ member: mem, payment: pay });
    }
  }

  if (eligible.length === 0) {
    showToast('Paid members found, but none have valid WhatsApp phone numbers saved.', 'warning');
    return;
  }

  const provider = localStorage.getItem('pulari_wa_provider') || 'evolution';
  const url = (localStorage.getItem('pulari_wa_url') || '').trim();

  if (provider === 'disabled' || !url) {
    if (!confirm(`${eligible.length} paid members with WhatsApp numbers found for ${targetMonth} ${targetYear}.\n\nNote: WhatsApp Gateway server is not configured in Settings, so vouchers will open one-by-one in WhatsApp Web tabs.\n\nDo you want to proceed?`)) {
      return;
    }
  } else {
    if (!confirm(`Send automated WhatsApp receipt vouchers to ${eligible.length} paid members in the background for ${targetMonth} ${targetYear}?`)) {
      return;
    }
  }

  showToast(`Sending WhatsApp vouchers to ${eligible.length} members...`, 'info');

  let sentCount = 0;
  for (let i = 0; i < eligible.length; i++) {
    const item = eligible[i];
    await sendWhatsAppVoucher({
      member: item.member,
      paymentInfo: item.payment,
      background: true,
      silent: true
    });
    sentCount++;
    // Small delay between sends to prevent server rate limiting
    if (i < eligible.length - 1) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  showToast(`Successfully dispatched WhatsApp vouchers to ${sentCount} members! 🎉`, 'success');
}

/**
 * Initialize Event Listeners for Voucher Modal Action Buttons
 */
function initMembershipVoucherModalListeners() {
  const sendWaPdfBtn = document.getElementById('btn-voucher-send-wa-pdf');
  if (sendWaPdfBtn) {
    sendWaPdfBtn.addEventListener('click', () => {
      if (currentVoucherMember) {
        sendMembershipVoucherWithPDF(currentVoucherMember, currentVoucherPayment);
      }
    });
  }

  const downloadPdfBtn = document.getElementById('btn-voucher-download-pdf');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      if (currentVoucherMember) {
        downloadMembershipVoucherPDF(currentVoucherMember.memberId, currentVoucherPayment);
      }
    });
  }

  const printBtn = document.getElementById('btn-voucher-print');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      printMembershipVoucher();
    });
  }

  const shareBtn = document.getElementById('btn-voucher-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (currentVoucherMember) {
        shareMembershipVoucherMobile(currentVoucherMember, currentVoucherPayment);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMembershipVoucherModalListeners);
} else {
  initMembershipVoucherModalListeners();
}

// Expose globally for payments view and onclick bindings
window.escapeHtml = escapeHtml;
window.formatWhatsAppPhone = formatWhatsAppPhone;
window.sendWhatsAppReminder = sendWhatsAppReminder;
window.formatWhatsAppReceiptVoucher = formatWhatsAppReceiptVoucher;
window.sendWhatsAppVoucher = sendWhatsAppVoucher;
window.sendBulkVouchersForMonth = sendBulkVouchersForMonth;
window.convertNumberToWordsINR = convertNumberToWordsINR;
window.convertNumberToWordsMalayalam = convertNumberToWordsMalayalam;
window.getMalayalamMonth = getMalayalamMonth;
window.formatVoucherDate = formatVoucherDate;
window.formatPaymentMethodMalayalam = formatPaymentMethodMalayalam;
window.renderMembershipVoucherHTML = renderMembershipVoucherHTML;
window.generateMembershipVoucherPDF = generateMembershipVoucherPDF;
window.downloadMembershipVoucherPDF = downloadMembershipVoucherPDF;
window.openMembershipVoucherModal = openMembershipVoucherModal;
window.sendMembershipVoucherWithPDF = sendMembershipVoucherWithPDF;
window.shareMembershipVoucherMobile = shareMembershipVoucherMobile;
window.getLogoBase64 = getLogoBase64;
window.getSignBase64 = getSignBase64;
window.printMembershipVoucher = printMembershipVoucher;


