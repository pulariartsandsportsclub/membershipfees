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

  // Active members
  const activeMembers = members.filter(m => m.status === 'Active');
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
});

/**
 * Client-side CSV File Generation & Download
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
  showToast('Report exported as CSV successfully!', 'success');
}
