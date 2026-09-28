'use strict';

const { auditLogger } = require('../services/auditLogger');

const getAuditLogs = async (req, res) => {
    try {
        const { userId, action, paperId, role, search, limit } = req.query;

        const logs = auditLogger.getLogs({
            userId,
            action,
            paperId,
            role,
            search,
            limit: limit ? parseInt(limit, 10) : 100
        });

        res.json({
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error('[auditController] Get logs error:', error);
        res.status(500).json({ message: 'Error retrieving audit logs' });
    }
};

const verifyAuditChain = async (req, res) => {
    try {
        const result = auditLogger.verifyChain();

        // Only log verification event if chain is valid and explicit logCheck is requested
        if (req.query.logCheck === 'true' && result.isValid) {
            auditLogger.logAction({
                userId: req.user?.id || 'SYSTEM_VERIFIER',
                userName: req.user?.name || 'System Auditor',
                userEmail: req.user?.email || '',
                role: req.user?.role || 'admin',
                action: 'AUDIT_VERIFIED',
                paperId: 'SYSTEM',
                details: 'Audit chain verification ran. Result: VALID'
            });
        }

        res.json({
            ...result,
            verifiedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('[auditController] Verification error:', error);
        res.status(500).json({ message: 'Error verifying audit chain: ' + error.message });
    }
};

const simulateTamper = async (req, res) => {
    try {
        const { recordIndex = 1, field = 'action', newValue = 'UNAUTHORIZED_ALTERATION' } = req.body;

        const result = auditLogger.simulateTamper({
            recordIndex: parseInt(recordIndex, 10),
            field,
            newValue
        });

        res.json({
            message: 'Tamper simulated successfully. Run verification now to observe detection!',
            result
        });
    } catch (error) {
        console.error('[auditController] Tamper simulation error:', error);
        res.status(500).json({ message: 'Error simulating tamper: ' + error.message });
    }
};

const restoreChain = async (req, res) => {
    try {
        const result = auditLogger.restoreChain();
        const verification = auditLogger.verifyChain();
        res.json({
            ...result,
            verification,
            isValid: verification.isValid
        });
    } catch (error) {
        console.error('[auditController] Restore error:', error);
        res.status(500).json({ message: 'Error restoring audit chain: ' + error.message });
    }
};

module.exports = {
    getAuditLogs,
    verifyAuditChain,
    simulateTamper,
    restoreChain
};
