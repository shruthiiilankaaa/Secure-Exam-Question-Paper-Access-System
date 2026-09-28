'use strict';

/**
 * Main Application Orchestrator — Person D
 * Connects Frontend Views, API Endpoints, Role Dashboards, and Audit Engine
 * Minimal Futuristic Enterprise Interface (Linear / Notion / Stripe / Apple)
 */

const App = {
    currentView: 'view-login',
    activeFilter: 'ALL',
    cachedPapers: [],
    cachedAuditLogs: [],

    init() {
        Auth.init();
        this.setupNavigation();
        this.setupUploadHandlers();
        this.setupUnlockHandlers();
        this.setupApprovalHandlers();
        this.setupAuditHandlers();
        this.setupModals();
    },

    // Navigation & Views
    setupNavigation() {
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.dataset.view;
                if (targetView) {
                    this.switchView(targetView);
                }
            });
        });
    },

    switchView(viewId) {
        // Guard protected views
        if (viewId !== 'view-login' && !API.getToken()) {
            this.switchView('view-login');
            return;
        }

        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.remove('active-view');
        });

        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active-view');
            this.currentView = viewId;
        }

        const appHeader = document.getElementById('app-header');
        if (viewId === 'view-login') {
            document.body.classList.add('login-mode');
            if (appHeader) appHeader.style.display = 'none';
        } else {
            document.body.classList.remove('login-mode');
            if (appHeader && API.getToken()) appHeader.style.display = 'flex';
        }

        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });

        // Trigger view-specific data refresh
        if (viewId === 'view-dashboard') this.loadDashboardData();
        if (viewId === 'view-approvals') this.loadApprovalsData();
        if (viewId === 'view-unlock') this.loadUnlockData();
        if (viewId === 'view-audit') this.loadAuditData();
    },

    // Toast Notifications (Clean text without emojis)
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div style="flex:1">${message}</div>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 150ms ease';
            setTimeout(() => toast.remove(), 200);
        }, 3500);
    },

    // -------------------------------------------------------------
    // PART 1 (Dashboard): Role-Specific Actions & Stat Metrics
    // -------------------------------------------------------------
    async loadDashboardData() {
        const user = Auth.currentUser;
        if (!user) return;

        const roleBanner = document.getElementById('dash-role-banner');
        if (roleBanner) {
            const dateStr = new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            let quickActionBtn = '';
            if (user.role === 'setter') {
                quickActionBtn = `<button class="btn btn-primary btn-sm" onclick="App.switchView('view-upload')">Upload New Paper</button>`;
            } else if (user.role === 'approver') {
                quickActionBtn = `<button class="btn btn-primary btn-sm" onclick="App.switchView('view-approvals')">Review Pending</button>`;
            } else if (user.role === 'invigilator') {
                quickActionBtn = `<button class="btn btn-emerald btn-sm" onclick="App.switchView('view-unlock')">Request Unlock</button>`;
            } else if (user.role === 'admin') {
                quickActionBtn = `<button class="btn btn-primary btn-sm" onclick="App.switchView('view-audit')">Audit Engine</button>`;
            }

            roleBanner.innerHTML = `
                <div class="dash-hero-banner">
                    <div class="dash-hero-content">
                        <div class="dash-hero-topline">
                            <span class="dash-hero-chip">
                                <span class="pulse-indicator"></span>
                                <span>Cryptographic Core Active &bull; Examination Session 2026</span>
                            </span>
                            <span class="dash-hero-date">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>${dateStr}</span>
                            </span>
                        </div>
                        
                        <div class="dash-hero-main">
                            <div class="dash-hero-text">
                                <h1 class="dash-hero-title">Welcome back, ${user.name}</h1>
                                <p class="dash-hero-subtitle">
                                    Role: <span class="role-tag ${user.role}">${user.role.toUpperCase()}</span>
                                    <span>&bull;</span>
                                    <span>Department: ${user.department || 'Examination Directorate'}</span>
                                    <span>&bull;</span>
                                    <span style="color:#16a34a; font-weight:600">● Session Secure</span>
                                </p>
                            </div>
                            
                            <div class="dash-hero-actions">
                                <button class="dash-refresh-btn" onclick="App.loadDashboardData()" title="Reload examination metrics">
                                    <svg class="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    <span>Refresh Board</span>
                                </button>
                                ${quickActionBtn}
                            </div>
                        </div>

                        <div class="dash-trust-strip">
                            <div class="trust-badge-item">
                                <div class="trust-badge-icon blue">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                </div>
                                <span>AES-256-GCM Vault</span>
                            </div>
                            <div class="trust-badge-item">
                                <div class="trust-badge-icon amber">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                </div>
                                <span>Shamir Consensus (k-of-n)</span>
                            </div>
                            <div class="trust-badge-item">
                                <div class="trust-badge-icon emerald">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <span>SHA-256 Hash Chain Intact</span>
                            </div>
                            <div class="trust-badge-item">
                                <div class="trust-badge-icon purple">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                                </div>
                                <span>Time-Lock Enforcement Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        try {
            const [papersRes, auditRes] = await Promise.all([
                API.papers.getAll(),
                API.audit.verify()
            ]);

            const papers = papersRes.papers || [];
            this.cachedPapers = papers;

            // Stat counters
            const elTotal = document.getElementById('stat-total-papers');
            const elPending = document.getElementById('stat-pending');
            const elReady = document.getElementById('stat-ready');
            const auditBadge = document.getElementById('stat-audit-status');

            if (elTotal) elTotal.textContent = papers.length;
            if (elPending) elPending.textContent = papers.filter(p => p.status === 'PENDING').length;
            if (elReady) elReady.textContent = papers.filter(p => p.status === 'READY_FOR_EXAM').length;
            
            if (auditBadge) {
                if (auditRes.isValid) {
                    auditBadge.textContent = '100% INTACT';
                    auditBadge.style.color = '#16a34a';
                } else {
                    auditBadge.textContent = 'TAMPERED';
                    auditBadge.style.color = '#dc2626';
                }
            }

            // Render Role-Specific Action Panel
            this.renderRoleActionPanel(user.role);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
    },

    renderRoleActionPanel(role) {
        const container = document.getElementById('role-action-panel');
        if (!container) return;

        let content = '';

        if (role === 'setter') {
            content = `
                <div class="glass-card highlight">
                    <h3 style="margin-bottom:0.75rem; color:var(--text-primary); font-size:var(--font-size-card-title); font-weight:600">
                        Question Paper Authoring Station
                    </h3>
                    <p style="color:var(--text-secondary); font-size:var(--font-size-body); margin-bottom:1.5rem">
                        Upload examination question papers to be encrypted with AES-256-GCM. 
                        The encryption key will be automatically split using Shamir's Secret Sharing (k-of-n) and distributed to designated approvers.
                    </p>
                    <button class="btn btn-primary" onclick="App.switchView('view-upload')">
                        Upload New Question Paper
                    </button>
                </div>
            `;
        } else if (role === 'approver') {
            const pendingCount = this.cachedPapers.filter(p => p.status === 'PENDING').length;
            content = `
                <div class="glass-card highlight">
                    <h3 style="margin-bottom:0.75rem; color:var(--text-primary); font-size:var(--font-size-card-title); font-weight:600">
                        Approver Authorization Station
                    </h3>
                    <p style="color:var(--text-secondary); font-size:var(--font-size-body); margin-bottom:1.5rem">
                        You have <strong>${pendingCount}</strong> papers awaiting cryptographic authorization. 
                        Approving will release your assigned Shamir share toward the threshold needed for exam unlock.
                    </p>
                    <button class="btn btn-primary" onclick="App.switchView('view-approvals')">
                        Review Pending Question Papers
                    </button>
                </div>
            `;
        } else if (role === 'invigilator') {
            const readyCount = this.cachedPapers.filter(p => p.status === 'READY_FOR_EXAM').length;
            content = `
                <div class="glass-card highlight">
                    <h3 style="margin-bottom:0.75rem; color:var(--text-primary); font-size:var(--font-size-card-title); font-weight:600">
                        Invigilator Examination Station
                    </h3>
                    <p style="color:var(--text-secondary); font-size:var(--font-size-body); margin-bottom:1.5rem">
                        Current active papers ready for exam decryption: <strong>${readyCount}</strong>. 
                        Submit unlock requests for scheduled exam halls or decrypt authorized papers within the examination window.
                    </p>
                    <button class="btn btn-emerald" onclick="App.switchView('view-unlock')">
                        Request Exam Paper Unlock
                    </button>
                </div>
            `;
        } else if (role === 'admin') {
            content = `
                <div class="glass-card highlight">
                    <h3 style="margin-bottom:0.75rem; color:var(--text-primary); font-size:var(--font-size-card-title); font-weight:600">
                        System Security Administration Station
                    </h3>
                    <p style="color:var(--text-secondary); font-size:var(--font-size-body); margin-bottom:1.5rem">
                        Complete administrative supervision: oversee encryption keys, monitor approver consensus, 
                        and execute mathematical verification of the SHA-256 tamper-evident audit ledger.
                    </p>
                    <div style="display:flex; gap:0.75rem; flex-wrap:wrap">
                        <button class="btn btn-primary" onclick="App.switchView('view-audit')">
                            Open Audit Verification Engine
                        </button>
                        <button class="btn btn-secondary" onclick="App.switchView('view-approvals')">
                            All Question Papers
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = content;
    },

    // -------------------------------------------------------------
    // PART 1 & 2: Question Paper Upload Page
    // -------------------------------------------------------------
    setupUploadHandlers() {
        const form = document.getElementById('upload-paper-form');
        const dropzone = document.getElementById('file-dropzone');
        const fileInput = document.getElementById('paper-file-input');
        const fileNameDisplay = document.getElementById('selected-file-name');

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    if (fileNameDisplay) {
                        fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name} (${(fileInput.files[0].size/1024).toFixed(1)} KB)`;
                    }
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length && fileNameDisplay) {
                    fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name} (${(fileInput.files[0].size/1024).toFixed(1)} KB)`;
                }
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('upload-submit-btn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Encrypting with AES-256 & Splitting Key...';

                try {
                    const formData = new FormData();
                    formData.append('courseCode', document.getElementById('upload-code').value.trim());
                    formData.append('title', document.getElementById('upload-title').value.trim());
                    formData.append('department', document.getElementById('upload-dept').value.trim());
                    formData.append('semester', document.getElementById('upload-sem').value);
                    formData.append('totalMarks', document.getElementById('upload-marks').value);
                    formData.append('examDate', document.getElementById('upload-date').value);
                    formData.append('startTime', document.getElementById('upload-start-time').value);
                    formData.append('endTime', document.getElementById('upload-end-time').value);
                    formData.append('thresholdK', document.getElementById('upload-k').value);
                    formData.append('totalSharesN', document.getElementById('upload-n').value);

                    if (fileInput && fileInput.files.length) {
                        formData.append('paperFile', fileInput.files[0]);
                    }

                    const res = await API.papers.upload(formData);
                    this.showToast(`Paper '${res.paper.courseCode}' encrypted & uploaded.`, 'success');
                    form.reset();
                    if (fileNameDisplay) fileNameDisplay.textContent = '';
                    
                    // Show confirmation and jump to approval status
                    this.switchView('view-approvals');
                } catch (err) {
                    this.showToast(err.message || 'Upload failed', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Encrypt & Upload Question Paper';
                }
            });
        }
    },

    // -------------------------------------------------------------
    // PART 1 & 2: Unlock Request Page
    // -------------------------------------------------------------
    setupUnlockHandlers() {
        const form = document.getElementById('unlock-request-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const paperId = document.getElementById('unlock-paper-select').value;
                const hall = document.getElementById('unlock-hall').value.trim();
                const reason = document.getElementById('unlock-reason').value.trim();

                if (!paperId) {
                    this.showToast('Please select an exam question paper', 'warning');
                    return;
                }

                try {
                    await API.papers.requestUnlock(paperId, { hall, reason });
                    this.showToast('Unlock request recorded and broadcast to Approvers.', 'success');
                    form.reset();
                    this.loadUnlockData();
                } catch (err) {
                    this.showToast(err.message || 'Unlock request failed', 'error');
                }
            });
        }
    },

    async loadUnlockData() {
        try {
            const res = await API.papers.getAll();
            const papers = res.papers || [];
            this.cachedPapers = papers;

            const select = document.getElementById('unlock-paper-select');
            if (select) {
                select.innerHTML = '<option value="">-- Choose Exam Paper --</option>' +
                    papers.map(p => `
                        <option value="${p.id}">
                            [${p.courseCode}] ${p.title} (Status: ${p.status.replace(/_/g, ' ')})
                        </option>
                    `).join('');
            }

            // Render live unlock requests table
            const tableBody = document.getElementById('unlock-requests-table-body');
            if (tableBody) {
                const allRequests = [];
                papers.forEach(p => {
                    (p.unlockRequests || []).forEach(r => {
                        allRequests.push({ ...r, paperCode: p.courseCode, paperTitle: p.title, paperStatus: p.status, paperId: p.id });
                    });
                });

                if (allRequests.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem">No unlock requests submitted yet.</td></tr>`;
                } else {
                    tableBody.innerHTML = allRequests.reverse().map(r => `
                        <tr>
                            <td><strong>${r.paperCode}</strong><br><small style="color:var(--text-secondary)">${r.paperTitle}</small></td>
                            <td>${r.hall}</td>
                            <td>${r.requestedBy?.name || 'Invigilator'}</td>
                            <td>${r.reason}</td>
                            <td><span class="status-badge ${this.getStatusBadgeClass(r.paperStatus)}">${r.paperStatus.replace(/_/g, ' ')}</span></td>
                            <td>
                                ${r.paperStatus === 'READY_FOR_EXAM' ? `
                                    <button class="btn btn-emerald btn-sm" onclick="App.downloadDecryptedPaper('${r.paperId}')">
                                        Decrypt PDF
                                    </button>
                                ` : `
                                    <span style="font-size:0.8rem; color:var(--text-muted)">Locked until approvals & window</span>
                                `}
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error('Error loading unlock data:', err);
        }
    },

    // -------------------------------------------------------------
    // PART 1 & 2: Approval Status Page (Redesigned Paper Cards)
    // -------------------------------------------------------------
    setupApprovalHandlers() {
        document.querySelectorAll('.filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.dataset.filter;
                this.renderApprovalCards();
            });
        });
    },

    async loadApprovalsData() {
        try {
            const res = await API.papers.getAll();
            this.cachedPapers = res.papers || [];
            this.renderApprovalCards();
        } catch (err) {
            console.error('Error loading approvals:', err);
        }
    },

    renderApprovalCards() {
        const container = document.getElementById('approval-cards-grid');
        if (!container) return;

        let papers = [...this.cachedPapers];
        if (this.activeFilter !== 'ALL') {
            papers = papers.filter(p => p.status === this.activeFilter);
        }

        if (papers.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:3rem; color:var(--text-muted)">
                    No papers found matching filter '${this.activeFilter}'.
                </div>
            `;
            return;
        }

        const user = Auth.currentUser;
        const canApprove = (user?.role === 'approver' || user?.role === 'admin');

        container.innerHTML = papers.map(paper => {
            const approvals = paper.approvals || [];
            const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
            const threshold = paper.thresholdK || 2;
            const total = paper.totalSharesN || 3;
            const percent = Math.min(100, Math.round((approvedCount / threshold) * 100));

            const isUserApproved = approvals.some(a => a.approverId === user?.id && a.status === 'APPROVED');

            return `
                <div class="paper-card">
                    <div class="paper-card-header">
                        <div class="paper-code">${paper.courseCode}</div>
                        <span class="status-badge ${this.getStatusBadgeClass(paper.status)}">
                            ${paper.status.replace(/_/g, ' ')}
                        </span>
                    </div>

                    <div class="paper-body">
                        <div class="paper-title">${paper.title}</div>
                        <div class="paper-meta">${paper.department} | Marks: ${paper.totalMarks}</div>
                        <div class="paper-date">
                            Exam Date: <strong style="color:var(--text-primary)">${paper.examDate}</strong> (${new Date(paper.examWindow.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(paper.examWindow.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </div>

                        <div class="threshold-progress">
                            <div style="display:flex; justify-content:space-between; font-size:13px">
                                <span style="color:var(--text-secondary)">Approval Progress:</span>
                                <strong style="color:var(--text-primary)">${approvedCount} / ${threshold} Sign-offs (${total} total shares)</strong>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${percent}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="paper-footer">
                        ${canApprove && !isUserApproved && paper.status !== 'REJECTED' ? `
                            <button class="btn btn-emerald btn-sm" onclick="App.openApproveModal('${paper.id}', '${paper.courseCode}')">
                                Approve
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="App.handleDirectReject('${paper.id}')">
                                Reject
                            </button>
                        ` : ''}

                        ${paper.status === 'READY_FOR_EXAM' ? `
                            <button class="btn btn-primary btn-sm" onclick="App.downloadDecryptedPaper('${paper.id}')">
                                Decrypt & Download
                            </button>
                        ` : ''}

                        <button class="btn btn-secondary btn-sm" onclick="App.openPaperDetailsModal('${paper.id}')">
                            Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'PENDING': return 'pending';
            case 'APPROVED': return 'approved';
            case 'REJECTED': return 'rejected';
            case 'TIME_LOCKED': return 'time-locked';
            case 'READY_FOR_EXAM': return 'ready';
            default: return 'pending';
        }
    },

    async downloadDecryptedPaper(paperId) {
        this.showToast('Reconstructing AES-256 key from Shamir shares & decrypting paper...', 'info');
        try {
            const res = await API.papers.download(paperId);
            if (res.blob) {
                const url = window.URL.createObjectURL(res.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Exam_Paper_${paperId}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                this.showToast('Question paper successfully decrypted and downloaded.', 'success');
            }
        } catch (err) {
            this.showToast(err.message || 'Decryption failed: paper is locked or unauthorized', 'error');
        }
    },

    // -------------------------------------------------------------
    // PART 3, 4, 5: Tamper-Evident Audit Logging & Verification
    // -------------------------------------------------------------
    setupAuditHandlers() {
        const verifyBtn = document.getElementById('run-verify-btn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.runAuditVerification());
        }

        const tamperBtn = document.getElementById('tamper-modal-trigger-btn');
        if (tamperBtn) {
            tamperBtn.addEventListener('click', () => {
                document.getElementById('tamper-modal').classList.add('active');
            });
        }

        const restoreBtn = document.getElementById('restore-chain-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', async () => {
                restoreBtn.disabled = true;
                const origText = restoreBtn.textContent;
                restoreBtn.textContent = 'Restoring...';

                try {
                    const res = await API.audit.restore();
                    this.showToast(res.message || 'Audit log successfully restored to legitimate state.', 'success');
                    
                    // Refresh audit logs and automatically rerun verification
                    await this.loadAuditData();
                } catch (err) {
                    this.showToast(err.message, 'error');
                } finally {
                    restoreBtn.disabled = false;
                    restoreBtn.textContent = origText;
                }
            });
        }

        // Filters
        const actionFilter = document.getElementById('audit-action-filter');
        const searchInput = document.getElementById('audit-search-input');
        if (actionFilter) actionFilter.addEventListener('change', () => this.filterAuditLogs());
        if (searchInput) searchInput.addEventListener('input', () => this.filterAuditLogs());
    },

    async loadAuditData() {
        try {
            const [logsRes, verifyRes] = await Promise.all([
                API.audit.getLogs(),
                API.audit.verify()
            ]);

            this.cachedAuditLogs = logsRes.logs || [];
            this.renderVerificationBanner(verifyRes);
            this.renderAuditTable(this.cachedAuditLogs, verifyRes);
        } catch (err) {
            console.error('Error loading audit data:', err);
        }
    },

    async runAuditVerification(logCheck = false) {
        const btn = document.getElementById('run-verify-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Recalculating SHA-256 Hashes...';
        }

        try {
            const res = await API.audit.verify(logCheck);
            this.renderVerificationBanner(res);
            
            const logsRes = await API.audit.getLogs();
            this.cachedAuditLogs = logsRes.logs || [];
            this.renderAuditTable(this.cachedAuditLogs, res);

            if (res.isValid) {
                this.showToast('Audit Chain Verified: All blocks and SHA-256 hashes cryptographically match.', 'success');
            } else {
                this.showToast(`TAMPERING DETECTED at Block #${res.corruptedIndex}!`, 'error');
            }
        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Verify Hash Chain Now';
            }
        }
    },

    renderVerificationBanner(verifyRes) {
        const banner = document.getElementById('verification-banner');
        if (!banner) return;

        if (verifyRes.isValid) {
            banner.className = 'verification-banner valid';
            banner.innerHTML = `
                <div>
                    <div class="banner-title">
                        <span class="alert-indicator success"></span>
                        Audit Chain Valid — 100% Cryptographically Intact
                    </div>
                    <div class="banner-desc">
                        All <strong>${verifyRes.totalRecords}</strong> ledger blocks verified with zero discrepancies. 
                        Every SHA-256(previousHash + timestamp + userId + action + paperId) matches.
                    </div>
                </div>
                <div>
                    <button class="btn btn-secondary btn-sm" id="banner-tamper-btn" onclick="document.getElementById('tamper-modal').classList.add('active')">
                        Simulate Tampering
                    </button>
                </div>
            `;
        } else {
            banner.className = 'verification-banner tampered';
            banner.innerHTML = `
                <div style="width:100%">
                    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem">
                        <div style="display:flex; align-items:center; gap:0.85rem">
                            <div style="width:36px; height:36px; border-radius:50%; background:#fef2f2; border:1px solid #fee2e2; display:flex; align-items:center; justify-content:center; color:#dc2626; flex-shrink:0">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </div>
                            <div>
                                <div class="banner-title" style="color:#b91c1c; font-size:16px; font-weight:600">
                                    Tampering Detected — Cryptographic Mismatch
                                </div>
                                <div class="banner-desc" style="color:#64748b; font-size:14px; margin-top:2px">
                                    Recalculated SHA-256 hash does not match stored block hash at Block #${verifyRes.corruptedIndex}.
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="banner-restore-btn" onclick="document.getElementById('restore-chain-btn').click()">
                            Restore Genuine Chain
                        </button>
                    </div>

                    <div class="corrupted-alert-panel">
                        <div style="font-weight:600; color:#b91c1c; font-size:13px; margin-bottom:0.5rem">
                            Diagnostic: ${verifyRes.failureReason}
                        </div>
                        <div class="corrupted-grid">
                            <div>
                                <span style="color:var(--text-secondary); font-size:12px">Block Number:</span><br>
                                <strong style="color:var(--text-primary); font-size:14px">Block #${verifyRes.corruptedIndex} (${verifyRes.corruptedRecord?.action})</strong>
                            </div>
                            <div>
                                <span style="color:var(--text-secondary); font-size:12px">Stored Hash:</span><br>
                                <span class="hash-pill" style="color:#b91c1c; background:#ffffff; border-color:#fca5a5">${verifyRes.storedHash || verifyRes.corruptedRecord?.currentHash}</span>
                            </div>
                            <div>
                                <span style="color:var(--text-secondary); font-size:12px">Recalculated Hash:</span><br>
                                <span class="hash-pill" style="color:#15803d; background:#ffffff; border-color:#86efac">${verifyRes.expectedHash}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    renderAuditTable(logs, verifyRes) {
        const tableBody = document.getElementById('audit-table-body');
        if (!tableBody) return;

        const corruptedIdx = (!verifyRes || verifyRes.isValid) ? -1 : verifyRes.corruptedIndex;

        if (logs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2.5rem; color:var(--text-muted)">No audit log records found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = logs.map(l => {
            const isCorrupted = (l.index === corruptedIdx);
            const dateStr = new Date(l.timestamp).toLocaleString();

            let actionClass = 'upload';
            if (l.action.includes('UNLOCK')) actionClass = 'unlock';
            if (l.action.includes('APPROV')) actionClass = 'approve';
            if (l.action.includes('DECRYPT')) actionClass = 'decrypt';
            if (l.action.includes('TAMPER') || l.action.includes('UNAUTHORIZED')) actionClass = 'tamper';

            return `
                <tr class="${isCorrupted ? 'corrupted-row' : ''}">
                    <td>
                        <strong style="color:${isCorrupted ? '#b91c1c' : 'var(--text-primary)'}">#${l.index}</strong>
                    </td>
                    <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary)">
                        ${dateStr}
                    </td>
                    <td>
                        <div style="font-weight:600; color:var(--text-primary)">${l.userName || l.userId}</div>
                        <div style="font-size:0.72rem; color:var(--text-muted)">${l.userEmail || l.userId}</div>
                    </td>
                    <td>
                        <span class="role-tag ${l.role}">${l.role}</span>
                    </td>
                    <td>
                        <span class="action-tag ${actionClass}">${l.action}</span>
                    </td>
                    <td>
                        <div style="font-weight:500">${l.paperId}</div>
                        <small style="color:var(--text-muted)">${l.paperTitle || ''}</small>
                    </td>
                    <td>
                        ${isCorrupted ? `
                            <span class="status-badge rejected" style="font-size:0.7rem">
                                Tampered
                            </span>
                        ` : `
                            <span class="status-badge ready" style="font-size:0.7rem">
                                Valid
                            </span>
                        `}
                    </td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="App.openProofModal(${l.index})">
                            Proof
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterAuditLogs() {
        const action = document.getElementById('audit-action-filter')?.value || 'ALL';
        const query = document.getElementById('audit-search-input')?.value.toLowerCase().trim() || '';

        let filtered = [...this.cachedAuditLogs];

        if (action !== 'ALL') {
            filtered = filtered.filter(l => l.action.toLowerCase() === action.toLowerCase());
        }

        if (query) {
            filtered = filtered.filter(l => 
                (l.userName && l.userName.toLowerCase().includes(query)) ||
                (l.userEmail && l.userEmail.toLowerCase().includes(query)) ||
                (l.action && l.action.toLowerCase().includes(query)) ||
                (l.paperId && l.paperId.toLowerCase().includes(query)) ||
                (l.paperTitle && l.paperTitle.toLowerCase().includes(query)) ||
                (l.currentHash && l.currentHash.toLowerCase().includes(query))
            );
        }

        this.renderAuditTable(filtered, { isValid: true, corruptedIndex: -1 });
    },

    openProofModal(logIndex) {
        const log = this.cachedAuditLogs.find(l => l.index === logIndex);
        if (!log) return;

        const body = document.getElementById('proof-modal-body');
        if (body) {
            body.innerHTML = `
                <div style="font-size:0.875rem; display:flex; flex-direction:column; gap:1rem">
                    <div style="background:#f8fafc; padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle)">
                        <div style="color:var(--blue-primary); font-weight:700; margin-bottom:0.5rem">Formula: SHA-256(previousHash + timestamp + userId + action + paperId)</div>
                        <div style="font-family:var(--font-mono); font-size:0.75rem; word-break:break-all; color:#374151; background:#ffffff; padding:0.5rem; border:1px solid #e2e8f0; border-radius:4px">
                            ${log.previousHash}${log.timestamp}${log.userId}${log.action}${log.paperId}
                        </div>
                    </div>

                    <div>
                        <span style="color:var(--text-secondary)">Previous Block Hash (Link):</span><br>
                        <span class="hash-pill" style="word-break:break-all; display:block; margin-top:0.25rem">${log.previousHash}</span>
                    </div>

                    <div>
                        <span style="color:var(--text-secondary)">Current Block Sealed Hash:</span><br>
                        <span class="hash-pill" style="word-break:break-all; display:block; margin-top:0.25rem; color:#15803d; border-color:#86efac; background:#f0fdf4">${log.currentHash}</span>
                    </div>

                    <div style="background:#f8fafc; padding:0.75rem 1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle)">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem">
                            <span style="color:var(--text-secondary)">Action:</span>
                            <strong style="color:var(--text-primary)">${log.action}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem">
                            <span style="color:var(--text-secondary)">User:</span>
                            <strong style="color:var(--text-primary)">${log.userName} (${log.role})</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem">
                            <span style="color:var(--text-secondary)">Paper:</span>
                            <strong style="color:var(--text-primary)">${log.paperId}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between">
                            <span style="color:var(--text-secondary)">Timestamp:</span>
                            <strong style="font-family:var(--font-mono); font-size:0.78rem; color:var(--text-primary)">${log.timestamp}</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        document.getElementById('proof-modal').classList.add('active');
    },

    // -------------------------------------------------------------
    // Modals & User Action Flows
    // -------------------------------------------------------------
    setupModals() {
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            });
        });

        // Tamper simulation form submission
        const tamperForm = document.getElementById('tamper-simulation-form');
        if (tamperForm) {
            tamperForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const index = parseInt(document.getElementById('tamper-index').value, 10);
                const field = document.getElementById('tamper-field').value;
                const value = document.getElementById('tamper-value').value.trim();

                try {
                    await API.audit.simulateTamper(index, field, value);
                    this.showToast(`Tamper injected into Block #${index}. Run verification now.`, 'warning');
                    document.getElementById('tamper-modal').classList.remove('active');
                    this.runAuditVerification();
                } catch (err) {
                    this.showToast(err.message, 'error');
                }
            });
        }

        // Approve sign-off form submission
        const approveForm = document.getElementById('approve-sign-form');
        if (approveForm) {
            approveForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const paperId = document.getElementById('approve-paper-id').value;
                const comments = document.getElementById('approve-comments').value.trim();

                try {
                    await API.papers.approve(paperId, { decision: 'APPROVE', comments });
                    this.showToast(`Cryptographic approval registered for ${paperId}.`, 'success');
                    document.getElementById('approve-modal').classList.remove('active');
                    this.loadApprovalsData();
                } catch (err) {
                    this.showToast(err.message, 'error');
                }
            });
        }
    },

    openApproveModal(paperId, courseCode) {
        document.getElementById('approve-paper-id').value = paperId;
        document.getElementById('approve-modal-code').textContent = courseCode;
        document.getElementById('approve-modal').classList.add('active');
    },

    async handleDirectReject(paperId) {
        const reason = prompt('Enter reason for rejecting this question paper:');
        if (!reason) return;

        try {
            await API.papers.approve(paperId, { decision: 'REJECT', comments: reason });
            this.showToast(`Paper ${paperId} rejected.`, 'error');
            this.loadApprovalsData();
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    openPaperDetailsModal(paperId) {
        const paper = this.cachedPapers.find(p => p.id === paperId);
        if (!paper) return;

        const body = document.getElementById('details-modal-body');
        if (body) {
            body.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1rem; font-size:0.875rem">
                    <div>
                        <div class="paper-code" style="font-size:1.1rem">${paper.courseCode}</div>
                        <div style="font-size:1.25rem; font-weight:700; color:var(--text-primary); margin-top:0.25rem">${paper.title}</div>
                        <div style="color:var(--text-secondary); margin-top:0.25rem">${paper.department} | Semester ${paper.semester || '8'}</div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; background:#f8fafc; border:1px solid var(--border-subtle); padding:1rem; border-radius:var(--radius-md)">
                        <div><span style="color:var(--text-secondary); font-size:13px">Status:</span><br><strong class="status-badge ${this.getStatusBadgeClass(paper.status)}" style="margin-top:0.25rem">${paper.status.replace(/_/g, ' ')}</strong></div>
                        <div><span style="color:var(--text-secondary); font-size:13px">Threshold (k/n):</span><br><strong style="color:var(--text-primary)">${paper.thresholdK} of ${paper.totalSharesN} Approvers</strong></div>
                        <div><span style="color:var(--text-secondary); font-size:13px">Exam Date:</span><br><strong style="color:var(--text-primary)">${paper.examDate}</strong></div>
                        <div><span style="color:var(--text-secondary); font-size:13px">Max Marks:</span><br><strong style="color:var(--text-primary)">${paper.totalMarks}</strong></div>
                    </div>

                    <div>
                        <div style="font-weight:600; color:var(--text-primary); margin-bottom:0.5rem">AES-256-GCM Ciphertext Payload:</div>
                        <div class="hash-pill" style="word-break:break-all; max-height:80px; overflow-y:auto; display:block">
                            ${paper.ciphertextBase64?.substring(0, 160)}... [${paper.fileSize || 0} bytes encrypted]
                        </div>
                    </div>

                    <div>
                        <div style="font-weight:600; color:var(--text-primary); margin-bottom:0.5rem">Shamir Key Share Approvals:</div>
                        ${(paper.approvals || []).map(a => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid var(--border-subtle); padding:0.6rem 0.85rem; border-radius:6px; margin-bottom:0.35rem">
                                <div>
                                    <div style="font-weight:600; color:var(--text-primary)">${a.approverName}</div>
                                    <div style="font-size:0.72rem; color:var(--text-muted)">${a.comments || 'No comments'}</div>
                                </div>
                                <span class="status-badge ${a.status === 'APPROVED' ? 'ready' : (a.status === 'REJECTED' ? 'rejected' : 'pending')}">${a.status}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        document.getElementById('details-modal').classList.add('active');
    }
};

window.App = App;

// Bootstrap on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
