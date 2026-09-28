'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const AUDIT_STORAGE_PATH = path.resolve(__dirname, '../data/audit-log.json');
const BACKUP_STORAGE_PATH = path.resolve(__dirname, '../data/audit-log-backup.json');

/**
 * SHA-256 Hash Chain Calculation
 * Formula required: SHA-256(previousHash + timestamp + userId + action + paperId)
 */
function calculateHash(previousHash, timestamp, userId, action, paperId) {
    const rawData = String(previousHash) + String(timestamp) + String(userId) + String(action) + String(paperId);
    return crypto.createHash('sha256').update(rawData).digest('hex');
}

/**
 * AuditLogger Service (Tamper-Evident Hash Chain)
 */
class AuditLogger {
    constructor() {
        this.ensureStorageDir();
        this.tamperOriginals = {};
        this.logs = this.loadLogs();
        if (this.logs.length === 0) {
            this.seedGenesisRecords();
        }
    }

    ensureStorageDir() {
        const dir = path.dirname(AUDIT_STORAGE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    loadLogs() {
        try {
            if (fs.existsSync(AUDIT_STORAGE_PATH)) {
                const data = fs.readFileSync(AUDIT_STORAGE_PATH, 'utf8');
                return JSON.parse(data);
            }
        } catch (err) {
            console.error('[AuditLogger] Error reading log file:', err.message);
        }
        return [];
    }

    saveLogs() {
        try {
            fs.writeFileSync(AUDIT_STORAGE_PATH, JSON.stringify(this.logs, null, 2), 'utf8');
        } catch (err) {
            console.error('[AuditLogger] Error writing log file:', err.message);
        }
    }

    saveBackup() {
        // Only save backup if chain is 100% valid! Never overwrite genuine backup with tampered data.
        const verification = this.verifyChain();
        if (!verification.isValid) {
            console.warn('[AuditLogger] Skipping backup save: audit chain is currently in a tampered state.');
            return;
        }
        try {
            fs.writeFileSync(BACKUP_STORAGE_PATH, JSON.stringify(this.logs, null, 2), 'utf8');
        } catch (err) {
            console.error('[AuditLogger] Error writing backup log file:', err.message);
        }
    }

    seedGenesisRecords() {
        console.log('[AuditLogger] Initializing audit log with genesis block...');
        const initialTimestamp = new Date(Date.now() - 3600000).toISOString();
        
        // Block 0: System Initialization
        const genesisRecord = {
            index: 0,
            timestamp: initialTimestamp,
            userId: 'SYSTEM_ADMIN_01',
            userName: 'System Root Authority',
            userEmail: 'admin@exam.edu',
            role: 'admin',
            action: 'SYSTEM_INITIALIZED',
            paperId: 'SYSTEM',
            paperTitle: 'System Ledger Genesis',
            details: 'Tamper-evident audit logging engine started with SHA-256 hash chaining',
            previousHash: GENESIS_HASH,
            currentHash: calculateHash(
                GENESIS_HASH,
                initialTimestamp,
                'SYSTEM_ADMIN_01',
                'SYSTEM_INITIALIZED',
                'SYSTEM'
            )
        };

        this.logs = [genesisRecord];
        this.saveLogs();
        this.saveBackup();
    }

    /**
     * Appends a new audit record to the hash chain.
     * Guaranteed chronological ordering and append-only immutability.
     */
    logAction({ userId, userName, userEmail, role, action, paperId, paperTitle, details }) {
        const timestamp = new Date().toISOString();
        const safeUserId = String(userId || 'ANONYMOUS');
        const safeAction = String(action || 'UNKNOWN_ACTION');
        const safePaperId = String(paperId || 'N/A');

        // Determine previous hash from latest log or genesis
        let previousHash = GENESIS_HASH;
        if (this.logs.length > 0) {
            const lastLog = this.logs[this.logs.length - 1];
            previousHash = lastLog.currentHash;
        }

        const currentHash = calculateHash(
            previousHash,
            timestamp,
            safeUserId,
            safeAction,
            safePaperId
        );

        const record = {
            index: this.logs.length,
            timestamp,
            userId: safeUserId,
            userName: userName || safeUserId,
            userEmail: userEmail || '',
            role: role || 'user',
            action: safeAction,
            paperId: safePaperId,
            paperTitle: paperTitle || '',
            details: details || '',
            previousHash,
            currentHash
        };

        this.logs.push(record);
        this.saveLogs();
        // Also update backup when legitimately appended
        this.saveBackup();

        console.log(`[AuditLogger] Logged: [${record.action}] by ${record.role}:${record.userId} (Block #${record.index}, Hash: ${record.currentHash.substring(0, 12)}...)`);
        return record;
    }

    /**
     * Audit Verification (PART 4)
     * Recalculates the entire hash chain from index 0 to N-1
     * Compares stored hashes and detects any modified or deleted record
     */
    verifyChain() {
        if (!this.logs || this.logs.length === 0) {
            return {
                isValid: true,
                totalRecords: 0,
                corruptedIndex: -1,
                corruptedRecord: null,
                message: 'Audit chain is empty and valid.',
                verificationDetails: []
            };
        }

        let expectedPrevHash = GENESIS_HASH;
        const verificationDetails = [];

        for (let i = 0; i < this.logs.length; i++) {
            const record = this.logs[i];

            // 1. Verify previousHash matches previous record's currentHash
            const prevHashValid = (record.previousHash === expectedPrevHash);

            // 2. Recompute currentHash using specified formula
            const recalculatedHash = calculateHash(
                record.previousHash,
                record.timestamp,
                record.userId,
                record.action,
                record.paperId
            );

            const currentHashValid = (record.currentHash === recalculatedHash);
            const isBlockValid = prevHashValid && currentHashValid;

            verificationDetails.push({
                index: i,
                action: record.action,
                timestamp: record.timestamp,
                storedHash: record.currentHash,
                recomputedHash: recalculatedHash,
                storedPreviousHash: record.previousHash,
                expectedPreviousHash: expectedPrevHash,
                isValid: isBlockValid
            });

            // If invalid, report tampering at first corrupted record
            if (!isBlockValid) {
                let failureReason = '';
                if (!prevHashValid && !currentHashValid) {
                    failureReason = `Both previous hash link and SHA-256 block hash failed verification at Block #${i}.`;
                } else if (!prevHashValid) {
                    failureReason = `Broken chain linkage at Block #${i}: Stored previousHash does not match Block #${i - 1}'s currentHash. Detected record insertion, deletion, or reordering!`;
                } else {
                    failureReason = `Tampering detected at Block #${i}: Stored currentHash does not match recomputed SHA-256 hash. Data fields (timestamp, userId, action, or paperId) have been modified!`;
                }

                return {
                    isValid: false,
                    totalRecords: this.logs.length,
                    corruptedIndex: i,
                    corruptedRecord: record,
                    failureReason,
                    expectedHash: recalculatedHash,
                    storedHash: record.currentHash,
                    expectedPreviousHash: expectedPrevHash,
                    actualPreviousHash: record.previousHash,
                    verificationDetails
                };
            }

            expectedPrevHash = record.currentHash;
        }

        return {
            isValid: true,
            totalRecords: this.logs.length,
            corruptedIndex: -1,
            corruptedRecord: null,
            message: '✅ Audit chain valid! All block hashes and chain links cryptographically match.',
            verificationDetails
        };
    }

    /**
     * Get Audit History with filtering (PART 5)
     */
    getLogs({ userId, action, paperId, role, search, limit = 100 } = {}) {
        let results = [...this.logs];

        if (userId) {
            results = results.filter(l => l.userId.toLowerCase() === userId.toLowerCase() || (l.userEmail && l.userEmail.toLowerCase() === userId.toLowerCase()));
        }

        if (action && action !== 'ALL') {
            results = results.filter(l => l.action.toLowerCase() === action.toLowerCase());
        }

        if (role && role !== 'ALL') {
            results = results.filter(l => l.role.toLowerCase() === role.toLowerCase());
        }

        if (paperId && paperId !== 'ALL') {
            results = results.filter(l => l.paperId.toLowerCase() === paperId.toLowerCase());
        }

        if (search) {
            const q = search.toLowerCase();
            results = results.filter(l => 
                (l.userName && l.userName.toLowerCase().includes(q)) ||
                (l.userEmail && l.userEmail.toLowerCase().includes(q)) ||
                (l.action && l.action.toLowerCase().includes(q)) ||
                (l.paperTitle && l.paperTitle.toLowerCase().includes(q)) ||
                (l.details && l.details.toLowerCase().includes(q)) ||
                (l.currentHash && l.currentHash.toLowerCase().includes(q))
            );
        }

        // Return latest first for table view, limited
        return results.reverse().slice(0, limit);
    }

    /**
     * Tamper Simulation for Testing & Demonstration
     * Intentionally modifies a record's data to demonstrate verification failure
     */
    simulateTamper({ recordIndex = 1, field = 'action', newValue = 'UNAUTHORIZED_PAPER_LEAK' }) {
        if (recordIndex < 0 || recordIndex >= this.logs.length) {
            recordIndex = Math.max(0, this.logs.length - 1);
        }

        // Save pristine state of the record before modifying
        if (!this.tamperOriginals) this.tamperOriginals = {};
        if (!this.tamperOriginals[recordIndex]) {
            this.tamperOriginals[recordIndex] = JSON.parse(JSON.stringify(this.logs[recordIndex]));
        }

        const original = { ...this.logs[recordIndex] };
        this.logs[recordIndex][field] = newValue;
        this.saveLogs();

        console.warn(`[AuditLogger] TAMPER SIMULATED at Block #${recordIndex}: modified [${field}] from "${original[field]}" to "${newValue}".`);

        return {
            message: `Tamper simulated successfully on Block #${recordIndex}.`,
            corruptedIndex: recordIndex,
            fieldModified: field,
            previousValue: original[field],
            newValue
        };
    }

    /**
     * Restore genuine hash chain after tamper demonstration
     */
    restoreChain() {
        console.log('[AuditLogger] Executing chain restoration...');

        // 1. Restore any records saved in tamperOriginals cache
        let restoredFromCache = false;
        if (this.tamperOriginals && Object.keys(this.tamperOriginals).length > 0) {
            for (const [idxStr, originalRecord] of Object.entries(this.tamperOriginals)) {
                const idx = parseInt(idxStr, 10);
                if (this.logs[idx]) {
                    this.logs[idx] = JSON.parse(JSON.stringify(originalRecord));
                    restoredFromCache = true;
                }
            }
            this.tamperOriginals = {};
        }

        // 2. Mathematically revert any corrupted actions back to their original genuine actions
        const knownGenuineActions = [
            'PAPER_UPLOAD',
            'UNLOCK_REQUEST',
            'PAPER_APPROVED',
            'PAPER_REJECTED',
            'PAPER_DECRYPTED',
            'USER_LOGIN',
            'USER_REGISTERED',
            'SYSTEM_INITIALIZED'
        ];

        for (let i = 0; i < this.logs.length; i++) {
            const rec = this.logs[i];
            const currentRecalculated = calculateHash(rec.previousHash, rec.timestamp, rec.userId, rec.action, rec.paperId);
            if (currentRecalculated !== rec.currentHash) {
                // Find matching legitimate action that reproduces the sealed currentHash
                for (const act of knownGenuineActions) {
                    const candidateHash = calculateHash(rec.previousHash, rec.timestamp, rec.userId, act, rec.paperId);
                    if (candidateHash === rec.currentHash) {
                        console.log(`[AuditLogger] Restoring Block #${i} action from "${rec.action}" -> "${act}"`);
                        rec.action = act;
                        break;
                    }
                }
            }
        }

        // 3. Verify the chain status
        let verification = this.verifyChain();

        // 4. If clean backup exists and chain still had issues, try clean backup
        if (!verification.isValid && fs.existsSync(BACKUP_STORAGE_PATH)) {
            try {
                const backupData = JSON.parse(fs.readFileSync(BACKUP_STORAGE_PATH, 'utf8'));
                let backupValid = true;
                let prev = GENESIS_HASH;
                for (let i = 0; i < backupData.length; i++) {
                    if (backupData[i].previousHash !== prev) { backupValid = false; break; }
                    const h = calculateHash(prev, backupData[i].timestamp, backupData[i].userId, backupData[i].action, backupData[i].paperId);
                    if (h !== backupData[i].currentHash) { backupValid = false; break; }
                    prev = h;
                }
                if (backupValid) {
                    this.logs = backupData;
                    verification = this.verifyChain();
                }
            } catch (err) {
                console.error('[AuditLogger] Backup restore check error:', err.message);
            }
        }

        // Persist restored state
        this.saveLogs();
        if (verification.isValid) {
            try {
                fs.writeFileSync(BACKUP_STORAGE_PATH, JSON.stringify(this.logs, null, 2), 'utf8');
            } catch (e) {}
            console.log('[AuditLogger] Chain successfully restored and verified valid.');
            return {
                success: true,
                message: 'Audit log successfully restored to legitimate state.',
                isValid: true,
                totalRecords: this.logs.length
            };
        } else {
            console.warn('[AuditLogger] Chain verification warnings after restore:', verification.failureReason);
            return {
                success: false,
                message: 'Restore completed with warnings: ' + verification.failureReason,
                isValid: false,
                corruptedIndex: verification.corruptedIndex
            };
        }
    }
}

// Singleton instance
const auditLoggerInstance = new AuditLogger();

module.exports = {
    auditLogger: auditLoggerInstance,
    calculateHash,
    GENESIS_HASH
};
