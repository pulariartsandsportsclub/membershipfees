/**
 * Pulari Arts & Sports Club - Public Member Dashboard
 */

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PublicState = {
  selectedMonth: new Date().toLocaleString('default', { month: 'long' }),
  selectedYear: new Date().getFullYear(),
  members: [],
  payments: [],
  settings: {
    monthly_fee: 30,
    club_name: "Pulari Arts & Sports Club",
    currency: "₹"
  },
  searchQuery: '',
  statusFilter: 'All'
};

document.addEventListener('DOMContentLoaded', () => {
  fillMonthYearSelects();
  bindPublicControls();
  loadPublicData();
});

function fillMonthYearSelects() {
  const monthSelect = document.getElementById('public-month-select');
  const yearSelect = document.getElementById('public-year-select');
  const currentYear = new Date().getFullYear();

  if (monthSelect) {
    monthSelect.innerHTML = MONTHS_LIST.map(month =>
      `<option value="${month}">${month}</option>`
    ).join('');
    monthSelect.value = PublicState.selectedMonth;
  }

  if (yearSelect) {
    const years = [currentYear - 1, currentYear, currentYear + 1];
    yearSelect.innerHTML = years.map(year =>
      `<option value="${year}">${year}</option>`
    ).join('');
    yearSelect.value = String(PublicState.selectedYear);
  }
}

function bindPublicControls() {
  const monthSelect = document.getElementById('public-month-select');
  const yearSelect = document.getElementById('public-year-select');
  const currentBtn = document.getElementById('btn-public-current-month');
  const searchInput = document.getElementById('public-search');

  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      PublicState.selectedMonth = monthSelect.value;
      renderPublicDashboard();
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', () => {
      PublicState.selectedYear = Number(yearSelect.value);
      renderPublicDashboard();
    });
  }

  if (currentBtn) {
    currentBtn.addEventListener('click', () => {
      PublicState.selectedMonth = new Date().toLocaleString('default', { month: 'long' });
      PublicState.selectedYear = new Date().getFullYear();
      if (monthSelect) monthSelect.value = PublicState.selectedMonth;
      if (yearSelect) yearSelect.value = String(PublicState.selectedYear);
      renderPublicDashboard();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      PublicState.searchQuery = searchInput.value.trim();
      renderPublicDashboard();
    });
  }

  document.querySelectorAll('.public-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      PublicState.statusFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('.public-filter-btn').forEach(el => {
        const isActive = el === btn;
        el.classList.toggle('btn-primary', isActive);
        el.classList.toggle('btn-outline', !isActive);
      });
      renderPublicDashboard();
    });
  });
}

async function loadPublicData() {
  const spinner = document.getElementById('public-spinner');
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const [settingsRes, membersRes, paymentsRes] = await Promise.all([
      apiCall('GET_SETTINGS'),
      apiCall('GET_MEMBERS'),
      apiCall('GET_PAYMENTS')
    ]);

    if (settingsRes.success) PublicState.settings = settingsRes.data;
    if (membersRes.success) PublicState.members = membersRes.data || [];
    if (paymentsRes.success) PublicState.payments = paymentsRes.data || [];

    renderPublicDashboard();
  } catch (err) {
    console.error('Public dashboard load error:', err);
    showPublicToast('Could not load membership data.', 'error');
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

function getMonthRows() {
  const { members, payments, selectedMonth, selectedYear, settings } = PublicState;
  const activeMembers = members.filter(m => m.status === 'Active');
  const defaultFee = Number(settings.monthly_fee || 30);

  return activeMembers.map(member => {
    const payment = payments.find(p =>
      p.memberId === member.memberId &&
      p.month === selectedMonth &&
      Number(p.year) === Number(selectedYear) &&
      p.status === 'Paid'
    );

    return {
      memberId: member.memberId,
      memberName: member.fullName,
      fee: Number(member.monthlyFee || defaultFee),
      isPaid: !!payment,
      paymentDate: payment ? payment.paymentDate : '',
      amount: payment ? Number(payment.amount || 0) : 0
    };
  });
}

function renderPublicDashboard() {
  const rows = getMonthRows();
  const paidRows = rows.filter(r => r.isPaid);
  const unpaidRows = rows.filter(r => !r.isPaid);
  const totalCollected = paidRows.reduce((sum, r) => sum + Number(r.amount || r.fee || 0), 0);
  const rate = rows.length > 0 ? Math.round((paidRows.length / rows.length) * 100) : 0;

  setText('public-total-members', rows.length);
  setText('public-paid-count', paidRows.length);
  setText('public-unpaid-count', unpaidRows.length);
  setText('public-collected-amount', formatPublicCurrency(totalCollected));
  setText('public-collection-rate', `${rate}%`);
  setText('public-month-badge', `${PublicState.selectedMonth} ${PublicState.selectedYear}`);

  const fill = document.getElementById('public-progress-fill');
  if (fill) fill.style.width = `${rate}%`;

  renderMonthsStrip();
  renderMembersTable(rows);
  renderPaidUnpaidTables(paidRows, unpaidRows);
}

function renderMonthsStrip() {
  const container = document.getElementById('public-months-strip');
  if (!container) return;

  const { payments, members, selectedMonth, selectedYear } = PublicState;
  const activeCount = members.filter(m => m.status === 'Active').length;
  const monthIdx = MONTHS_LIST.indexOf(selectedMonth);
  const chips = [];

  for (let i = 5; i >= 0; i--) {
    let m = monthIdx - i;
    let y = Number(selectedYear);
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const monthName = MONTHS_LIST[m];
    const paidCount = payments.filter(p =>
      p.month === monthName && Number(p.year) === y && p.status === 'Paid'
    ).length;
    const isSelected = monthName === selectedMonth && y === Number(selectedYear);
    chips.push(`
      <button type="button" class="public-month-chip${isSelected ? ' active' : ''}"
        data-month="${monthName}" data-year="${y}">
        <span class="chip-month">${monthName.substring(0, 3)} '${String(y).slice(-2)}</span>
        <span class="chip-count">${paidCount}/${activeCount} paid</span>
      </button>
    `);
  }

  container.innerHTML = chips.join('');
  container.querySelectorAll('.public-month-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      PublicState.selectedMonth = btn.getAttribute('data-month');
      PublicState.selectedYear = Number(btn.getAttribute('data-year'));
      const monthSelect = document.getElementById('public-month-select');
      const yearSelect = document.getElementById('public-year-select');
      if (monthSelect) monthSelect.value = PublicState.selectedMonth;
      if (yearSelect) yearSelect.value = String(PublicState.selectedYear);
      renderPublicDashboard();
    });
  });
}

function renderMembersTable(rows) {
  const tbody = document.getElementById('public-members-table-body');
  if (!tbody) return;

  const query = PublicState.searchQuery.toLowerCase();
  const filtered = rows.filter(row => {
    const matchesSearch =
      row.memberName.toLowerCase().includes(query) ||
      String(row.memberId).toLowerCase().includes(query);
    if (PublicState.statusFilter === 'Paid') return matchesSearch && row.isPaid;
    if (PublicState.statusFilter === 'Unpaid') return matchesSearch && !row.isPaid;
    return matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>No members found for ${PublicState.selectedMonth} ${PublicState.selectedYear}.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(row => `
    <tr>
      <td><strong>${escapeHtml(row.memberId)}</strong></td>
      <td>${escapeHtml(row.memberName)}</td>
      <td style="font-weight:600;">${formatPublicCurrency(row.fee)}</td>
      <td>
        <span class="badge ${row.isPaid ? 'badge-paid' : 'badge-unpaid'}">
          ${row.isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </td>
      <td>${row.isPaid ? escapeHtml(row.paymentDate) : '—'}</td>
    </tr>
  `).join('');
}

function renderPaidUnpaidTables(paidRows, unpaidRows) {
  const paidBody = document.getElementById('public-paid-table-body');
  const unpaidBody = document.getElementById('public-unpaid-table-body');

  if (paidBody) {
    paidBody.innerHTML = paidRows.length
      ? paidRows.map(row => `
          <tr>
            <td><strong>${escapeHtml(row.memberId)}</strong></td>
            <td>${escapeHtml(row.memberName)}</td>
            <td>${formatPublicCurrency(row.amount || row.fee)}</td>
            <td>${escapeHtml(row.paymentDate)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="4" class="empty-state">No paid members yet.</td></tr>`;
  }

  if (unpaidBody) {
    unpaidBody.innerHTML = unpaidRows.length
      ? unpaidRows.map(row => `
          <tr>
            <td><strong>${escapeHtml(row.memberId)}</strong></td>
            <td>${escapeHtml(row.memberName)}</td>
            <td>${formatPublicCurrency(row.fee)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="3" class="empty-state">All members have paid.</td></tr>`;
  }
}

function formatPublicCurrency(amount) {
  const symbol = PublicState.settings.currency || '₹';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showPublicToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
