'use strict';

const assert = require('assert');
const { auditLogger, calculateHash, GENESIS_HASH } = require('../services/auditLogger');

console.log('====================================================');
console.log('🧪 RUNNING PERSON D AUDIT LOGGING & VERIFICATION TESTS');
console.log('====================================================\n');

async function runTests() {
    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ FAIL: ${name}`);
            console.error(`   Error: ${err.message}`);
            failed++;
        }
    }

    // Ensure clean state
    auditLogger.restoreChain();

    test('1. Hash formula strictly matches SHA-256(prevHash + timestamp + userId + action + paperId)', () => {
        const prev = '0000000000000000000000000000000000000000000000000000000000000000';
        const ts = '2026-09-25T12:00:00.000Z';
        const user = 'user123';
        const action = 'PAPER_UPLOAD';
        const paper = 'paper456';
        
        const hash = calculateHash(prev, ts, user, action, paper);
        assert.strictEqual(typeof hash, 'string');
        assert.strictEqual(hash.length, 64); // SHA-256 hex output is 64 characters
    });

    test('2. Log entry is automatically appended with correct previousHash link', () => {
        const countBefore = auditLogger.logs.length;
        const lastHashBefore = auditLogger.logs[countBefore - 1].currentHash;

        const newLog = auditLogger.logAction({
            userId: 'SETTER_01',
            userName: 'Dr. Alan Turing',
            role: 'setter',
            action: 'PAPER_UPLOAD',
            paperId: 'CS801_TEST',
            paperTitle: 'Advanced Cryptography Exam',
            details: 'Threshold 2-of-3 paper encrypted and shares created'
        });

        assert.strictEqual(auditLogger.logs.length, countBefore + 1);
        assert.strictEqual(newLog.previousHash, lastHashBefore);
        assert.strictEqual(
            newLog.currentHash,
            calculateHash(newLog.previousHash, newLog.timestamp, newLog.userId, newLog.action, newLog.paperId)
        );
    });

    test('3. Verification passes on a valid untampered chain', () => {
        const result = auditLogger.verifyChain();
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.corruptedIndex, -1);
        assert.strictEqual(result.corruptedRecord, null);
    });

    test('4. Verification detects intentionally modified record (data tampering)', () => {
        const targetIndex = auditLogger.logs.length - 1;
        // Intentionally tamper with record's action
        auditLogger.simulateTamper({
            recordIndex: targetIndex,
            field: 'action',
            newValue: 'UNAUTHORIZED_EXAM_LEAK'
        });

        const result = auditLogger.verifyChain();
        assert.strictEqual(result.isValid, false, 'Tampered chain must be detected as invalid');
        assert.strictEqual(result.corruptedIndex, targetIndex, `Should highlight corrupted index ${targetIndex}`);
        assert.ok(result.failureReason.includes('Tampering detected'));
        assert.notStrictEqual(result.storedHash, result.expectedHash);
    });

    test('5. Chain restoration recovers genuine cryptographic state', () => {
        auditLogger.restoreChain();
        const result = auditLogger.verifyChain();
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.corruptedIndex, -1);
    });

    test('6. Filter audit history by action and user', () => {
        auditLogger.logAction({
            userId: 'INVIGILATOR_01',
            userName: 'Sarah Connor',
            role: 'invigilator',
            action: 'UNLOCK_REQUEST',
            paperId: 'CS801_TEST',
            paperTitle: 'Advanced Cryptography Exam'
        });

        const uploadLogs = auditLogger.getLogs({ action: 'PAPER_UPLOAD' });
        assert.ok(uploadLogs.every(l => l.action === 'PAPER_UPLOAD'));

        const unlockLogs = auditLogger.getLogs({ action: 'UNLOCK_REQUEST' });
        assert.ok(unlockLogs.some(l => l.userId === 'INVIGILATOR_01'));
    });

    console.log('\n----------------------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('----------------------------------------------------\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
