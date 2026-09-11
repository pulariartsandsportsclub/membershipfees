/**
 * Pulari Arts & Sports Club - Membership Management System
 * Monthly Payments Module (js/payments.js)
 */

let paymentSearchQuery = '';
let paymentStatusFilter = 'All'; // 'All', 'Paid', 'Unpaid'
let pendingPaymentTarget = null; // Store target payment info for modal confirm

function renderPaymentsPage() {
  const tbody = document.getElementById('payments-table-body');
  if (!tbody) return;

  const monthSelect = document.getElementById('payment-month-select');
  const yearSelect = document.getElementById('payment-year-select');

  if (monthSelect) monthSelect.value = AppState.selectedMonth;
  if (yearSelect) yearSelect.value = AppState.selectedYear;

  const { members, payments, selectedMonth, selectedYear } = AppState;

  // Active members are eligible for payment tracking
  const activeMembers = members.filter(m => m.status === 'Active');

  // Map each member to their payment record for selected month/year
  const paymentRows = activeMembers.map(member => {
    const payment = payments.find(p => 
      p.memberId === member.memberId && 
      p.month === selectedMonth && 
      Number(p.year) === Number(selectedYear) && 
      p.status === 'Paid'
    );

    return {
      memberId: member.memberId,
      memberName: member.fullName,
      fee: member.monthlyFee || AppState.settings.monthly_fee || 30,
      isPaid: !!payment,
      paymentDate: payment ? payment.paymentDate : '—',
      paymentId: payment ? payment.paymentId : null
    };
  });

  // Apply Search & Filter
  const filtered = paymentRows.filter(row => {
    const matchesSearch = 
      row.memberName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
      row.memberId.toLowerCase().includes(paymentSearchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (paymentStatusFilter === 'Paid') matchesStatus = row.isPaid;
    if (paymentStatusFilter === 'Unpaid') matchesStatus = !row.isPaid;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <p>No member payment records found for ${selectedMonth} ${selectedYear}.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(row => `
    <tr>
      <td><strong>${row.memberId}</strong></td>
      <td>${row.memberName}</td>
      <td style="font-weight:600;">${formatCurrency(row.fee)}</td>
      <td>
        <span class="badge ${row.isPaid ? 'badge-paid' : 'badge-unpaid'}">
          ${row.isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </td>
      <td>${row.paymentDate}</td>
      <td>
        ${row.isPaid ? `
          <button class="btn btn-outline btn-sm" onclick="promptMarkUnpaid('${row.memberId}', '${row.memberName}')">
            Mark Unpaid
          </button>
        ` : `
          <button class="btn btn-secondary btn-sm" onclick="openPaymentConfirmModal('${row.memberId}', '${row.memberName}', ${row.fee})">
            Mark Paid
          </button>
        `}
      </td>
    </tr>
  `).join('');
}

/**
 * Event Listeners for Payments Page Controls
 */
document.addEventListener('DOMContentLoaded', () => {
  const monthSelect = document.getElementById('payment-month-select');
  const yearSelect = document.getElementById('payment-year-select');
  const currentMonthBtn = document.getElementById('btn-current-month');
  const searchInput = document.getElementById('payment-search');
  const statusFilterBtnGroup = document.querySelectorAll('.payment-filter-btn');
  const confirmPaymentBtn = document.getElementById('btn-confirm-payment');

  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      AppState.selectedMonth = e.target.value;
      updateHeaderMonthBadge();
      renderPaymentsPage();
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      AppState.selectedYear = parseInt(e.target.value, 10);
      updateHeaderMonthBadge();
      renderPaymentsPage();
    });
  }

  if (currentMonthBtn) {
    currentMonthBtn.addEventListener('click', () => {
      const now = new Date();
      AppState.selectedMonth = now.toLocaleString('default', { month: 'long' });
      AppState.selectedYear = now.getFullYear();
      updateHeaderMonthBadge();
      renderPaymentsPage();
      showToast('Switched to current month.', 'info');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      paymentSearchQuery = e.target.value;
      renderPaymentsPage();
    });
  }

  statusFilterBtnGroup.forEach(btn => {
    btn.addEventListener('click', () => {
      statusFilterBtnGroup.forEach(b => b.classList.remove('btn-primary'));
      statusFilterBtnGroup.forEach(b => b.classList.add('btn-outline'));
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');

      paymentStatusFilter = btn.getAttribute('data-filter');
      renderPaymentsPage();
    });
  });

  if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener('click', executeMarkPayment);
  }
});

/**
 * Open Payment Confirmation Modal
 */
function openPaymentConfirmModal(memberId, memberName, amount) {
  pendingPaymentTarget = {
    memberId,
    memberName,
    amount,
    month: AppState.selectedMonth,
    year: AppState.selectedYear
  };

  const desc = document.getElementById('payment-confirm-desc');
  if (desc) {
    desc.innerHTML = `Confirm payment of <strong>${formatCurrency(amount)}</strong> for <strong>${memberName} (${memberId})</strong> for <strong>${AppState.selectedMonth} ${AppState.selectedYear}</strong>?`;
  }

  openModal('payment-confirm-modal');
}

/**
 * Execute Mark Paid via API
 */
async function executeMarkPayment() {
  if (!pendingPaymentTarget) return;

  const btn = document.getElementById('btn-confirm-payment');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  const payload = {
    memberId: pendingPaymentTarget.memberId,
    memberName: pendingPaymentTarget.memberName,
    month: pendingPaymentTarget.month,
    year: pendingPaymentTarget.year,
    amount: pendingPaymentTarget.amount,
    status: 'Paid',
    paymentMethod: 'Cash',
    notes: `Monthly fee for ${pendingPaymentTarget.month} ${pendingPaymentTarget.year}`
  };

  const res = await apiCall('MARK_PAYMENT', payload);

  btn.disabled = false;
  btn.textContent = 'Confirm Payment';

  if (res.success) {
    closeModal('payment-confirm-modal');
    showToast(res.message, 'success');
    refreshAppData();
  } else {
    showToast(res.message || 'Payment recording failed.', 'error');
  }

  pendingPaymentTarget = null;
}

/**
 * Correction: Mark Unpaid
 */
async function promptMarkUnpaid(memberId, memberName) {
  if (confirm(`Mark payment as UNPAID for ${memberName} for ${AppState.selectedMonth} ${AppState.selectedYear}?`)) {
    const payload = {
      memberId,
      month: AppState.selectedMonth,
      year: AppState.selectedYear,
      status: 'Unpaid'
    };

    const res = await apiCall('MARK_PAYMENT', payload);
    if (res.success) {
      showToast('Payment record updated to Unpaid.', 'info');
      refreshAppData();
    } else {
      showToast(res.message || 'Error updating payment.', 'error');
    }
  }
}
