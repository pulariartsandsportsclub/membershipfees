/**
 * Pulari Arts & Sports Club - Membership Management System
 * Google Apps Script API Backend (Code.gs)
 * 
 * Deployment Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Replace all existing script code with this file and save (Ctrl+S).
 * 4. Click Deploy -> New deployment.
 * 5. Select Type: "Web App"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Click Deploy and copy the Web App URL into your Frontend Settings tab.
 */

const SHEET_NAMES = Object.freeze({
  MEMBERS: "Members",
  PAYMENTS: "Payments",
  SETTINGS: "Settings"
});

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "GET_MEMBERS";
    const result = handleAction(action, e ? e.parameter : {});
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * Handle HTTP POST Requests (From fetch API)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    const action = payload.action || "GET_MEMBERS";
    const result = handleAction(action, payload);
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * Action Router
 */
function handleAction(action, payload) {
  initSpreadsheetTables();

  switch (action) {
    case "GET_MEMBERS":
      return getMembersData();
    case "ADD_MEMBER":
      return addMember(payload);
    case "UPDATE_MEMBER":
      return updateMember(payload);
    case "DEACTIVATE_MEMBER":
      return deactivateMember(payload);
    case "GET_PAYMENTS":
      return getPaymentsData();
    case "MARK_PAYMENT":
      return recordPayment(payload);
    case "GET_SETTINGS":
      return getSettingsData();
    case "UPDATE_SETTINGS":
      return updateSettings(payload);
    case "LOGIN":
      return authenticateAdmin(payload);
    default:
      return { success: false, message: "Invalid API action specified." };
  }
}

/**
 * Standardized JSON Response Formatter
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Initialize Spreadsheet Tables and Column Headers (No dummy rows)
 */
function initSpreadsheetTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Members Sheet
  let membersSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
  if (!membersSheet) {
    membersSheet = ss.insertSheet(SHEET_NAMES.MEMBERS);
    membersSheet.appendRow([
      "Member ID", "Full Name", "Phone", "Address", "Join Date",
      "Monthly Fee", "Status", "Notes", "Created At", "Updated At"
    ]);
  }

  // 2. Payments Sheet
  let paymentsSheet = ss.getSheetByName(SHEET_NAMES.PAYMENTS);
  if (!paymentsSheet) {
    paymentsSheet = ss.insertSheet(SHEET_NAMES.PAYMENTS);
    paymentsSheet.appendRow([
      "Payment ID", "Member ID", "Member Name", "Month", "Year",
      "Amount", "Payment Date", "Payment Method", "Status", "Notes", "Created At"
    ]);
  }

  // 3. Settings Sheet
  let settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
    settingsSheet.appendRow(["Setting", "Value"]);
    settingsSheet.appendRow(["monthly_fee", "30"]);
    settingsSheet.appendRow(["club_name", "Pulari Arts & Sports Club"]);
    settingsSheet.appendRow(["currency", "₹"]);
    settingsSheet.appendRow(["admin_password", "admin"]);
  }
}

/**
 * Fetch All Members
 */
function getMembersData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const members = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows

    members.push({
      memberId: String(row[0]),
      fullName: String(row[1]),
      phone: String(row[2] || ''),
      address: String(row[3] || ''),
      joinDate: formatDateValue(row[4]),
      monthlyFee: Number(row[5] || 0),
      status: String(row[6] || 'Active'),
      notes: String(row[7] || ''),
      createdAt: formatDateValue(row[8]),
      updatedAt: formatDateValue(row[9])
    });
  }

  return { success: true, data: members };
}

/**
 * Add New Member
 */
function addMember(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  const membersRes = getMembersData();
  const existingMembers = membersRes.data;

  // Duplicate Member ID Check
  const inputId = String(payload.memberId || '').trim();
  if (existingMembers.some(m => m.memberId.toUpperCase() === inputId.toUpperCase())) {
    return { success: false, message: `Member ID '${inputId}' already exists.` };
  }

  const todayStr = getTodayIsoDate();
  const newRow = [
    inputId,
    payload.fullName || '',
    payload.phone || '',
    payload.address || '',
    payload.joinDate || todayStr,
    Number(payload.monthlyFee || 0),
    payload.status || 'Active',
    payload.notes || '',
    todayStr,
    todayStr
  ];

  sheet.appendRow(newRow);
  return { success: true, message: "Member added successfully!", data: payload };
}

/**
 * Update Existing Member
 */
function updateMember(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  const data = sheet.getDataRange().getValues();
  const targetId = String(payload.memberId || '').trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === targetId) {
      const todayStr = getTodayIsoDate();
      sheet.getRange(i + 1, 2).setValue(payload.fullName || '');
      sheet.getRange(i + 1, 3).setValue(payload.phone || '');
      sheet.getRange(i + 1, 4).setValue(payload.address || '');
      sheet.getRange(i + 1, 5).setValue(payload.joinDate || todayStr);
      sheet.getRange(i + 1, 6).setValue(Number(payload.monthlyFee || 0));
      sheet.getRange(i + 1, 7).setValue(payload.status || 'Active');
      sheet.getRange(i + 1, 8).setValue(payload.notes || '');
      sheet.getRange(i + 1, 10).setValue(todayStr);

      return { success: true, message: "Member updated successfully!" };
    }
  }

  return { success: false, message: "Member ID not found." };
}

/**
 * Deactivate Member
 */
function deactivateMember(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  const data = sheet.getDataRange().getValues();
  const targetId = String(payload.memberId || '').trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === targetId) {
      sheet.getRange(i + 1, 7).setValue("Inactive");
      sheet.getRange(i + 1, 10).setValue(getTodayIsoDate());
      return { success: true, message: "Member deactivated successfully." };
    }
  }

  return { success: false, message: "Member not found." };
}

/**
 * Fetch All Payments
 */
function getPaymentsData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const payments = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    payments.push({
      paymentId: String(row[0]),
      memberId: String(row[1]),
      memberName: String(row[2]),
      month: String(row[3]),
      year: Number(row[4]),
      amount: Number(row[5]),
      paymentDate: formatDateValue(row[6]),
      paymentMethod: String(row[7] || 'Cash'),
      status: String(row[8] || 'Paid'),
      notes: String(row[9] || ''),
      createdAt: formatDateValue(row[10])
    });
  }

  return { success: true, data: payments };
}

/**
 * Record or Update Payment (Member ID + Month + Year)
 */
function recordPayment(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
  const data = sheet.getDataRange().getValues();

  const { memberId, month, year, amount, status, notes } = payload;
  const targetMemberId = String(memberId || '').trim().toUpperCase();
  const targetMonth = String(month || '').trim().toLowerCase();
  const targetYear = Number(year);

  // Search existing payment record
  let existingRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toUpperCase() === targetMemberId &&
        String(data[i][3]).toLowerCase() === targetMonth &&
        Number(data[i][4]) === targetYear) {
      existingRowIndex = i + 1;
      break;
    }
  }

  if (status === "Unpaid") {
    if (existingRowIndex !== -1) {
      sheet.deleteRow(existingRowIndex);
    }
    return { success: true, message: "Payment status set to Unpaid." };
  }

  // Check duplicate payment
  if (existingRowIndex !== -1 && payload.forceUpdate !== true) {
    return {
      success: false,
      message: `Payment already recorded for this member for ${month} ${year}.`
    };
  }

  const todayStr = getTodayIsoDate();
  const paymentId = "PAY" + String(data.length).padStart(3, '0');

  if (existingRowIndex !== -1) {
    sheet.getRange(existingRowIndex, 6).setValue(Number(amount));
    sheet.getRange(existingRowIndex, 7).setValue(todayStr);
    sheet.getRange(existingRowIndex, 9).setValue("Paid");
    if (notes) sheet.getRange(existingRowIndex, 10).setValue(notes);
  } else {
    sheet.appendRow([
      paymentId,
      memberId,
      payload.memberName || '',
      month,
      targetYear,
      Number(amount),
      todayStr,
      payload.paymentMethod || 'Cash',
      'Paid',
      notes || '',
      todayStr
    ]);
  }

  return { success: true, message: "Payment recorded successfully!" };
}

/**
 * Fetch Settings
 */
function getSettingsData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      settings[String(data[i][0])] = data[i][1];
    }
  }

  return { success: true, data: settings };
}

/**
 * Update Settings
 */
function updateSettings(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();

  Object.keys(payload).forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(payload[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, payload[key]]);
    }
  });

  return { success: true, message: "Settings updated successfully." };
}

/**
 * Admin Authentication
 */
function authenticateAdmin(payload) {
  const settingsRes = getSettingsData();
  const currentPassword = settingsRes.data.admin_password || "admin";

  if (String(payload.password || '') === String(currentPassword)) {
    return { success: true, message: "Authentication successful." };
  }
  return { success: false, message: "Invalid admin password." };
}

/**
 * Helper: Format Date values to YYYY-MM-DD
 */
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val).split('T')[0];
}

/**
 * Helper: Get Today's Date in YYYY-MM-DD format
 */
function getTodayIsoDate() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}
