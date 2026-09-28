'use strict';

const jwt = require('jsonwebtoken');
const dataStore = require('../services/dataStore');

const JWT_SECRET = process.env.JWT_SECRET || 'secure-exam-system-secret-key-2026';

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = dataStore.findUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                message: 'User session invalid or user not found'
            });
        }

        req.user = {
            userId: user.id,
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        console.error('[authMiddleware] JWT verification error:', error.message);
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
};

module.exports = {
    authMiddleware,
    JWT_SECRET
};
