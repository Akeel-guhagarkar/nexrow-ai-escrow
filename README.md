# SupremeX — Setup Guide

## 🔥 Firebase Setup (Step-by-Step)

---

### Step 1: Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it `supremex` (or anything you like)
4. Disable Google Analytics (optional for prototype)
5. Click **Create Project**

---

### Step 2: Enable Authentication

1. In Firebase Console → left sidebar → **Authentication**
2. Click **Get Started**
3. Under **Sign-in method** → Enable **Email/Password**
4. Click **Save**

---

### Step 3: Create Firestore Database

1. Left sidebar → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for prototype)
4. Select a region (e.g., `asia-south1` for India)
5. Click **Enable**

#### Firestore Security Rules (paste in Rules tab):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Deals: only participants can read/write
    match /deals/{dealId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.participants;
    }
  }
}
```

#### Firestore Composite Index:
Create this index for the dashboard query to work:
- Collection: `deals`
- Field 1: `participants` (Arrays)
- Field 2: `createdAt` (Descending)

Go to: Firestore → Indexes → Add Index

---

### Step 4: Enable Storage

1. Left sidebar → **Storage**
2. Click **Get Started**
3. Start in test mode
4. Click **Done**

#### Storage Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /proofs/{dealId}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

### Step 5: Get Your Firebase Config

1. In Firebase Console → ⚙️ **Project Settings**
2. Under **Your apps** → click **</>** (Web)
3. Register the app (name: `supremex-web`)
4. Copy the `firebaseConfig` object

---

### Step 6: Add Config to the Project

Open `js/firebase.js` and replace the placeholder config:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",           // ← Your actual values
  authDomain:        "supremex-abc.firebaseapp.com",
  projectId:         "supremex-abc",
  storageBucket:     "supremex-abc.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

### Step 7: Serve the Project

Since the project uses ES Modules (`import`/`export`), you CANNOT open HTML files directly.  
You must use a local server.

**Option A — VS Code Live Server:**
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → **Open with Live Server**

**Option B — Python:**
```bash
cd supremex
python3 -m http.server 8080
# Open: http://localhost:8080
```

**Option C — Node.js `serve`:**
```bash
npx serve supremex
```

---

## 📁 Project Structure

```
supremex/
├── index.html              ← Login / Signup
├── css/
│   └── style.css           ← Shared styles (all pages)
├── js/
│   └── firebase.js         ← Firebase config + shared utilities
└── pages/
    ├── dashboard.html      ← Main dashboard, view all deals
    ├── create-deal.html    ← Create new escrow deal
    ├── payment.html        ← Simulated payment + locking
    ├── upload-proof.html   ← Provider uploads delivery proof
    ├── otp-verify.html     ← Client verifies with OTP
    └── status.html         ← Deal tracker (real-time updates)
```

---

## 🔄 How the Flow Works

```
CLIENT ACTIONS:
  1. Sign up as "Client"
  2. Create Deal → enter title, amount, provider's email, deadline
  3. Go to Payment page → click "Lock in Escrow"
     Status: PENDING → LOCKED

PROVIDER ACTIONS:
  4. Sign up as "Provider" (use the email client entered)
  5. On Dashboard, they see the deal assigned to them
  6. Click → go to Status page → click "Upload Proof"
  7. Upload image/video/doc or paste a URL
     Status: LOCKED → DELIVERED

CLIENT ACTIONS:
  8. Gets notified (via Dashboard real-time update)
  9. Reviews proof on OTP Verify page
  10. Enters OTP: 1234 (demo)
      Status: DELIVERED → RELEASED

SYSTEM: Payment is released to provider ✅
```

---

## 🎯 Demo OTP

For this prototype, the OTP is always: **`1234`**

In production, you would:
- Send OTP via Firebase Functions + Twilio (SMS)
- Or via Firebase Email extension
- Or generate random 6-digit code stored in Firestore

---

## ⚡ Key Features

| Feature | Implementation |
|---------|---------------|
| Authentication | Firebase Auth (Email/Password) |
| Deal Storage | Firestore `deals` collection |
| User Profiles | Firestore `users` collection |
| File Upload | Firebase Storage (`proofs/` folder) |
| Real-time Updates | Firestore `onSnapshot` on Status page |
| Payment Simulation | UI animation, no real gateway |
| OTP Verification | Simulated (stored in Firestore, always 1234) |
| Dispute System | Sets status to `DISPUTED`, locks funds |
| Role-based Access | Client vs Provider, checked on every page |

---

## 🚨 Hackathon Tips

1. **Demo flow**: Create 2 accounts (one client, one provider) to show the full flow
2. **Real-time**: The Status page auto-updates without refresh — show this live!
3. **Dispute feature**: Create a deal and raise a dispute to show the safety net
4. **Mobile-friendly**: The UI is responsive — show on phone for extra points

---

## 🛠 Troubleshooting

**"Firebase: Error (auth/operation-not-allowed)"**
→ Enable Email/Password auth in Firebase Console

**"Missing or insufficient permissions"**
→ Check Firestore rules — ensure test mode is active

**"No deals showing on dashboard"**
→ Create the composite index in Firestore Console

**"CORS error / Module not found"**
→ Use a local server (Live Server, Python, etc.) — not file:// 

**Storage upload fails**
→ Enable Firebase Storage and set rules to test mode
