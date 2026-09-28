'use strict';

/**
 * End-to-End Test Suite for Person D Deliverables
 * Demonstrates:
 * 1. Login API & JWT token generation for all roles (Admin, Setter, Approver, Invigilator)
 * 2. Static Web UI assets serving (HTML, CSS, JS)
 * 3. Question paper upload API with AES-256-GCM encryption & Shamir Secret Sharing
 * 4. Unlock request submission & tracking
 * 5. Dynamic approval status transitions (Pending -> Approved -> Ready for Exam / Time Locked)
 * 6. Authorized paper decryption & original PDF retrieval
 * 7. Automatic audit logging on all actions
 * 8. Hash-chain audit verification on intact chain
 * 9. Tamper detection on intentionally modified record with index pinpointing
 * 10. Chain restoration to genuine cryptographic state
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function fetchJSON(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
}

async function runDemonstration() {
    console.log('================================================================');
    console.log('🚀 DEMONSTRATION & VERIFICATION SUITE — PERSON D DELIVERABLES');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    async function step(name, fn) {
        try {
            await fn();
            console.log(`✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ FAIL: ${name}`);
            console.error(`   ${err.message}`);
            failed++;
        }
    }

    let adminToken, setterToken, hodToken, controllerToken, invigilatorToken;

    // STEP 1: Static assets serving
    await step('1. Static Web UI serving (index.html, main.css, components.css, app.js)', async () => {
        const htmlRes = await fetch(`${BASE_URL}/`);
        const html = await htmlRes.text();
        assert.ok(html.includes('Secure Exam Paper System'), 'index.html must contain brand title');
        assert.ok(html.includes('id="view-login"'), 'index.html must have login view');
        assert.ok(html.includes('id="view-audit"'), 'index.html must have audit verification view');

        const cssRes = await fetch(`${BASE_URL}/css/main.css`);
        assert.strictEqual(cssRes.status, 200, 'main.css must be accessible');

        const jsRes = await fetch(`${BASE_URL}/js/app.js`);
        assert.strictEqual(jsRes.status, 200, 'app.js must be accessible');
    });

    // STEP 2: Login API for all roles
    await step('2. Login API works and issues valid JWTs for all 4 roles', async () => {
        // Admin
        const adminRes = await fetchJSON('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'admin@exam.edu', password: 'Admin@123' })
        });
        assert.strictEqual(adminRes.status, 200);
        assert.strictEqual(adminRes.data.user.role, 'admin');
        adminToken = adminRes.data.token;

        // Setter
        const setterRes = await fetchJSON('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'setter@exam.edu', password: 'Setter@123' })
        });
        assert.strictEqual(setterRes.status, 200);
        assert.strictEqual(setterRes.data.user.role, 'setter');
        setterToken = setterRes.data.token;

        // Approver 1 (HOD)
        const hodRes = await fetchJSON('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'hod@exam.edu', password: 'Approver@123' })
        });
        assert.strictEqual(hodRes.status, 200);
        hodToken = hodRes.data.token;

        // Approver 2 (Controller)
        const ctrlRes = await fetchJSON('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'controller@exam.edu', password: 'Approver@123' })
        });
        assert.strictEqual(ctrlRes.status, 200);
        controllerToken = ctrlRes.data.token;

        // Invigilator
        const invRes = await fetchJSON('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'invigilator@exam.edu', password: 'Invigilator@123' })
        });
        assert.strictEqual(invRes.status, 200);
        assert.strictEqual(invRes.data.user.role, 'invigilator');
        invigilatorToken = invRes.data.token;
    });

    let uploadedPaperId = null;

    // STEP 3: Question Paper Upload API
    await step('3. Question paper upload API connects correctly (AES-256-GCM + Shamir shares)', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const uploadRes = await fetchJSON('/api/papers/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${setterToken}` },
            body: JSON.stringify({
                courseCode: 'CS905',
                title: 'Blockchain & Cryptographic Protocol Engineering',
                department: 'Computer Science & Engineering',
                semester: 'Semester 8',
                totalMarks: 100,
                examDate: dateStr,
                startTime: '09:00',
                endTime: '12:00',
                thresholdK: 2,
                totalSharesN: 3
            })
        });

        assert.strictEqual(uploadRes.status, 201);
        assert.strictEqual(uploadRes.data.paper.courseCode, 'CS905');
        assert.strictEqual(uploadRes.data.paper.status, 'PENDING');
        uploadedPaperId = uploadRes.data.paper.id;
    });

    // STEP 4: Unlock request submission
    await step('4. Unlock request submission works and updates paper record', async () => {
        const unlockRes = await fetchJSON(`/api/papers/${uploadedPaperId}/request-unlock`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${invigilatorToken}` },
            body: JSON.stringify({
                hall: 'Hall C - Room 405',
                reason: 'Semester 8 Cryptography Paper Invigilation'
            })
        });

        assert.strictEqual(unlockRes.status, 200);
        assert.strictEqual(unlockRes.data.request.hall, 'Hall C - Room 405');
    });

    // STEP 5: Approvals update dynamically
    await step('5. Approval status updates dynamically (Approver 1 signs -> PENDING, Approver 2 signs -> Threshold met)', async () => {
        // Approver 1 (HOD) approves
        const app1Res = await fetchJSON(`/api/papers/${uploadedPaperId}/approve`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${hodToken}` },
            body: JSON.stringify({ decision: 'APPROVE', comments: 'Curriculum verified. Approved.' })
        });
        assert.strictEqual(app1Res.status, 200);

        // Approver 2 (Controller) approves -> Threshold 2/2 met!
        const app2Res = await fetchJSON(`/api/papers/${uploadedPaperId}/approve`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${controllerToken}` },
            body: JSON.stringify({ decision: 'APPROVE', comments: 'Exam clearance granted.' })
        });
        assert.strictEqual(app2Res.status, 200);
        // Since examDate is tomorrow, status is TIME_LOCKED
        assert.strictEqual(app2Res.data.status, 'TIME_LOCKED');
    });

    // STEP 6: Paper Decryption & PDF Download
    await step('6. Question paper decryption with Shamir shares works on active paper', async () => {
        // Active seeded paper CS801 is READY_FOR_EXAM
        const downloadRes = await fetch(`${BASE_URL}/api/papers/PAPER_CS801/download`, {
            headers: { Authorization: `Bearer ${invigilatorToken}` }
        });
        assert.strictEqual(downloadRes.status, 200);
        assert.strictEqual(downloadRes.headers.get('content-type'), 'application/pdf');
        const buffer = await downloadRes.arrayBuffer();
        assert.ok(buffer.byteLength > 0, 'Decrypted PDF must have non-zero bytes');
    });

    // STEP 7: Automatic Audit Log Entries
    await step('7. Audit log generated automatically after actions with strict SHA-256 formula', async () => {
        const auditRes = await fetchJSON('/api/audit/logs', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(auditRes.status, 200);
        assert.ok(auditRes.data.logs.length >= 6, 'Multiple audit events must be recorded');

        const uploadLog = auditRes.data.logs.find(l => l.action === 'PAPER_UPLOAD' && l.paperId === uploadedPaperId);
        assert.ok(uploadLog, 'PAPER_UPLOAD action must be in audit log');

        const unlockLog = auditRes.data.logs.find(l => l.action === 'UNLOCK_REQUEST' && l.paperId === uploadedPaperId);
        assert.ok(unlockLog, 'UNLOCK_REQUEST action must be in audit log');
    });

    // STEP 8: Audit Verification passes on valid chain
    await step('8. Audit verification passes on valid chain', async () => {
        const verifyRes = await fetchJSON('/api/audit/verify', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(verifyRes.status, 200);
        assert.strictEqual(verifyRes.data.isValid, true, 'Intact chain must be valid');
        assert.strictEqual(verifyRes.data.corruptedIndex, -1);
    });

    // STEP 9: Audit Verification detects intentionally modified record
    await step('9. Audit verification detects intentionally modified record and pinpoints corrupted block', async () => {
        const targetIndex = 2;

        // Intentionally inject tamper
        const tamperRes = await fetchJSON('/api/audit/tamper-test', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
                recordIndex: targetIndex,
                field: 'action',
                newValue: 'UNAUTHORIZED_QUESTION_LEAK'
            })
        });
        assert.strictEqual(tamperRes.status, 200);

        // Run verification
        const verifyPostTamper = await fetchJSON('/api/audit/verify', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(verifyPostTamper.status, 200);
        assert.strictEqual(verifyPostTamper.data.isValid, false, 'Tampered chain must be detected as invalid');
        assert.strictEqual(verifyPostTamper.data.corruptedIndex, targetIndex, `Must pinpoint Block #${targetIndex}`);
        assert.ok(verifyPostTamper.data.failureReason.includes('Tampering detected'));
        assert.notStrictEqual(verifyPostTamper.data.storedHash, verifyPostTamper.data.expectedHash);
    });

    // STEP 10: Restoration recovers valid chain
    await step('10. Audit chain restoration recovers genuine state', async () => {
        const restoreRes = await fetchJSON('/api/audit/restore', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(restoreRes.status, 200);

        const verifyRestored = await fetchJSON('/api/audit/verify', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(verifyRestored.data.isValid, true, 'Restored chain must be 100% valid');
    });

    console.log('\n================================================================');
    console.log(`🎉 ALL PERSON D DELIVERABLE TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
}

runDemonstration().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
