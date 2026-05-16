Building DabbaBook deployment for new client. Use the master templates we built (DabbaBook\_Master\_AppScript.gs, DabbaBook\_Master\_Page.js, DabbaBook\_Master\_Pickup.js). I'll give you Phase 1 info — generate the three files with CLIENT\_CONFIG block filled in, ready to paste.



# DabbaBook — New Client Onboarding Checklist

**Target time: 30 minutes**

\---

## Phase 1 — Info Gathering (5 min)

Fill this before touching code:

* \[ ] Business name:
* \[ ] Order prefix (3 letters + dash, e.g. `NB-`):
* \[ ] Owner email:
* \[ ] Brand colour (hex): Take from attached logo
* \[ ] Logo emoji: Take from attached logo
* \[ ] Plans + meal counts per session:

  * Plan 1 name: Single | Meals: 1
  * Plan 2 name: Weekly | Meals: 7
  * Plan 3 name: Monthly | Meals: 30
* \[ ] Pricing per session (veg / non-veg):
* Single Breakfast: ₹ 50
* Single Lunch: ₹80 / ₹ 120
* Single Dinner: ₹80 / ₹ 120
* 
* Monthly Breakfast: ₹ 2000
* Monthly Lunch: ₹2500 / ₹ 3600
* Monthly Dinner: ₹2500 / ₹ 3600



* Monthly Breakfast + Veg Lunch : ₹ 5500
* Monthly Breakfast + Non Veg Lunch : ₹ 8700
Monthly Breakfast + Veg Dinner : ₹ 5500
* Monthly Breakfast + Non Veg Dinner : ₹ 8700
* Monthly Veg Lunch + Veg Dinner: ₹5000
* Monthly Non Veg Lunch + Non Veg Dinner: ₹7200

\[ ] Dashboard username + password (decide now):

* \[ ] Auth key (unique, e.g. `nb\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_authed`): \_authed
* \[ ] **Dabba Tracker enabled?** Yes / No:

  * If Yes → which sessions issue dabbas? (default: Lunch + Dinner)

\---

## Phase 2 — Google Side (10 min)

* \[ ] Create Google Sheet → name it `\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\[Business] - DabbaBook`
* \[ ] Create linked Google Form (matching Protein Baba's 12 questions in same order)
* \[ ] Open Sheet → Extensions → Apps Script
* \[ ] Paste **DabbaBook\_Master\_AppScript.gs**
* \[ ] Edit `CLIENT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_CONFIG` block at top with Phase 1 info

  * \[ ] Set `FEATURES.dabbaTracker` to `true` or `false` to match Phase 1 decision
* \[ ] Save → Refresh sheet
* \[ ] **DabbaBook menu → Step 1: Setup Sheets** ✅

  * Confirm: Order Database, Kitchen Order List, Config sheets created
  * If dabba enabled: Dabba Log sheet also created
* \[ ] **DabbaBook menu → Step 2: Install Trigger** ✅
* \[ ] Open Config sheet → copy `API\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_TOKEN` value (UUID)
* \[ ] Open Config sheet → note the auto-generated `DAILY\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_PIN` (4 digits, rotates daily)
* \[ ] Deploy → New deployment → Web app → Execute as: Me, Access: Anyone
* \[ ] Copy Web App URL

\---

## Phase 3 — Vercel Side (10 min)

* \[ ] GitHub: Create new repo `dabbabook-\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\[client-slug]`
* \[ ] Copy Protein Baba repo structure (or template repo if exists)
* \[ ] Replace `app/page.js` with **DabbaBook\_Master\_Page.js**

  * \[ ] Edit `CLIENT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_CONFIG` block — must match `FEATURES.dabbaTracker` from AppScript
* \[ ] **If dabba enabled:** Create `app/pickup/page.js` from **DabbaBook\_Master\_Pickup.js**

  * \[ ] Edit `CLIENT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_CONFIG` block — keep colours/branding consistent with main page
* \[ ] Verify `app/api/proxy/route.js` exists (CORS proxy — required)
* \[ ] Push to GitHub
* \[ ] Vercel: Import repo → New Project
* \[ ] Add env vars:

  * \[ ] `NEXT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_PUBLIC\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_URL` = Apps Script Web App URL
  * \[ ] `NEXT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_PUBLIC\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_TOKEN` = UUID from Config sheet
  * \[ ] `NEXT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_PUBLIC\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_USERNAME` = dashboard username
  * \[ ] `NEXT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_PUBLIC\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_PASSWORD` = dashboard password
* \[ ] Deploy

\---

## Phase 4 — Smoke Test (5 min)

**Core flow:**

* \[ ] Submit a test order via Google Form
* \[ ] Check Order Database sheet — order appears with correct prefix
* \[ ] Check owner email — notification received
* \[ ] Open Vercel URL → log in → Today's Overview loads
* \[ ] Generate Kitchen List for today → Lunch → Preview shows test order
* \[ ] Click **Confirm \& Deduct** → counter decreases by 1

**Dabba flow (if enabled):**

* \[ ] Open **Dabba Tracker** tab → confirmed Lunch dabba appears as Pending
* \[ ] Note Today's PIN displayed (4 digits)
* \[ ] Open `\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\[vercel-url]/pickup` in new tab/phone
* \[ ] Enter PIN → see test customer with 1 pending dabba
* \[ ] Click "✓ Collected 1 dabba" → success message
* \[ ] Back to admin Dabba Tracker → status changed to Returned

**Cleanup:**

* \[ ] Delete test order from sheet (also delete its row from Dabba Log if present)

\---

## Phase 5 — Handover

* \[ ] Share Vercel URL + login credentials with client
* \[ ] Share Google Form link (for them to embed/share)
* \[ ] **If dabba enabled:**

  * \[ ] Share `\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\[vercel-url]/pickup` URL with delivery team
  * \[ ] Show client how to read/update Daily PIN from Dabba Tracker tab
  * \[ ] Explain: PIN auto-rotates daily, can be manually overridden if needed
* \[ ] Walk client through tabs: Today's Overview, Generate Kitchen List, Orders, Dabba Tracker
* \[ ] Add client to active deployments tracker

\---

## Common Gotchas

**General:**

* **Apps Script schema mismatch** — verify Form question order matches `processOrder()` column mapping (timestamp, email, name, phone, address, plan, combo, pref, start date, payment method, payment status, instructions)
* **CORS errors in dashboard** — `app/api/proxy/route.js` missing
* **"Invalid token"** — token in Vercel env doesn't match Config sheet
* **Dates not comparing** — Start Date column must be formatted as date, not text
* **Order prefix not applied** — saved Apps Script before refreshing sheet menu

**Dabba Tracker specific:**

* **Tab not appearing** — `FEATURES.dabbaTracker` mismatch between AppScript and page.js, or page.js not redeployed
* **Dabba Log sheet missing** — feature was off when Step 1 ran; turn on, save, run Step 1 again
* **Pickup page shows "Invalid PIN"** — PIN displayed in admin is for *today only*, midnight rotation. Refresh admin tab to see new PIN.
* **Dabbas not logging** — only logs on **Confirm \& Deduct**, not on Preview. Only logs for sessions in `DABBA.sessions` (Lunch + Dinner by default)
* **Same dabba logged twice** — should be impossible (idempotent on order+session+date), but if seen, check for duplicate entries in Dabba Log sheet manually

