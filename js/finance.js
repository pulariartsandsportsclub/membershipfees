/**
 * Pulari Arts & Sports Club - Financial Management Dashboard
 * Fetches and displays club Income & Expenses from Google Apps Script / Google Sheets
 * 
 * API Endpoint: https://script.google.com/macros/s/AKfycbx3fQPLuHUERree9oy2yVEzEpHkclqRnkBEgDo0Kbj8-SsrLcZfjBHtAv1JdfcsBA6m/exec
 */

(function () {
  'use strict';

  const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbx3fQPLuHUERree9oy2yVEzEpHkclqRnkBEgDo0Kbj8-SsrLcZfjBHtAv1JdfcsBA6m/exec";
  const CACHE_KEY = "pulari_finance_data_cache_v2";
  const CACHE_TIME_KEY = "pulari_finance_cache_time_v2";

  // State
  let rawTransactions = [];
  let summaryData = { totalIncome: 0, totalExpense: 0, netBalance: 0, count: 0 };
  let currentFilter = {
    type: 'all',          // 'all' | 'income' | 'expense'
    category: 'all',
    paymentMode: 'all',
    search: '',
    sortBy: 'date-desc'   // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'title-asc'
  };

  let monthlyChartInstance = null;
  let categoryChartInstance = null;

  // DOM Elements
  const elements = {
    totalIncome: document.getElementById('stat-total-income'),
    totalExpense: document.getElementById('stat-total-expense'),
    netBalance: document.getElementById('stat-net-balance'),
    balanceBadge: document.getElementById('stat-balance-badge'),
    totalCount: document.getElementById('stat-total-count'),
    incomeCount: document.getElementById('stat-income-count'),
    expenseCount: document.getElementById('stat-expense-count'),
    incomeRatioBar: document.getElementById('income-ratio-bar'),
    expenseRatioBar: document.getElementById('expense-ratio-bar'),
    incomeRatioText: document.getElementById('income-ratio-text'),
    expenseRatioText: document.getElementById('expense-ratio-text'),
    avgTxnAmount: document.getElementById('stat-avg-amount'),
    invoiceCount: document.getElementById('stat-invoice-count'),

    // Status & Loading
    syncIndicator: document.getElementById('finance-sync-indicator'),
    syncText: document.getElementById('finance-sync-text'),
    btnRefresh: document.getElementById('btn-finance-refresh'),
    loadingSkeleton: document.getElementById('finance-skeleton'),
    tableWrapper: document.getElementById('finance-table-wrapper'),
    tableBody: document.getElementById('finance-table-body'),
    cardsContainer: document.getElementById('finance-cards-container'),
    emptyState: document.getElementById('finance-empty-state'),

    // Filters & Search
    search: document.getElementById('finance-search'),
    categoryFilter: document.getElementById('filter-category'),
    paymentFilter: document.getElementById('filter-payment'),
    sortSelect: document.getElementById('filter-sort'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    typeButtons: document.querySelectorAll('.type-filter-btn'),

    // Actions
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnPrintStatement: document.getElementById('btn-print-statement'),

    // Voucher Modal
    voucherModal: document.getElementById('voucher-modal'),
    voucherBackdrop: document.getElementById('voucher-backdrop'),
    voucherCloseBtn: document.getElementById('btn-close-voucher'),
    voucherContent: document.getElementById('voucher-modal-content'),
    voucherPrintBtn: document.getElementById('btn-print-voucher')
  };

  /**
   * Currency Formatter in Indian Rupee format
   */
  function formatINR(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  }

  /**
   * Format Date to clean standard (e.g. 06 Sep 2026)
   */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const parts = String(dateStr).split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Initialize Dashboard
   */
  function init() {
    setupEventListeners();

    // 1. Try loading cached data first for instant render
    const cached = loadFromCache();
    if (cached) {
      processData(cached.data, cached.summary, false);
      updateSyncStatus('cached', cached.timestamp);
    } else {
      showLoading(true);
    }

    // 2. Fetch fresh data from live API
    fetchLiveData(false);
  }

  /**
   * Load cached data from localStorage
   */
  function loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const time = localStorage.getItem(CACHE_TIME_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          data: parsed.data || [],
          summary: parsed.summary || null,
          timestamp: time ? new Date(time) : new Date()
        };
      }
    } catch (err) {
      console.warn('Failed to parse cache:', err);
    }
    return null;
  }

  /**
   * Save data to localStorage
   */
  function saveToCache(data, summary) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, summary }));
      localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
    } catch (err) {
      console.warn('Failed to save to cache:', err);
    }
  }

  /**
   * Fetch Live Data from Google Apps Script Web App
   */
  async function fetchLiveData(isManualRefresh = false) {
    if (isManualRefresh && elements.btnRefresh) {
      elements.btnRefresh.classList.add('is-spinning');
    }
    updateSyncStatus('fetching');

    try {
      // Add cache buster query parameter
      const url = `${FINANCE_API_URL}?_cb=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result && result.status === 'success' && Array.isArray(result.data)) {
        saveToCache(result.data, result.summary);
        processData(result.data, result.summary, true);
        updateSyncStatus('online', new Date());
      } else if (result && result.data && Array.isArray(result.data)) {
        saveToCache(result.data, result.summary);
        processData(result.data, result.summary, true);
        updateSyncStatus('online', new Date());
      } else {
        throw new Error(result.message || 'Invalid response structure received from Google Sheet.');
      }
    } catch (error) {
      console.error('Error fetching Pulari Finance data:', error);
      updateSyncStatus('error', null, error.message);

      // If we don't even have cached data, display empty/error message
      if (rawTransactions.length === 0) {
        showLoading(false);
        renderEmptyState(true, error.message);
      }
    } finally {
      if (elements.btnRefresh) {
        setTimeout(() => elements.btnRefresh.classList.remove('is-spinning'), 500);
      }
    }
  }

  /**
   * Process & Calculate Financial Data
   */
  function processData(transactions, summary, updateFilters = true) {
    rawTransactions = transactions || [];

    // Recalculate summary if not provided or to ensure perfect sync
    let totalInc = 0;
    let totalExp = 0;
    let invoiceCount = 0;

    rawTransactions.forEach(item => {
      const amt = parseFloat(item.Amount) || 0;
      const type = (item.Type || '').toLowerCase();
      if (type === 'income') {
        totalInc += amt;
      } else if (type === 'expense') {
        totalExp += amt;
      }
      if (item.InvoiceUrl && item.InvoiceUrl.trim() !== '') {
        invoiceCount++;
      }
    });

    summaryData = summary && typeof summary.totalIncome === 'number'
      ? summary
      : {
        totalIncome: totalInc,
        totalExpense: totalExp,
        netBalance: totalInc - totalExp,
        count: rawTransactions.length
      };

    summaryData.invoiceCount = invoiceCount;

    // Update KPI metric cards
    renderKPIs();

    // Populate category and payment filters
    if (updateFilters) {
      populateCategoryAndPaymentFilters();
    }

    // Render Charts
    renderVisualCharts();

    // Filter, sort & render table/cards
    applyFiltersAndRender();

    showLoading(false);
  }

  /**
   * Update KPI Cards & Progress Meters
   */
  function renderKPIs() {
    const inc = summaryData.totalIncome || 0;
    const exp = summaryData.totalExpense || 0;
    const net = inc - exp;
    const totalFlow = inc + exp;

    if (elements.totalIncome) elements.totalIncome.textContent = formatINR(inc);
    if (elements.totalExpense) elements.totalExpense.textContent = formatINR(exp);

    if (elements.netBalance) {
      elements.netBalance.textContent = (net >= 0 ? '+ ' : '- ') + formatINR(Math.abs(net));
      elements.netBalance.className = 'kpi-stat-number ' + (net >= 0 ? 'text-positive' : 'text-negative');
    }

    if (elements.balanceBadge) {
      if (net > 0) {
        elements.balanceBadge.textContent = 'Surplus Fund';
        elements.balanceBadge.className = 'status-chip chip-positive';
      } else if (net < 0) {
        elements.balanceBadge.textContent = 'Deficit';
        elements.balanceBadge.className = 'status-chip chip-negative';
      } else {
        elements.balanceBadge.textContent = 'Balanced';
        elements.balanceBadge.className = 'status-chip chip-neutral';
      }
    }

    const incomeCount = rawTransactions.filter(t => (t.Type || '').toLowerCase() === 'income').length;
    const expenseCount = rawTransactions.filter(t => (t.Type || '').toLowerCase() === 'expense').length;

    if (elements.totalCount) elements.totalCount.textContent = `${rawTransactions.length} Total`;
    if (elements.incomeCount) elements.incomeCount.textContent = `${incomeCount} Records`;
    if (elements.expenseCount) elements.expenseCount.textContent = `${expenseCount} Records`;

    // Flow Share Bars
    if (totalFlow > 0) {
      const incPct = Math.round((inc / totalFlow) * 100);
      const expPct = 100 - incPct;

      if (elements.incomeRatioBar) elements.incomeRatioBar.style.width = `${incPct}%`;
      if (elements.expenseRatioBar) elements.expenseRatioBar.style.width = `${expPct}%`;
      if (elements.incomeRatioText) elements.incomeRatioText.textContent = `${incPct}%`;
      if (elements.expenseRatioText) elements.expenseRatioText.textContent = `${expPct}%`;
    }

    // Average Transaction Amount
    if (elements.avgTxnAmount) {
      const avg = rawTransactions.length ? Math.round(totalFlow / rawTransactions.length) : 0;
      elements.avgTxnAmount.textContent = formatINR(avg);
    }

    if (elements.invoiceCount) {
      elements.invoiceCount.textContent = `${summaryData.invoiceCount || 0} Invoices`;
    }

    // Update Type Filter Counts
    const btnAll = document.querySelector('.type-filter-btn[data-type="all"] span');
    const btnInc = document.querySelector('.type-filter-btn[data-type="income"] span');
    const btnExp = document.querySelector('.type-filter-btn[data-type="expense"] span');
    if (btnAll) btnAll.textContent = `(${rawTransactions.length})`;
    if (btnInc) btnInc.textContent = `(${incomeCount})`;
    if (btnExp) btnExp.textContent = `(${expenseCount})`;
  }

  /**
   * Populate Category & Payment Dropdown Filters
   */
  function populateCategoryAndPaymentFilters() {
    if (!elements.categoryFilter || !elements.paymentFilter) return;

    const currentCat = currentFilter.category;
    const currentPay = currentFilter.paymentMode;

    const categories = new Set();
    const payments = new Set();

    rawTransactions.forEach(t => {
      if (t.Category && t.Category.trim() !== '') categories.add(t.Category.trim());
      if (t.PaymentMode && t.PaymentMode.trim() !== '') payments.add(t.PaymentMode.trim());
    });

    // Categories
    elements.categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    Array.from(categories).sort().forEach(cat => {
      const count = rawTransactions.filter(t => t.Category === cat).length;
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = `${cat} (${count})`;
      if (cat === currentCat) opt.selected = true;
      elements.categoryFilter.appendChild(opt);
    });

    // Payments
    elements.paymentFilter.innerHTML = '<option value="all">All Payment Modes</option>';
    Array.from(payments).sort().forEach(pm => {
      const count = rawTransactions.filter(t => t.PaymentMode === pm).length;
      const opt = document.createElement('option');
      opt.value = pm;
      opt.textContent = `${pm} (${count})`;
      if (pm === currentPay) opt.selected = true;
      elements.paymentFilter.appendChild(opt);
    });
  }

  /**
   * Apply Search, Filter & Sort Rules
   */
  function applyFiltersAndRender() {
    let filtered = [...rawTransactions];

    // 1. Type Filter (all, income, expense)
    if (currentFilter.type !== 'all') {
      filtered = filtered.filter(t => (t.Type || '').toLowerCase() === currentFilter.type);
    }

    // 2. Category Filter
    if (currentFilter.category !== 'all') {
      filtered = filtered.filter(t => (t.Category || '').toLowerCase() === currentFilter.category.toLowerCase());
    }

    // 3. Payment Mode Filter
    if (currentFilter.paymentMode !== 'all') {
      filtered = filtered.filter(t => (t.PaymentMode || '').toLowerCase() === currentFilter.paymentMode.toLowerCase());
    }

    // 4. Search Filter
    if (currentFilter.search.trim() !== '') {
      const q = currentFilter.search.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const title = (t.Title || '').toLowerCase();
        const id = (t.ID || '').toLowerCase();
        const category = (t.Category || '').toLowerCase();
        const notes = (t.Notes || '').toLowerCase();
        const createdBy = (t.CreatedBy || t.ReceivedBy || t.AuthorizedBy || '').toLowerCase();
        const paymentMode = (t.PaymentMode || '').toLowerCase();
        const amount = String(t.Amount || '');
        return title.includes(q) || id.includes(q) || category.includes(q) ||
          notes.includes(q) || createdBy.includes(q) || paymentMode.includes(q) || amount.includes(q);
      });
    }

    // 5. Sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.Date || 0).getTime();
      const dateB = new Date(b.Date || 0).getTime();
      const amtA = parseFloat(a.Amount) || 0;
      const amtB = parseFloat(b.Amount) || 0;
      const titleA = (a.Title || '').toLowerCase();
      const titleB = (b.Title || '').toLowerCase();

      switch (currentFilter.sortBy) {
        case 'date-asc':
          return dateA - dateB;
        case 'amount-desc':
          return amtB - amtA;
        case 'amount-asc':
          return amtA - amtB;
        case 'title-asc':
          return titleA.localeCompare(titleB);
        case 'date-desc':
        default:
          return dateB - dateA;
      }
    });

    renderTransactions(filtered);
  }

  /**
   * Render Table Rows
   */
  function renderTransactions(list) {
    if (!elements.tableBody) return;

    if (list.length === 0) {
      if (elements.tableWrapper) elements.tableWrapper.style.display = 'none';
      renderEmptyState(false);
      return;
    }

    if (elements.emptyState) elements.emptyState.style.display = 'none';
    if (elements.tableWrapper) elements.tableWrapper.style.display = 'block';

    // 1. Render Table Rows
    elements.tableBody.innerHTML = list.map((item, index) => {
      const isIncome = (item.Type || '').toLowerCase() === 'income';
      const typeBadgeClass = isIncome ? 'badge-income' : 'badge-expense';
      const typeLabel = isIncome ? 'Income' : 'Expense';
      const typeSign = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'amount-income' : 'amount-expense';
      const creator = item.CreatedBy || item.ReceivedBy || item.AuthorizedBy || 'Admin';
      const notesClean = item.Notes ? item.Notes.trim() : '';
      const hasInvoice = item.InvoiceUrl && item.InvoiceUrl.trim() !== '';

      return `
        <tr class="transaction-row" data-id="${escapeHtml(item.ID || '')}">
          <td class="col-date">
            <div class="txn-date-wrap">
              <span class="txn-date-main">${formatDate(item.Date)}</span>
              <span class="txn-id-sub">${escapeHtml(item.ID || 'TXN-' + (index + 1))}</span>
            </div>
          </td>
          <td class="col-type">
            <span class="txn-type-badge ${typeBadgeClass}">
              <span class="badge-dot"></span>
              ${typeLabel}
            </span>
          </td>
          <td class="col-title">
            <div class="txn-title-wrap">
              <div class="txn-title-text">${escapeHtml(item.Title || 'Untitled')}</div>
              ${notesClean ? `
                <div class="txn-notes-preview" title="${escapeHtml(notesClean)}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                  <span>${escapeHtml(truncate(notesClean.replace(/\n/g, ', '), 60))}</span>
                </div>
              ` : ''}
            </div>
          </td>
          <td class="col-category">
            <span class="category-pill">${escapeHtml(item.Category || 'General')}</span>
          </td>
          <td class="col-payment">
            <span class="payment-badge payment-${(item.PaymentMode || 'cash').toLowerCase().replace(/\s+/g, '')}">
              ${escapeHtml(item.PaymentMode || 'Cash')}
            </span>
          </td>
          <td class="col-creator">
            <div class="creator-chip">
              <span class="creator-avatar">${escapeHtml(creator.charAt(0).toUpperCase())}</span>
              <span class="creator-name">${escapeHtml(creator)}</span>
            </div>
          </td>
          <td class="col-amount text-right">
            <span class="txn-amount-val ${amountClass}">
              ${typeSign} ${formatINR(item.Amount)}
            </span>
          </td>
          <td class="col-actions text-center">
            <div class="txn-actions-group">
              ${hasInvoice ? `
                <a href="${escapeHtml(item.InvoiceUrl)}" target="_blank" rel="noopener noreferrer" class="btn-action-icon btn-invoice" title="Open Bill / Invoice in Drive">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                  <span>Bill</span>
                </a>
              ` : ''}
              <button type="button" class="btn-action-icon btn-view-voucher" data-id="${escapeHtml(item.ID || '')}" title="View Receipt Voucher">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                <span>View</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (elements.cardsContainer) {
      elements.cardsContainer.innerHTML = '';
    }

    // Attach Voucher Click Handlers
    document.querySelectorAll('.btn-view-voucher').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openVoucherModal(id);
      });
    });
  }

  /**
   * Render Charts using Chart.js
   */
  function renderVisualCharts() {
    if (typeof Chart === 'undefined') return;

    // Income vs Expense Pie Chart
    renderIncomeExpensePieChart();
  }

  /**
   * Render Income vs Expense Pie Chart
   */
  function renderIncomeExpensePieChart() {
    const canvas = document.getElementById('chart-income-expense-pie') || document.getElementById('chart-category-breakdown');
    if (!canvas) return;

    const totalIncome = summaryData.totalIncome || 0;
    const totalExpense = summaryData.totalExpense || 0;
    const totalSum = totalIncome + totalExpense;

    const incomePct = totalSum > 0 ? ((totalIncome / totalSum) * 100).toFixed(1) : 0;
    const expensePct = totalSum > 0 ? ((totalExpense / totalSum) * 100).toFixed(1) : 0;

    const labels = [
      `Income: ${formatINR(totalIncome)} (${incomePct}%)`,
      `Expenses: ${formatINR(totalExpense)} (${expensePct}%)`
    ];

    const data = [totalIncome, totalExpense];
    const backgroundColors = ['#10b981', '#ef4444'];
    const hoverColors = ['#059669', '#dc2626'];

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    categoryChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: totalSum > 0 ? data : [1, 1],
          backgroundColor: backgroundColors,
          hoverBackgroundColor: hoverColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 12,
              font: { family: "'Segoe UI', system-ui, sans-serif", size: 11.5, weight: '700' },
              color: '#1e293b'
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw || 0;
                const isInc = ctx.dataIndex === 0;
                const pct = isInc ? incomePct : expensePct;
                const title = isInc ? 'Total Income' : 'Total Expenses';
                return ` ${title}: ${formatINR(val)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Open Official Digital Voucher Modal
   */
  function openVoucherModal(txnId) {
    const txn = rawTransactions.find(t => t.ID === txnId) || rawTransactions[0];
    if (!txn || !elements.voucherModal || !elements.voucherContent) return;

    const isIncome = (txn.Type || '').toLowerCase() === 'income';
    const typeLabel = isIncome ? 'INCOME RECEIPT VOUCHER' : 'EXPENSE PAYMENT VOUCHER';
    const typeColor = isIncome ? '#059669' : '#dc2626';
    const amountVal = parseFloat(txn.Amount) || 0;
    const creator = txn.CreatedBy || txn.ReceivedBy || txn.AuthorizedBy || 'Authorized Official';
    const hasInvoice = txn.InvoiceUrl && txn.InvoiceUrl.trim() !== '';

    // Parse multiline notes as line items if available
    let notesHtml = '';
    if (txn.Notes && txn.Notes.trim() !== '') {
      const lines = txn.Notes.trim().split('\n').filter(l => l.trim().length > 0);
      notesHtml = `
        <div class="voucher-breakdown-box">
          <div class="voucher-box-title">Itemized Details / Breakdown</div>
          <table class="voucher-items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item / Description</th>
                <th class="text-right">Amount / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((line, idx) => {
        const parts = line.split(/[-–:]/);
        if (parts.length >= 2) {
          const desc = parts.slice(0, parts.length - 1).join(' - ').trim();
          const val = parts[parts.length - 1].trim();
          return `
                    <tr>
                      <td style="width:30px;">${idx + 1}</td>
                      <td><strong>${escapeHtml(desc)}</strong></td>
                      <td class="text-right"><code>${escapeHtml(val)}</code></td>
                    </tr>
                  `;
        }
        return `
                  <tr>
                    <td style="width:30px;">${idx + 1}</td>
                    <td colspan="2">${escapeHtml(line)}</td>
                  </tr>
                `;
      }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    elements.voucherContent.innerHTML = `
      <div class="voucher-paper" id="printable-voucher">
        <!-- Voucher Header -->
        <div class="voucher-header">
          <div class="voucher-brand">
            <img src="PULARI.png" alt="Pulari Club Logo" class="voucher-logo">
            <div class="voucher-club-info">
              <h2>PULARI ARTS & SPORTS CLUB</h2>
              <p>Reg No. MPM/CA/355/2017 • Porur, Malappuram</p>
            </div>
          </div>
          <div class="voucher-badge-wrap">
            <div class="voucher-type-pill" style="background: ${typeColor}; color: #fff;">
              ${typeLabel}
            </div>
            <div class="voucher-no">VOUCHER NO: <strong>${escapeHtml(txn.ID || 'N/A')}</strong></div>
          </div>
        </div>

        <div class="voucher-divider"></div>

        <!-- Voucher Key Details Grid -->
        <div class="voucher-meta-grid">
          <div class="v-meta-item">
            <span class="v-label">Date of Entry</span>
            <span class="v-value">${formatDate(txn.Date)}</span>
          </div>
          <div class="v-meta-item">
            <span class="v-label">Category</span>
            <span class="v-value">${escapeHtml(txn.Category || 'General')}</span>
          </div>
          <div class="v-meta-item">
            <span class="v-label">Payment Mode</span>
            <span class="v-value">${escapeHtml(txn.PaymentMode || 'Cash')}</span>
          </div>
          <div class="v-meta-item">
            <span class="v-label">${isIncome ? 'Received / Recorded By' : 'Authorized / Paid By'}</span>
            <span class="v-value">${escapeHtml(creator)}</span>
          </div>
        </div>

        <!-- Main Title & Amount Highlight -->
        <div class="voucher-headline-box">
          <div class="v-title-section">
            <span class="v-label">Transaction Title / Purpose</span>
            <h3 class="v-main-title">${escapeHtml(txn.Title || 'Untitled')}</h3>
          </div>
          <div class="v-amount-section">
            <span class="v-label">Total Amount</span>
            <div class="v-big-amount" style="color: ${typeColor};">
              ${formatINR(amountVal)}
            </div>
          </div>
        </div>

        <!-- Itemized Breakdown -->
        ${notesHtml}

        <!-- Invoice / Drive Link Attachment -->
        ${hasInvoice ? `
          <div class="voucher-attachment-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            <div class="v-attach-info">
              <strong>Attached Invoice / Document in Google Drive</strong>
              <span>Verified receipt stored securely</span>
            </div>
            <a href="${escapeHtml(txn.InvoiceUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
              Open Original Bill ↗
            </a>
          </div>
        ` : ''}

        <!-- Voucher Signatures -->
        <div class="voucher-footer-sign">
          <div class="sign-block">
            <div class="sign-line"></div>
            <span>Recorded By (${escapeHtml(creator)})</span>
          </div>
          <div class="sign-block">
            <div class="sign-line"></div>
            <span>Treasurer / Secretary</span>
          </div>
          <div class="sign-block">
            <div class="sign-line"></div>
            <span>Club President</span>
          </div>
        </div>

        <div class="voucher-watermark">PULARI ARTS & SPORTS CLUB</div>
      </div>
    `;

    // Show modal
    elements.voucherModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close Voucher Modal
   */
  function closeVoucherModal() {
    if (elements.voucherModal) {
      elements.voucherModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Export Transactions to CSV
   */
  function exportCSV() {
    if (rawTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['ID', 'Type', 'Title', 'Category', 'Amount (INR)', 'Date', 'PaymentMode', 'HandledBy', 'Notes', 'InvoiceUrl', 'Timestamp'];
    const rows = rawTransactions.map(t => [
      `"${(t.ID || '').replace(/"/g, '""')}"`,
      `"${(t.Type || '').replace(/"/g, '""')}"`,
      `"${(t.Title || '').replace(/"/g, '""')}"`,
      `"${(t.Category || '').replace(/"/g, '""')}"`,
      parseFloat(t.Amount) || 0,
      `"${(t.Date || '').replace(/"/g, '""')}"`,
      `"${(t.PaymentMode || '').replace(/"/g, '""')}"`,
      `"${(t.CreatedBy || t.ReceivedBy || t.AuthorizedBy || '').replace(/"/g, '""')}"`,
      `"${(t.Notes || '').replace(/\n/g, ' | ').replace(/"/g, '""')}"`,
      `"${(t.InvoiceUrl || '').replace(/"/g, '""')}"`,
      `"${(t.Timestamp || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pulari_Club_Finance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Print Statement / Report
   */
  function printReport() {
    window.print();
  }

  /**
   * Print Single Voucher
   */
  function printSingleVoucher() {
    const printable = document.getElementById('printable-voucher');
    if (!printable) {
      window.print();
      return;
    }
    window.print();
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Refresh button
    if (elements.btnRefresh) {
      elements.btnRefresh.addEventListener('click', () => fetchLiveData(true));
    }

    // Type filter buttons
    elements.typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter.type = btn.getAttribute('data-type') || 'all';
        applyFiltersAndRender();
      });
    });

    // Search input (with debounce)
    if (elements.search) {
      let debounceTimer = null;
      elements.search.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentFilter.search = e.target.value || '';
          applyFiltersAndRender();
        }, 150);
      });
    }

    // Category dropdown
    if (elements.categoryFilter) {
      elements.categoryFilter.addEventListener('change', (e) => {
        currentFilter.category = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Payment Mode dropdown
    if (elements.paymentFilter) {
      elements.paymentFilter.addEventListener('change', (e) => {
        currentFilter.paymentMode = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Sort dropdown
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        currentFilter.sortBy = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Reset filters
    if (elements.btnResetFilters) {
      elements.btnResetFilters.addEventListener('click', () => {
        currentFilter.type = 'all';
        currentFilter.category = 'all';
        currentFilter.paymentMode = 'all';
        currentFilter.search = '';
        currentFilter.sortBy = 'date-desc';

        if (elements.search) elements.search.value = '';
        if (elements.categoryFilter) elements.categoryFilter.value = 'all';
        if (elements.paymentFilter) elements.paymentFilter.value = 'all';
        if (elements.sortSelect) elements.sortSelect.value = 'date-desc';

        elements.typeButtons.forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-type') === 'all');
        });

        applyFiltersAndRender();
      });
    }

    // Export CSV
    if (elements.btnExportCsv) {
      elements.btnExportCsv.addEventListener('click', exportCSV);
    }

    // Print Statement
    if (elements.btnPrintStatement) {
      elements.btnPrintStatement.addEventListener('click', printReport);
    }

    // Modal controls
    if (elements.voucherCloseBtn) {
      elements.voucherCloseBtn.addEventListener('click', closeVoucherModal);
    }
    if (elements.voucherBackdrop) {
      elements.voucherBackdrop.addEventListener('click', closeVoucherModal);
    }
    if (elements.voucherPrintBtn) {
      elements.voucherPrintBtn.addEventListener('click', printSingleVoucher);
    }

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.voucherModal && elements.voucherModal.classList.contains('active')) {
        closeVoucherModal();
      }
    });
  }

  /**
   * Update sync indicator in top bar
   */
  function updateSyncStatus(status, time = new Date(), errorMsg = '') {
    if (!elements.syncIndicator || !elements.syncText) return;

    elements.syncIndicator.className = 'status-dot';

    switch (status) {
      case 'online':
        elements.syncIndicator.classList.add('dot-online');
        elements.syncText.textContent = `Live Connected (${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
        break;
      case 'cached':
        elements.syncIndicator.classList.add('dot-cached');
        elements.syncText.textContent = `Cached (${time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Local'})`;
        break;
      case 'fetching':
        elements.syncIndicator.classList.add('dot-syncing');
        elements.syncText.textContent = 'Syncing Google Sheets...';
        break;
      case 'error':
        elements.syncIndicator.classList.add('dot-error');
        elements.syncText.textContent = 'Offline (Check Connection)';
        break;
    }
  }

  /**
   * Show / Hide Loading Skeleton
   */
  function showLoading(show) {
    if (elements.loadingSkeleton) {
      elements.loadingSkeleton.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Render Empty / Error State
   */
  function renderEmptyState(isError = false, message = '') {
    if (!elements.emptyState) return;
    elements.emptyState.style.display = 'block';

    if (isError) {
      elements.emptyState.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <h3>Unable to Connect to Google Sheet</h3>
        <p>${escapeHtml(message || 'Please check your internet connection or Google Script endpoint.')}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry Connection</button>
      `;
    } else {
      elements.emptyState.innerHTML = `
        <div class="empty-icon">🔍</div>
        <h3>No Transactions Found</h3>
        <p>No records matched your search or active filter criteria.</p>
        <button class="btn btn-outline" id="btn-empty-reset">Reset All Filters</button>
      `;
      const btnReset = document.getElementById('btn-empty-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (elements.btnResetFilters) elements.btnResetFilters.click();
        });
      }
    }
  }

  /**
   * Helper: Escape HTML string
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Helper: Truncate string
   */
  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '...' : str;
  }

  // Start on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
