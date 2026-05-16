/****************************************************************
 * DABBABOOK - MASTER APPS SCRIPT TEMPLATE
 * Counter-based meal tracking | Per-session veg/nv pricing
 * Config-driven plans | Powered by Ready-To-Eat ADs
 *
 * NEW CLIENT SETUP:
 *   1. Edit the CLIENT_CONFIG block below — that's it
 *   2. Save → Refresh sheet → DabbaBook menu → Step 1: Setup Sheets
 *   3. DabbaBook menu → Step 2: Install Trigger
 *   4. Deploy as Web App → copy URL → paste into Vercel env vars
 ****************************************************************/

/* ════════════════════════════════════════════════════════════════
   ███  CLIENT CONFIG — EDIT ONLY THIS BLOCK FOR NEW CLIENTS  ███
   ════════════════════════════════════════════════════════════════ */
const CLIENT_CONFIG = {
  // ─── Identity ───────────────────────────────────────────────
  BUSINESS_NAME: 'Protein Baba',
  ORDER_PREFIX: 'PB-',                    // PB-00001, PB-00002 …
  OWNER_EMAIL: 'kartik2348@gmail.com',    // gets new-order alerts
  BRAND_COLOR: '#2d4a2b',                 // header colour for sheets

  // ─── Email toggles ──────────────────────────────────────────
  SEND_OWNER_EMAIL: true,
  SEND_CUSTOMER_EMAIL: true,

  // ─── Plan durations ─────────────────────────────────────────
  // Key = exact plan name in Google Form
  // Value = number of meals per session for that plan
  PLANS: {
    'Single Meal (1-Day Trial)': 1,
    'Weekly': 6,
    'Monthly': 26,
  },

  // ─── Pricing (per meal, INR) ────────────────────────────────
  // Per-session veg/non-veg split. Set both equal if no split.
  PRICES: {
    Breakfast: { veg: 251, nonVeg: 251 },  // breakfast usually no split
    Lunch:     { veg: 198, nonVeg: 209 },
    Dinner:    { veg: 198, nonVeg: 209 },
  },

  // ─── Feature toggles ────────────────────────────────────────
  FEATURES: {
    dabbaTracker: true,                   // false = hide from this client
  },

  // ─── Dabba Tracker config ──────────────────────────────────
  // Sessions that issue a dabba (Breakfast usually doesn't — packaging only)
  DABBA: {
    sessions: ['Lunch', 'Dinner'],        // 1 dabba per listed session per day
    alertDays: 3,                         // pending > N days = flag
    dailyPin: '',                         // set via API; rotates daily
  },
};
/* ════════════════════════════════════════════════════════════════
   ███  END CONFIG — DO NOT EDIT BELOW THIS LINE  ███
   ════════════════════════════════════════════════════════════════ */


// ============ INTERNAL CONSTANTS ============
const FORM_SHEET_NAME = 'Form Responses 1';
const ORDER_DB_SHEET = 'Order Database';
const KITCHEN_SHEET = 'Kitchen Order List';
const DABBA_LOG_SHEET = 'Dabba Log';
const CONFIG_SHEET = 'Config';
const SESSIONS = ['Breakfast', 'Lunch', 'Dinner'];

// ============ MENU ============
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DabbaBook')
    .addItem('Step 1: Setup Sheets', 'setupSheets')
    .addItem('Step 2: Install Trigger', 'installTrigger')
    .addItem('Reset Config Sheet', 'resetConfigSheet')
    .addItem('Migrate Existing Orders', 'migrateExistingOrders')
    .addItem('Configure Owner Email', 'configureOwnerEmail')
    .addSeparator()
    .addItem('Generate Kitchen List', 'generateKitchenListPrompt')
    .addItem('Skip a Meal for Customer', 'skipMealPrompt')
    .addToUi();
}

// ============ SETUP ============
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const brand = CLIENT_CONFIG.BRAND_COLOR;

  // Order Database
  let db = ss.getSheetByName(ORDER_DB_SHEET);
  if (!db) {
    db = ss.insertSheet(ORDER_DB_SHEET);
    db.appendRow([
      'Order Number', 'Timestamp', 'Customer Name', 'Email', 'Phone', 'Address',
      'Plan Duration', 'Meal Combo', 'Food Preference', 'Start Date',
      'Breakfast Total', 'Breakfast Remaining',
      'Lunch Total', 'Lunch Remaining',
      'Dinner Total', 'Dinner Remaining',
      'Last Deducted Date',
      'Total Amount', 'Payment Method', 'Payment Status',
      'Status', 'Special Instructions'
    ]);
    db.getRange(1, 1, 1, 22).setFontWeight('bold').setBackground(brand).setFontColor('#fff');
    db.getRange('J:J').setNumberFormat('yyyy-mm-dd');
    db.getRange('Q:Q').setNumberFormat('yyyy-mm-dd');
  }

  // Kitchen Order List
  let kitchen = ss.getSheetByName(KITCHEN_SHEET);
  if (!kitchen) {
    kitchen = ss.insertSheet(KITCHEN_SHEET);
    kitchen.appendRow(['Order Number', 'Customer Name', 'Phone', 'Address', 'Session', 'Food Type', 'Meals Remaining (after today)', 'Special Instructions']);
    kitchen.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground(brand).setFontColor('#fff');
  }

  // Config sheet (only for runtime values that need persistence — order counter & API token)
  let config = ss.getSheetByName(CONFIG_SHEET);
  if (!config) {
    config = ss.insertSheet(CONFIG_SHEET);
    config.appendRow(['Key', 'Value']);
    config.appendRow(['LAST_ORDER_NUMBER', '0']);
    config.appendRow(['API_TOKEN', Utilities.getUuid()]);
    config.appendRow(['DAILY_PIN', generateDailyPin()]);
    config.appendRow(['DAILY_PIN_DATE', formatDateISO(new Date())]);
    config.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground(brand).setFontColor('#fff');
  }

  // Dabba Log (only if feature enabled)
  if (CLIENT_CONFIG.FEATURES && CLIENT_CONFIG.FEATURES.dabbaTracker) {
    let dabba = ss.getSheetByName(DABBA_LOG_SHEET);
    if (!dabba) {
      dabba = ss.insertSheet(DABBA_LOG_SHEET);
      dabba.appendRow(['Log ID', 'Order Number', 'Customer Name', 'Phone', 'Address', 'Session', 'Issued Date', 'Returned Date', 'Days Pending', 'Status']);
      dabba.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground(brand).setFontColor('#fff');
      dabba.getRange('G:G').setNumberFormat('yyyy-mm-dd');
      dabba.getRange('H:H').setNumberFormat('yyyy-mm-dd');
    }
  }

  SpreadsheetApp.getUi().alert('✅ Sheets ready for ' + CLIENT_CONFIG.BUSINESS_NAME + '. Now run Step 2: Install Trigger.');
}

function installTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
  SpreadsheetApp.getUi().alert('✅ Trigger installed.');
}

function resetConfigSheet() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    'Reset Config Sheet',
    'This will generate a NEW API Token and reset the Config sheet for ' + CLIENT_CONFIG.BUSINESS_NAME + '.\n\nProceed?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const brand = CLIENT_CONFIG.BRAND_COLOR;

  // Delete and recreate Config sheet cleanly
  let config = ss.getSheetByName(CONFIG_SHEET);
  if (config) ss.deleteSheet(config);
  config = ss.insertSheet(CONFIG_SHEET);

  config.appendRow(['Key', 'Value']);
  config.appendRow(['LAST_ORDER_NUMBER', '0']);
  config.appendRow(['API_TOKEN', Utilities.getUuid()]);
  config.appendRow(['DAILY_PIN', generateDailyPin()]);
  config.appendRow(['DAILY_PIN_DATE', todayISO()]);
  config.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground(brand).setFontColor('#fff');
  config.getRange('B5').setNumberFormat('@STRING@'); // Force plain text — prevents Date object issue

  // Show new token to user
  const newToken = getRuntimeConfig('API_TOKEN');
  ui.alert('✅ Config sheet reset for ' + CLIENT_CONFIG.BUSINESS_NAME + '.\n\nNew API Token:\n' + newToken + '\n\nCopy this into your Vercel env vars (NEXT_PUBLIC_API_TOKEN).');
}


function configureOwnerEmail() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Owner email is set in CLIENT_CONFIG.OWNER_EMAIL at the top of the script. Edit it there and save.');
}

// ============ CONFIG HELPERS (runtime values only) ============
function getRuntimeConfig(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (data[i][0] === key) return data[i][1];
  return null;
}

function setRuntimeConfig(key, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getNextOrderNumber() {
  const last = parseInt(getRuntimeConfig('LAST_ORDER_NUMBER') || '0');
  const next = last + 1;
  setRuntimeConfig('LAST_ORDER_NUMBER', next);
  return CLIENT_CONFIG.ORDER_PREFIX + String(next).padStart(5, '0');
}

// ============ COMBO PARSING ============
function getSessionsFromCombo(combo) {
  if (!combo) return [];
  const c = combo.toString();
  const sessions = [];
  if (c.includes('Breakfast')) sessions.push('Breakfast');
  if (c.includes('Lunch')) sessions.push('Lunch');
  if (c.includes('Dinner')) sessions.push('Dinner');
  return sessions;
}

// ============ PRICE CALCULATION ============
function calculatePricing(planDuration, mealCombo, foodPref) {
  const perSession = CLIENT_CONFIG.PLANS[planDuration] || 1;
  const sessions = getSessionsFromCombo(mealCombo);
  const isNonVeg = (foodPref || '').toLowerCase().includes('non');

  const breakdown = [];
  let total = 0;

  sessions.forEach(s => {
    const priceMap = CLIENT_CONFIG.PRICES[s];
    if (!priceMap) return;
    const rate = isNonVeg ? priceMap.nonVeg : priceMap.veg;
    const sub = perSession * rate;
    const label = s + (priceMap.veg === priceMap.nonVeg ? '' : (isNonVeg ? ' (Non-Veg)' : ' (Veg)'));
    breakdown.push({ label: label, qty: perSession, rate: rate, subtotal: sub });
    total += sub;
  });

  return { breakdown: breakdown, total: total, perSession: perSession };
}

// ============ FORM SUBMIT ============
function onFormSubmit(e) {
  try {
    const row = e.values || e.range.getValues()[0];
    processOrder(row);
  } catch (err) {
    Logger.log('onFormSubmit error: ' + err);
  }
}

function processOrder(row) {
  // Form column mapping (0-indexed):
  // 0: Timestamp, 1: Email, 2: Customer Name, 3: Phone, 4: Address,
  // 5: Plan Duration, 6: Meal Combo, 7: Food Preference,
  // 8: Delivery Start Date, 9: Payment Method, 10: Payment Status,
  // 11: Special Instructions
  const timestamp = row[0];
  const email = row[1];
  const customerName = row[2];
  const phone = row[3];
  const address = row[4];
  const planDuration = row[5];
  const mealCombo = row[6];
  const foodPref = row[7];
  const startDateRaw = row[8];
  const paymentMethod = row[9];
  const paymentStatus = row[10];
  const instructions = row[11] || '';

  if (!startDateRaw) {
    Logger.log('Skipping row - no start date');
    return;
  }

  const startDate = new Date(startDateRaw);
  startDate.setHours(0, 0, 0, 0);

  const orderNumber = getNextOrderNumber();
  const sessions = getSessionsFromCombo(mealCombo);
  const perSession = CLIENT_CONFIG.PLANS[planDuration] || 1;

  const bTotal = sessions.includes('Breakfast') ? perSession : 0;
  const lTotal = sessions.includes('Lunch') ? perSession : 0;
  const dTotal = sessions.includes('Dinner') ? perSession : 0;

  const pricing = calculatePricing(planDuration, mealCombo, foodPref);

  const db = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ORDER_DB_SHEET);
  const newRow = [
    orderNumber, timestamp, customerName, email, phone, address,
    planDuration, mealCombo, foodPref, startDate,
    bTotal, bTotal,
    lTotal, lTotal,
    dTotal, dTotal,
    '',
    pricing.total, paymentMethod, paymentStatus,
    'Active', instructions
  ];
  const insertRow = db.getLastRow() + 1;
  db.getRange(insertRow, 1, 1, 22).setValues([newRow]);
  db.getRange(insertRow, 10).setNumberFormat('yyyy-mm-dd');
  db.getRange(insertRow, 17).setNumberFormat('yyyy-mm-dd');

  sendOwnerEmail(orderNumber, customerName, phone, address, planDuration, mealCombo, foodPref, startDate, pricing, paymentMethod, paymentStatus);
  sendCustomerEmail(email, orderNumber, customerName, planDuration, mealCombo, foodPref, startDate, pricing, paymentMethod, paymentStatus);
}

// ============ NOTIFICATIONS ============
function sendOwnerEmail(orderNumber, name, phone, address, planDuration, mealCombo, foodPref, startDate, pricing, paymentMethod, paymentStatus) {
  if (!CLIENT_CONFIG.SEND_OWNER_EMAIL) return;
  const ownerEmail = CLIENT_CONFIG.OWNER_EMAIL;
  if (!ownerEmail) return;
  const businessName = CLIENT_CONFIG.BUSINESS_NAME;

  const breakdownText = pricing.breakdown.map(b =>
    `  • ${b.label}: ${b.qty} × ₹${b.rate} = ₹${b.subtotal}`
  ).join('\n');

  const subject = `[${businessName}] New Order: ${orderNumber} - ${name}`;
  const body = `New order received!

Order #: ${orderNumber}
Customer: ${name}
Phone: ${phone}
Address: ${address}

Plan: ${planDuration}
Combo: ${mealCombo}
Food Preference: ${foodPref}
Start Date: ${formatDate(startDate)}

Pricing:
${breakdownText}
─────────────────
Total: ₹${pricing.total}

Payment: ${paymentMethod} (${paymentStatus})

— ${businessName} (DabbaBook)`;
  try { MailApp.sendEmail(ownerEmail, subject, body); } catch (err) { Logger.log('Owner email error: ' + err); }
}

function sendCustomerEmail(email, orderNumber, name, planDuration, mealCombo, foodPref, startDate, pricing, paymentMethod, paymentStatus) {
  if (!CLIENT_CONFIG.SEND_CUSTOMER_EMAIL) return;
  if (!email) return;
  const businessName = CLIENT_CONFIG.BUSINESS_NAME;

  const breakdownText = pricing.breakdown.map(b =>
    `  • ${b.label}: ${b.qty} × ₹${b.rate} = ₹${b.subtotal}`
  ).join('\n');

  const subject = `[${businessName}] Order Confirmed - ${orderNumber}`;
  const body = `Hi ${name},

Your order is confirmed! Thank you for choosing ${businessName}.

Order #: ${orderNumber}
Plan: ${planDuration}
Combo: ${mealCombo}
Food Preference: ${foodPref}
Start Date: ${formatDate(startDate)}

Pricing breakdown:
${breakdownText}
─────────────────
Total: ₹${pricing.total}

Payment: ${paymentMethod} (${paymentStatus})

If you have any questions, just reply to this email.

— ${businessName}`;
  try { MailApp.sendEmail(email, subject, body); } catch (err) { Logger.log('Customer email error: ' + err); }
}

function formatDate(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd MMM yyyy');
}

function formatDateISO(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function todayISO() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// ============ MIGRATION ============
function migrateExistingOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const form = ss.getSheetByName(FORM_SHEET_NAME);
  if (!form) {
    SpreadsheetApp.getUi().alert('❌ Form sheet "' + FORM_SHEET_NAME + '" not found.');
    return;
  }
  const data = form.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { processOrder(data[i]); count++; }
  }
  SpreadsheetApp.getUi().alert(`✅ Migrated ${count} orders.`);
}

// ============ KITCHEN LIST ============
function generateKitchenListPrompt() {
  const ui = SpreadsheetApp.getUi();
  const today = new Date();
  const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const dateResp = ui.prompt('Generate Kitchen List — Step 1 of 2',
    `Enter date (YYYY-MM-DD).\nLeave blank for today (${todayStr}):`,
    ui.ButtonSet.OK_CANCEL);
  if (dateResp.getSelectedButton() !== ui.Button.OK) return;
  let dateStr = dateResp.getResponseText().trim();
  if (!dateStr) dateStr = todayStr;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) { ui.alert('❌ Invalid date format. Use YYYY-MM-DD.'); return; }
  targetDate.setHours(0, 0, 0, 0);

  const sessionResp = ui.prompt('Generate Kitchen List — Step 2 of 2',
    'Enter session: Breakfast / Lunch / Dinner',
    ui.ButtonSet.OK_CANCEL);
  if (sessionResp.getSelectedButton() !== ui.Button.OK) return;
  const session = sessionResp.getResponseText().trim();
  if (!SESSIONS.includes(session)) { ui.alert('❌ Invalid session.'); return; }

  const result = generateKitchenList(targetDate, session);
  ui.alert(`✅ Kitchen list ready.\n\nDate: ${dateStr}\nSession: ${session}\nOrders shown: ${result.count}\nNewly deducted: ${result.deducted}`);
}

function skipMealPrompt() {
  const ui = SpreadsheetApp.getUi();
  const orderResp = ui.prompt('Skip Meal — Step 1 of 2',
    `Enter Order Number (e.g. ${CLIENT_CONFIG.ORDER_PREFIX}00001):`,
    ui.ButtonSet.OK_CANCEL);
  if (orderResp.getSelectedButton() !== ui.Button.OK) return;
  const orderNumber = orderResp.getResponseText().trim();
  if (!orderNumber) { ui.alert('❌ Order number required.'); return; }

  const sessionResp = ui.prompt('Skip Meal — Step 2 of 2',
    `Skip which session for ${orderNumber} today?\nBreakfast / Lunch / Dinner`,
    ui.ButtonSet.OK_CANCEL);
  if (sessionResp.getSelectedButton() !== ui.Button.OK) return;
  const session = sessionResp.getResponseText().trim();
  if (!SESSIONS.includes(session)) { ui.alert('❌ Invalid session.'); return; }

  const result = skipMeal(orderNumber, session);
  if (result.error) ui.alert('❌ ' + result.error);
  else ui.alert('✅ ' + result.message);
}

function generateKitchenList(date, session) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const db = ss.getSheetByName(ORDER_DB_SHEET);
  const kitchen = ss.getSheetByName(KITCHEN_SHEET);

  if (kitchen.getLastRow() > 1) {
    kitchen.getRange(2, 1, kitchen.getLastRow() - 1, kitchen.getLastColumn()).clearContent();
  }

  const data = db.getDataRange().getValues();
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const targetTime = targetDate.getTime();
  const remCol = session === 'Breakfast' ? 12 : (session === 'Lunch' ? 14 : 16);

  const kitchenRows = [];
  const deductRows = [];
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderNum = row[0];
    const name = row[2];
    const phone = row[4];
    const address = row[5];
    const combo = row[7];
    const foodPref = row[8] || '';
    const startDate = row[9] instanceof Date ? row[9] : new Date(row[9]);
    startDate.setHours(0, 0, 0, 0);
    const lastDed = row[16];
    const status = row[20];
    const instructions = row[21] || '';

    if (status !== 'Active') continue;
    if (targetTime < startDate.getTime()) continue;

    const sessions = getSessionsFromCombo(combo);
    if (!sessions.includes(session)) continue;

    const remaining = parseInt(row[remCol - 1]) || 0;
    if (remaining <= 0) continue;

    let foodType;
    if (session === 'Breakfast') foodType = '—';
    else foodType = foodPref;

    const todayStr = formatDate(targetDate);
    const lastDedRaw = String(lastDed || '');
    let dedDate = '', dedSessions = [];
    if (lastDedRaw.includes('|')) {
      const parts = lastDedRaw.split('|');
      dedDate = parts[0];
      dedSessions = parts[1] ? parts[1].split(',') : [];
    } else if (lastDedRaw) {
      dedDate = lastDedRaw;
    }

    let willDeduct = true;
    if (dedDate === todayStr && dedSessions.indexOf(session.charAt(0)) >= 0) {
      willDeduct = false;
    }

    const newRemaining = willDeduct ? remaining - 1 : remaining;
    kitchenRows.push([orderNum, name, phone, address, session, foodType, newRemaining, instructions]);
    count++;

    if (willDeduct) {
      deductRows.push({ rowIdx: i + 1, newRem: newRemaining, dedDate: todayStr, dedSessions: dedSessions.concat([session.charAt(0)]) });
    }
  }

  if (kitchenRows.length > 0) {
    kitchen.getRange(2, 1, kitchenRows.length, 8).setValues(kitchenRows);
  }

  deductRows.forEach(d => {
    db.getRange(d.rowIdx, remCol).setValue(d.newRem);
    db.getRange(d.rowIdx, 17).setValue(d.dedDate + '|' + d.dedSessions.join(','));
    const checkRow = db.getRange(d.rowIdx, 1, 1, 22).getValues()[0];
    const bRem = parseInt(checkRow[11]) || 0;
    const lRem = parseInt(checkRow[13]) || 0;
    const dRem = parseInt(checkRow[15]) || 0;
    if (bRem === 0 && lRem === 0 && dRem === 0) {
      db.getRange(d.rowIdx, 21).setValue('Completed');
    }
    // Log dabba if feature enabled and session counts as dabba-issuing
    if (CLIENT_CONFIG.FEATURES && CLIENT_CONFIG.FEATURES.dabbaTracker
        && CLIENT_CONFIG.DABBA && CLIENT_CONFIG.DABBA.sessions.indexOf(session) >= 0) {
      logDabba(checkRow[0], checkRow[2], checkRow[4], checkRow[5], session, targetDate);
    }
  });

  return { count: count, deducted: deductRows.length };
}

// ============ DABBA TRACKER ============
function logDabba(orderNumber, customerName, phone, address, session, issuedDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DABBA_LOG_SHEET);
  if (!sheet) return;
  const issuedStr = formatDateISO(issuedDate);
  // Idempotent: skip if already logged for this order+session+date
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][1] === orderNumber && existing[i][5] === session) {
      const existingDate = existing[i][6] instanceof Date ? formatDateISO(existing[i][6]) : String(existing[i][6]);
      if (existingDate === issuedStr) return;
    }
  }
  const logId = 'DBA-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 1000);
  sheet.appendRow([logId, orderNumber, customerName, phone, address, session, issuedDate, '', '', 'Pending']);
}

function generateDailyPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function ensureDailyPin() {
  const today = todayISO();
  let storedDate = getRuntimeConfig('DAILY_PIN_DATE');

  // Normalise — Sheets sometimes returns a Date object instead of string
  if (storedDate instanceof Date) {
    storedDate = formatDateISO(storedDate);
  } else {
    storedDate = String(storedDate || '').substring(0, 10);
  }

  if (storedDate !== today) {
    const newPin = generateDailyPin();
    setRuntimeConfig('DAILY_PIN', String(newPin));
    setRuntimeConfig('DAILY_PIN_DATE', today);
    return newPin;
  }
  return String(getRuntimeConfig('DAILY_PIN') || generateDailyPin());
}

function getDabbaTracker() {
  if (!CLIENT_CONFIG.FEATURES || !CLIENT_CONFIG.FEATURES.dabbaTracker) {
    return { error: 'Dabba Tracker not enabled for this client' };
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DABBA_LOG_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return { logs: [], summary: { pending: 0, returned: 0, overdue: 0 } };
  }
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alertDays = CLIENT_CONFIG.DABBA.alertDays || 3;
  const logs = [];
  let pending = 0, returned = 0, overdue = 0;

  data.forEach(r => {
    if (!r[0]) return;
    const issued = r[6] instanceof Date ? r[6] : new Date(r[6]);
    issued.setHours(0, 0, 0, 0);
    const status = r[9];
    let daysPending = '';
    if (status === 'Pending') {
      daysPending = Math.floor((today.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
      pending++;
      if (daysPending >= alertDays) overdue++;
    } else if (status === 'Returned') {
      returned++;
    }
    logs.push({
      logId: r[0],
      orderNumber: r[1],
      customerName: r[2],
      phone: r[3],
      address: r[4],
      session: r[5],
      issuedDate: formatDateISO(issued),
      returnedDate: r[7] ? (r[7] instanceof Date ? formatDateISO(r[7]) : r[7]) : '',
      daysPending: daysPending,
      status: status,
      isOverdue: status === 'Pending' && daysPending >= alertDays,
    });
  });

  // Sort: overdue first, then pending by oldest, then returned
  logs.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.status !== b.status) return a.status === 'Pending' ? -1 : 1;
    return (b.daysPending || 0) - (a.daysPending || 0);
  });

  return { logs: logs, summary: { pending: pending, returned: returned, overdue: overdue } };
}

function getDabbaPickupList(date) {
  if (!CLIENT_CONFIG.FEATURES || !CLIENT_CONFIG.FEATURES.dabbaTracker) {
    return { error: 'Dabba Tracker not enabled' };
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DABBA_LOG_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return { list: [] };
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const targetTime = targetDate.getTime();

  // Pickup list = all dabbas issued ON or BEFORE this date that are still Pending
  const list = [];
  data.forEach(r => {
    if (!r[0] || r[9] !== 'Pending') return;
    const issued = r[6] instanceof Date ? r[6] : new Date(r[6]);
    issued.setHours(0, 0, 0, 0);
    if (issued.getTime() > targetTime) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysPending = Math.floor((today.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
    list.push({
      logId: r[0],
      orderNumber: r[1],
      customerName: r[2],
      phone: r[3],
      address: r[4],
      session: r[5],
      issuedDate: formatDateISO(issued),
      daysPending: daysPending,
    });
  });
  // Group by order to show dabba count per customer
  const grouped = {};
  list.forEach(item => {
    if (!grouped[item.orderNumber]) {
      grouped[item.orderNumber] = {
        orderNumber: item.orderNumber,
        customerName: item.customerName,
        phone: item.phone,
        address: item.address,
        dabbaCount: 0,
        oldestDays: 0,
        items: [],
      };
    }
    grouped[item.orderNumber].dabbaCount++;
    grouped[item.orderNumber].oldestDays = Math.max(grouped[item.orderNumber].oldestDays, item.daysPending);
    grouped[item.orderNumber].items.push(item);
  });
  return { list: Object.values(grouped).sort((a, b) => b.oldestDays - a.oldestDays) };
}

function markDabbaReturned(logId) {
  if (!CLIENT_CONFIG.FEATURES || !CLIENT_CONFIG.FEATURES.dabbaTracker) {
    return { error: 'Dabba Tracker not enabled' };
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DABBA_LOG_SHEET);
  if (!sheet) return { error: 'Dabba Log sheet not found' };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === logId) {
      if (data[i][9] === 'Returned') return { error: 'Already marked returned' };
      const today = new Date();
      sheet.getRange(i + 1, 8).setValue(today);
      sheet.getRange(i + 1, 10).setValue('Returned');
      return { success: true, message: 'Marked returned' };
    }
  }
  return { error: 'Log ID not found' };
}

function markDabbasReturnedByOrder(orderNumber) {
  if (!CLIENT_CONFIG.FEATURES || !CLIENT_CONFIG.FEATURES.dabbaTracker) {
    return { error: 'Dabba Tracker not enabled' };
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DABBA_LOG_SHEET);
  if (!sheet) return { error: 'Dabba Log sheet not found' };
  const data = sheet.getDataRange().getValues();
  const today = new Date();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === orderNumber && data[i][9] === 'Pending') {
      sheet.getRange(i + 1, 8).setValue(today);
      sheet.getRange(i + 1, 10).setValue('Returned');
      count++;
    }
  }
  return { success: true, message: `Marked ${count} dabba${count === 1 ? '' : 's'} returned for ${orderNumber}` };
}

function setDailyPin(newPin) {
  if (!newPin || !/^\d{4}$/.test(newPin)) return { error: 'PIN must be 4 digits' };
  setRuntimeConfig('DAILY_PIN', newPin);
  setRuntimeConfig('DAILY_PIN_DATE', todayISO());
  return { success: true, pin: newPin };
}

function verifyPin(pin) {
  const currentPin = ensureDailyPin();
  return { valid: pin === currentPin };
}

// ============ WEB APP API ============
function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action;

    // PIN-authenticated endpoints (used by mobile /pickup page — no API token)
    const pinAuthActions = ['verifyPin', 'getDabbaPickupListByPin', 'markDabbaReturnedByPin', 'markDabbasReturnedByOrderByPin'];
    if (pinAuthActions.indexOf(action) >= 0) {
      const pin = params.pin;
      const valid = (pin === ensureDailyPin());
      if (action === 'verifyPin') return jsonResponse({ valid: valid });
      if (!valid) return jsonResponse({ error: 'Invalid PIN' });
      let pinResult = {};
      if (action === 'getDabbaPickupListByPin') pinResult = getDabbaPickupList(params.date);
      else if (action === 'markDabbaReturnedByPin') pinResult = markDabbaReturned(params.logId);
      else if (action === 'markDabbasReturnedByOrderByPin') pinResult = markDabbasReturnedByOrder(params.orderNumber);
      return jsonResponse(pinResult);
    }

    // Token-authenticated endpoints (admin dashboard)
    const token = params.token;
    if (token !== getRuntimeConfig('API_TOKEN')) {
      return jsonResponse({ error: 'Invalid token' });
    }
    let result = {};
    if (action === 'getDashboard') {
      result = getDashboardData();
    } else if (action === 'previewKitchenList') {
      const date = params.date ? new Date(params.date) : new Date();
      const session = params.session || 'Lunch';
      result = { list: previewKitchenList(date, session) };
    } else if (action === 'getKitchenList') {
      const date = params.date ? new Date(params.date) : new Date();
      const session = params.session || 'Lunch';
      result = generateKitchenList(date, session);
      result.list = getKitchenListData();
    } else if (action === 'getOrders') {
      result = { orders: getAllOrders() };
    } else if (action === 'skipMeal') {
      result = skipMeal(params.orderNumber, params.session);
    } else if (action === 'getDabbaTracker') {
      result = getDabbaTracker();
    } else if (action === 'getDabbaPickupList') {
      result = getDabbaPickupList(params.date);
    } else if (action === 'markDabbaReturned') {
      result = markDabbaReturned(params.logId);
    } else if (action === 'markDabbasReturnedByOrder') {
      result = markDabbasReturnedByOrder(params.orderNumber);
    } else if (action === 'getDailyPin') {
      result = { pin: ensureDailyPin() };
    } else if (action === 'setDailyPin') {
      result = setDailyPin(params.pin);
    } else if (action === 'getClientInfo') {
      result = {
        businessName: CLIENT_CONFIG.BUSINESS_NAME,
        brandColor: CLIENT_CONFIG.BRAND_COLOR,
        orderPrefix: CLIENT_CONFIG.ORDER_PREFIX,
        features: CLIENT_CONFIG.FEATURES || {},
        dabbaSessions: (CLIENT_CONFIG.DABBA && CLIENT_CONFIG.DABBA.sessions) || [],
        dabbaAlertDays: (CLIENT_CONFIG.DABBA && CLIENT_CONFIG.DABBA.alertDays) || 3,
      };
    } else {
      result = { error: 'Unknown action' };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getDashboardData() {
  const db = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ORDER_DB_SHEET);
  const data = db.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  let totalOrders = 0;
  let activeOrders = 0;
  let todayB = 0, todayL = 0, todayD = 0;
  let totalRevenue = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    totalOrders++;
    const status = row[20];
    if (status === 'Active') activeOrders++;
    totalRevenue += parseInt(row[17]) || 0;

    const startDate = row[9] instanceof Date ? row[9] : new Date(row[9]);
    startDate.setHours(0, 0, 0, 0);
    if (todayTime < startDate.getTime()) continue;
    if (status !== 'Active') continue;

    const bRem = parseInt(row[11]) || 0;
    const lRem = parseInt(row[13]) || 0;
    const dRem = parseInt(row[15]) || 0;
    if (bRem > 0) todayB++;
    if (lRem > 0) todayL++;
    if (dRem > 0) todayD++;
  }

  return {
    totalOrders: totalOrders,
    activeOrders: activeOrders,
    todayBreakfast: todayB,
    todayLunch: todayL,
    todayDinner: todayD,
    totalRevenue: totalRevenue,
    businessName: CLIENT_CONFIG.BUSINESS_NAME,
  };
}

function previewKitchenList(date, session) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const db = ss.getSheetByName(ORDER_DB_SHEET);
  const data = db.getDataRange().getValues();
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const targetTime = targetDate.getTime();
  const remCol = session === 'Breakfast' ? 12 : (session === 'Lunch' ? 14 : 16);
  const todayStr = formatDateISO(targetDate);

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderNum = row[0];
    if (!orderNum) continue;
    const status = row[20];
    if (status !== 'Active') continue;

    const startDate = row[9] instanceof Date ? row[9] : new Date(row[9]);
    startDate.setHours(0, 0, 0, 0);
    if (targetTime < startDate.getTime()) continue;

    const combo = row[7];
    const sessions = getSessionsFromCombo(combo);
    if (!sessions.includes(session)) continue;

    const remaining = parseInt(row[remCol - 1]) || 0;
    if (remaining <= 0) continue;

    const foodPref = row[8] || '';
    let foodType;
    if (session === 'Breakfast') foodType = '—';
    else foodType = foodPref;

    const lastDedRaw = String(row[16] || '');
    let alreadyDeducted = false;
    if (lastDedRaw.includes('|')) {
      const parts = lastDedRaw.split('|');
      const dedDate = parts[0];
      const dedSessions = parts[1] ? parts[1].split(',') : [];
      if (dedDate === todayStr && dedSessions.indexOf(session.charAt(0)) >= 0) {
        alreadyDeducted = true;
      }
    }

    const mealsAfter = alreadyDeducted ? remaining : remaining - 1;

    list.push({
      orderNumber: orderNum,
      customerName: row[2],
      phone: row[4],
      address: row[5],
      session: session,
      foodType: foodType,
      mealsRemaining: mealsAfter,
      currentRemaining: remaining,
      alreadyDeducted: alreadyDeducted,
      specialInstructions: row[21] || '',
    });
  }
  return list;
}

function getKitchenListData() {
  const k = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KITCHEN_SHEET);
  if (k.getLastRow() < 2) return [];
  return k.getRange(2, 1, k.getLastRow() - 1, 8).getValues().map(r => ({
    orderNumber: r[0], customerName: r[1], phone: r[2], address: r[3],
    session: r[4], foodType: r[5], mealsRemaining: r[6], specialInstructions: r[7]
  }));
}

function getAllOrders() {
  const db = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ORDER_DB_SHEET);
  if (db.getLastRow() < 2) return [];
  return db.getRange(2, 1, db.getLastRow() - 1, 22).getValues().filter(r => r[0]).map(r => ({
    orderNumber: r[0], timestamp: r[1], customerName: r[2], email: r[3],
    phone: r[4], address: r[5], planDuration: r[6], mealCombo: r[7],
    foodPreference: r[8], startDate: r[9],
    breakfastTotal: r[10], breakfastRemaining: r[11],
    lunchTotal: r[12], lunchRemaining: r[13],
    dinnerTotal: r[14], dinnerRemaining: r[15],
    totalAmount: r[17], paymentMethod: r[18], paymentStatus: r[19],
    status: r[20], specialInstructions: r[21],
  }));
}

function skipMeal(orderNumber, session) {
  if (!orderNumber || !SESSIONS.includes(session)) return { error: 'Invalid params' };
  const db = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ORDER_DB_SHEET);
  const data = db.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === orderNumber) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = formatDate(today);
      const lastDedRaw = String(data[i][16] || '');
      let dedDate = '', dedSessions = [];
      if (lastDedRaw.includes('|')) {
        const parts = lastDedRaw.split('|');
        dedDate = parts[0];
        dedSessions = parts[1] ? parts[1].split(',') : [];
      }
      if (dedDate !== todayStr) { dedDate = todayStr; dedSessions = []; }
      if (dedSessions.indexOf(session.charAt(0)) < 0) dedSessions.push(session.charAt(0));
      db.getRange(i + 1, 17).setValue(dedDate + '|' + dedSessions.join(','));
      return { success: true, message: `Skipped ${session} for ${orderNumber} on ${todayStr}` };
    }
  }
  return { error: 'Order not found' };
}
