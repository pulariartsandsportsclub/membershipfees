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
 * Generate Formatted Bilingual Payment Receipt Voucher Message
 */
function formatWhatsAppReceiptVoucher(member, paymentInfo = {}) {
  const { settings, selectedMonth, selectedYear } = AppState;
  const clubName = (settings && settings.club_name) || "പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ്";
  const currencySymbol = (settings && settings.currency) || "₹";
  const amount = paymentInfo.amount || member.monthlyFee || (settings && settings.monthly_fee) || 30;
  const payMonth = paymentInfo.month || selectedMonth;
  const payYear = paymentInfo.year || selectedYear;
  const paymentDate = paymentInfo.paymentDate || new Date().toISOString().split('T')[0];
  const receiptNo = paymentInfo.paymentId || `PAY-${payYear}${String(MONTHS_LIST.indexOf(payMonth) + 1).padStart(2, '0')}-${String(member.memberId).replace(/\D/g, '') || '01'}`;

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

  const malMonth = malMonthNames[payMonth] || payMonth;

  return `
🧾 *${clubName}*
*മാസവരി രസീത് / PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━
👤 *അംഗത്തിന്റെ പേര് / Name:* ${member.fullName}
🆔 *മെമ്പർ ഐഡി / ID:* ${member.memberId}
📅 *അടച്ച മാസം / Period:* ${malMonth} ${payYear} (${payMonth})
💰 *അടച്ച തുക / Amount:* ${currencySymbol}${amount}
💳 *രീതി / Method:* ${paymentInfo.paymentMethod || 'Cash'}
📆 *തീയതി / Date:* ${paymentDate}
🔢 *രസീത് നമ്പർ / Receipt No:* ${receiptNo}
━━━━━━━━━━━━━━━━━━━━
✅ താങ്കളുടെ ഈ മാസത്തെ ക്ലബ്ബ് മാസവരി വിജയകരമായി ലഭിച്ചിരിക്കുന്നു. ക്ലബ്ബിന്റെ പ്രവർത്തനങ്ങളിലുള്ള താങ്കളുടെ വിലയേറിയ സഹകരണത്തിന് നന്ദി! 🙏

_${clubName} ഭരണസമിതി_`;
}

/**
 * Dispatch WhatsApp Voucher:
 * 1. If Free Gateway (Evolution API / WPPConnect) is configured: Sends 100% silently in background.
 * 2. Fallback: Opens WhatsApp Web (wa.me) pre-filled.
 */
async function sendWhatsAppVoucher(options = {}) {
  const { member, paymentInfo = {}, background = true, silent = false } = options;
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
      } else if (provider === 'wppconnect') {
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
            message: message
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

// Expose globally for payments view and onclick bindings
window.formatWhatsAppPhone = formatWhatsAppPhone;
window.sendWhatsAppReminder = sendWhatsAppReminder;
window.formatWhatsAppReceiptVoucher = formatWhatsAppReceiptVoucher;
window.sendWhatsAppVoucher = sendWhatsAppVoucher;
window.sendBulkVouchersForMonth = sendBulkVouchersForMonth;

