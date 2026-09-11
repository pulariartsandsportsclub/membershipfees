/**
 * Pulari Arts & Sports Club - Membership Management System
 * Dashboard View & Dynamic Interactive SVG Charts (js/dashboard.js)
 */

// Initialize range state if not already present
if (!AppState.trendsRange) {
  AppState.trendsRange = '6'; // '6', '12', 'year'
}

let isTrendsListenersAttached = false;

function renderDashboard() {
  const { members, payments, selectedMonth, selectedYear } = AppState;

  // Filter active members
  const activeMembers = members.filter(m => m.status === 'Active');
  const totalActiveCount = activeMembers.length;

  // Filter payments for selected month & year
  const monthPayments = payments.filter(p => 
    p.month === selectedMonth && 
    Number(p.year) === Number(selectedYear) && 
    p.status === 'Paid'
  );

  const paidCount = monthPayments.length;
  const unpaidCount = Math.max(0, totalActiveCount - paidCount);
  const totalCollected = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const collectionRate = totalActiveCount > 0 ? Math.round((paidCount / totalActiveCount) * 100) : 0;

  // Update Summary Metric Cards
  const totalMembersEl = document.getElementById('dash-total-members');
  const paidCountEl = document.getElementById('dash-paid-count');
  const unpaidCountEl = document.getElementById('dash-unpaid-count');
  const collectedEl = document.getElementById('dash-collected-amount');

  if (totalMembersEl) totalMembersEl.textContent = totalActiveCount;
  if (paidCountEl) paidCountEl.textContent = paidCount;
  if (unpaidCountEl) unpaidCountEl.textContent = unpaidCount;
  if (collectedEl) collectedEl.textContent = formatCurrency(totalCollected);

  // Render Interactive Monthly Collection Bar Chart
  renderMonthlyBarChart();

  // Render Status Doughnut/Ring Chart
  renderStatusRingChart(collectionRate, paidCount, unpaidCount);

  // Ensure interactive event listeners are attached
  initTrendsInteractivity();
}

/**
 * Pure SVG Dynamic, Responsive, and Interactive Bar Chart
 */
function renderMonthlyBarChart() {
  const container = document.getElementById('dash-bar-chart');
  if (!container) return;

  const { payments, members, selectedMonth, selectedYear, trendsRange } = AppState;
  const activeMembersCount = members.filter(m => m.status === 'Active').length || members.length || 1;
  const standardFee = Number(AppState.settings.monthly_fee || 30);

  const currentYear = Number(selectedYear);
  const monthIdx = MONTHS_LIST.indexOf(selectedMonth);

  // 1. Build time series data based on selected range
  const chartData = [];
  
  if (trendsRange === 'year') {
    // 12 calendar months for the selected year
    for (let m = 0; m < 12; m++) {
      const monthName = MONTHS_LIST[m];
      const monthPays = payments.filter(p => p.month === monthName && Number(p.year) === currentYear && p.status === 'Paid');
      const totalAmount = monthPays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidMembersCount = monthPays.length;
      const rate = activeMembersCount > 0 ? Math.min(100, Math.round((paidMembersCount / activeMembersCount) * 100)) : 0;

      chartData.push({
        month: monthName,
        year: currentYear,
        shortLabel: monthName.substring(0, 3),
        fullLabel: `${monthName} ${currentYear}`,
        amount: totalAmount,
        paidCount: paidMembersCount,
        totalMembers: activeMembersCount,
        rate: rate,
        isSelected: (monthName === selectedMonth && currentYear === Number(selectedYear))
      });
    }
  } else {
    // Count back N months (6 or 12)
    const count = trendsRange === '12' ? 12 : 6;
    for (let i = count - 1; i >= 0; i--) {
      let m = monthIdx - i;
      let y = currentYear;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      const monthName = MONTHS_LIST[m];
      const monthPays = payments.filter(p => p.month === monthName && Number(p.year) === y && p.status === 'Paid');
      const totalAmount = monthPays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidMembersCount = monthPays.length;
      const rate = activeMembersCount > 0 ? Math.min(100, Math.round((paidMembersCount / activeMembersCount) * 100)) : 0;

      chartData.push({
        month: monthName,
        year: y,
        shortLabel: count === 12 ? monthName.substring(0, 3) : `${monthName.substring(0, 3)} '${String(y).slice(-2)}`,
        fullLabel: `${monthName} ${y}`,
        amount: totalAmount,
        paidCount: paidMembersCount,
        totalMembers: activeMembersCount,
        rate: rate,
        isSelected: (monthName === selectedMonth && y === Number(selectedYear))
      });
    }
  }

  // 2. Compute Summary Statistics for the banner
  const totalPeriodAmount = chartData.reduce((acc, d) => acc + d.amount, 0);
  const avgPeriodAmount = Math.round(totalPeriodAmount / (chartData.length || 1));
  
  let peakItem = chartData.reduce((max, d) => (d.amount > max.amount ? d : max), { amount: 0, fullLabel: '—' });

  const totalEl = document.getElementById('tstat-total');
  const avgEl = document.getElementById('tstat-avg');
  const peakEl = document.getElementById('tstat-peak');
  const selEl = document.getElementById('tstat-selected');
  const subtitleEl = document.getElementById('trends-subtitle');

  if (totalEl) totalEl.textContent = formatCurrency(totalPeriodAmount);
  if (avgEl) avgEl.textContent = formatCurrency(avgPeriodAmount);
  if (peakEl) peakEl.textContent = peakItem.amount > 0 ? `${peakItem.shortLabel} (${formatCurrency(peakItem.amount)})` : 'None';
  if (selEl) selEl.textContent = `${selectedMonth.substring(0, 3)} ${selectedYear}`;
  
  if (subtitleEl) {
    if (trendsRange === 'year') {
      subtitleEl.textContent = `Full Year Collections for ${currentYear} (${chartData.length} Months)`;
    } else if (trendsRange === '12') {
      subtitleEl.textContent = `Rolling 12-Month Performance Overview`;
    } else {
      subtitleEl.textContent = `Last 6 Months Collection Trends & Compliance`;
    }
  }

  // 3. Dynamic Scaling (calculate nice upper bound for Y-axis)
  const maxDataAmount = Math.max(...chartData.map(d => d.amount), 0);
  const baselineTarget = activeMembersCount * standardFee;
  let chartMax = Math.max(maxDataAmount, baselineTarget, 100);

  // Round up to clean step (e.g. multiples of 25, 50, 100, 250, 500)
  chartMax = getNiceScaleMax(chartMax);

  // SVG Geometry Definitions
  const svgWidth = 760;
  const svgHeight = 270;
  const padding = { top: 38, right: 24, bottom: 48, left: 62 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const numBars = chartData.length;
  const slotWidth = graphWidth / numBars;
  const barWidth = Math.max(16, Math.min(48, Math.floor(slotWidth * (numBars > 8 ? 0.68 : 0.58))));

  // Gridline Ticks (4 levels: 0, 33%, 66%, 100%)
  const tickSteps = [0, 0.333, 0.666, 1];
  let gridSvg = '';
  tickSteps.forEach(step => {
    const yVal = padding.top + graphHeight * (1 - step);
    const tickAmount = Math.round(chartMax * step);
    gridSvg += `
      <g class="chart-grid-row">
        <line x1="${padding.left}" y1="${yVal}" x2="${svgWidth - padding.right}" y2="${yVal}" class="grid-line" />
        <text x="${padding.left - 10}" y="${yVal + 4}" text-anchor="end" class="grid-label">
          ${formatCurrency(tickAmount)}
        </text>
      </g>
    `;
  });

  // Render Individual Bars
  let barsSvg = '';
  chartData.forEach((d, idx) => {
    const barH = Math.max(d.amount > 0 ? 6 : 0, (d.amount / chartMax) * graphHeight);
    const slotCenter = padding.left + idx * slotWidth + slotWidth / 2;
    const x = slotCenter - barWidth / 2;
    const y = padding.top + (graphHeight - barH);

    const isSelected = d.isSelected;
    const barFillClass = isSelected ? 'bar-rect-selected' : 'bar-rect-default';
    const amountLabel = d.amount > 0 ? formatCurrency(d.amount) : '₹0';

    barsSvg += `
      <g class="chart-bar-group ${isSelected ? 'is-selected' : ''}" 
         data-month="${d.month}" 
         data-year="${d.year}"
         data-amount="${d.amount}"
         data-paid="${d.paidCount}"
         data-total="${d.totalMembers}"
         data-rate="${d.rate}"
         data-label="${d.fullLabel}">
         
        <!-- Track Background with rounded corners -->
        <rect x="${x}" y="${padding.top}" width="${barWidth}" height="${graphHeight}" rx="6" class="bar-track" />

        ${isSelected ? `
          <!-- Active Selection Glow Accent -->
          <rect x="${x - 3}" y="${padding.top - 3}" width="${barWidth + 6}" height="${graphHeight + 6}" rx="9" class="bar-selection-outline" />
        ` : ''}

        <!-- Animated Data Bar -->
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="6" class="bar-rect ${barFillClass}" />

        <!-- Floating Value Badge on Top of Bar -->
        <g class="bar-val-badge">
          ${d.amount > 0 ? `
            <rect x="${slotCenter - 26}" y="${y - 24}" width="52" height="18" rx="9" class="badge-bg ${isSelected ? 'badge-bg-selected' : ''}" />
            <text x="${slotCenter}" y="${y - 11}" text-anchor="middle" class="badge-text ${isSelected ? 'badge-text-selected' : ''}">
              ${amountLabel}
            </text>
          ` : `
            <text x="${slotCenter}" y="${y - 8}" text-anchor="middle" class="badge-text text-zero">
              —
            </text>
          `}
        </g>

        <!-- X-Axis Month Label -->
        <text x="${slotCenter}" y="${svgHeight - 24}" text-anchor="middle" class="axis-label-month ${isSelected ? 'axis-label-selected' : ''}">
          ${d.shortLabel}
        </text>

        <!-- Paid Rate / Count Subtext -->
        <text x="${slotCenter}" y="${svgHeight - 10}" text-anchor="middle" class="axis-label-sub">
          ${d.paidCount}/${d.totalMembers}
        </text>
      </g>
    `;
  });

  // Assemble full SVG
  container.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="trends-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <!-- Standard Bar Gradient (Vibrant Indigo/Blue) -->
        <linearGradient id="barGradDefault" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        
        <!-- Active Selected Bar Gradient (Luminous Emerald) -->
        <linearGradient id="barGradSelected" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>

        <!-- Drop Shadow Filter for Active Badge -->
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.12"/>
        </filter>
      </defs>

      <!-- Horizontal Guide Lines -->
      ${gridSvg}

      <!-- Bottom Baseline Axis -->
      <line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${svgWidth - padding.right}" y2="${padding.top + graphHeight}" class="axis-base-line" />

      <!-- Rendered Data Bars -->
      ${barsSvg}
    </svg>
  `;

  // Attach tooltips & click handlers to the SVG elements
  attachBarInteractions(container);
}

/**
 * Attach dynamic tooltip and click events to bars
 */
function attachBarInteractions(container) {
  const tooltip = document.getElementById('chart-tooltip');
  const barGroups = container.querySelectorAll('.chart-bar-group');

  barGroups.forEach(group => {
    // Hover event for tooltip
    group.addEventListener('mouseenter', (e) => {
      const month = group.getAttribute('data-month');
      const year = group.getAttribute('data-year');
      const amount = Number(group.getAttribute('data-amount') || 0);
      const paid = group.getAttribute('data-paid');
      const total = group.getAttribute('data-total');
      const rate = group.getAttribute('data-rate');
      const isSelected = (month === AppState.selectedMonth && Number(year) === Number(AppState.selectedYear));

      if (tooltip) {
        tooltip.innerHTML = `
          <div class="tt-header">
            <span class="tt-title">${month} ${year}</span>
            ${isSelected ? '<span class="tt-tag">Active View</span>' : '<span class="tt-click-hint">Click to switch</span>'}
          </div>
          <div class="tt-body">
            <div class="tt-row">
              <span class="tt-lbl">Collected:</span>
              <span class="tt-val text-primary"><b>${formatCurrency(amount)}</b></span>
            </div>
            <div class="tt-row">
              <span class="tt-lbl">Members Paid:</span>
              <span class="tt-val">${paid} of ${total} (${rate}%)</span>
            </div>
          </div>
        `;
        tooltip.style.opacity = '1';
      }
    });

    group.addEventListener('mousemove', (e) => {
      if (tooltip) {
        const wrapperRect = container.parentElement.getBoundingClientRect();
        const mouseX = e.clientX - wrapperRect.left;
        const mouseY = e.clientY - wrapperRect.top;

        // Keep tooltip within wrapper bounds
        const tooltipWidth = 190;
        let posX = mouseX + 15;
        if (posX + tooltipWidth > wrapperRect.width) {
          posX = mouseX - tooltipWidth - 15;
        }

        tooltip.style.left = `${Math.max(10, posX)}px`;
        tooltip.style.top = `${Math.max(10, mouseY - 70)}px`;
      }
    });

    group.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.style.opacity = '0';
    });

    // Click event to switch to that month
    group.addEventListener('click', () => {
      const targetMonth = group.getAttribute('data-month');
      const targetYear = Number(group.getAttribute('data-year'));

      if (targetMonth && targetYear) {
        AppState.selectedMonth = targetMonth;
        AppState.selectedYear = targetYear;

        // Update header badge
        updateHeaderMonthBadge();

        // Rerender entire dashboard to reflect clicked month!
        renderDashboard();

        showToast(`Dashboard switched to ${targetMonth} ${targetYear}`, 'info');
      }
    });
  });
}

/**
 * Initialize Range Toggle Buttons
 */
function initTrendsInteractivity() {
  if (isTrendsListenersAttached) return;

  const toggleGroup = document.getElementById('trends-range-toggle');
  if (toggleGroup) {
    toggleGroup.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const range = btn.getAttribute('data-range');
        if (range && range !== AppState.trendsRange) {
          AppState.trendsRange = range;
          
          toggleGroup.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          renderMonthlyBarChart();
        }
      });
    });
    isTrendsListenersAttached = true;
  }
}

/**
 * Helper to compute clean dynamic rounded scale max
 */
function getNiceScaleMax(val) {
  if (val <= 60) return 60;
  if (val <= 100) return 100;
  if (val <= 150) return 150;
  if (val <= 200) return 200;
  if (val <= 300) return 300;
  if (val <= 500) return 500;
  if (val <= 1000) return 1000;
  if (val <= 2000) return 2000;
  if (val <= 5000) return 5000;
  
  const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
  const factor = Math.ceil(val / magnitude);
  return factor * magnitude;
}

/**
 * Pure SVG Dynamic Ring/Doughnut Chart for Paid vs Unpaid Rate
 */
function renderStatusRingChart(percentage, paidCount, unpaidCount) {
  const percentEl = document.getElementById('ring-percent');
  const circleEl = document.getElementById('ring-circle');
  const paidLegend = document.getElementById('legend-paid-txt');
  const unpaidLegend = document.getElementById('legend-unpaid-txt');

  if (percentEl) percentEl.textContent = `${percentage}%`;
  if (paidLegend) paidLegend.textContent = `Paid (${paidCount})`;
  if (unpaidLegend) unpaidLegend.textContent = `Unpaid (${unpaidCount})`;

  if (circleEl) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius; // ~339.29
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    circleEl.style.strokeDasharray = `${circumference}`;
    circleEl.style.strokeDashoffset = `${strokeDashoffset}`;
    circleEl.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
  }
}
