'use strict';

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const paperRoutes = require('./routes/paperRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        module: 'Person D - Frontend, Audit Logging & Verification',
        timestamp: new Date().toISOString()
    });
});

// SPA fallback: any unhandled request serves index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('===============================================================');
    console.log(`🚀 Secure Exam Question Paper System (Person D) is running!`);
    console.log(`🌐 Web UI: http://localhost:${PORT}`);
    console.log(`🔒 Audit Engine: SHA-256 Hash Chain Initialized`);
    console.log('---------------------------------------------------------------');
    console.log('🔑 Pre-configured Demo Accounts:');
    console.log('   👑 Admin:       admin@exam.edu       (pass: Admin@123)');
    console.log('   📝 Setter:      setter@exam.edu      (pass: Setter@123)');
    console.log('   ⚖️  Approver 1:  hod@exam.edu         (pass: Approver@123)');
    console.log('   ⚖️  Approver 2:  controller@exam.edu  (pass: Approver@123)');
    console.log('   🏫 Invigilator: invigilator@exam.edu (pass: Invigilator@123)');
    console.log('===============================================================');
});

module.exports = app;
