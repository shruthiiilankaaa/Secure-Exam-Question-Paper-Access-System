# Secure Exam Question Paper Access System — Person D Deliverable

## Role: Person D (Frontend, Tamper-Evident Audit Logging & Verification)

This directory (`person-d-frontend-audit`) contains the complete frontend web application, API integration, and cryptographic tamper-evident audit logging and verification engine for the **Secure Exam Question Paper Access System**.

---

## 🌟 Key Features Implemented

### 1. Responsive Cyber-Security Web Portal (Part 1)
- **Login Page (`public/index.html`, `js/auth.js`)**:
  - Secure institutional email + password authentication.
  - JWT token storage and automated session state tracking.
  - Role-based automatic redirection to specialized views.
  - **1-Click Quick Demo Login buttons** for rapid evaluation across all 4 roles.
- **Role-Specific Dashboards (`js/app.js`)**:
  - **Admin**: Full cryptographic ledger supervision, tamper simulation, system metrics, consensus tracking.
  - **Setter**: Question paper encryption upload studio, Shamir threshold configuration, metadata tracking.
  - **Approver**: Pending cryptographic authorizations, approval status board, digital signature & share registration.
  - **Invigilator**: Exam unlock request dispatch, exam window countdowns, paper decryption & download.
- **Question Paper Upload Page (`view-upload`)**:
  - PDF file upload dropzone (drag-and-drop or file selector).
  - Metadata: Course Code, Title, Department, Semester, Total Marks.
  - Exam Time-Lock Window (Start time, End time, Date).
  - Shamir Secret Sharing configuration: Threshold $k$ (minimum approvals needed) and Total Shares $n$.
  - Connected directly to Person B's `paperCrypto.js` for AES-256-GCM encryption.
- **Unlock Request Page (`view-unlock`)**:
  - Invigilator submits unlock requests for designated examination halls with reasons.
  - Live active requests tracking table.
- **Approval Status Page (`view-approvals`)**:
  - Real-time consensus board with dynamic status badges:
    - 🟡 **Pending**: Awaiting threshold $k$ approver signatures.
    - 🔵 **Approved**: Threshold met.
    - 🔴 **Rejected**: Denied by an approver.
    - 🔒 **Time Locked**: Threshold approvals met, but current time is before the scheduled exam window.
    - 🟢 **Ready for Exam**: Threshold approvals met **AND** current time is within the exam window.
  - Approvers can sign off or reject with remarks in 1 click.
  - Invigilators can decrypt and download original PDF once status is `READY_FOR_EXAM`.

### 2. Tamper-Evident Hash Chain Audit System (Part 3)
- Hash Formula:
  $$\text{CurrentHash} = \text{SHA-256}(\text{previousHash} + \text{timestamp} + \text{userId} + \text{action} + \text{paperId})$$
- Strict chronological append-only immutability.
- Automatically records entries after important actions:
  - `USER_LOGIN`
  - `USER_REGISTERED`
  - `PAPER_UPLOAD`
  - `UNLOCK_REQUEST`
  - `PAPER_APPROVED`
  - `PAPER_REJECTED`
  - `PAPER_DECRYPTED`
  - `AUDIT_VERIFIED`

### 3. Audit Verification Engine (Part 4)
- Recalculates the entire hash chain from Genesis block ($0000\dots0000$) to the latest block.
- Confirms linkage: $\text{record}[i].\text{previousHash} == \text{record}[i-1].\text{currentHash}$.
- Recomputes SHA-256 hash for every block and compares against stored hash.
- **Tampering Detection**:
  - Pinpoints the exact index of the first corrupted record.
  - Displays stored hash vs recomputed hash.
  - Visually flags the corrupted row in the UI with a glowing red diagnostic banner.
- **Tamper Simulation & Restoration**:
  - Built-in simulation tool allows evaluators to tamper with any block in 1 click to test the detection engine.
  - One-click restore button recovers genuine cryptographic state.

### 4. Audit History UI (Part 5)
- Search and filter by user, role, action, or keywords.
- Cryptographic Proof Modal showing raw string concatenation and computed SHA-256 hash.

---

## 🔑 Pre-Configured Demo Credentials (1-Click Login)

| Role | Name | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Prof. Robert Vance | `admin@exam.edu` | `Admin@123` | Full audit verification, tamper testing, all papers |
| **Setter** | Dr. Alan Turing | `setter@exam.edu` | `Setter@123` | Paper upload, AES-256 encryption, Shamir split |
| **Approver 1** | Prof. Margaret Hamilton (HOD) | `hod@exam.edu` | `Approver@123` | Sign share 1/2, approve/reject papers |
| **Approver 2** | Dr. Claude Shannon (Controller) | `controller@exam.edu` | `Approver@123` | Sign share 2/2, grant threshold consensus |
| **Invigilator** | Sarah Connor | `invigilator@exam.edu` | `Invigilator@123` | Submit unlock request, decrypt & download paper |

---

## 🚀 How to Run the Application

```bash
# 1. Navigate to Person D directory
cd person-d-frontend-audit

# 2. Run the server (runs with zero-config out of the box)
npm start
```

Open your browser at: **`http://localhost:5000`**

### Running the Test Suites

```bash
# Unit test for cryptographic audit verification
node test/audit-test.js

# Complete end-to-end integration and demonstration suite
node test/e2e-demo.js
```

---

## 📁 Directory Structure & File Listing

```
person-d-frontend-audit/
├── package.json                   # Standalone scripts and dependencies
├── server.js                      # Express server serving APIs and static UI
├── README.md                      # Documentation and evaluation guide
├── services/
│   ├── auditLogger.js             # SHA-256 hash-chain engine, tamper verification & recovery
│   ├── cryptoAdapter.js           # Seamless integration with crypto-core/paperCrypto.js
│   └── dataStore.js               # Zero-config store pre-seeded with demo accounts & papers
├── middleware/
│   ├── authMiddleware.js          # JWT token verification (aligned with Person A)
│   └── roleMiddleware.js          # Role-based authorization
├── controllers/
│   ├── authController.js          # Signup, Login, Demo accounts
│   ├── paperController.js         # Upload, Approvals, Unlock requests, Decryption
│   └── auditController.js         # Ledger history, Verification, Tamper simulation
├── routes/
│   ├── authRoutes.js              # /api/auth/*
│   ├── paperRoutes.js             # /api/papers/*
│   └── auditRoutes.js             # /api/audit/*
├── test/
│   ├── audit-test.js              # Hash chain and tamper detection unit test
│   └── e2e-demo.js                # Full 10-step end-to-end demonstration suite
└── public/                        # Premium Cyber-Dark Responsive Web Application
    ├── index.html                 # Single page application layout
    ├── css/
    │   ├── main.css               # Design tokens, typography, glassmorphism, animations
    │   └── components.css         # Status badges, dropzones, tables, modals, banners
    └── js/
        ├── api.js                 # API client with JWT handling
        ├── auth.js                # Authentication state, session storage, demo logins
        └── app.js                 # View orchestrator, live approval board, verification engine
```
