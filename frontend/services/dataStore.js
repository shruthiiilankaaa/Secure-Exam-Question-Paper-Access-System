'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { encryptPaper } = require('./cryptoAdapter');
const { auditLogger } = require('./auditLogger');

const DATA_DIR = path.resolve(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PAPERS_FILE = path.join(DATA_DIR, 'papers.json');

class DataStore {
    constructor() {
        this.ensureDataDir();
        this.users = this.loadJSON(USERS_FILE, []);
        this.papers = this.loadJSON(PAPERS_FILE, []);

        if (this.users.length === 0) {
            this.seedInitialUsers();
        }
        if (this.papers.length === 0) {
            this.seedInitialPapers();
        }
    }

    ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    loadJSON(filePath, fallback) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (err) {
            console.error(`[DataStore] Error reading ${filePath}:`, err.message);
        }
        return fallback;
    }

    saveUsers() {
        try {
            fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2), 'utf8');
        } catch (err) {
            console.error('[DataStore] Error saving users:', err.message);
        }
    }

    savePapers() {
        try {
            fs.writeFileSync(PAPERS_FILE, JSON.stringify(this.papers, null, 2), 'utf8');
        } catch (err) {
            console.error('[DataStore] Error saving papers:', err.message);
        }
    }

    seedInitialUsers() {
        console.log('[DataStore] Seeding pre-configured demo users...');
        const salt = bcrypt.genSaltSync(10);

        this.users = [
            {
                id: 'USER_ADMIN_01',
                name: 'Prof. Robert Vance (Admin)',
                email: 'admin@exam.edu',
                passwordHash: bcrypt.hashSync('Admin@123', salt),
                role: 'admin',
                createdAt: new Date().toISOString()
            },
            {
                id: 'USER_SETTER_01',
                name: 'Dr. Alan Turing (Exam Setter)',
                email: 'setter@exam.edu',
                passwordHash: bcrypt.hashSync('Setter@123', salt),
                role: 'setter',
                department: 'Computer Science & Engineering',
                createdAt: new Date().toISOString()
            },
            {
                id: 'USER_APPROVER_01',
                name: 'Prof. Margaret Hamilton (HOD)',
                email: 'hod@exam.edu',
                passwordHash: bcrypt.hashSync('Approver@123', salt),
                role: 'approver',
                designation: 'Head of Department',
                createdAt: new Date().toISOString()
            },
            {
                id: 'USER_APPROVER_02',
                name: 'Dr. Claude Shannon (Exam Controller)',
                email: 'controller@exam.edu',
                passwordHash: bcrypt.hashSync('Approver@123', salt),
                role: 'approver',
                designation: 'Controller of Examinations',
                createdAt: new Date().toISOString()
            },
            {
                id: 'USER_INVIGILATOR_01',
                name: 'Sarah Connor (Senior Invigilator)',
                email: 'invigilator@exam.edu',
                passwordHash: bcrypt.hashSync('Invigilator@123', salt),
                role: 'invigilator',
                hallAssigned: 'Hall A - Room 302',
                createdAt: new Date().toISOString()
            }
        ];

        this.saveUsers();
    }

    seedInitialPapers() {
        console.log('[DataStore] Seeding sample encrypted exam question papers...');
        const samplePdfContent = Buffer.from(
            `%PDF-1.4\n1 0 obj\n<< /Title (CS801 - Advanced Cryptography Final Examination)\n/Author (Department of Computer Science)\n>>\nendobj\n` +
            `2 0 obj\n<< /Length 280 >>\nstream\n` +
            `SEMESTER EXAMINATION: CS801 - ADVANCED CRYPTOGRAPHY\n` +
            `Time: 3 Hours       Max Marks: 100\n` +
            `-----------------------------------------------------\n` +
            `SECTION A: (Answer all questions)\n` +
            `1. Explain Shamir's (k, n) threshold secret sharing scheme over GF(256).\n` +
            `2. Contrast AES-256-GCM authenticated encryption with AES-CBC-HMAC.\n` +
            `3. Formulate the hash chain verification algorithm for tamper-evident logging.\n` +
            `SECTION B:\n` +
            `4. Detail the time-lock puzzle cryptographic release mechanism.\n` +
            `endstream\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000010 00000 n\n0000000100 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n450\n%%EOF`
        );

        // Encrypt using Person B crypto core (3 shares, 2 threshold)
        const cryptoResult = encryptPaper(samplePdfContent, 3, 2);

        // Active paper: Exam happening right now
        const now = new Date();
        const activeStart = new Date(now.getTime() - 30 * 60000).toISOString(); // started 30 mins ago
        const activeEnd = new Date(now.getTime() + 150 * 60000).toISOString(); // ends in 2.5 hours

        // Future paper: Tomorrow
        const futureDate = new Date(now.getTime() + 24 * 3600000);
        const futureStart = new Date(futureDate.setHours(9, 0, 0, 0)).toISOString();
        const futureEnd = new Date(futureDate.setHours(12, 0, 0, 0)).toISOString();

        this.papers = [
            {
                id: 'PAPER_CS801',
                courseCode: 'CS801',
                title: 'Advanced Cryptography & Network Security',
                department: 'Computer Science & Engineering',
                semester: 'Semester 8',
                totalMarks: 100,
                examDate: now.toISOString().split('T')[0],
                examWindow: {
                    startTime: activeStart,
                    endTime: activeEnd
                },
                uploadedBy: {
                    id: 'USER_SETTER_01',
                    name: 'Dr. Alan Turing (Exam Setter)',
                    email: 'setter@exam.edu'
                },
                ciphertextBase64: cryptoResult.ciphertext.toString('base64'),
                filename: 'CS801_Final_Exam.pdf',
                mimeType: 'application/pdf',
                fileSize: samplePdfContent.length,
                thresholdK: 2,
                totalSharesN: 3,
                approvals: [
                    {
                        approverId: 'USER_APPROVER_01',
                        approverName: 'Prof. Margaret Hamilton (HOD)',
                        role: 'approver',
                        status: 'APPROVED',
                        approvedAt: new Date(now.getTime() - 60 * 60000).toISOString(),
                        share: cryptoResult.shares[0],
                        comments: 'Syllabus and question distribution verified. Approved.'
                    },
                    {
                        approverId: 'USER_APPROVER_02',
                        approverName: 'Dr. Claude Shannon (Exam Controller)',
                        role: 'approver',
                        status: 'APPROVED',
                        approvedAt: new Date(now.getTime() - 45 * 60000).toISOString(),
                        share: cryptoResult.shares[1],
                        comments: 'Code and confidentiality requirements confirmed. Approved.'
                    }
                ],
                assignedShares: {
                    'USER_APPROVER_01': cryptoResult.shares[0],
                    'USER_APPROVER_02': cryptoResult.shares[1],
                    'USER_ADMIN_01': cryptoResult.shares[2]
                },
                status: 'READY_FOR_EXAM', // Threshold (2/2) met AND within active exam window
                unlockRequests: [
                    {
                        id: 'REQ_01',
                        requestedBy: {
                            id: 'USER_INVIGILATOR_01',
                            name: 'Sarah Connor (Senior Invigilator)',
                            email: 'invigilator@exam.edu'
                        },
                        hall: 'Hall A - Room 302',
                        reason: 'Scheduled Semester 8 Final Exam Invigilation',
                        requestedAt: new Date(now.getTime() - 25 * 60000).toISOString(),
                        status: 'APPROVED'
                    }
                ],
                createdAt: new Date(now.getTime() - 7200000).toISOString()
            },
            {
                id: 'PAPER_CS802',
                courseCode: 'CS802',
                title: 'Quantum Computing & Information Theory',
                department: 'Computer Science & Engineering',
                semester: 'Semester 8',
                totalMarks: 100,
                examDate: futureStart.split('T')[0],
                examWindow: {
                    startTime: futureStart,
                    endTime: futureEnd
                },
                uploadedBy: {
                    id: 'USER_SETTER_01',
                    name: 'Dr. Alan Turing (Exam Setter)',
                    email: 'setter@exam.edu'
                },
                ciphertextBase64: cryptoResult.ciphertext.toString('base64'),
                filename: 'CS802_Quantum_Computing.pdf',
                mimeType: 'application/pdf',
                fileSize: samplePdfContent.length,
                thresholdK: 2,
                totalSharesN: 3,
                approvals: [
                    {
                        approverId: 'USER_APPROVER_01',
                        approverName: 'Prof. Margaret Hamilton (HOD)',
                        role: 'approver',
                        status: 'APPROVED',
                        approvedAt: new Date(now.getTime() - 15 * 60000).toISOString(),
                        share: cryptoResult.shares[0],
                        comments: 'Questions compliant with curriculum.'
                    },
                    {
                        approverId: 'USER_APPROVER_02',
                        approverName: 'Dr. Claude Shannon (Exam Controller)',
                        role: 'approver',
                        status: 'APPROVED',
                        approvedAt: new Date(now.getTime() - 10 * 60000).toISOString(),
                        share: cryptoResult.shares[1],
                        comments: 'Exam clearance granted.'
                    }
                ],
                assignedShares: {
                    'USER_APPROVER_01': cryptoResult.shares[0],
                    'USER_APPROVER_02': cryptoResult.shares[1],
                    'USER_ADMIN_01': cryptoResult.shares[2]
                },
                status: 'TIME_LOCKED', // Threshold met, but current time is before tomorrow's exam window
                unlockRequests: [],
                createdAt: new Date(now.getTime() - 3600000).toISOString()
            },
            {
                id: 'PAPER_CS803',
                courseCode: 'CS803',
                title: 'Cloud Architecture & Distributed Systems',
                department: 'Computer Science & Engineering',
                semester: 'Semester 8',
                totalMarks: 100,
                examDate: futureStart.split('T')[0],
                examWindow: {
                    startTime: futureStart,
                    endTime: futureEnd
                },
                uploadedBy: {
                    id: 'USER_SETTER_01',
                    name: 'Dr. Alan Turing (Exam Setter)',
                    email: 'setter@exam.edu'
                },
                ciphertextBase64: cryptoResult.ciphertext.toString('base64'),
                filename: 'CS803_Distributed_Systems.pdf',
                mimeType: 'application/pdf',
                fileSize: samplePdfContent.length,
                thresholdK: 2,
                totalSharesN: 3,
                approvals: [
                    {
                        approverId: 'USER_APPROVER_01',
                        approverName: 'Prof. Margaret Hamilton (HOD)',
                        role: 'approver',
                        status: 'PENDING',
                        comments: ''
                    },
                    {
                        approverId: 'USER_APPROVER_02',
                        approverName: 'Dr. Claude Shannon (Exam Controller)',
                        role: 'approver',
                        status: 'PENDING',
                        comments: ''
                    }
                ],
                assignedShares: {
                    'USER_APPROVER_01': cryptoResult.shares[0],
                    'USER_APPROVER_02': cryptoResult.shares[1],
                    'USER_ADMIN_01': cryptoResult.shares[2]
                },
                status: 'PENDING', // Awaiting approvers to sign
                unlockRequests: [],
                createdAt: new Date().toISOString()
            }
        ];

        this.savePapers();

        // Audit the seeded papers
        auditLogger.logAction({
            userId: 'USER_SETTER_01',
            userName: 'Dr. Alan Turing (Exam Setter)',
            userEmail: 'setter@exam.edu',
            role: 'setter',
            action: 'PAPER_UPLOAD',
            paperId: 'PAPER_CS801',
            paperTitle: 'Advanced Cryptography & Network Security',
            details: 'AES-256-GCM encrypted, 3 Shamir shares distributed, Threshold=2'
        });

        auditLogger.logAction({
            userId: 'USER_APPROVER_01',
            userName: 'Prof. Margaret Hamilton (HOD)',
            userEmail: 'hod@exam.edu',
            role: 'approver',
            action: 'PAPER_APPROVED',
            paperId: 'PAPER_CS801',
            paperTitle: 'Advanced Cryptography & Network Security',
            details: 'HOD approval signed and share registered (1/2 required)'
        });

        auditLogger.logAction({
            userId: 'USER_APPROVER_02',
            userName: 'Dr. Claude Shannon (Exam Controller)',
            userEmail: 'controller@exam.edu',
            role: 'approver',
            action: 'PAPER_APPROVED',
            paperId: 'PAPER_CS801',
            paperTitle: 'Advanced Cryptography & Network Security',
            details: 'Controller approval signed and share registered (2/2 threshold reached). Status -> READY_FOR_EXAM'
        });

        auditLogger.logAction({
            userId: 'USER_INVIGILATOR_01',
            userName: 'Sarah Connor (Senior Invigilator)',
            userEmail: 'invigilator@exam.edu',
            role: 'invigilator',
            action: 'UNLOCK_REQUEST',
            paperId: 'PAPER_CS801',
            paperTitle: 'Advanced Cryptography & Network Security',
            details: 'Requested unlock for Hall A - Room 302'
        });
    }

    // User Methods
    findUserByEmail(email) {
        if (!email) return null;
        return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    findUserById(id) {
        return this.users.find(u => u.id === id);
    }

    createUser({ name, email, password, role, department, designation }) {
        const salt = bcrypt.genSaltSync(10);
        const user = {
            id: 'USER_' + Date.now().toString(36).toUpperCase(),
            name,
            email: email.toLowerCase(),
            passwordHash: bcrypt.hashSync(password, salt),
            role,
            department: department || '',
            designation: designation || '',
            createdAt: new Date().toISOString()
        };
        this.users.push(user);
        this.saveUsers();
        return user;
    }

    // Paper Methods
    getAllPapers() {
        return this.papers;
    }

    findPaperById(id) {
        return this.papers.find(p => p.id === id);
    }

    createPaper(paperData) {
        const paper = {
            id: 'PAPER_' + Date.now().toString(36).toUpperCase(),
            ...paperData,
            createdAt: new Date().toISOString()
        };
        this.papers.push(paper);
        this.savePapers();
        return paper;
    }

    updatePaper(id, updates) {
        const index = this.papers.findIndex(p => p.id === id);
        if (index === -1) return null;
        this.papers[index] = { ...this.papers[index], ...updates };
        this.savePapers();
        return this.papers[index];
    }
}

const dataStoreInstance = new DataStore();

module.exports = dataStoreInstance;
