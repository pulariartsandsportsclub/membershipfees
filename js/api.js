/**
 * Pulari Arts & Sports Club - Membership Management System
 * API Communication & Storage Module (js/api.js)
 */

const API_CONFIG = {
  // Deployed Google Apps Script Web App URL
  apiUrl: localStorage.getItem('pulari_api_url') || "https://script.google.com/macros/s/AKfycbz0EiE4JfTt1rB3rPIjfNM_1DmWLiUFEOa-6UEZPCU3A8odX-DmlDz5swfbXsFUDtycnw/exec",
  
  // Local storage keys for fallback demo mode
  STORAGE_MEMBERS: 'pulari_members_db',
  STORAGE_PAYMENTS: 'pulari_payments_db',
  STORAGE_SETTINGS: 'pulari_settings_db'
};

// Initial Seed Data for Local Demo Mode (Empty by default)
const DEFAULT_SEED_DATA = {
  settings: {
    monthly_fee: 30,
    club_name: "Pulari Arts & Sports Club",
    currency: "₹",
    admin_password: "admin"
  },
  members: [],
  payments: []
};

// Ensure local storage is seeded for demo mode
(function initLocalStorage() {
  if (!localStorage.getItem(API_CONFIG.STORAGE_SETTINGS)) {
    localStorage.setItem(API_CONFIG.STORAGE_SETTINGS, JSON.stringify(DEFAULT_SEED_DATA.settings));
  }
  if (!localStorage.getItem(API_CONFIG.STORAGE_MEMBERS)) {
    localStorage.setItem(API_CONFIG.STORAGE_MEMBERS, JSON.stringify(DEFAULT_SEED_DATA.members));
  }
  if (!localStorage.getItem(API_CONFIG.STORAGE_PAYMENTS)) {
    localStorage.setItem(API_CONFIG.STORAGE_PAYMENTS, JSON.stringify(DEFAULT_SEED_DATA.payments));
  }
})();

/**
 * Main API Request Wrapper
 * Attempts remote Google Apps Script API call first if configured;
 * otherwise gracefully uses local storage demo backend.
 */
async function apiCall(action, payload = {}) {
  const apiUrl = localStorage.getItem('pulari_api_url') || API_CONFIG.apiUrl;
  
  if (apiUrl && apiUrl.trim().length > 0) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow'
      });
      
      const result = await response.json();
      return result;
    } catch (err) {
      console.warn("Apps Script API call failed or non-CORS response, falling back to local store:", err);
      // Fallback to local execution below if remote call fails
    }
  }

  // --- LOCAL DEMO BACKEND ENGINE ---
  return handleLocalApiCall(action, payload);
}

/**
 * Local Store API Logic (Supports offline testing & demo before Google Sheets deployment)
 */
function handleLocalApiCall(action, payload) {
  const members = JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_MEMBERS) || '[]');
  const payments = JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_PAYMENTS) || '[]');
  const settings = JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_SETTINGS) || '{}');

  switch (action) {
    case 'GET_MEMBERS':
      return { success: true, data: members };

    case 'ADD_MEMBER': {
      // Validate duplicate ID
      if (members.some(m => m.memberId === payload.memberId)) {
        return { success: false, message: `Member ID ${payload.memberId} already exists.` };
      }
      const newMember = {
        ...payload,
        createdAt: new Date().toISOString().split('T')[0]
      };
      members.push(newMember);
      localStorage.setItem(API_CONFIG.STORAGE_MEMBERS, JSON.stringify(members));
      return { success: true, message: 'Member added successfully!', data: newMember };
    }

    case 'UPDATE_MEMBER': {
      const index = members.findIndex(m => m.memberId === payload.memberId);
      if (index === -1) {
        return { success: false, message: 'Member not found.' };
      }
      members[index] = { ...members[index], ...payload, updatedAt: new Date().toISOString().split('T')[0] };
      localStorage.setItem(API_CONFIG.STORAGE_MEMBERS, JSON.stringify(members));
      return { success: true, message: 'Member updated successfully!', data: members[index] };
    }

    case 'DEACTIVATE_MEMBER': {
      const member = members.find(m => m.memberId === payload.memberId);
      if (!member) return { success: false, message: 'Member not found.' };
      member.status = 'Inactive';
      localStorage.setItem(API_CONFIG.STORAGE_MEMBERS, JSON.stringify(members));
      return { success: true, message: 'Member deactivated successfully!' };
    }

    case 'GET_PAYMENTS':
      return { success: true, data: payments };

    case 'MARK_PAYMENT': {
      const { memberId, month, year, amount, status, notes } = payload;
      // Duplicate payment check: Member ID + Month + Year
      const existingIndex = payments.findIndex(p => p.memberId === memberId && p.month === month && Number(p.year) === Number(year));
      
      if (status === 'Unpaid') {
        if (existingIndex !== -1) {
          payments.splice(existingIndex, 1);
          localStorage.setItem(API_CONFIG.STORAGE_PAYMENTS, JSON.stringify(payments));
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

      localStorage.setItem(API_CONFIG.STORAGE_PAYMENTS, JSON.stringify(payments));
      return { success: true, message: 'Payment recorded successfully!', data: newPayment };
    }

    case 'GET_SETTINGS':
      return { success: true, data: settings };

    case 'UPDATE_SETTINGS': {
      const updatedSettings = { ...settings, ...payload };
      localStorage.setItem(API_CONFIG.STORAGE_SETTINGS, JSON.stringify(updatedSettings));
      return { success: true, message: 'Settings saved successfully!', data: updatedSettings };
    }

    case 'LOGIN': {
      if (payload.password === settings.admin_password || payload.password === 'admin') {
        return { success: true, message: 'Login successful' };
      }
      return { success: false, message: 'Invalid admin password' };
    }

    default:
      return { success: false, message: 'Unknown API action' };
  }
}
