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

  // WhatsApp Gateway inputs
  const waProviderInput = document.getElementById('settings-wa-provider');
  const waUrlInput = document.getElementById('settings-wa-url');
  const waInstanceInput = document.getElementById('settings-wa-instance');
  const waTokenInput = document.getElementById('settings-wa-token');
  const waAutosendInput = document.getElementById('settings-wa-autosend');

  if (clubNameInput) clubNameInput.value = settings.club_name || "Pulari Arts & Sports Club";
  if (feeInput) feeInput.value = settings.monthly_fee || 30;
  if (currencyInput) currencyInput.value = settings.currency || "₹";
  if (supabaseUrlInput) supabaseUrlInput.value = localStorage.getItem('pulari_supabase_url') || SUPABASE_CONFIG.url;
  if (supabaseKeyInput) supabaseKeyInput.value = localStorage.getItem('pulari_supabase_key') || SUPABASE_CONFIG.anonKey;
  if (sheetUrlInput) sheetUrlInput.value = localStorage.getItem('pulari_api_url') || GOOGLE_SHEET_CONFIG.url;

  if (waProviderInput) waProviderInput.value = localStorage.getItem('pulari_wa_provider') || 'evolution';
  if (waUrlInput) waUrlInput.value = localStorage.getItem('pulari_wa_url') || 'https://evolution-api-latest-ykez.onrender.com';
  if (waInstanceInput) waInstanceInput.value = localStorage.getItem('pulari_wa_instance') || 'pulari-club';
  if (waTokenInput) waTokenInput.value = localStorage.getItem('pulari_wa_token') || 'pulari_secret_key_123';
  if (waAutosendInput) waAutosendInput.checked = localStorage.getItem('pulari_wa_autosend') !== 'false';
}

document.addEventListener('DOMContentLoaded', () => {
  const settingsForm = document.getElementById('settings-form');
  const testApiBtn = document.getElementById('btn-test-api');
  const testWaBtn = document.getElementById('btn-test-whatsapp');

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

      // WhatsApp settings
      const wa_provider = document.getElementById('settings-wa-provider')?.value || 'evolution';
      const wa_url = (document.getElementById('settings-wa-url')?.value || '').trim().replace(/\/+$/, '');
      const wa_instance = (document.getElementById('settings-wa-instance')?.value || '').trim();
      const wa_token = (document.getElementById('settings-wa-token')?.value || '').trim();
      const wa_autosend = document.getElementById('settings-wa-autosend')?.checked ? 'true' : 'false';

      // Store in LocalStorage
      SUPABASE_CONFIG.url = supabase_url;
      SUPABASE_CONFIG.anonKey = supabase_key;
      GOOGLE_SHEET_CONFIG.url = sheet_url;

      localStorage.setItem('pulari_wa_provider', wa_provider);
      localStorage.setItem('pulari_wa_url', wa_url);
      localStorage.setItem('pulari_wa_instance', wa_instance);
      localStorage.setItem('pulari_wa_token', wa_token);
      localStorage.setItem('pulari_wa_autosend', wa_autosend);

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
        showToast('Settings & WhatsApp gateway saved successfully!', 'success');
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

  if (testWaBtn) {
    testWaBtn.addEventListener('click', async () => {
      const url = (document.getElementById('settings-wa-url')?.value || '').trim().replace(/\/+$/, '');
      const provider = document.getElementById('settings-wa-provider')?.value || 'evolution';
      const instance = (document.getElementById('settings-wa-instance')?.value || '').trim();
      const token = (document.getElementById('settings-wa-token')?.value || '').trim();

      if (provider === 'disabled') {
        showToast('WhatsApp Gateway is currently set to Disabled (using 1-Click WhatsApp Web).', 'info');
        return;
      }

      if (!url) {
        showToast('Please enter your WhatsApp Gateway Server URL to test connection.', 'warning');
        return;
      }

      testWaBtn.disabled = true;
      testWaBtn.textContent = 'Testing Gateway...';

      try {
        let testUrl = `${url}`;
        let headers = {};

        if (provider === 'evolution') {
          testUrl = `${url}/instance/connectionState/${instance || 'pulari-club'}`;
          if (token) headers['apikey'] = token;
        } else if (provider === 'wppconnect') {
          testUrl = `${url}/api/${instance || 'pulari-club'}/status-session`;
          if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(testUrl, {
          method: 'GET',
          headers: headers
        });

        if (!res.ok) {
          showToast(`Gateway connection error (HTTP ${res.status}). Check Server URL, Instance Name, and API Token.`, 'error');
          return;
        }

        const data = await res.json().catch(() => ({}));
        const isOpen = (data && data.instance && data.instance.state === 'open') || (data && data.status === 'CONNECTED');

        if (!isOpen) {
          showToast(`Gateway reached, but WhatsApp is not connected (Status: ${data.instance?.state || 'disconnected'}). Open Evolution Manager & scan QR code.`, 'warning');
          return;
        }

        showToast('WhatsApp Gateway is connected (Status: Open)! 🚀', 'success');

        // Offer to send a live test message
        const testPhoneRaw = prompt('WhatsApp Gateway is Connected! Enter your WhatsApp phone number (with country code, e.g. 919876543210 or 971547528521) to send a test message:', '');
        if (testPhoneRaw && testPhoneRaw.trim()) {
          const testPhone = (typeof formatWhatsAppPhone === 'function' ? formatWhatsAppPhone(testPhoneRaw) : testPhoneRaw.replace(/\D/g, ''));
          testWaBtn.textContent = 'Sending test message...';
          testWaBtn.disabled = true;

          let sendUrl = `${url}/message/sendText/${instance || 'pulari-club'}`;
          let sendBody = {
            number: testPhone,
            text: '🎉 *Pulari Arts & Sports Club*\nWhatsApp Gateway is connected and working! Background vouchers will now be delivered automatically.'
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          try {
            const sendRes = await fetch(sendUrl, {
              signal: controller.signal,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'apikey': token } : {})
              },
              body: JSON.stringify(sendBody)
            });
            clearTimeout(timeoutId);

            if (sendRes.ok) {
              showToast(`Test message sent successfully to ${testPhone}! Check your WhatsApp 📱`, 'success');
            } else {
              const sendErr = await sendRes.json().catch(() => ({}));
              let errMsg = sendRes.statusText;
              if (sendErr?.response?.message?.[0]?.exists === false) {
                errMsg = `Phone ${testPhone} is not registered on WhatsApp!`;
              } else if (sendErr?.message) {
                errMsg = typeof sendErr.message === 'string' ? sendErr.message : JSON.stringify(sendErr.message);
              }
              showToast(`Delivery error (${sendRes.status}): ${errMsg}`, 'error');
            }
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
              showToast('Request timed out after 12s. WhatsApp server took too long to deliver.', 'warning');
            } else {
              showToast(`Network error: ${fetchErr.message}`, 'error');
            }
          } finally {
            testWaBtn.disabled = false;
            testWaBtn.textContent = '📲 Test WhatsApp Connection';
          }
        }
      } catch (err) {
        showToast('Could not reach WhatsApp server. Check server URL and network.', 'warning');
      } finally {
        testWaBtn.disabled = false;
        testWaBtn.textContent = '📲 Test WhatsApp Connection';
      }
    });
  }
});
