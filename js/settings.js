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

  // Due Members Email Settings
  const recipientInput = document.getElementById('settings-recipient-email');
  if (recipientInput) {
    const savedEmail = localStorage.getItem('pulari_due_recipient_email');
    recipientInput.value = (savedEmail && savedEmail !== 'nunuappu48@gmail.com') ? savedEmail : '';
  }

  // Render Due Members Summary & Preview
  renderDueReportSettings();
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

  // Initialize Due Email Reporting listeners
  initDueEmailReportListeners();
});

/**
 * Safe HTML escaping helper for settings module
 */
function escapeSettingHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Calculate Monthly Pending Dues for Current and Past Months
 * Pulari Arts & Sports Club cycle strictly begins from September 2026.
 */
function calculateDueMembersReport() {
  const { members = [], payments = [], settings = {} } = AppState;
  const currency = settings.currency || '₹';
  const defaultFee = Number(settings.monthly_fee || 30);
  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();

  // Full cycle definition for Pulari Club (Starts September 2026)
  const fullCycleMonths = [
    { name: "September", year: 2026, monthIndex: 8, malName: "സെപ്റ്റംബർ" },
    { name: "October", year: 2026, monthIndex: 9, malName: "ഒക്ടോബർ" },
    { name: "November", year: 2026, monthIndex: 10, malName: "നവംബർ" },
    { name: "December", year: 2026, monthIndex: 11, malName: "ഡിസംബർ" },
    { name: "January", year: 2027, monthIndex: 0, malName: "ജനുവരി" },
    { name: "February", year: 2027, monthIndex: 1, malName: "ഫെബ്രുവരി" },
    { name: "March", year: 2027, monthIndex: 2, malName: "മാർച്ച്" },
    { name: "April", year: 2027, monthIndex: 3, malName: "ഏപ്രിൽ" },
    { name: "May", year: 2027, monthIndex: 4, malName: "മേയ്" },
    { name: "June", year: 2027, monthIndex: 5, malName: "ജൂൺ" },
    { name: "July", year: 2027, monthIndex: 6, malName: "ജൂലൈ" },
    { name: "August", year: 2027, monthIndex: 7, malName: "ഓഗസ്റ്റ്" }
  ];

  const getMonthDate = (item) => new Date(item.year, item.monthIndex, 1);
  const currentDateStamp = new Date(currentYear, now.getMonth(), 1);

  // Evaluate from September 2026 up to current month
  let evaluatedCycleMonths = fullCycleMonths.filter(item => getMonthDate(item) <= currentDateStamp);
  if (evaluatedCycleMonths.length === 0) {
    evaluatedCycleMonths = [{ name: "September", year: 2026, monthIndex: 8, malName: "സെപ്റ്റംബർ" }];
  }

  // Active members sorted by full name
  const activeMembers = members
    .filter(m => (m.status || 'Active').toLowerCase() === 'active')
    .slice()
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' }));

  // 1. Month-by-month summary: How many members are yet to pay in each month
  const monthSummaries = evaluatedCycleMonths.map(cycleMonth => {
    const isCurrent = (cycleMonth.name.toLowerCase() === currentMonthName.toLowerCase() && cycleMonth.year === currentYear);
    const cycleDate = getMonthDate(cycleMonth);

    // Active members eligible for this month (joined on or before this month)
    const eligibleMembers = activeMembers.filter(m => {
      if (!m.joinDate) return true;
      const parts = String(m.joinDate).split('-');
      if (parts.length < 2) return true;
      const joinMonthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      return joinMonthDate <= cycleDate;
    });

    // Members who haven't paid for this month
    const unpaidMembers = eligibleMembers.filter(m => {
      const isPaid = (payments || []).some(p =>
        p.memberId === m.memberId &&
        p.month && p.month.toLowerCase() === cycleMonth.name.toLowerCase() &&
        Number(p.year) === cycleMonth.year &&
        p.status === 'Paid'
      );
      return !isPaid;
    });

    const totalDue = unpaidMembers.reduce((sum, m) => sum + Number(m.monthlyFee || defaultFee), 0);
    const paidCount = eligibleMembers.length - unpaidMembers.length;
    const rate = eligibleMembers.length > 0 ? Math.round((paidCount / eligibleMembers.length) * 100) : 0;

    return {
      month: cycleMonth.name,
      year: cycleMonth.year,
      malName: cycleMonth.malName,
      label: `${cycleMonth.name} ${cycleMonth.year}`,
      isCurrent,
      eligibleCount: eligibleMembers.length,
      paidCount,
      unpaidCount: unpaidMembers.length,
      totalDue,
      collectionRate: rate,
      unpaidMembers
    };
  });

  // 2. Member-wise due breakdown: details of current and past month due members
  const dueMembersList = [];

  activeMembers.forEach(member => {
    const fee = Number(member.monthlyFee || defaultFee);
    const unpaidMonths = [];
    const pastUnpaidMonths = [];
    const currentUnpaidMonths = [];

    evaluatedCycleMonths.forEach(cycleMonth => {
      if (member.joinDate) {
        const parts = String(member.joinDate).split('-');
        if (parts.length >= 2) {
          const joinMonthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
          if (getMonthDate(cycleMonth) < joinMonthDate) return; // Joined after this cycle month
        }
      }

      const isPaid = (payments || []).some(p =>
        p.memberId === member.memberId &&
        p.month && p.month.toLowerCase() === cycleMonth.name.toLowerCase() &&
        Number(p.year) === cycleMonth.year &&
        p.status === 'Paid'
      );

      if (!isPaid) {
        const isCurrent = (cycleMonth.name.toLowerCase() === currentMonthName.toLowerCase() && cycleMonth.year === currentYear);
        const item = {
          name: cycleMonth.name,
          year: cycleMonth.year,
          malName: cycleMonth.malName,
          label: `${cycleMonth.name} ${cycleMonth.year}`,
          isCurrent,
          amount: fee
        };
        unpaidMonths.push(item);
        if (isCurrent) {
          currentUnpaidMonths.push(item);
        } else {
          pastUnpaidMonths.push(item);
        }
      }
    });

    if (unpaidMonths.length > 0) {
      dueMembersList.push({
        memberId: member.memberId,
        fullName: member.fullName,
        phone: (member.phone || '').trim(),
        monthlyFee: fee,
        unpaidMonths,
        pastUnpaidMonths,
        currentUnpaidMonths,
        totalDueAmount: unpaidMonths.length * fee,
        pastDueAmount: pastUnpaidMonths.length * fee,
        currentDueAmount: currentUnpaidMonths.length * fee
      });
    }
  });

  // Sort by highest due amount, then alphabetically
  dueMembersList.sort((a, b) => b.totalDueAmount - a.totalDueAmount || (a.fullName || '').localeCompare(b.fullName || ''));

  const totalDueAmount = dueMembersList.reduce((sum, m) => sum + m.totalDueAmount, 0);
  const totalPastDueAmount = dueMembersList.reduce((sum, m) => sum + m.pastDueAmount, 0);
  const totalCurrentDueAmount = dueMembersList.reduce((sum, m) => sum + m.currentDueAmount, 0);

  return {
    currentMonthName,
    currentYear,
    currency,
    defaultFee,
    activeMembersCount: activeMembers.length,
    dueMembersCount: dueMembersList.length,
    totalDueAmount,
    totalPastDueAmount,
    totalCurrentDueAmount,
    monthSummaries,
    dueMembersList
  };
}

/**
 * Render the Due Report section in the Settings page
 */
function renderDueReportSettings() {
  const summaryContainer = document.getElementById('settings-due-months-summary');
  const previewContainer = document.getElementById('settings-due-preview-content');
  const badgeEl = document.getElementById('settings-due-total-badge');
  const countBtnEl = document.getElementById('due-members-count-btn');
  const countDescEl = document.getElementById('settings-due-months-count');

  if (!summaryContainer) return;

  const report = calculateDueMembersReport();

  // Update top badge
  if (badgeEl) {
    if (report.dueMembersCount === 0) {
      badgeEl.className = 'badge badge-paid';
      badgeEl.textContent = 'All Members Up-To-Date 🎉';
    } else {
      badgeEl.className = 'badge badge-unpaid';
      badgeEl.textContent = `${report.dueMembersCount} Due (${report.currency}${report.totalDueAmount.toLocaleString('en-IN')})`;
    }
  }

  if (countBtnEl) {
    countBtnEl.textContent = report.dueMembersCount;
  }

  if (countDescEl) {
    countDescEl.textContent = `${report.monthSummaries.length} billing cycle months evaluated`;
  }

  // Render Month-by-Month summary cards
  summaryContainer.innerHTML = report.monthSummaries.map(ms => {
    const badgeColor = ms.isCurrent ? '#2563eb' : '#64748b';
    const badgeBg = ms.isCurrent ? '#eff6ff' : '#f1f5f9';
    const statusText = ms.isCurrent ? 'Current Month' : 'Past Month';
    const isCleared = ms.unpaidCount === 0;

    return `
      <div style="background:#fff; border:1px solid ${ms.isCurrent ? '#93c5fd' : '#e2e8f0'}; border-radius:8px; padding:0.75rem; box-shadow:0 1px 3px rgba(0,0,0,0.04); position:relative; overflow:hidden;">
        ${ms.isCurrent ? '<div style="position:absolute; top:0; left:0; right:0; height:3px; background:#2563eb;"></div>' : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <strong style="font-size:0.85rem; color:#1e293b;">${escapeSettingHtml(ms.month)} ${ms.year}</strong>
          <span style="font-size:0.65rem; padding:0.1rem 0.35rem; border-radius:4px; background:${badgeBg}; color:${badgeColor}; font-weight:700;">
            ${statusText}
          </span>
        </div>
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin-top:0.25rem;">
          <div style="font-size:1.15rem; font-weight:800; color:${isCleared ? '#059669' : '#dc2626'};">
            ${ms.unpaidCount} <span style="font-size:0.7rem; font-weight:600; color:var(--text-muted);">yet to pay</span>
          </div>
          <div style="font-size:0.82rem; font-weight:700; color:${isCleared ? '#059669' : '#b91c1c'};">
            ${report.currency}${ms.totalDue.toLocaleString('en-IN')}
          </div>
        </div>
        <div style="margin-top:0.35rem; font-size:0.7rem; color:var(--text-muted); display:flex; justify-content:space-between;">
          <span>Collected: ${ms.paidCount}/${ms.eligibleCount}</span>
          <span>${ms.collectionRate}%</span>
        </div>
      </div>
    `;
  }).join('');

  // Render Detailed Member List Preview Table
  if (previewContainer) {
    if (report.dueMembersList.length === 0) {
      previewContainer.innerHTML = `
        <div style="padding:1.5rem; text-align:center; color:#059669;">
          <div style="font-size:1.75rem; margin-bottom:0.25rem;">🎉</div>
          <strong>Awesome! All members have paid their monthly fees up to ${report.currentMonthName} ${report.currentYear}.</strong>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:0.25rem 0 0 0;">No pending dues found.</p>
        </div>
      `;
    } else {
      previewContainer.innerHTML = `
        <div style="font-size:0.75rem; color:var(--text-muted); padding:0.4rem 0.6rem; background:#f8fafc; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:0.35rem;">
          <span>👉</span> <em>Swipe horizontally (&rarr;) to see past &amp; current due amounts</em>
        </div>
        <div style="width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch;">
          <table class="data-table" style="width:100%; min-width:580px; font-size:0.82rem; margin:0;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="width:40px; text-align:center;">#</th>
                <th>Member Name</th>
                <th>Mobile Number</th>
                <th>Past Month(s) Due</th>
                <th>Current Month</th>
                <th style="text-align:right;">Total Due</th>
                <th style="text-align:center; width:65px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${report.dueMembersList.map((m, idx) => {
        const pastBadges = m.pastUnpaidMonths.length > 0
          ? m.pastUnpaidMonths.map(p => `<span style="display:inline-block; font-size:0.68rem; background:#fee2e2; color:#991b1b; padding:0.1rem 0.35rem; border-radius:4px; margin:1px; font-weight:600;">${escapeSettingHtml(p.name.substring(0, 3))} '${String(p.year).slice(-2)}</span>`).join('')
          : '<span style="color:#059669; font-size:0.72rem; font-weight:600;">✓ Nil</span>';

        const currentBadge = m.currentUnpaidMonths.length > 0
          ? `<span style="display:inline-block; font-size:0.68rem; background:#dbeafe; color:#1e40af; padding:0.1rem 0.35rem; border-radius:4px; font-weight:700;">${escapeSettingHtml(report.currentMonthName.substring(0, 3))} Due</span>`
          : '<span style="color:#059669; font-size:0.72rem; font-weight:600;">✓ Paid</span>';

        const cleanPhone = (m.phone || '').replace(/\D/g, '');

        return `
                  <tr>
                    <td style="text-align:center; color:var(--text-muted);">${idx + 1}</td>
                    <td>
                      <strong>${escapeSettingHtml(m.fullName)}</strong>
                      <div style="font-size:0.7rem; color:var(--text-muted);">${escapeSettingHtml(m.memberId)}</div>
                    </td>
                    <td>
                      ${cleanPhone ? `
                        <a href="tel:${cleanPhone}" style="color:#2563eb; text-decoration:none; font-weight:600;">
                          ${escapeSettingHtml(m.phone)}
                        </a>
                      ` : '<span style="color:var(--text-muted); font-style:italic;">No phone</span>'}
                    </td>
                    <td>${pastBadges}</td>
                    <td>${currentBadge}</td>
                    <td style="text-align:right; font-weight:800; color:#dc2626;">
                      ${report.currency}${m.totalDueAmount.toLocaleString('en-IN')}
                    </td>
                    <td style="text-align:center;">
                      ${typeof sendWhatsAppReminder === 'function' ? `
                        <button type="button" class="btn btn-whatsapp btn-xs" onclick="sendWhatsAppReminder('${escapeSettingHtml(m.memberId)}')" title="Send WhatsApp reminder to ${escapeSettingHtml(m.fullName)}" style="padding:0.15rem 0.4rem; font-size:0.7rem;">
                          WA
                        </button>
                      ` : '—'}
                    </td>
                  </tr>
                `;
      }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
}

/**
 * Generate Rich HTML Email Template for Due Members
 */
function generateDueReportEmailHTML(report) {
  const settings = AppState.settings || {};
  const clubName = settings.club_name || "പുലരി ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ്";
  const currency = report.currency || "₹";
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const monthRows = report.monthSummaries.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; font-weight:600; color:#1e293b;">
        ${escapeSettingHtml(m.month)} ${m.year}
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; text-align:center;">
        <span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; ${m.isCurrent ? 'background:#dbeafe; color:#1e40af;' : 'background:#f1f5f9; color:#475569;'}">
          ${m.isCurrent ? 'Current Month' : 'Past Month'}
        </span>
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; text-align:center; font-weight:700; color:${m.unpaidCount > 0 ? '#dc2626' : '#059669'};">
        ${m.unpaidCount} Members
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; text-align:center; color:#475569;">
        ${m.paidCount} / ${m.eligibleCount} (${m.collectionRate}%)
      </td>
      <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:700; color:#b91c1c;">
        ${currency}${m.totalDue.toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const memberRows = report.dueMembersList.map((m, i) => {
    const pastText = m.pastUnpaidMonths.length > 0
      ? m.pastUnpaidMonths.map(p => `${p.name.substring(0, 3)} '${String(p.year).slice(-2)}`).join(', ')
      : '<span style="color:#059669;">Nil</span>';

    const currentText = m.currentUnpaidMonths.length > 0
      ? `<span style="color:#dc2626; font-weight:700;">${report.currentMonthName.substring(0, 3)} Due</span>`
      : '<span style="color:#059669;">Paid</span>';

    return `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#64748b; font-size:12px;">
          ${i + 1}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0;">
          <strong style="color:#0f172a; font-size:13px;">${escapeSettingHtml(m.fullName)}</strong>
          <div style="font-size:11px; color:#64748b;">ID: ${escapeSettingHtml(m.memberId)}</div>
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; color:#334155; font-size:13px;">
          ${m.phone ? `<a href="tel:${escapeSettingHtml(m.phone)}" style="color:#2563eb; text-decoration:none;">${escapeSettingHtml(m.phone)}</a>` : '<span style="color:#94a3b8; font-style:italic;">Not provided</span>'}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; color:#b91c1c;">
          ${pastText}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; font-size:12px;">
          ${currentText}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:800; font-size:14px; color:#dc2626;">
          ${currency}${m.totalDueAmount.toLocaleString('en-IN')}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulari Club Due Members Report</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-card { border-radius: 8px !important; }
      .email-header { padding: 16px 14px !important; }
      .email-body { padding: 14px 10px !important; }
      .kpi-td { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 4px 0 !important; }
      .mobile-scroll-box { width: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; display: block !important; }
      .mobile-scroll-table { min-width: 580px !important; width: 100% !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0; padding:20px; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b;">
  <div class="email-card" style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid #e2e8f0;">
    
    <!-- Club Header -->
    <div class="email-header" style="background:linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%); color:#ffffff; padding:24px 28px;">
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td>
            <h1 style="margin:0 0 4px 0; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:0.3px;">
              ${escapeSettingHtml(clubName)}
            </h1>
            <p style="margin:0; font-size:12px; color:#cbd5e1;">
              രജി. നമ്പർ: MPM/CA/355/2017 &bull; പോരൂർ, മലപ്പുറം &bull; സ്ഥാപിതം: 1985
            </p>
          </td>
          <td style="text-align:right; vertical-align:middle;">
            <div style="display:inline-block; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); border-radius:8px; padding:6px 12px; text-align:right;">
              <div style="font-size:10px; text-transform:uppercase; color:#e2e8f0; font-weight:700;">Statement Period</div>
              <div style="font-size:13px; font-weight:800; color:#ffffff;">Up to ${escapeSettingHtml(report.currentMonthName)} ${report.currentYear}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Subtitle Bar -->
    <div style="background:#0f172a; color:#f8fafc; padding:10px 20px; font-size:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
      <span><strong>Official Report:</strong> Monthly Membership Fee Due &amp; Unpaid Members</span>
      <span style="color:#94a3b8;">Generated: ${dateStr}</span>
    </div>

    <div class="email-body" style="padding:22px 24px;">

      <!-- Executive KPI Cards -->
      <table class="kpi-table" style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <tr>
          <td class="kpi-td" style="width:25%; padding:5px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Active Members</div>
              <div style="font-size:20px; font-weight:800; color:#0f172a; margin-top:2px;">${report.activeMembersCount}</div>
            </div>
          </td>
          <td class="kpi-td" style="width:25%; padding:5px;">
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#b91c1c; font-weight:700; text-transform:uppercase;">Due Members</div>
              <div style="font-size:20px; font-weight:800; color:#dc2626; margin-top:2px;">${report.dueMembersCount}</div>
            </div>
          </td>
          <td class="kpi-td" style="width:25%; padding:5px;">
            <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#92400e; font-weight:700; text-transform:uppercase;">Past Dues</div>
              <div style="font-size:18px; font-weight:800; color:#b45309; margin-top:2px;">${currency}${report.totalPastDueAmount.toLocaleString('en-IN')}</div>
            </div>
          </td>
          <td class="kpi-td" style="width:25%; padding:5px;">
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#1e40af; font-weight:700; text-transform:uppercase;">Total Outstanding</div>
              <div style="font-size:20px; font-weight:800; color:#1d4ed8; margin-top:2px;">${currency}${report.totalDueAmount.toLocaleString('en-IN')}</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- SECTION 1: Month-by-Month Summary -->
      <h3 style="margin:0 0 8px 0; font-size:15px; font-weight:700; color:#0f172a; border-bottom:2px solid #2563eb; padding-bottom:6px;">
        1. Month-Wise Unpaid Breakdown (How Many Yet to Pay in Each Month)
      </h3>
      <div class="mobile-scroll-box" style="width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:24px; border:1px solid #e2e8f0; border-radius:8px;">
        <table class="mobile-scroll-table" style="width:100%; min-width:540px; border-collapse:collapse; font-size:13px; margin:0;">
          <thead>
            <tr style="background:#f1f5f9; color:#475569; font-size:12px;">
              <th style="padding:10px 14px; text-align:left; border-bottom:2px solid #cbd5e1;">Month &amp; Year</th>
              <th style="padding:10px 14px; text-align:center; border-bottom:2px solid #cbd5e1;">Period</th>
              <th style="padding:10px 14px; text-align:center; border-bottom:2px solid #cbd5e1;">Members Yet to Pay</th>
              <th style="padding:10px 14px; text-align:center; border-bottom:2px solid #cbd5e1;">Collection Progress</th>
              <th style="padding:10px 14px; text-align:right; border-bottom:2px solid #cbd5e1;">Unpaid Amount</th>
            </tr>
          </thead>
          <tbody>
            ${monthRows}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:800;">
              <td colspan="4" style="padding:10px 14px; text-align:right; border-top:2px solid #cbd5e1;">Total All Months Dues:</td>
              <td style="padding:10px 14px; text-align:right; border-top:2px solid #cbd5e1; color:#dc2626; font-size:15px;">
                ${currency}${report.totalDueAmount.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- SECTION 2: Detailed Member List -->
      <div style="border-bottom:2px solid #2563eb; padding-bottom:6px; margin-bottom:8px;">
        <h3 style="margin:0; font-size:15px; font-weight:700; color:#0f172a;">
          2. Detailed Due Members List (Name, Mobile Number, Due Months &amp; Due Amount)
        </h3>
      </div>
      <div style="font-size:11px; color:#1d4ed8; background:#eff6ff; border:1px solid #dbeafe; padding:6px 10px; border-radius:6px; margin-bottom:8px; display:inline-block; font-weight:600;">
        👉 Swipe table horizontally (&rarr;) to see past dues, current dues &amp; amounts on mobile
      </div>

      ${report.dueMembersList.length === 0 ? `
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:16px; text-align:center; color:#065f46; font-weight:600;">
          🎉 Congratulations! All members have paid their monthly fees up to ${escapeSettingHtml(report.currentMonthName)} ${report.currentYear}.
        </div>
      ` : `
        <div class="mobile-scroll-box" style="width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:16px;">
          <table class="mobile-scroll-table" style="width:100%; min-width:600px; border-collapse:collapse; font-size:13px; margin:0;">
            <thead>
              <tr style="background:#f1f5f9; color:#475569; font-size:12px;">
                <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #cbd5e1; width:35px;">#</th>
                <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #cbd5e1;">Member Name &amp; ID</th>
                <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #cbd5e1;">Mobile Number</th>
                <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #cbd5e1;">Past Month(s) Due</th>
                <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #cbd5e1;">Current Month</th>
                <th style="padding:10px 12px; text-align:right; border-bottom:2px solid #cbd5e1;">Total Due</th>
              </tr>
            </thead>
            <tbody>
              ${memberRows}
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc; font-weight:800;">
                <td colspan="5" style="padding:12px; text-align:right; border-top:2px solid #cbd5e1;">Grand Total Outstanding:</td>
                <td style="padding:12px; text-align:right; border-top:2px solid #cbd5e1; color:#dc2626; font-size:16px;">
                  ${currency}${report.totalDueAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}

      <!-- Footer Note -->
      <div style="margin-top:28px; padding-top:18px; border-top:1px solid #e2e8f0; font-size:11.5px; color:#64748b; line-height:1.6; text-align:center;">
        <div style="background:#f8fafc; border-radius:6px; padding:10px 16px; margin-bottom:12px; display:inline-block; border:1px solid #e2e8f0; color:#334155; font-size:12px; font-weight:600;">
          ⚠️ This is an automated system-generated email. Please do not reply directly to this email.
        </div>
        <p style="margin:0 0 4px 0; color:#64748b;">
          <strong>Sent from:</strong> pulariporurclub@gmail.com 
        </p>
        <p style="margin:0; font-size:11px; color:#94a3b8;">
          © 2026 Pulari Arts &amp; Sports Club &bull; Official Membership Management Portal
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Plain Text Email Version
 */
function generateDueReportEmailText(report) {
  const settings = AppState.settings || {};
  const clubName = settings.club_name || "Pulari Arts & Sports Club";
  const currency = report.currency || "₹";

  let out = `=======================================================\n`;
  out += `${clubName}\n`;
  out += `MONTHLY DUE MEMBERS & PENDING FEES REPORT\n`;
  out += `Statement Period: Up to ${report.currentMonthName} ${report.currentYear}\n`;
  out += `Sent from: pulariporurclub@gmail.com\n`;
  out += `=======================================================\n\n`;

  out += `OVERVIEW SUMMARY:\n`;
  out += `-------------------------------------------------------\n`;
  out += `Total Active Members: ${report.activeMembersCount}\n`;
  out += `Members Yet to Pay:   ${report.dueMembersCount}\n`;
  out += `Past Months Due:      ${currency}${report.totalPastDueAmount}\n`;
  out += `Current Month Due:    ${currency}${report.totalCurrentDueAmount}\n`;
  out += `Total Outstanding:    ${currency}${report.totalDueAmount}\n\n`;

  out += `1. MONTH-WISE UNPAID BREAKDOWN:\n`;
  out += `-------------------------------------------------------\n`;
  report.monthSummaries.forEach(m => {
    out += `* ${m.month} ${m.year} (${m.isCurrent ? 'Current' : 'Past'}): ${m.unpaidCount} members yet to pay | Total Due: ${currency}${m.totalDue}\n`;
  });
  out += `\n`;

  out += `2. DETAILS OF DUE MEMBERS (CURRENT & PAST MONTHS):\n`;
  out += `-------------------------------------------------------\n`;
  if (report.dueMembersList.length === 0) {
    out += `All members have paid their monthly fees up to ${report.currentMonthName} ${report.currentYear}.\n`;
  } else {
    report.dueMembersList.forEach((m, idx) => {
      const pastStr = m.pastUnpaidMonths.length > 0
        ? m.pastUnpaidMonths.map(p => `${p.name} ${p.year}`).join(', ')
        : 'Nil';
      const curStr = m.currentUnpaidMonths.length > 0 ? `${report.currentMonthName} ${report.currentYear}` : 'Paid';

      out += `${idx + 1}. ${m.fullName} (${m.memberId})\n`;
      out += `   Mobile:        ${m.phone || 'No phone'}\n`;
      out += `   Past Dues:     ${pastStr}\n`;
      out += `   Current Due:   ${curStr}\n`;
      out += `   Total Due:     ${currency}${m.totalDueAmount}\n\n`;
    });
  }

  out += `=======================================================\n`;
  out += `⚠️ NOTE: This is an automated system-generated email.\n`;
  out += `Please do not reply directly to this email.\n`;
  out += `=======================================================\n`;
  return out;
}

/**
 * Event Listeners for Due Email Report Section
 */
function initDueEmailReportListeners() {
  const sendEmailBtn = document.getElementById('btn-send-due-email');
  const previewEmailBtn = document.getElementById('btn-preview-due-email');
  const openGmailBtn = document.getElementById('btn-open-gmail-web');
  const togglePreviewBtn = document.getElementById('btn-toggle-due-preview');
  const recipientInput = document.getElementById('settings-recipient-email');

  // Modal buttons
  const modalSendBtn = document.getElementById('btn-modal-send-email');
  const modalCopyBtn = document.getElementById('btn-copy-email-text');
  const modalGmailBtn = document.getElementById('btn-preview-open-gmail');

  // Toggle Live Due Preview Table
  if (togglePreviewBtn) {
    togglePreviewBtn.addEventListener('click', () => {
      const container = document.getElementById('settings-due-preview-container');
      const label = document.getElementById('due-preview-toggle-text');
      if (!container) return;

      const isHidden = container.style.display === 'none' || !container.style.display;
      container.style.display = isHidden ? 'block' : 'none';
      if (label) {
        label.textContent = isHidden ? 'Hide Member List' : 'Show Member List';
      }
    });
  }

  // Save recipient email when modified
  if (recipientInput) {
    recipientInput.addEventListener('change', (e) => {
      const val = (e.target.value || '').trim();
      if (val) {
        localStorage.setItem('pulari_due_recipient_email', val);
      }
    });
  }

  // Send Email Action
  async function triggerSendDueEmail(btnElement) {
    const savedEmail = localStorage.getItem('pulari_due_recipient_email');
    const toEmail = (recipientInput?.value || (savedEmail && savedEmail !== 'nunuappu48@gmail.com' ? savedEmail : '')).trim();
    if (!toEmail || !toEmail.includes('@')) {
      showToast('Please enter a recipient email address.', 'warning');
      if (recipientInput) recipientInput.focus();
      return;
    }

    localStorage.setItem('pulari_due_recipient_email', toEmail);

    const report = calculateDueMembersReport();
    report.toEmail = toEmail;
    const subject = `Pulari Arts & Sports Club - Pending Monthly Dues Report (${report.currentMonthName} ${report.currentYear})`;
    const htmlBody = generateDueReportEmailHTML(report);
    const textBody = generateDueReportEmailText(report);

    const origText = btnElement ? btnElement.innerHTML : 'Send Email';
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.innerHTML = `
        <span style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.7s linear infinite; margin-right:6px; vertical-align:middle;"></span>
        Sending email to ${escapeSettingHtml(toEmail)}...
      `;
    }

    showToast(`Sending due report email from pulariporurclub@gmail.com to ${toEmail}...`, 'info');

    try {
      const res = await sendDueReportEmailViaAppsScript({
        to: toEmail,
        subject: subject,
        htmlBody: htmlBody,
        textBody: textBody
      });

      if (res && res.success !== false) {
        showToast(`✅ Due report email successfully sent from pulariporurclub@gmail.com to ${toEmail}!`, 'success');
        if (typeof closeModal === 'function') {
          closeModal('due-email-preview-modal');
        }
      } else {
        showToast(res.message || 'Error sending email via Google Apps Script.', 'error');
      }
    } catch (err) {
      console.error('Email dispatch error:', err);
      showToast(`Notice: Email dispatch sent to Apps Script. If blocked by network/ad-blocker, you can also use "Open in Gmail".`, 'info');
    } finally {
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = origText;
      }
    }
  }

  if (sendEmailBtn) {
    sendEmailBtn.addEventListener('click', () => triggerSendDueEmail(sendEmailBtn));
  }

  if (modalSendBtn) {
    modalSendBtn.addEventListener('click', () => triggerSendDueEmail(modalSendBtn));
  }

  // Open Preview Modal
  function openEmailPreview() {
    const savedEmail = localStorage.getItem('pulari_due_recipient_email');
    const toEmail = (recipientInput?.value || (savedEmail && savedEmail !== 'nunuappu48@gmail.com' ? savedEmail : '')).trim();
    const report = calculateDueMembersReport();
    report.toEmail = toEmail;
    const subject = `Pulari Arts & Sports Club - Pending Monthly Dues Report (${report.currentMonthName} ${report.currentYear})`;

    const toEl = document.getElementById('preview-modal-to');
    const subjEl = document.getElementById('preview-modal-subject');
    const renderedEl = document.getElementById('due-email-rendered-preview');
    const subDescEl = document.getElementById('due-email-modal-subtitle');

    if (toEl) toEl.textContent = toEmail || 'Not specified (please enter in settings)';
    if (subjEl) subjEl.textContent = subject;
    if (subDescEl) subDescEl.textContent = toEmail ? `From: pulariporurclub@gmail.com • To: ${toEmail}` : 'From: pulariporurclub@gmail.com';
    if (renderedEl) {
      renderedEl.innerHTML = generateDueReportEmailHTML(report);
    }

    if (typeof openModal === 'function') {
      openModal('due-email-preview-modal');
    }
  }

  if (previewEmailBtn) {
    previewEmailBtn.addEventListener('click', openEmailPreview);
  }

  // Open in Gmail Web
  function openInGmailWeb() {
    const savedEmail = localStorage.getItem('pulari_due_recipient_email');
    const toEmail = (recipientInput?.value || (savedEmail && savedEmail !== 'nunuappu48@gmail.com' ? savedEmail : '')).trim();
    if (!toEmail) {
      showToast('Please enter a recipient email address first.', 'warning');
      if (recipientInput) recipientInput.focus();
      return;
    }

    const report = calculateDueMembersReport();
    report.toEmail = toEmail;
    const subject = `Pulari Arts & Sports Club - Pending Monthly Dues Report (${report.currentMonthName} ${report.currentYear})`;
    const textBody = generateDueReportEmailText(report);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(textBody)}`;
    window.open(gmailUrl, '_blank');
    showToast(`Opening Gmail Web compose for ${toEmail}...`, 'info');
  }

  if (openGmailBtn) {
    openGmailBtn.addEventListener('click', openInGmailWeb);
  }

  if (modalGmailBtn) {
    modalGmailBtn.addEventListener('click', openInGmailWeb);
  }

  // Copy Plain Text to Clipboard
  if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', async () => {
      const report = calculateDueMembersReport();
      const textBody = generateDueReportEmailText(report);
      try {
        await navigator.clipboard.writeText(textBody);
        showToast('Due members report text copied to clipboard! 📋', 'success');
      } catch (e) {
        // Fallback for browsers with restricted clipboard
        const ta = document.createElement('textarea');
        ta.value = textBody;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Due members report text copied to clipboard! 📋', 'success');
      }
    });
  }
}

// Global hook so other tabs (like Reports) can trigger the preview/email directly
window.openDueReportEmailModal = function () {
  const settingsTab = document.querySelector('.nav-item[data-tab="settings"]');
  if (settingsTab) {
    settingsTab.click();
  }
  setTimeout(() => {
    const section = document.getElementById('settings-sender-email');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
};
