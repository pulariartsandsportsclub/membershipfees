/**
 * Pulari Arts & Sports Club - Membership Management System
 * Supabase Data Layer & Storage Engine (js/api.js)
 */

const SUPABASE_CONFIG = {
  // Hardcoded project credentials
  defaultUrl: "https://cthrbesxxuryolzjjelo.supabase.co",
  defaultKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0aHJiZXN4eHVyeW9sempqZWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTUzMzA1OCwiZXhwIjoyMTA1MTA5MDU4fQ.aYktvglg-XaKuNIJ-j5XZZp7Q6fEg7iwveZE2WzltIk",

  get url() {
    return localStorage.getItem('pulari_supabase_url') || this.defaultUrl;
  },
  set url(val) {
    localStorage.setItem('pulari_supabase_url', (val || '').trim().replace(/\/+$/, ''));
  },
  get anonKey() {
    return localStorage.getItem('pulari_supabase_key') || this.defaultKey;
  },
  set anonKey(val) {
    localStorage.setItem('pulari_supabase_key', (val || '').trim());
  },

  // Fallback demo storage keys
  STORAGE_MEMBERS: 'pulari_members_db',
  STORAGE_PAYMENTS: 'pulari_payments_db',
  STORAGE_SETTINGS: 'pulari_settings_db'
};

const GOOGLE_SHEET_CONFIG = {
  // Google Apps Script Web App URL for background backup writes
  defaultUrl: "https://script.google.com/macros/s/AKfycbz0EiE4JfTt1rB3rPIjfNM_1DmWLiUFEOa-6UEZPCU3A8odX-DmlDz5swfbXsFUDtycnw/exec",
  get url() {
    return localStorage.getItem('pulari_api_url') || this.defaultUrl;
  },
  set url(val) {
    localStorage.setItem('pulari_api_url', (val || '').trim());
  }
};

/**
 * Dual-Write Backup Helper: Sends asynchronous background write to Google Sheet
 * Does not block or fail the primary Supabase transaction.
 */
function syncBackupToGoogleSheet(action, payload) {
  const sheetUrl = GOOGLE_SHEET_CONFIG.url;
  if (!sheetUrl || !sheetUrl.trim()) return;

  try {
    fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
      mode: 'no-cors'
    }).then(() => {
      console.log(`[Backup Sync] Dispatched '${action}' to Google Sheet backup.`);
    }).catch(err => {
      console.warn(`[Backup Sync] Google Sheet backup note for '${action}':`, err);
    });
  } catch (err) {
    console.warn('[Backup Sync] Exception dispatching to Google Sheet backup:', err);
  }
}

// Initial Seed Data for Fallback Demo Mode
const DEFAULT_SEED_DATA = {
  settings: {
    monthly_fee: 30,
    club_name: "Pulari Arts & Sports Club",
    currency: "₹",
    admin_password: "admin@1235789"
  },
  members: [],
  payments: []
};

// Ensure fallback local storage exists
(function initLocalStorage() {
  if (!localStorage.getItem(SUPABASE_CONFIG.STORAGE_SETTINGS)) {
    localStorage.setItem(SUPABASE_CONFIG.STORAGE_SETTINGS, JSON.stringify(DEFAULT_SEED_DATA.settings));
  }
  if (!localStorage.getItem(SUPABASE_CONFIG.STORAGE_MEMBERS)) {
    localStorage.setItem(SUPABASE_CONFIG.STORAGE_MEMBERS, JSON.stringify(DEFAULT_SEED_DATA.members));
  }
  if (!localStorage.getItem(SUPABASE_CONFIG.STORAGE_PAYMENTS)) {
    localStorage.setItem(SUPABASE_CONFIG.STORAGE_PAYMENTS, JSON.stringify(DEFAULT_SEED_DATA.payments));
  }
})();

// Helper to check if Supabase credentials are configured
function isSupabaseConfigured() {
  return !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}

/**
 * Standardized Supabase REST Request Wrapper
 */
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_CONFIG.anonKey,
    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = `Supabase Error (${response.status}): ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) errMsg = errJson.message;
    } catch (_) {}
    throw new Error(errMsg);
  }

  // Some operations (like 204 No Content) don't have a JSON body
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Data Mappers: Convert between PostgreSQL snake_case and Frontend camelCase
 */
function mapMemberFromDb(m) {
  return {
    memberId: m.member_id,
    fullName: m.full_name,
    phone: m.phone || '',
    address: m.address || '',
    joinDate: m.join_date ? String(m.join_date).split('T')[0] : '',
    monthlyFee: Number(m.monthly_fee || 0),
    status: m.status || 'Active',
    notes: m.notes || '',
    createdAt: m.created_at ? String(m.created_at).split('T')[0] : '',
    updatedAt: m.updated_at ? String(m.updated_at).split('T')[0] : ''
  };
}

function mapMemberToDb(payload) {
  return {
    member_id: payload.memberId,
    full_name: payload.fullName,
    phone: payload.phone || null,
    address: payload.address || null,
    join_date: payload.joinDate || new Date().toISOString().split('T')[0],
    monthly_fee: Number(payload.monthlyFee || 30),
    status: payload.status || 'Active',
    notes: payload.notes || null
  };
}

function mapPaymentFromDb(p) {
  return {
    paymentId: p.payment_id || '',
    memberId: p.member_id,
    memberName: p.member_name || '',
    month: p.month,
    year: Number(p.year),
    amount: Number(p.amount || 0),
    paymentDate: p.payment_date ? String(p.payment_date).split('T')[0] : '',
    paymentMethod: p.payment_method || 'Cash',
    status: p.status || 'Paid',
    notes: p.notes || '',
    createdAt: p.created_at ? String(p.created_at).split('T')[0] : ''
  };
}

function mapPaymentToDb(payload) {
  return {
    payment_id: payload.paymentId || null,
    member_id: payload.memberId,
    member_name: payload.memberName || null,
    month: payload.month,
    year: Number(payload.year),
    amount: Number(payload.amount || 30),
    payment_date: payload.paymentDate || new Date().toISOString().split('T')[0],
    payment_method: payload.paymentMethod || 'Cash',
    status: payload.status || 'Paid',
    notes: payload.notes || null
  };
}

/**
 * Main API Router for All CRUD Operations
 */
async function apiCall(action, payload = {}) {
  if (isSupabaseConfigured()) {
    try {
      return await handleSupabaseApiCall(action, payload);
    } catch (err) {
      console.warn(`Supabase API call failed for '${action}', falling back:`, err);
      return { success: false, message: err.message || 'Database operation failed.' };
    }
  }

  // Fallback to local storage if Supabase credentials are not set
  return handleLocalApiCall(action, payload);
}

/**
 * Handle Supabase Database Execution
 */
async function handleSupabaseApiCall(action, payload) {
  switch (action) {
    case 'GET_ALL_DATA': {
      const [settingsRows, membersRows, paymentsRows] = await Promise.all([
        supabaseRequest('settings?select=*'),
        supabaseRequest('members?select=*&order=member_id.asc'),
        supabaseRequest('payments?select=*&order=payment_date.desc')
      ]);

      const settingsObj = {};
      (settingsRows || []).forEach(r => {
        if (r.key) settingsObj[r.key] = r.value;
      });

      return {
        success: true,
        data: {
          settings: settingsObj,
          members: (membersRows || []).map(mapMemberFromDb),
          payments: (paymentsRows || []).map(mapPaymentFromDb)
        }
      };
    }

    case 'GET_MEMBERS': {
      const members = await supabaseRequest('members?select=*&order=member_id.asc');
      return {
        success: true,
        data: (members || []).map(mapMemberFromDb)
      };
    }

    case 'ADD_MEMBER': {
      const dbRow = mapMemberToDb(payload);
      const res = await supabaseRequest('members', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(dbRow)
      });
      const created = res && res[0] ? mapMemberFromDb(res[0]) : payload;
      // Asynchronously sync backup to Google Sheet
      syncBackupToGoogleSheet('ADD_MEMBER', payload);
      return { success: true, message: 'Member added successfully!', data: created };
    }

    case 'UPDATE_MEMBER': {
      const memberId = payload.memberId;
      const dbRow = mapMemberToDb(payload);
      delete dbRow.member_id; // Keep primary identifier intact

      const res = await supabaseRequest(`members?member_id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(dbRow)
      });
      const updated = res && res[0] ? mapMemberFromDb(res[0]) : payload;
      // Asynchronously sync backup to Google Sheet
      syncBackupToGoogleSheet('UPDATE_MEMBER', payload);
      return { success: true, message: 'Member updated successfully!', data: updated };
    }

    case 'DEACTIVATE_MEMBER': {
      const memberId = payload.memberId;
      await supabaseRequest(`members?member_id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Inactive' })
      });
      // Asynchronously sync backup to Google Sheet
      syncBackupToGoogleSheet('DEACTIVATE_MEMBER', payload);
      return { success: true, message: 'Member deactivated successfully!' };
    }

    case 'GET_PAYMENTS': {
      const payments = await supabaseRequest('payments?select=*&order=payment_date.desc');
      return {
        success: true,
        data: (payments || []).map(mapPaymentFromDb)
      };
    }

    case 'MARK_PAYMENT': {
      const { memberId, month, year, status } = payload;

      if (status === 'Unpaid') {
        // Delete payment record from Supabase
        await supabaseRequest(
          `payments?member_id=eq.${encodeURIComponent(memberId)}&month=eq.${encodeURIComponent(month)}&year=eq.${Number(year)}`,
          { method: 'DELETE' }
        );
        // Asynchronously sync backup to Google Sheet
        syncBackupToGoogleSheet('MARK_PAYMENT', payload);
        return { success: true, message: 'Payment marked as unpaid.' };
      }

      // Upsert payment record into Supabase
      const paymentData = mapPaymentToDb(payload);
      if (!paymentData.payment_id) {
        paymentData.payment_id = `PAY-${Date.now().toString().slice(-6)}`;
      }

      const res = await supabaseRequest('payments?on_conflict=member_id,month,year', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(paymentData)
      });

      const saved = res && res[0] ? mapPaymentFromDb(res[0]) : payload;
      // Asynchronously sync backup to Google Sheet
      syncBackupToGoogleSheet('MARK_PAYMENT', payload);
      return { success: true, message: 'Payment recorded successfully!', data: saved };
    }

    case 'GET_SETTINGS': {
      const rows = await supabaseRequest('settings?select=*');
      const settingsObj = {};
      (rows || []).forEach(r => {
        if (r.key) settingsObj[r.key] = r.value;
      });
      return { success: true, data: settingsObj };
    }

    case 'UPDATE_SETTINGS': {
      const rows = Object.entries(payload).map(([key, value]) => ({
        key,
        value: String(value)
      }));

      await supabaseRequest('settings?on_conflict=key', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(rows)
      });

      // Asynchronously sync backup to Google Sheet
      syncBackupToGoogleSheet('UPDATE_SETTINGS', payload);
      return { success: true, message: 'Settings saved successfully!', data: payload };
    }

    case 'LOGIN': {
      const username = String(payload.username || '').trim();
      const password = String(payload.password || '');
      
      const rows = await supabaseRequest('settings?select=*');
      const settingsObj = {};
      (rows || []).forEach(r => {
        if (r.key) settingsObj[r.key] = r.value;
      });

      const expectedPassword = settingsObj.admin_password || "admin@1235789";
      if (username === 'admin' && password === expectedPassword) {
        return { success: true, message: 'Login successful' };
      }
      return { success: false, message: 'Invalid username or password' };
    }

    default:
      return { success: false, message: 'Unknown API action' };
  }
}

// Stale-While-Revalidate Cache Key
const CACHE_KEY_ALL_DATA = 'pulari_cache_all_data';

/**
 * Fetch Initial Application Data with Stale-While-Revalidate Caching
 */
async function fetchInitialData(onFreshDataCallback) {
  let cachedData = null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_ALL_DATA);
    if (raw) {
      cachedData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Error reading cached data:", e);
  }

  const fetchPromise = (async () => {
    try {
      const res = await apiCall('GET_ALL_DATA');
      if (res && res.success && res.data) {
        localStorage.setItem(CACHE_KEY_ALL_DATA, JSON.stringify(res.data));
        if (onFreshDataCallback) {
          onFreshDataCallback(res.data, false);
        }
        return res.data;
      }
      throw new Error(res.message || 'Failed to fetch fresh data');
    } catch (err) {
      console.error("Failed fetching fresh data from backend:", err);
      if (cachedData && onFreshDataCallback) {
        return cachedData;
      }
      throw err;
    }
  })();

  return { cachedData, freshPromise: fetchPromise };
}

/**
 * Local Store API Logic (Fallback when Supabase credentials are not yet entered)
 */
function handleLocalApiCall(action, payload) {
  const members = JSON.parse(localStorage.getItem(SUPABASE_CONFIG.STORAGE_MEMBERS) || '[]');
  const payments = JSON.parse(localStorage.getItem(SUPABASE_CONFIG.STORAGE_PAYMENTS) || '[]');
  const settings = JSON.parse(localStorage.getItem(SUPABASE_CONFIG.STORAGE_SETTINGS) || '{}');

  switch (action) {
    case 'GET_ALL_DATA':
      return {
        success: true,
        data: { settings, members, payments }
      };

    case 'GET_MEMBERS':
      return { success: true, data: members };

    case 'ADD_MEMBER': {
      if (members.some(m => m.memberId === payload.memberId)) {
        return { success: false, message: `Member ID ${payload.memberId} already exists.` };
      }
      const newMember = {
        ...payload,
        createdAt: new Date().toISOString().split('T')[0]
      };
      members.push(newMember);
      localStorage.setItem(SUPABASE_CONFIG.STORAGE_MEMBERS, JSON.stringify(members));
      return { success: true, message: 'Member added successfully!', data: newMember };
    }

    case 'UPDATE_MEMBER': {
      const index = members.findIndex(m => m.memberId === payload.memberId);
      if (index === -1) return { success: false, message: 'Member not found.' };
      members[index] = { ...members[index], ...payload, updatedAt: new Date().toISOString().split('T')[0] };
      localStorage.setItem(SUPABASE_CONFIG.STORAGE_MEMBERS, JSON.stringify(members));
      return { success: true, message: 'Member updated successfully!', data: members[index] };
    }

    case 'DEACTIVATE_MEMBER': {
      const member = members.find(m => m.memberId === payload.memberId);
      if (!member) return { success: false, message: 'Member not found.' };
      member.status = 'Inactive';
      localStorage.setItem(SUPABASE_CONFIG.STORAGE_MEMBERS, JSON.stringify(members));
      return { success: true, message: 'Member deactivated successfully!' };
    }

    case 'GET_PAYMENTS':
      return { success: true, data: payments };

    case 'MARK_PAYMENT': {
      const { memberId, month, year, amount, status, notes } = payload;
      const existingIndex = payments.findIndex(p => p.memberId === memberId && p.month === month && Number(p.year) === Number(year));
      
      if (status === 'Unpaid') {
        if (existingIndex !== -1) {
          payments.splice(existingIndex, 1);
          localStorage.setItem(SUPABASE_CONFIG.STORAGE_PAYMENTS, JSON.stringify(payments));
        }
        return { success: true, message: 'Payment marked as unpaid.' };
      }

      if (existingIndex !== -1 && payload.forceUpdate !== true) {
        return { 
          success: false, 
          message: `Payment already recorded for this member for ${month} ${year}.` 
        };
      }

      const member = members.find(m => m.memberId === memberId);
      const newPayment = {
        paymentId: 'PAY' + String(payments.length + 1).padStart(3, '0'),
        memberId,
        memberName: member ? member.fullName : payload.memberName,
        month,
        year: Number(year),
        amount: Number(amount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: payload.paymentMethod || 'Cash',
        status: 'Paid',
        notes: notes || 'Monthly membership fee',
        createdAt: new Date().toISOString().split('T')[0]
      };

      if (existingIndex !== -1) {
        payments[existingIndex] = newPayment;
      } else {
        payments.push(newPayment);
      }

      localStorage.setItem(SUPABASE_CONFIG.STORAGE_PAYMENTS, JSON.stringify(payments));
      return { success: true, message: 'Payment recorded successfully!', data: newPayment };
    }

    case 'GET_SETTINGS':
      return { success: true, data: settings };

    case 'UPDATE_SETTINGS': {
      const updatedSettings = { ...settings, ...payload };
      localStorage.setItem(SUPABASE_CONFIG.STORAGE_SETTINGS, JSON.stringify(updatedSettings));
      return { success: true, message: 'Settings saved successfully!', data: updatedSettings };
    }

    case 'LOGIN': {
      const username = String(payload.username || '').trim();
      const password = String(payload.password || '');
      const expectedPassword = settings.admin_password || DEFAULT_SEED_DATA.settings.admin_password;
      if (username === 'admin' && password === expectedPassword) {
        return { success: true, message: 'Login successful' };
      }
      return { success: false, message: 'Invalid username or password' };
    }

    default:
      return { success: false, message: 'Unknown API action' };
  }
}
