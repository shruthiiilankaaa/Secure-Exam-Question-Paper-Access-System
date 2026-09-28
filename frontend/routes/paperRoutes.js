'use strict';

const express = require('express');
const multer = require('multer');
const {
    uploadPaper,
    getPapers,
    getPaperById,
    requestUnlock,
    approvePaper,
    downloadPaper
} = require('../controllers/paperController');
const { authMiddleware } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// All paper routes require authentication
router.use(authMiddleware);

// Get list of papers
router.get('/', getPapers);

// Get single paper details
router.get('/:id', getPaperById);

// Upload new question paper (setter, admin)
router.post('/upload', authorize('setter', 'admin'), upload.single('paperFile'), uploadPaper);

// Request paper unlock (invigilator, approver, admin)
router.post('/:id/request-unlock', authorize('invigilator', 'approver', 'admin'), requestUnlock);

// Approve or reject paper (approver, admin)
router.post('/:id/approve', authorize('approver', 'admin'), approvePaper);

// Decrypt & download original PDF (if Ready for Exam)
router.get('/:id/download', downloadPaper);

module.exports = router;
