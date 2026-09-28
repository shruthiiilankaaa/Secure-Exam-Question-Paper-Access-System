'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dataStore = require('../services/dataStore');
const { auditLogger } = require('../services/auditLogger');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        const user = dataStore.findUserByEmail(email);
        if (!user) {
            // Log failed login attempt
            auditLogger.logAction({
                userId: email,
                userName: 'Unknown',
                role: 'anonymous',
                action: 'AUTH_FAILED_USER_NOT_FOUND',
                paperId: 'SYSTEM',
                details: `Failed login attempt for email: ${email}`
            });

            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            // Log failed login attempt
            auditLogger.logAction({
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                role: user.role,
                action: 'AUTH_FAILED_BAD_PASSWORD',
                paperId: 'SYSTEM',
                details: `Failed password verification for user ${user.email}`
            });

            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Audit valid login
        auditLogger.logAction({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            role: user.role,
            action: 'USER_LOGIN',
            paperId: 'SYSTEM',
            details: `User logged in successfully with role '${user.role}'`
        });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department || ''
            }
        });
    } catch (error) {
        console.error('[authController] Login error:', error);
        res.status(500).json({
            message: 'Server error during login'
        });
    }
};

const signup = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: 'All fields (name, email, password, role) are required'
            });
        }

        const allowedRoles = ['admin', 'setter', 'approver', 'invigilator'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role. Allowed roles are: ${allowedRoles.join(', ')}`
            });
        }

        const existing = dataStore.findUserByEmail(email);
        if (existing) {
            return res.status(409).json({
                message: 'User with this email already exists'
            });
        }

        const newUser = dataStore.createUser({
            name,
            email,
            password,
            role,
            department
        });

        auditLogger.logAction({
            userId: newUser.id,
            userName: newUser.name,
            userEmail: newUser.email,
            role: newUser.role,
            action: 'USER_REGISTERED',
            paperId: 'SYSTEM',
            details: `New account registered as ${newUser.role}`
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('[authController] Signup error:', error);
        res.status(500).json({
            message: 'Server error during signup'
        });
    }
};

const me = async (req, res) => {
    try {
        res.status(200).json({
            user: req.user
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getDemoAccounts = (req, res) => {
    res.json({
        demoAccounts: [
            {
                role: 'admin',
                label: 'System Admin',
                email: 'admin@exam.edu',
                password: 'Admin@123',
                name: 'Prof. Robert Vance (Admin)',
                description: 'Full audit verification, system monitoring, tamper testing, security ledger inspection.'
            },
            {
                role: 'setter',
                label: 'Exam Setter',
                email: 'setter@exam.edu',
                password: 'Setter@123',
                name: 'Dr. Alan Turing (Exam Setter)',
                description: 'Question paper upload, AES-256 encryption, Shamir key splitting, metadata entry.'
            },
            {
                role: 'approver',
                label: 'Approver 1 (HOD)',
                email: 'hod@exam.edu',
                password: 'Approver@123',
                name: 'Prof. Margaret Hamilton (HOD)',
                description: 'Review pending papers, sign cryptographic shares, authorize unlock requests.'
            },
            {
                role: 'approver',
                label: 'Approver 2 (Controller)',
                email: 'controller@exam.edu',
                password: 'Approver@123',
                name: 'Dr. Claude Shannon (Exam Controller)',
                description: 'Review and grant second cryptographic approval share to satisfy 2-of-3 threshold.'
            },
            {
                role: 'invigilator',
                label: 'Invigilator',
                email: 'invigilator@exam.edu',
                password: 'Invigilator@123',
                name: 'Sarah Connor (Senior Invigilator)',
                description: 'Request exam unlock, monitor countdown, decrypt & access approved question paper in exam window.'
            }
        ]
    });
};

module.exports = {
    login,
    signup,
    me,
    getDemoAccounts
};
