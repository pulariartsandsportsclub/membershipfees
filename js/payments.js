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
          <div style="display:inline-flex; gap:0.4rem; align-items:center;">
            <button class="btn btn-secondary btn-sm" onclick="openPaymentConfirmModal('${row.memberId}', '${row.memberName}', ${row.fee})">
              Mark Paid
            </button>
            <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsAppReminder('${row.memberId}')" title="Send WhatsApp Reminder to ${row.memberName}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </button>
          </div>
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
