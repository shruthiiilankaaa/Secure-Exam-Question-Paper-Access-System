'use strict';

const express = require('express');
const { login, signup, me, getDemoAccounts } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/me', authMiddleware, me);
router.get('/demo-accounts', getDemoAccounts);

module.exports = router;
