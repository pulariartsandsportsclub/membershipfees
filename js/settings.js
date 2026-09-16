/**
 * Pulari Arts & Sports Club - Membership Management System
 * System Settings Module (js/settings.js)
 */

function renderSettingsPage() {
  const { settings } = AppState;

  const clubNameInput = document.getElementById('settings-club-name');
  const feeInput = document.getElementById('settings-monthly-fee');
  const currencyInput = document.getElementById('settings-currency');
  const supabaseUrlInput = document.getElementById('settings-supabase-url');
  const supabaseKeyInput = document.getElementById('settings-supabase-key');
  const sheetUrlInput = document.getElementById('settings-sheet-url');

  if (clubNameInput) clubNameInput.value = settings.club_name || "Pulari Arts & Sports Club";
  if (feeInput) feeInput.value = settings.monthly_fee || 30;
  if (currencyInput) currencyInput.value = settings.currency || "₹";
  if (supabaseUrlInput) supabaseUrlInput.value = localStorage.getItem('pulari_supabase_url') || SUPABASE_CONFIG.url;
  if (supabaseKeyInput) supabaseKeyInput.value = localStorage.getItem('pulari_supabase_key') || SUPABASE_CONFIG.anonKey;
  if (sheetUrlInput) sheetUrlInput.value = localStorage.getItem('pulari_api_url') || GOOGLE_SHEET_CONFIG.url;
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
      const supabase_url = document.getElementById('settings-supabase-url').value.trim();
      const supabase_key = document.getElementById('settings-supabase-key').value.trim();
      const sheet_url = (document.getElementById('settings-sheet-url')?.value || '').trim();

      // Store Supabase Credentials in LocalStorage
      SUPABASE_CONFIG.url = supabase_url;
      SUPABASE_CONFIG.anonKey = supabase_key;
      GOOGLE_SHEET_CONFIG.url = sheet_url;

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
        showToast('Settings & Supabase credentials saved successfully!', 'success');
        refreshAppData();
      } else {
        showToast(res.message || 'Error saving settings.', 'error');
      }
    });
  }

  if (testApiBtn) {
    testApiBtn.addEventListener('click', async () => {
      const url = document.getElementById('settings-supabase-url').value.trim().replace(/\/+$/, '');
      const key = document.getElementById('settings-supabase-key').value.trim();

      if (!url || !key) {
        showToast('Please enter both Supabase Project URL and Public Anon Key.', 'warning');
        return;
      }

      testApiBtn.disabled = true;
      testApiBtn.textContent = 'Testing connection...';

      try {
        const testEndpoint = `${url}/rest/v1/settings?select=*&limit=1`;
        const res = await fetch(testEndpoint, {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });

        if (res.ok) {
          showToast('Connected to Supabase Database successfully! 🚀', 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(`Supabase responded with error (${res.status}): ${errData.message || res.statusText}`, 'error');
        }
      } catch (err) {
        showToast('Could not reach Supabase. Check URL, network, or CORS settings.', 'error');
        console.error('Supabase Test Error:', err);
      } finally {
        testApiBtn.disabled = false;
        testApiBtn.textContent = 'Test Supabase Connection';
      }
    });
  }
});
