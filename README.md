# 🕊️ SimamiaKanisa Church Management System

> **Multi-tenant Church Management Platform — Built for Kenyan Churches**

SimamiaKanisa is a **multi-tenant** church management platform where each church gets its own private, isolated workspace. One deployment serves unlimited churches — each with their own members, contributions, pledges, and analytics — with zero data crossover between churches.

---

## Table of Contents

- [Features](#features)
- [Multi-tenancy](#multi-tenancy)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Firestore Security Rules](#firestore-security-rules)
- [Cloud Functions](#cloud-functions)
- [User Roles](#user-roles)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### Member Management
- Add, edit, and delete church members
- Organize by ministry/group (Youth, Choir, Women, Men, Elders, Ushers)
- Store contact information with phone numbers
- Member statistics on dashboard

### Contributions & Tithes
- Record Tithes, Offerings, Building Fund, Mission, and other contributions
- Support for M-Pesa, Cash, and Bank Transfer
- Real-time contribution tracking and monthly summaries
- Breakdown by contribution type

### Event Management
- Create and manage church events
- Track date, time, and expected attendance
- Upcoming and past event views

### Pledge Management
- Create pledges with categories (Building Fund, Mission, Equipment, Other)
- Track payments, balances, and pledge status (Active, Completed, Overdue)
- Payment history per pledge
- WhatsApp reminder integration with pre-formatted messages
- CSV export of pledge reports

### Analytics & Reports
- Real-time dashboard with key metrics
- Monthly collection trends (Chart.js)
- Category breakdown, top contributors, participation rate
- Growth rate tracking
- Export to Excel (CSV) and PDF (jsPDF)

### Security & Authentication
- Firebase Authentication (email/password)
- JWT custom claims for tenant isolation (`tenantId`, `role`)
- Role-based access control (Admin, Editor, Member)
- Protected routes with automatic redirect
- Cloud Function enforces tenant claim on registration

### WhatsApp Integration
- One-click pledge reminders via WhatsApp
- Pre-formatted messages with pledge balance and payment options

---

## Multi-tenancy

Each church is a **tenant** — completely isolated from all other churches.

```
Firestore
└── tenants/
    ├── gracefellowship/
    │     ├── members/
    │     ├── contributions/
    │     ├── events/
    │     ├── pledges/
    │     └── pledge_payments/
    └── deliverance/
          ├── members/
          ├── contributions/
          └── ...
```

**How isolation works:**

| Layer | Mechanism |
|---|---|
| URL | Each church accesses via `?tenant=churchid` or subdomain |
| JWT | `tenantId` baked into Firebase Auth token as custom claim |
| Firestore Rules | `request.auth.token.tenantId == tenantId` enforced on every read/write |
| Client | All collection refs go through `tenantRef()` in `firebase-config.js` |

**Onboarding a new church:**
1. Church admin visits `register-church.html`
2. Fills in church name and admin credentials
3. System creates the tenant document and admin member doc
4. Cloud Function stamps `tenantId` + `role: admin` into the JWT
5. Church receives their login URL: `login.html?tenant=churchid`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Database | Cloud Firestore (NoSQL, real-time) |
| Auth | Firebase Authentication + Custom Claims |
| Functions | Firebase Cloud Functions v2 (Node 20) |
| Charts | Chart.js 4 |
| PDF export | jsPDF + jsPDF-AutoTable |
| Hosting | Firebase Hosting / Vercel |

---

## Project Structure

```
simamiakanisa/
├── index.html                  # Main app shell
├── login.html                  # Login page
├── register.html               # Staff registration
├── register-church.html        # New church onboarding
│
├── firebase-config.js          # Firebase init + tenant resolution + collection helpers
├── auth.js                     # Auth: login, register, protectPage, authReady event
├── main.js                     # Bootstrap, dashboard, tab switching
├── state.js                    # Global state arrays (members, contributions, etc.)
├── pagination.js               # Shared pagination logic
├── members.js                  # Members tab
├── contributions.js            # Contributions tab
├── events.js                   # Events tab
│
├── PLEDGES/
│   ├── Pledges.js              # Entry point
│   ├── Pledges.db.js           # Tenant-scoped Firestore refs
│   ├── Pledges.state.js        # Pledges in-memory state
│   ├── Pledges.data.js         # Firebase load, create, record payment
│   ├── Pledges.stats.js        # Summary card updates
│   ├── Pledges.table.js        # Table render + pagination
│   ├── Pledges.modals.js       # Create / pay / history modals
│   └── Pledges.ui.js           # Layout HTML, export CSV, WhatsApp, modals HTML
│
├── ANALYTICS/
│   ├── Analytics.js            # Entry point
│   ├── Analytics.db.js         # Tenant-scoped Firestore refs
│   ├── Analytics.state.js      # Analytics in-memory state
│   ├── Analytics.data.js       # Filter, growth rate, year range
│   ├── Analytics.summary.js    # Summary card updates
│   ├── Analytics.charts.js     # All 5 Chart.js renderers
│   ├── Analytics.export.js     # CSV + PDF export
│   └── Analytics.ui.js         # Layout HTML + error display
│
├── functions/
│   ├── index.js                # setTenantClaim + promoteUser Cloud Functions
│   └── package.json
│
├── style.css                   # Global styles
├── pledges.css                 # Pledges-specific styles
├── analytics.css               # Analytics-specific styles
├── CSS/
│   └── mobileNav.css           # Mobile navigation styles
│
├── firestore.rules             # Firestore security rules
├── storage.rules               # Firebase Storage rules
├── firebase.json               # Firebase project config
└── images/
    └── church.jpeg             # Default church logo
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/maxoti/simamiakanisa.git
cd simamiakanisa
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Enable **Authentication → Email/Password**
4. Create a **Firestore Database** in production mode
5. Upgrade to **Blaze plan** (required for Cloud Functions)

### 3. Configure Firebase

Open `firebase-config.js` and update:

```javascript
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### 4. Install and deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only "functions,firestore:rules"
```

### 5. Run locally

```bash
# VS Code Live Server (recommended)
# Or:
npx http-server -p 5501
```

Visit `http://127.0.0.1:5501/register-church.html` to register your first church.

---

## Firestore Security Rules

All data is isolated by `tenantId` — enforced server-side so even a buggy client cannot access another church's data.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function ownTenant(tenantId) {
      return request.auth != null
          && request.auth.token.tenantId == tenantId;
    }

    function hasRole(tenantId, role) {
      return ownTenant(tenantId)
          && request.auth.token.role == role;
    }

    match /tenants/{tenantId} {
      allow read:   if request.auth != null;
      allow create: if request.auth != null
                    && !exists(/databases/$(database)/documents/tenants/$(tenantId))
                    && request.resource.data.tenantId == tenantId;
      allow update, delete: if request.auth.token.role == "superadmin";

      match /members/{memberId} {
        allow read:   if request.auth != null
                      && (ownTenant(tenantId) || request.auth.uid == memberId);
        allow create: if request.auth != null && request.auth.uid == memberId;
        allow update: if hasRole(tenantId, "admin") || request.auth.uid == memberId;
        allow delete: if hasRole(tenantId, "admin");
      }

      match /contributions/{docId}    { allow read, write: if ownTenant(tenantId); }
      match /pledges/{pledgeId}       { allow read, write: if ownTenant(tenantId); }
      match /pledge_payments/{id}     { allow read, write: if ownTenant(tenantId); }
      match /events/{eventId}         { allow read, write: if ownTenant(tenantId); }
      match /analytics/{docId} {
        allow read:  if ownTenant(tenantId);
        allow write: if hasRole(tenantId, "admin");
      }
    }

    match /{document=**} { allow read, write: if false; }
  }
}
```

---

## Cloud Functions

Two functions in `functions/index.js`:

| Function | Purpose |
|---|---|
| `setTenantClaim` | Called on registration — stamps `tenantId` + `role` into the user's JWT |
| `promoteUser` | Called by admin — changes a member's role within the same tenant |

Deploy:
```bash
firebase deploy --only functions
```

---

## User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — manage members, contributions, events, pledges, analytics |
| `editor` | Add/edit members, contributions, events, pledges |
| `member` | Read-only access |

Roles are enforced in both the UI (buttons shown/hidden) and Firestore Rules (server-side).

---

## Usage

### Register a new church

1. Visit `register-church.html`
2. Enter church name — your workspace ID is auto-generated
3. Enter admin email and password
4. Click **Create Church Workspace**
5. Share the login URL with your staff: `login.html?tenant=yourchurchid`

### Add members

1. Login → **Members** tab → **+ Add Member**

### Record a contribution

1. **Contributions** tab → **+ Record Contribution**
2. Select member, type, amount, and payment method

### Create a pledge

1. **Pledges** tab → **+ New Pledge**
2. Select member, category, amount, and dates

### Send a pledge reminder

1. In the Pledges table, click **WhatsApp**
2. Pre-formatted message opens in WhatsApp Web

---

## Roadmap

- [ ] Email reports (scheduled PDF delivery)
- [ ] Attendance tracking
- [ ] Mobile app (PWA)
- [ ] Subdomain routing per church (`church.simamiakanisa.co.ke`)
- [ ] Superadmin dashboard (manage all tenants)
- [ ] Automated Firestore backups
- [ ] Offline mode with sync

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

- GitHub Issues: [Report a bug](https://github.com/maxoti/simamiakanisa/issues)
- Email: support@simamiakanisa.com

---


**Built with  for Kenyan Churches**

 Star this repo if it's useful!

