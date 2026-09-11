# Pulari Arts & Sports Club – Membership Management System

A simple, modern, fast, and responsive web application designed for **Pulari Arts & Sports Club** to manage club members and monthly membership fee collections.

Built using HTML5, CSS3, Vanilla JavaScript, Google Apps Script, and Google Sheets as the database backend. Fully compatible with GitHub Pages hosting.

---

## 🌟 Key Features

* **Interactive Dashboard**:
  * Active Member count
  * Paid members this month
  * Pending/Unpaid members this month
  * Total collected amount for current month
  * 6-Month dynamic SVG collection trend bar chart
  * Paid vs Unpaid status doughnut chart
* **Members Management**:
  * Member table listing (`Member ID`, `Name`, `Phone`, `Join Date`, `Status`, `Action`)
  * Auto-generated Member IDs (`PUL001`, `PUL002`, `PUL003`...)
  * Real-time search (Name, ID, Phone) and Active/Inactive filter
  * Member addition, edit, deactivation, and detailed payment history view
* **Monthly Fee Collection**:
  * Dynamic Month & Year selector with "Current Month" quick button
  * Single-click **Mark Paid** / **Mark Unpaid** confirmation flow
  * Built-in **Duplicate Payment Protection** (`Member ID` + `Month` + `Year`)
* **Monthly Reports**:
  * Collection stats, collection percentage rate (%)
  * Detailed lists of Paid and Unpaid members
  * One-click **Print Report** (`window.print()`)
  * Client-side **Export CSV** download
* **Local Demo Fallback**:
  * Works out-of-the-box in the browser using `localStorage` even before connecting Google Sheets!

---

## 📁 Project Structure

```
pulari-club/
│
├── index.html              # Main Single-Page Dashboard
├── css/
│   └── style.css           # Custom styling system, responsive layout, print styles
│
├── js/
│   ├── api.js              # API client (Google Apps Script fetch & LocalStore fallback)
│   ├── app.js              # State manager, auth controller, navigation, toasts
│   ├── dashboard.js        # Dashboard view & dynamic SVG charts
│   ├── members.js          # Member CRUD & modal logic
│   ├── payments.js         # Monthly payment grid & payment confirmation logic
│   ├── reports.js          # Monthly metrics, print trigger, CSV export
│   └── settings.js         # Fee settings, club parameters & Apps Script URL check
│
├── google_apps_script/
│   └── Code.gs             # Backend Google Apps Script API
│
└── README.md               # Documentation & Deployment guide
```

---

## 📊 Part 1: Google Sheet Setup Instructions

1. Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Name the spreadsheet: **`Pulari Club Database`**.
3. Create 3 tabs (sheets) with the exact names:
   * **`Members`**
   * **`Payments`**
   * **`Settings`**

### Sheet Columns & Structure

#### 1. `Members` Sheet
Add these headers in **Row 1**:
| Member ID | Full Name | Phone | Address | Join Date | Monthly Fee | Status | Notes | Created At | Updated At |
| --------- | --------- | ----- | ------- | --------- | ----------- | ------ | ----- | ---------- | ---------- |

#### 2. `Payments` Sheet
Add these headers in **Row 1**:
| Payment ID | Member ID | Member Name | Month | Year | Amount | Payment Date | Payment Method | Status | Notes | Created At |
| ---------- | --------- | ----------- | ----- | ---- | ------ | ------------ | -------------- | ------ | ----- | ---------- |

#### 3. `Settings` Sheet
Add these headers in **Row 1**:
| Setting | Value |
| ------- | ----- |
| `monthly_fee` | `100` |
| `club_name` | `Pulari Arts & Sports Club` |
| `currency` | `₹` |
| `admin_password` | `admin` |

*(Note: The Apps Script backend will automatically create missing sheets and headers if they are not present on first execution!)*

---

## ⚙️ Part 2: Google Apps Script Backend Deployment

1. Open your **Pulari Club Database** Google Sheet.
2. Click **Extensions** → **Apps Script** in the top menu.
3. Replace all code in `Code.gs` with the code provided in [`google_apps_script/Code.gs`](file:///c:/Users/asimj/Documents/gitpulari/Membership/membershipfees/google_apps_script/Code.gs).
4. Click **Save** (💾 icon).
5. Click **Deploy** → **New deployment** (top right).
6. Click the gear icon ⚙️ next to *Select type* and select **Web app**.
7. Enter a description (e.g. *Pulari Club Backend API v1*).
8. Set **Execute as**: `Me (your-email@gmail.com)`
9. Set **Who has access**: `Anyone`
10. Click **Deploy**.
11. Grant the requested permissions when prompted.
12. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/AKfycbx.../exec`).

---

## 🚀 Part 3: Connecting Frontend to Backend

1. Open the application in your browser (or on GitHub Pages).
2. Go to **Settings** page from the sidebar menu.
3. Paste your copied **Google Apps Script Web App URL** into the URL field.
4. Click **Test API Connection**.
5. Click **Save Settings**.

---

## 💻 Part 4: Deploying to GitHub Pages

1. Create a public repository on [GitHub](https://github.com) named `pulari-club`.
2. Commit and push all files (`index.html`, `css/`, `js/`, `README.md`) to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial release of Pulari Arts & Sports Club Membership System"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pulari-club.git
   git push -u origin main
   ```
3. On GitHub, go to your repository **Settings** → **Pages**.
4. Under **Build and deployment**, select **Source**: `Deploy from a branch`.
5. Select branch: `main`, folder: `/ (root)`.
6. Click **Save**.
7. Your web application is now live at: `https://YOUR_USERNAME.github.io/pulari-club/`

---

## 🔒 Security & Admin Access

* Initial Admin Password: **`admin`**
* You can change the admin password anytime from the **Settings** tab.
* Google Sheet credentials and secrets are kept entirely private inside Google Apps Script and never exposed in frontend code.

---

## 📄 License & Ownership
Created for **Pulari Arts & Sports Club**. Free to customize and adapt for local sports and cultural clubs.
