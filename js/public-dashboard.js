/**
 * പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ് - മെമ്പർഷിപ്പ് മാസവരി ഡാഷ്‌ബോർഡ്
 * Pulari Arts & Sports Club - Public Member Dashboard (Malayalam UI)
 */

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MALAYALAM_MONTHS = {
  "January": "ജനുവരി",
  "February": "ഫെബ്രുവരി",
  "March": "മാർച്ച്",
  "April": "ഏപ്രിൽ",
  "May": "മേയ്",
  "June": "ജൂൺ",
  "July": "ജൂലൈ",
  "August": "ഓഗസ്റ്റ്",
  "September": "സെപ്റ്റംബർ",
  "October": "ഒക്ടോബർ",
  "November": "നവംബർ",
  "December": "ഡിസംബർ"
};

const MALAYALAM_MONTHS_SHORT = {
  "January": "ജനു",
  "February": "ഫെബ്രു",
  "March": "മാർച്ച്",
  "April": "ഏപ്രിൽ",
  "May": "മേയ്",
  "June": "ജൂൺ",
  "July": "ജൂലൈ",
  "August": "ഓഗസ്റ്റ്",
  "September": "സെപ്റ്റം",
  "October": "ഒക്ടോ",
  "November": "നവം",
  "December": "ഡിസം"
};

const PublicState = {
  currentView: 'yearly', // 'monthly' or 'yearly'
  selectedMonth: new Date().toLocaleString('default', { month: 'long' }),
  selectedYear: new Date().getFullYear(),
  yearlyYear: new Date().getFullYear(),
  yearlySearchQuery: '',
  yearlyStatusFilter: 'All', // 'All', 'Full', 'Partial', 'Unpaid'
  yearlySort: 'name-asc', // 'name-asc', 'name-desc', 'id-asc', 'id-desc', 'paid-desc', 'paid-asc'
  members: [],
  payments: [],
  settings: {
    monthly_fee: 30,
    club_name: "പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ്",
    currency: "₹"
  },
  searchQuery: '',
  statusFilter: 'All'
};

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScrollEffect();
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
      `<option value="${month}">${MALAYALAM_MONTHS[month] || month}</option>`
    ).join('');
    monthSelect.value = PublicState.selectedMonth;
  }

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

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

  // Set default view on load (yearly view)
  switchView(PublicState.currentView || 'yearly');

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

  // Header click sorting
  const thId = document.getElementById('th-sort-id');
  const thName = document.getElementById('th-sort-name');
  const thPaid = document.getElementById('th-sort-paid');

  if (thId) {
    thId.addEventListener('click', () => {
      PublicState.yearlySort = (PublicState.yearlySort === 'id-asc') ? 'id-desc' : 'id-asc';
      renderYearlyDashboard();
    });
  }

  if (thName) {
    thName.addEventListener('click', () => {
      PublicState.yearlySort = (PublicState.yearlySort === 'name-asc') ? 'name-desc' : 'name-asc';
      renderYearlyDashboard();
    });
  }

  if (thPaid) {
    thPaid.addEventListener('click', () => {
      PublicState.yearlySort = (PublicState.yearlySort === 'paid-desc') ? 'paid-asc' : 'paid-desc';
      renderYearlyDashboard();
    });
  }

  // Yearly Filter Tabs and Clickable Stat Filter Cards
  function applyYearlyFilter(filterValue) {
    PublicState.yearlyStatusFilter = filterValue;
    
    // Sync filter tabs
    document.querySelectorAll('.yearly-filter-tab').forEach(el => {
      el.classList.toggle('active', (el.getAttribute('data-filter') || 'All') === filterValue);
    });

    // Sync stat cards
    document.querySelectorAll('.yearly-stat-filter-card').forEach(el => {
      el.classList.toggle('active', (el.getAttribute('data-filter') || 'All') === filterValue);
    });

    renderYearlyDashboard();
  }

  document.querySelectorAll('.yearly-filter-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const filterValue = btn.getAttribute('data-filter') || 'All';
      applyYearlyFilter(filterValue);
    });
  });

  document.querySelectorAll('.yearly-stat-filter-card').forEach(card => {
    card.addEventListener('click', () => {
      const filterValue = card.getAttribute('data-filter') || 'All';
      applyYearlyFilter(filterValue);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const filterValue = card.getAttribute('data-filter') || 'All';
        applyYearlyFilter(filterValue);
      }
    });
  });
}

/**
 * Fast Data Loading with Stale-While-Revalidate
 * Loads instantly from cache and updates fresh from Supabase DB in background
 */
async function loadPublicData(isManualRefresh = false) {
  const spinner = document.getElementById('public-spinner');
  const cacheDot = document.querySelector('.status-indicator-dot');
  const cacheText = document.getElementById('public-cache-text');

  if (spinner) spinner.style.display = 'inline-block';
  if (cacheDot) cacheDot.className = 'status-indicator-dot updating';
  if (cacheText) cacheText.textContent = isManualRefresh ? 'Updating...' : 'Connecting...';

  try {
    const { cachedData, freshPromise } = await fetchInitialData((freshData) => {
      // Background fresh data arrived
      applyLoadedData(freshData);
      if (cacheDot) cacheDot.className = 'status-indicator-dot';
      if (cacheText) cacheText.textContent = 'Online';
      if (spinner) spinner.style.display = 'none';
      if (isManualRefresh) {
        showPublicToast('പുതിയ വിവരങ്ങൾ ലഭ്യമാക്കി!', 'success');
      }
    });

    // If cached data is present, render immediately in <50ms!
    if (cachedData && !isManualRefresh) {
      applyLoadedData(cachedData);
      if (cacheDot) cacheDot.className = 'status-indicator-dot';
      if (cacheText) cacheText.textContent = 'Online';
    }

    // Wait for the fresh promise
    await freshPromise;
  } catch (err) {
    console.error('Public dashboard data load error:', err);
    if (cacheDot) cacheDot.className = 'status-indicator-dot offline';
    if (cacheText) cacheText.textContent = 'Offline';
    showPublicToast('ഓഫ്‌ലൈൻ വിവരങ്ങളാണ് കാണിക്കുന്നത്.', 'info');
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

  const malMonth = MALAYALAM_MONTHS[PublicState.selectedMonth] || PublicState.selectedMonth;

  setText('public-total-members', rows.length);
  setText('public-paid-count', paidRows.length);
  setText('public-unpaid-count', unpaidRows.length);
  setText('public-collected-amount', formatPublicCurrency(totalCollected));
  setText('public-collection-rate', `${rate}%`);
  setText('public-month-badge', `${malMonth} ${PublicState.selectedYear}`);

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
    const malMonthShort = MALAYALAM_MONTHS_SHORT[monthName] || monthName.substring(0, 3);
    const paidCount = payments.filter(p =>
      p.month === monthName && Number(p.year) === y && p.status === 'Paid'
    ).length;
    const isSelected = monthName === selectedMonth && y === Number(selectedYear);
    chips.push(`
      <button type="button" class="public-month-chip${isSelected ? ' active' : ''}"
        data-month="${monthName}" data-year="${y}">
        <span class="chip-month">${malMonthShort} '${String(y).slice(-2)}</span>
        <span class="chip-count">${paidCount}/${activeCount} അടച്ചു</span>
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
    const malMonth = MALAYALAM_MONTHS[PublicState.selectedMonth] || PublicState.selectedMonth;
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <p>${malMonth} ${PublicState.selectedYear}-ൽ അംഗങ്ങളുടെ വിവരങ്ങൾ ലഭ്യമല്ല.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(row => `
    <tr>
      <td style="font-weight:700; color:var(--kl-green-deep);">${escapeHtml(row.memberName)}</td>
      <td style="font-weight:700;">${formatPublicCurrency(row.fee)}</td>
      <td>
        <span class="badge ${row.isPaid ? 'badge-paid' : 'badge-unpaid'}">
          ${row.isPaid ? 'അടച്ചു' : 'ബാക്കി'}
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
      : `<tr><td colspan="4" class="empty-state">അടച്ച അംഗങ്ങളില്ല.</td></tr>`;
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
      : `<tr><td colspan="3" class="empty-state">എല്ലാ അംഗങ്ങളും അടച്ചിട്ടുണ്ട്.</td></tr>`;
  }
}

/* ==========================================================================
   YEARLY OVERVIEW RENDER LOGIC (Which Months Paid & Yearly Matrix)
   ========================================================================== */

// Membership Cycle Months: September (selected year) to August (next year)
const CYCLE_MONTHS = [
  { name: "September", malShort: "സെപ്റ്റം", yearOffset: 0 },
  { name: "October", malShort: "ഒക്ടോ", yearOffset: 0 },
  { name: "November", malShort: "നവം", yearOffset: 0 },
  { name: "December", malShort: "ഡിസം", yearOffset: 0 },
  { name: "January", malShort: "ജനു", yearOffset: 1 },
  { name: "February", malShort: "ഫെബ്രു", yearOffset: 1 },
  { name: "March", malShort: "മാർച്ച്", yearOffset: 1 },
  { name: "April", malShort: "ഏപ്രിൽ", yearOffset: 1 },
  { name: "May", malShort: "മേയ്", yearOffset: 1 },
  { name: "June", malShort: "ജൂൺ", yearOffset: 1 },
  { name: "July", malShort: "ജൂലൈ", yearOffset: 1 },
  { name: "August", malShort: "ഓഗസ്റ്റ്", yearOffset: 1 }
];

function getYearlyMemberData() {
  const { members, payments, yearlyYear, settings } = PublicState;
  const activeMembers = members.filter(m => m.status === 'Active');
  const defaultFee = Number(settings.monthly_fee || 30);
  const baseYear = Number(yearlyYear);

  return activeMembers.map(member => {
    const memberFee = Number(member.monthlyFee || defaultFee);

    // Map through 12 cycle months: Sep (baseYear) to Aug (baseYear + 1)
    const monthsStatus = CYCLE_MONTHS.map(cm => {
      const targetYear = baseYear + cm.yearOffset;
      const payment = (payments || []).find(p =>
        p.memberId === member.memberId &&
        p.month && p.month.toLowerCase() === cm.name.toLowerCase() &&
        Number(p.year) === targetYear &&
        p.status === 'Paid'
      );
      return {
        monthName: MALAYALAM_MONTHS[cm.name] || cm.name,
        shortName: cm.malShort,
        year: targetYear,
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
      paidFullMonthNames: paidMonths.map(m => `${m.monthName} ${m.year}`),
      overallStatus
    };
  });
}

function renderYearlyDashboard() {
  const yearlyData = getYearlyMemberData();
  const selectedYear = PublicState.yearlyYear;

  // Calculate Yearly Stats
  const totalMembers = yearlyData.length;
  const fullPaidCount = yearlyData.filter(d => d.overallStatus === 'Full').length;
  const partialPaidCount = yearlyData.filter(d => d.overallStatus === 'Partial').length;
  const totalYearlyCollected = yearlyData.reduce((sum, d) => sum + d.totalPaid, 0);
  const totalYearlyExpected = yearlyData.reduce((sum, d) => sum + d.expectedTotal, 0);

  const collectionRate = totalYearlyExpected > 0
    ? Math.round((totalYearlyCollected / totalYearlyExpected) * 100)
    : 0;

  // Update Stats Elements
  const nextYear = selectedYear + 1;
  const cycleLabel = `സെപ്റ്റംബർ ${selectedYear} – ഓഗസ്റ്റ് ${nextYear}`;

  if (PublicState.currentView === 'yearly') {
    setText('public-month-badge', cycleLabel);
  }
  setText('yearly-total-members', totalMembers);
  setText('yearly-full-paid-count', fullPaidCount);
  setText('yearly-partial-paid-count', partialPaidCount);
  setText('yearly-total-collected', formatPublicCurrency(totalYearlyCollected));
  setText('yearly-collection-rate', `${collectionRate}%`);
  setText('yearly-progress-year-label', cycleLabel);
  setText('yearly-progress-sublabel', `പ്രതീക്ഷിക്കുന്ന ${formatPublicCurrency(totalYearlyExpected)}-ൽ ${formatPublicCurrency(totalYearlyCollected)} പിരിഞ്ഞു`);
  setText('yearly-full-paid-sub', `ആകെ ${totalMembers}-ൽ ${fullPaidCount} പേർ 12 മാസവും അടച്ചു`);
  setText('yearly-collected-sub', `${cycleLabel} കാലയളവിലെ ആകെ തുക`);

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

  // Sort Table Rows (Alphabetic, ID, Paid Count)
  const sortMode = PublicState.yearlySort || 'name-asc';
  filtered.sort((a, b) => {
    if (sortMode === 'name-asc') {
      return (a.memberName || '').localeCompare(b.memberName || '', undefined, { sensitivity: 'base' });
    }
    if (sortMode === 'name-desc') {
      return (b.memberName || '').localeCompare(a.memberName || '', undefined, { sensitivity: 'base' });
    }
    if (sortMode === 'id-asc') {
      return String(a.memberId).localeCompare(String(b.memberId), undefined, { numeric: true });
    }
    if (sortMode === 'id-desc') {
      return String(b.memberId).localeCompare(String(a.memberId), undefined, { numeric: true });
    }
    if (sortMode === 'paid-desc') {
      return b.paidCount - a.paidCount || (a.memberName || '').localeCompare(b.memberName || '', undefined, { sensitivity: 'base' });
    }
    if (sortMode === 'paid-asc') {
      return a.paidCount - b.paidCount || (a.memberName || '').localeCompare(b.memberName || '', undefined, { sensitivity: 'base' });
    }
    return 0;
  });

  // Update table header sort indicators
  const thId = document.getElementById('th-sort-id');
  const thName = document.getElementById('th-sort-name');
  const thPaid = document.getElementById('th-sort-paid');
  if (thId) thId.textContent = `മെമ്പർ ഐഡി ${sortMode === 'id-asc' ? '▲' : sortMode === 'id-desc' ? '▼' : '⇕'}`;
  if (thName) thName.textContent = `അംഗത്തിന്റെ പേര് ${sortMode === 'name-asc' ? '▲' : sortMode === 'name-desc' ? '▼' : '⇕'}`;
  if (thPaid) thPaid.textContent = `അടച്ച മാസങ്ങൾ ${sortMode === 'paid-desc' ? '▼' : sortMode === 'paid-asc' ? '▲' : '⇕'}`;

  const tbody = document.getElementById('yearly-members-table-body');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>${cycleLabel} കാലയളവിൽ അംഗങ്ങളുടെ വിവരങ്ങൾ ലഭ്യമല്ല.</p>
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
      completionBadge = `<div class="yearly-completion-pill all-paid">⭐ 12/12 മാസവും അടച്ചു</div>`;
    } else if (row.paidCount > 0) {
      completionBadge = `<div class="yearly-completion-pill partial">⏳ ${row.paidCount} മാസം അടച്ചു (${row.paidMonthNames.join(', ')})</div>`;
    } else {
      completionBadge = `<div class="yearly-completion-pill zero">❌ ഈ കാലയളവിൽ അടവില്ല</div>`;
    }

    // Generate 12 Month Pills (Sep - Aug)
    const monthPillsHtml = row.monthsStatus.map(m => {
      const tooltip = m.isPaid
        ? `${m.shortName} ${m.year}: ${formatPublicCurrency(m.amount)} അടച്ചു${m.paymentDate ? ' (' + m.paymentDate + ')' : ''}`
        : `${m.shortName} ${m.year}: അടക്കാൻ ബാക്കി`;
      const checkIcon = m.isPaid ? '✓ ' : '';
      return `<span class="month-pill ${m.isPaid ? 'paid' : 'unpaid'}" title="${escapeHtml(tooltip)}">${checkIcon}${m.shortName}</span>`;
    }).join('');

    // Overall Status Badge
    let statusBadge = '';
    if (row.overallStatus === 'Full') {
      statusBadge = `<span class="badge badge-paid">പൂർണ്ണം (12/12)</span>`;
    } else if (row.overallStatus === 'Partial') {
      statusBadge = `<span class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">ഭാഗികം (${row.paidCount}/12)</span>`;
    } else {
      statusBadge = `<span class="badge badge-unpaid">ബാക്കി (0/12)</span>`;
    }

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--kl-green-deep, var(--text-main));">${escapeHtml(row.memberName)}</div>
          ${row.phone ? `<div style="font-size:0.75rem; color:var(--kl-text-muted, var(--text-muted));">${escapeHtml(row.phone)}</div>` : ''}
        </td>
        <td>
          <div class="months-progress-wrapper">
            <div class="months-count-text"><strong>${row.paidCount}</strong> <span style="font-size:0.78rem; font-weight:600; color:var(--kl-text-muted, var(--text-muted));">/ 12 മാസം</span></div>
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
          <strong style="color:var(--kl-green-palm, var(--primary-color)); font-size:0.95rem;">${formatPublicCurrency(row.totalPaid)}</strong>
          <div style="font-size:0.72rem; color:var(--kl-text-muted, var(--text-muted));">ആകെ ${formatPublicCurrency(row.expectedTotal)}</div>
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

/**
 * Auto minimize/compact header when scrolling down on mobile/desktop
 */
function initHeaderScrollEffect() {
  const header = document.querySelector('.public-header');
  if (!header) return;

  let ticking = false;

  const onScroll = () => {
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Minimize header when scrolled down past 25px
    if (currentScrollY > 25) {
      header.classList.add('header-minimized');
    } else {
      header.classList.remove('header-minimized');
    }

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  // Initial check on load
  onScroll();
}
