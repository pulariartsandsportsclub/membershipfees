/**
 * Pulari Arts & Sports Club - Public Member Dashboard
 * Supports Monthly Payment Status and Yearly Wise Member Breakdown
 */

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const PublicState = {
  currentView: 'monthly', // 'monthly' or 'yearly'
  selectedMonth: new Date().toLocaleString('default', { month: 'long' }),
  selectedYear: new Date().getFullYear(),
  yearlyYear: new Date().getFullYear(),
  yearlySearchQuery: '',
  yearlyStatusFilter: 'All', // 'All', 'Full', 'Partial', 'Unpaid'
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
  bindViewSwitcher();
  bindYearlyControls();
  loadPublicData();
});

function fillMonthYearSelects() {
  const monthSelect = document.getElementById('public-month-select');
  const yearSelect = document.getElementById('public-year-select');
  const yearlyYearSelect = document.getElementById('yearly-year-select');
  const currentYear = new Date().getFullYear();

  if (monthSelect) {
    monthSelect.innerHTML = MONTHS_LIST.map(month =>
      `<option value="${month}">${month}</option>`
    ).join('');
    monthSelect.value = PublicState.selectedMonth;
  }

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  if (yearSelect) {
    yearSelect.innerHTML = years.map(year =>
      `<option value="${year}">${year}</option>`
    ).join('');
    yearSelect.value = String(PublicState.selectedYear);
  }

  if (yearlyYearSelect) {
    yearlyYearSelect.innerHTML = years.map(year =>
      `<option value="${year}">${year}</option>`
    ).join('');
    yearlyYearSelect.value = String(PublicState.yearlyYear);
  }
}

function bindViewSwitcher() {
  const btnMonthly = document.getElementById('view-tab-monthly');
  const btnYearly = document.getElementById('view-tab-yearly');
  const monthlySection = document.getElementById('view-section-monthly');
  const yearlySection = document.getElementById('view-section-yearly');
  const forceRefreshBtn = document.getElementById('btn-force-refresh');

  function switchView(view) {
    PublicState.currentView = view;
    if (view === 'monthly') {
      btnMonthly?.classList.add('active');
      btnYearly?.classList.remove('active');
      if (monthlySection) monthlySection.style.display = 'block';
      if (yearlySection) yearlySection.style.display = 'none';
      renderPublicDashboard();
    } else {
      btnYearly?.classList.add('active');
      btnMonthly?.classList.remove('active');
      if (yearlySection) yearlySection.style.display = 'block';
      if (monthlySection) monthlySection.style.display = 'none';
      renderYearlyDashboard();
    }
  }

  if (btnMonthly) {
    btnMonthly.addEventListener('click', () => switchView('monthly'));
  }
  if (btnYearly) {
    btnYearly.addEventListener('click', () => switchView('yearly'));
  }

  if (forceRefreshBtn) {
    forceRefreshBtn.addEventListener('click', () => {
      loadPublicData(true);
    });
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

function bindYearlyControls() {
  const yearlyYearSelect = document.getElementById('yearly-year-select');
  const btnCurrentYear = document.getElementById('btn-yearly-current-year');
  const yearlySearch = document.getElementById('yearly-search');

  if (yearlyYearSelect) {
    yearlyYearSelect.addEventListener('change', () => {
      PublicState.yearlyYear = Number(yearlyYearSelect.value);
      renderYearlyDashboard();
    });
  }

  if (btnCurrentYear) {
    btnCurrentYear.addEventListener('click', () => {
      PublicState.yearlyYear = new Date().getFullYear();
      if (yearlyYearSelect) yearlyYearSelect.value = String(PublicState.yearlyYear);
      renderYearlyDashboard();
    });
  }

  if (yearlySearch) {
    yearlySearch.addEventListener('input', () => {
      PublicState.yearlySearchQuery = yearlySearch.value.trim();
      renderYearlyDashboard();
    });
  }

  document.querySelectorAll('.yearly-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      PublicState.yearlyStatusFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('.yearly-filter-btn').forEach(el => {
        const isActive = el === btn;
        el.classList.toggle('btn-primary', isActive);
        el.classList.toggle('btn-outline', !isActive);
      });
      renderYearlyDashboard();
    });
  });
}

/**
 * Fast Data Loading with Stale-While-Revalidate
 * Loads instantly from cache and updates fresh from Google Sheet in background
 */
async function loadPublicData(isManualRefresh = false) {
  const spinner = document.getElementById('public-spinner');
  const cacheDot = document.querySelector('.status-indicator-dot');
  const cacheText = document.getElementById('public-cache-text');

  if (spinner) spinner.style.display = 'inline-block';
  if (cacheDot) cacheDot.className = 'status-indicator-dot updating';
  if (cacheText) cacheText.textContent = isManualRefresh ? 'Fetching from Sheet...' : 'Syncing with Sheet...';

  try {
    const { cachedData, freshPromise } = await fetchInitialData((freshData) => {
      // Background fresh data arrived
      applyLoadedData(freshData);
      if (cacheDot) cacheDot.className = 'status-indicator-dot';
      if (cacheText) cacheText.textContent = 'Live Connected';
      if (spinner) spinner.style.display = 'none';
      if (isManualRefresh) {
        showPublicToast('Latest data refreshed from Google Sheet!', 'success');
      }
    });

    // If cached data is present, render immediately in <50ms!
    if (cachedData && !isManualRefresh) {
      applyLoadedData(cachedData);
      if (cacheText) cacheText.textContent = 'Showing cached • Updating...';
    }

    // Wait for the fresh promise
    await freshPromise;
  } catch (err) {
    console.error('Public dashboard data load error:', err);
    if (cacheDot) cacheDot.className = 'status-indicator-dot';
    if (cacheText) cacheText.textContent = 'Offline / Local';
    showPublicToast('Connected in offline mode.', 'info');
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

function applyLoadedData(data) {
  if (data.settings) PublicState.settings = data.settings;
  if (data.members) PublicState.members = data.members || [];
  if (data.payments) PublicState.payments = data.payments || [];

  renderPublicDashboard();
  renderYearlyDashboard();
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

/* ==========================================================================
   YEARLY OVERVIEW RENDER LOGIC (Which Months Paid & Yearly Matrix)
   ========================================================================== */

function getYearlyMemberData() {
  const { members, payments, yearlyYear, settings } = PublicState;
  const activeMembers = members.filter(m => m.status === 'Active');
  const defaultFee = Number(settings.monthly_fee || 30);

  return activeMembers.map(member => {
    const memberFee = Number(member.monthlyFee || defaultFee);
    // Find all paid records for this member in this year
    const memberYearPayments = payments.filter(p =>
      p.memberId === member.memberId &&
      Number(p.year) === Number(yearlyYear) &&
      p.status === 'Paid'
    );

    // Map through all 12 months
    const monthsStatus = MONTHS_LIST.map((monthName, idx) => {
      const payment = memberYearPayments.find(p => p.month.toLowerCase() === monthName.toLowerCase());
      return {
        monthName,
        shortName: MONTHS_SHORT[idx],
        isPaid: !!payment,
        paymentDate: payment ? payment.paymentDate : '',
        amount: payment ? Number(payment.amount || memberFee) : 0
      };
    });

    const paidMonths = monthsStatus.filter(m => m.isPaid);
    const paidCount = paidMonths.length;
    const totalPaid = paidMonths.reduce((sum, m) => sum + m.amount, 0);
    const expectedTotal = memberFee * 12;

    let overallStatus = 'Unpaid';
    if (paidCount === 12) {
      overallStatus = 'Full';
    } else if (paidCount > 0) {
      overallStatus = 'Partial';
    }

    return {
      memberId: member.memberId,
      memberName: member.fullName,
      phone: member.phone || '',
      monthlyFee: memberFee,
      expectedTotal,
      totalPaid,
      paidCount,
      monthsStatus,
      paidMonthNames: paidMonths.map(m => m.shortName),
      overallStatus
    };
  });
}

function renderYearlyDashboard() {
  const yearlyData = getYearlyMemberData();
  const selectedYear = PublicState.yearlyYear;
  const defaultFee = Number(PublicState.settings.monthly_fee || 30);

  // Calculate Yearly Stats
  const totalMembers = yearlyData.length;
  const fullPaidCount = yearlyData.filter(d => d.overallStatus === 'Full').length;
  const partialPaidCount = yearlyData.filter(d => d.overallStatus === 'Partial').length;
  const unpaidCount = yearlyData.filter(d => d.overallStatus === 'Unpaid').length;
  const totalYearlyCollected = yearlyData.reduce((sum, d) => sum + d.totalPaid, 0);
  const totalYearlyExpected = yearlyData.reduce((sum, d) => sum + d.expectedTotal, totalMembers * defaultFee * 12);

  const collectionRate = totalYearlyExpected > 0
    ? Math.round((totalYearlyCollected / totalYearlyExpected) * 100)
    : 0;

  // Update Stats Elements
  setText('yearly-total-members', totalMembers);
  setText('yearly-full-paid-count', fullPaidCount);
  setText('yearly-partial-paid-count', partialPaidCount);
  setText('yearly-total-collected', formatPublicCurrency(totalYearlyCollected));
  setText('yearly-collection-rate', `${collectionRate}%`);
  setText('yearly-progress-year-label', selectedYear);
  setText('yearly-progress-sublabel', `${formatPublicCurrency(totalYearlyCollected)} of ${formatPublicCurrency(totalYearlyExpected)} expected`);
  setText('yearly-full-paid-sub', `${fullPaidCount} of ${totalMembers} members cleared all 12 mos`);
  setText('yearly-collected-sub', `Total collection in ${selectedYear}`);

  const fill = document.getElementById('yearly-progress-fill');
  if (fill) fill.style.width = `${collectionRate}%`;

  // Filter Table Rows
  const query = PublicState.yearlySearchQuery.toLowerCase();
  const filtered = yearlyData.filter(row => {
    const matchesSearch =
      row.memberName.toLowerCase().includes(query) ||
      String(row.memberId).toLowerCase().includes(query);

    if (PublicState.yearlyStatusFilter === 'Full') return matchesSearch && row.overallStatus === 'Full';
    if (PublicState.yearlyStatusFilter === 'Partial') return matchesSearch && row.overallStatus === 'Partial';
    if (PublicState.yearlyStatusFilter === 'Unpaid') return matchesSearch && row.overallStatus === 'Unpaid';
    return matchesSearch;
  });

  const tbody = document.getElementById('yearly-members-table-body');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <p>No members found matching the filter for ${selectedYear}.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(row => {
    const pct = Math.round((row.paidCount / 12) * 100);

    // Summary Badge Text
    let completionBadge = '';
    if (row.paidCount === 12) {
      completionBadge = `<div class="yearly-completion-pill all-paid">⭐ All 12 Months Cleared</div>`;
    } else if (row.paidCount > 0) {
      completionBadge = `<div class="yearly-completion-pill partial">⏳ ${row.paidCount} Months Paid: ${row.paidMonthNames.join(', ')}</div>`;
    } else {
      completionBadge = `<div class="yearly-completion-pill zero">❌ No payments this year</div>`;
    }

    // Generate 12 Month Pills (Jan - Dec)
    const monthPillsHtml = row.monthsStatus.map(m => {
      const tooltip = m.isPaid
        ? `${m.monthName} ${selectedYear}: Paid ${formatPublicCurrency(m.amount)}${m.paymentDate ? ' on ' + m.paymentDate : ''}`
        : `${m.monthName} ${selectedYear}: Unpaid / Due`;
      const checkIcon = m.isPaid ? '✓ ' : '';
      return `<span class="month-pill ${m.isPaid ? 'paid' : 'unpaid'}" title="${escapeHtml(tooltip)}">${checkIcon}${m.shortName}</span>`;
    }).join('');

    // Overall Status Badge
    let statusBadge = '';
    if (row.overallStatus === 'Full') {
      statusBadge = `<span class="badge badge-paid">Fully Paid (12/12)</span>`;
    } else if (row.overallStatus === 'Partial') {
      statusBadge = `<span class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">Partial (${row.paidCount}/12)</span>`;
    } else {
      statusBadge = `<span class="badge badge-unpaid">Unpaid (0/12)</span>`;
    }

    return `
      <tr>
        <td><strong>${escapeHtml(row.memberId)}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--text-main);">${escapeHtml(row.memberName)}</div>
          ${row.phone ? `<div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(row.phone)}</div>` : ''}
        </td>
        <td>
          <div class="months-progress-wrapper">
            <div class="months-count-text">${row.paidCount} <span style="font-size:0.78rem; font-weight:500; color:var(--text-muted);">/ 12 Months</span></div>
            <div class="months-micro-track">
              <div class="months-micro-fill" style="width:${pct}%;"></div>
            </div>
          </div>
        </td>
        <td>
          ${completionBadge}
          <div class="months-pill-grid">
            ${monthPillsHtml}
          </div>
        </td>
        <td>
          <strong style="color:var(--primary-color);">${formatPublicCurrency(row.totalPaid)}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted);">of ${formatPublicCurrency(row.expectedTotal)}</div>
        </td>
        <td>
          ${statusBadge}
        </td>
      </tr>
    `;
  }).join('');
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
