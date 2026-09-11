/**
 * Pulari Arts & Sports Club - Membership Management System
 * System Settings Module (js/settings.js)
 */

function renderSettingsPage() {
  const { settings } = AppState;

  const clubNameInput = document.getElementById('settings-club-name');
  const feeInput = document.getElementById('settings-monthly-fee');
  const currencyInput = document.getElementById('settings-currency');
  const apiUrlInput = document.getElementById('settings-api-url');

  if (clubNameInput) clubNameInput.value = settings.club_name || "Pulari Arts & Sports Club";
  if (feeInput) feeInput.value = settings.monthly_fee || 30;
  if (currencyInput) currencyInput.value = settings.currency || "₹";
  if (apiUrlInput) apiUrlInput.value = localStorage.getItem('pulari_api_url') || "";
}

document.addEventListener('DOMContentLoaded', () => {
  const settingsForm = document.getElementById('settings-form');
  const testApiBtn = document.getElementById('btn-test-api');

  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = settingsForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const club_name = document.getElementById('settings-club-name').value.trim();
      const monthly_fee = Number(document.getElementById('settings-monthly-fee').value || 30);
      const currency = document.getElementById('settings-currency').value.trim();
      const admin_password = document.getElementById('settings-admin-password').value.trim();
      const api_url = document.getElementById('settings-api-url').value.trim();

      // Store API URL in LocalStorage
      localStorage.setItem('pulari_api_url', api_url);

      const payload = {
        club_name,
        monthly_fee,
        currency
      };

      if (admin_password && admin_password.length > 0) {
        payload.admin_password = admin_password;
      }

      const res = await apiCall('UPDATE_SETTINGS', payload);

      btn.disabled = false;
      btn.textContent = 'Save Settings';

      if (res.success) {
        showToast('Settings saved successfully!', 'success');
        refreshAppData();
      } else {
        showToast(res.message || 'Error saving settings.', 'error');
      }
    });
  }

  if (testApiBtn) {
    testApiBtn.addEventListener('click', async () => {
      const url = document.getElementById('settings-api-url').value.trim();
      if (!url) {
        showToast('Running in Local Demo Mode (No API URL set).', 'info');
        return;
      }

      testApiBtn.disabled = true;
      testApiBtn.textContent = 'Testing connection...';

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'GET_SETTINGS' })
        });
        const json = await res.json();
        if (json.success) {
          showToast('Connected to Google Apps Script successfully! 🎉', 'success');
        } else {
          showToast('API URL responded, but returned an error.', 'warning');
        }
      } catch (err) {
        showToast('Could not reach Google Apps Script Web App. Check URL and CORS deployment settings.', 'error');
        console.error('API Test Error:', err);
      } finally {
        testApiBtn.disabled = false;
        testApiBtn.textContent = 'Test API Connection';
      }
    });
  }
});
