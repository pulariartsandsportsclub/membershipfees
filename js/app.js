/**
 * Pulari Arts & Sports Club - Membership Management System
 * Core App State & Navigation Controller (js/app.js)
 */

const AppState = {
  activeTab: 'dashboard',
  isLoggedIn: sessionStorage.getItem('pulari_auth') === 'true',
  selectedMonth: new Date().toLocaleString('default', { month: 'long' }),
  selectedYear: new Date().getFullYear(),
  members: [],
  payments: [],
  settings: {
    monthly_fee: 30,
    club_name: "Pulari Arts & Sports Club",
    currency: "₹"
  }
};

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAuthentication();
  initModalListeners();
  
  // Set top header month badge
  updateHeaderMonthBadge();
});

/**
 * Global App Data Refresh
 */
async function refreshAppData() {
  showGlobalLoading(true);
  try {
    const [settingsRes, membersRes, paymentsRes] = await Promise.all([
      apiCall('GET_SETTINGS'),
      apiCall('GET_MEMBERS'),
      apiCall('GET_PAYMENTS')
    ]);

    if (settingsRes.success) AppState.settings = settingsRes.data;
    if (membersRes.success) AppState.members = membersRes.data;
    if (paymentsRes.success) AppState.payments = paymentsRes.data;

    // Trigger tab specific view renders
    renderCurrentTab();
  } catch (err) {
    showToast('Failed to load system data.', 'error');
    console.error('Data loading error:', err);
  } finally {
    showGlobalLoading(false);
  }
}

/**
 * Navigation Router
 */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      if (targetTab) {
        switchTab(targetTab);
        // Close mobile drawer if open
        document.querySelector('.sidebar').classList.remove('mobile-open');
      }
    });
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('mobile-open');
    });
  }
}

function switchTab(tabName) {
  AppState.activeTab = tabName;
  
  // Update sidebar active styling
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
  });

  // Update header title
  const titleMap = {
    dashboard: 'Dashboard Overview',
    members: 'Members Directory',
    payments: 'Monthly Fee Payments',
    reports: 'Collection Reports',
    settings: 'System Settings'
  };
  const headerTitle = document.getElementById('page-header-title');
  if (headerTitle) headerTitle.textContent = titleMap[tabName] || 'Dashboard';

  // Toggle page view elements
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabName}`);
  });

  renderCurrentTab();
}

function renderCurrentTab() {
  switch (AppState.activeTab) {
    case 'dashboard':
      if (window.renderDashboard) renderDashboard();
      break;
    case 'members':
      if (window.renderMembersPage) renderMembersPage();
      break;
    case 'payments':
      if (window.renderPaymentsPage) renderPaymentsPage();
      break;
    case 'reports':
      if (window.renderReportsPage) renderReportsPage();
      break;
    case 'settings':
      if (window.renderSettingsPage) renderSettingsPage();
      break;
  }
}

/**
 * Authentication Setup
 */
function setAuthView(isLoggedIn) {
  document.body.classList.toggle('logged-in', isLoggedIn);
  document.body.classList.toggle('logged-out', !isLoggedIn);
}

function initAuthentication() {
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('btn-logout');
  const loginError = document.getElementById('login-error');

  setAuthView(AppState.isLoggedIn);
  if (AppState.isLoggedIn) {
    refreshAppData();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = loginForm.querySelector('button[type="submit"]');

      if (loginError) loginError.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      let res = handleLocalApiCall('LOGIN', { username, password });
      if (!res.success) {
        res = await apiCall('LOGIN', { username, password });
      }
      btn.disabled = false;
      btn.textContent = 'Sign In';

      if (res.success) {
        AppState.isLoggedIn = true;
        sessionStorage.setItem('pulari_auth', 'true');
        setAuthView(true);
        loginForm.reset();
        showToast('Login successful. Welcome admin!', 'success');
        refreshAppData();
      } else {
        if (loginError) {
          loginError.textContent = res.message || 'Invalid username or password.';
          loginError.hidden = false;
        }
        showToast(res.message || 'Invalid username or password.', 'error');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      AppState.isLoggedIn = false;
      sessionStorage.removeItem('pulari_auth');
      setAuthView(false);
      const usernameInput = document.getElementById('login-username');
      if (usernameInput) usernameInput.focus();
      showToast('Logged out successfully.', 'info');
    });
  }
}

/**
 * Reusable Toast Notification System
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:inherit;">&times;</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Modal Dialog Helpers
 */
function initModalListeners() {
  document.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

/**
 * UI Utilities
 */
function formatCurrency(amount) {
  const symbol = AppState.settings.currency || '₹';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
}

function updateHeaderMonthBadge() {
  const badge = document.getElementById('header-month-badge');
  if (badge) {
    badge.textContent = `${AppState.selectedMonth} ${AppState.selectedYear}`;
  }
}

function showGlobalLoading(show) {
  const spinner = document.getElementById('global-spinner');
  if (spinner) spinner.style.display = show ? 'inline-block' : 'none';
}
