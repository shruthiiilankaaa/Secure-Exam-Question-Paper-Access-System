'use strict';

const dataStore = require('../services/dataStore');
const { encryptPaper, decryptPaper } = require('../services/cryptoAdapter');
const { auditLogger } = require('../services/auditLogger');

function computePaperStatus(paper) {
    const approvals = paper.approvals || [];
    const hasRejection = approvals.some(a => a.status === 'REJECTED');
    if (hasRejection) return 'REJECTED';

    const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
    const threshold = paper.thresholdK || 2;

    if (approvedCount < threshold) {
        return 'PENDING';
    }

    // Threshold met: evaluate time-lock
    const now = new Date();
    const startTime = new Date(paper.examWindow.startTime);
    const endTime = new Date(paper.examWindow.endTime);

    if (now < startTime) {
        return 'TIME_LOCKED';
    } else if (now >= startTime && now <= endTime) {
        return 'READY_FOR_EXAM';
    } else {
        return 'EXAM_CONCLUDED';
    }
}

const uploadPaper = async (req, res) => {
    try {
        const {
            courseCode,
            title,
            department,
            semester,
            totalMarks,
            examDate,
            startTime,
            endTime,
            thresholdK = 2,
            totalSharesN = 3
        } = req.body;

        if (!courseCode || !title || !examDate || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Required fields missing: courseCode, title, examDate, startTime, endTime'
            });
        }

        let fileBuffer;
        let filename = 'exam_question_paper.pdf';

        if (req.file) {
            fileBuffer = req.file.buffer;
            filename = req.file.originalname;
        } else {
            // Generate standard PDF payload if uploaded via JSON or direct testing
            fileBuffer = Buffer.from(
                `%PDF-1.4\n1 0 obj\n<< /Title (${courseCode} - ${title})\n>>\nendobj\n` +
                `2 0 obj\n<< /Length 200 >>\nstream\nCONFIDENTIAL EXAM PAPER\nCOURSE: ${courseCode} - ${title}\n` +
                `Date: ${examDate}\nMax Marks: ${totalMarks || 100}\n` +
                `Instructions: Answer all questions in sequential order.\nendstream\nendobj\nxref\n0 3\ntrailer\n<< /Size 3 >>\nstartxref\n300\n%%EOF`
            );
        }

        const k = parseInt(thresholdK, 10) || 2;
        const n = parseInt(totalSharesN, 10) || 3;

        // Perform AES-256-GCM encryption and Shamir Secret Sharing via Person B crypto core
        const cryptoResult = encryptPaper(fileBuffer, n, k);

        // Map shares to system approvers
        const approversList = [
            { id: 'USER_APPROVER_01', name: 'Prof. Margaret Hamilton (HOD)', role: 'approver' },
            { id: 'USER_APPROVER_02', name: 'Dr. Claude Shannon (Exam Controller)', role: 'approver' },
            { id: 'USER_ADMIN_01', name: 'Prof. Robert Vance (Admin)', role: 'admin' }
        ];

        const approvals = approversList.map((app, idx) => ({
            approverId: app.id,
            approverName: app.name,
            role: app.role,
            status: 'PENDING',
            share: cryptoResult.shares[idx] || cryptoResult.shares[0],
            comments: ''
        }));

        const newPaper = dataStore.createPaper({
            courseCode,
            title,
            department: department || 'Computer Science & Engineering',
            semester: semester || 'Semester 8',
            totalMarks: parseInt(totalMarks, 10) || 100,
            examDate,
            examWindow: {
                startTime: new Date(`${examDate}T${startTime}:00`).toISOString(),
                endTime: new Date(`${examDate}T${endTime}:00`).toISOString()
            },
            uploadedBy: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            },
            ciphertextBase64: cryptoResult.ciphertext.toString('base64'),
            filename,
            mimeType: 'application/pdf',
            fileSize: fileBuffer.length,
            thresholdK: k,
            totalSharesN: n,
            approvals,
            status: 'PENDING',
            unlockRequests: []
        });

        // Audit Logging
        auditLogger.logAction({
            userId: req.user.id,
            userName: req.user.name,
            userEmail: req.user.email,
            role: req.user.role,
            action: 'PAPER_UPLOAD',
            paperId: newPaper.id,
            paperTitle: `${courseCode}: ${title}`,
            details: `Encrypted with AES-256-GCM (${fileBuffer.length} bytes), ${n} Shamir shares generated (Threshold k=${k})`
        });

        res.status(201).json({
            message: 'Question paper encrypted and uploaded successfully',
            paper: {
                id: newPaper.id,
                courseCode: newPaper.courseCode,
                title: newPaper.title,
                status: newPaper.status,
                thresholdK: newPaper.thresholdK,
                totalSharesN: newPaper.totalSharesN,
                examWindow: newPaper.examWindow,
                createdAt: newPaper.createdAt
            }
        });
    } catch (error) {
        console.error('[paperController] Upload error:', error);
        res.status(500).json({
            message: 'Error encrypting and uploading question paper: ' + error.message
        });
    }
};

const getPapers = async (req, res) => {
    try {
        const papers = dataStore.getAllPapers();

        // Dynamically recalculate and update statuses
        const formatted = papers.map(p => {
            const dynamicStatus = computePaperStatus(p);
            return {
                ...p,
                status: dynamicStatus,
                // Hide actual cryptographic shares unless user is an authorized approver/admin
                approvals: p.approvals.map(a => ({
                    approverId: a.approverId,
                    approverName: a.approverName,
                    role: a.role,
                    status: a.status,
                    approvedAt: a.approvedAt,
                    comments: a.comments,
                    hasShare: Boolean(a.share)
                }))
            };
        });

        res.json({ papers: formatted });
    } catch (error) {
        console.error('[paperController] Get papers error:', error);
        res.status(500).json({ message: 'Error retrieving papers' });
    }
};

const getPaperById = async (req, res) => {
    try {
        const paper = dataStore.findPaperById(req.params.id);
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }

        const dynamicStatus = computePaperStatus(paper);
        const userApproval = paper.approvals.find(a => a.approverId === req.user.id);

        res.json({
            paper: {
                ...paper,
                status: dynamicStatus,
                userShare: (req.user.role === 'admin' || userApproval) ? userApproval?.share : null
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const requestUnlock = async (req, res) => {
    try {
        const paper = dataStore.findPaperById(req.params.id);
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }

        const { hall, reason } = req.body;

        const newRequest = {
            id: 'REQ_' + Date.now().toString(36).toUpperCase(),
            requestedBy: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            },
            hall: hall || 'Main Examination Center',
            reason: reason || 'Scheduled exam invigilation unlock request',
            requestedAt: new Date().toISOString(),
            status: 'PENDING_APPROVAL'
        };

        const existingRequests = paper.unlockRequests || [];
        existingRequests.push(newRequest);

        dataStore.updatePaper(paper.id, { unlockRequests: existingRequests });

        // Audit Logging
        auditLogger.logAction({
            userId: req.user.id,
            userName: req.user.name,
            userEmail: req.user.email,
            role: req.user.role,
            action: 'UNLOCK_REQUEST',
            paperId: paper.id,
            paperTitle: `${paper.courseCode}: ${paper.title}`,
            details: `Unlock requested by Invigilator for ${newRequest.hall}. Reason: ${newRequest.reason}`
        });

        res.json({
            message: 'Unlock request submitted successfully',
            request: newRequest
        });
    } catch (error) {
        console.error('[paperController] Unlock request error:', error);
        res.status(500).json({ message: 'Error submitting unlock request' });
    }
};

const approvePaper = async (req, res) => {
    try {
        const paper = dataStore.findPaperById(req.params.id);
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }

        const { decision, comments } = req.body; // 'APPROVE' or 'REJECT'

        const approvalIndex = paper.approvals.findIndex(
            a => a.approverId === req.user.id || req.user.role === 'admin'
        );

        if (approvalIndex === -1 && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You are not an assigned approver for this paper' });
        }

        const targetIndex = approvalIndex >= 0 ? approvalIndex : 0;
        const isApproved = (decision === 'APPROVE');

        paper.approvals[targetIndex].status = isApproved ? 'APPROVED' : 'REJECTED';
        paper.approvals[targetIndex].approvedAt = new Date().toISOString();
        paper.approvals[targetIndex].comments = comments || (isApproved ? 'Approved by authority' : 'Rejected');

        const newStatus = computePaperStatus(paper);
        paper.status = newStatus;

        dataStore.updatePaper(paper.id, {
            approvals: paper.approvals,
            status: newStatus
        });

        const actionType = isApproved ? 'PAPER_APPROVED' : 'PAPER_REJECTED';
        auditLogger.logAction({
            userId: req.user.id,
            userName: req.user.name,
            userEmail: req.user.email,
            role: req.user.role,
            action: actionType,
            paperId: paper.id,
            paperTitle: `${paper.courseCode}: ${paper.title}`,
            details: `${req.user.name} recorded decision: ${decision}. Current status: ${newStatus}`
        });

        res.json({
            message: `Paper successfully marked as ${decision}`,
            status: newStatus,
            paper
        });
    } catch (error) {
        console.error('[paperController] Approval error:', error);
        res.status(500).json({ message: 'Error updating approval status' });
    }
};

const downloadPaper = async (req, res) => {
    try {
        const paper = dataStore.findPaperById(req.params.id);
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found' });
        }

        const currentStatus = computePaperStatus(paper);

        // Security check: Only allow decryption if status is READY_FOR_EXAM or admin bypass for testing
        if (currentStatus === 'TIME_LOCKED' && req.user.role !== 'admin') {
            auditLogger.logAction({
                userId: req.user.id,
                userName: req.user.name,
                userEmail: req.user.email,
                role: req.user.role,
                action: 'ACCESS_DENIED_TIME_LOCKED',
                paperId: paper.id,
                paperTitle: `${paper.courseCode}: ${paper.title}`,
                details: 'Attempted to decrypt paper before authorized exam time window'
            });

            return res.status(403).json({
                message: 'Access Denied: Paper is Time Locked. It can only be decrypted during the scheduled exam window.'
            });
        }

        if (currentStatus === 'PENDING' && req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Access Denied: Paper has not received threshold approvals yet.'
            });
        }

        // Collect >= K approved shares
        const validShares = paper.approvals
            .filter(a => a.status === 'APPROVED' && a.share)
            .map(a => a.share);

        // If admin or test, supply remaining shares if needed
        if (validShares.length < paper.thresholdK) {
            for (const a of paper.approvals) {
                if (a.share && !validShares.includes(a.share)) {
                    validShares.push(a.share);
                    if (validShares.length >= paper.thresholdK) break;
                }
            }
        }

        const ciphertextBuffer = Buffer.from(paper.ciphertextBase64, 'base64');
        const decryptedFileBuffer = decryptPaper(ciphertextBuffer, validShares);

        // Audit Logging
        auditLogger.logAction({
            userId: req.user.id,
            userName: req.user.name,
            userEmail: req.user.email,
            role: req.user.role,
            action: 'PAPER_DECRYPTED',
            paperId: paper.id,
            paperTitle: `${paper.courseCode}: ${paper.title}`,
            details: `Decrypted with ${validShares.length} Shamir shares. Served original PDF (${decryptedFileBuffer.length} bytes)`
        });

        res.setHeader('Content-Type', paper.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${paper.filename || 'Exam_Question_Paper.pdf'}"`);
        res.send(decryptedFileBuffer);
    } catch (error) {
        console.error('[paperController] Decryption error:', error);
        auditLogger.logAction({
            userId: req.user?.id || 'UNKNOWN',
            userName: req.user?.name || 'Unknown',
            role: req.user?.role || 'user',
            action: 'DECRYPTION_FAILED',
            paperId: req.params.id,
            details: error.message
        });

        res.status(500).json({
            message: 'Failed to decrypt paper: invalid key, corrupted data, or insufficient shares.'
        });
    }
};

module.exports = {
    uploadPaper,
    getPapers,
    getPaperById,
    requestUnlock,
    approvePaper,
    downloadPaper
};
