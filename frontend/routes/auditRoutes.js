'use strict';

const express = require('express');
const {
    getAuditLogs,
    verifyAuditChain,
    simulateTamper,
    restoreChain
} = require('../controllers/auditController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Get audit log history with filters (Part 5)
router.get('/logs', getAuditLogs);

// Recalculate hash chain and verify integrity (Part 4)
router.get('/verify', verifyAuditChain);

// Simulate tampering on a record for demonstration & grading (Testing requirement)
router.post('/tamper-test', simulateTamper);

// Restore legitimate chain from backup after tamper demonstration
router.post('/restore', restoreChain);

module.exports = router;
