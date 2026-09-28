'use strict';

/**
 * Auth Module — JWT Token & Secure Session Management
 * Role-based UI guards for Admin, Setter, Approver, Invigilator
 * Strictly starts on Login page without headers or quick-role switchers
 */

const Auth = {
    currentUser: null,

    init() {
        // Guarantee that opening the application starts on the Login page
        API.clearAuth();
        this.currentUser = null;
        this.setupEventListeners();
        this.applyAuthState();
    },

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        window.addEventListener('auth:expired', () => {
            this.handleLogout('Your session has expired. Please sign in again.');
        });
    },

    async handleLogin(e) {
        if (e) e.preventDefault();

        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value;

        if (!email || !password) {
            App.showToast('Please enter both academic email and password.', 'warning');
            return;
        }

        const submitBtn = document.getElementById('login-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Authenticating Credentials...';
        }

        try {
            const res = await API.auth.login(email, password);
            API.setToken(res.token);
            API.setUser(res.user);
            this.currentUser = res.user;

            App.showToast(`Signed in successfully as ${res.user.name}.`, 'success');
            this.applyAuthState();

            // Direct to appropriate initial dashboard view based on institutional role
            this.redirectByRole(res.user.role);
        } catch (err) {
            App.showToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        }
    },

    handleLogout(msg) {
        API.clearAuth();
        this.currentUser = null;
        this.applyAuthState();
        App.showToast(msg || 'Signed out of portal.', 'info');
        App.switchView('view-login');
        
        // Reset login form fields
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();
    },

    redirectByRole(role) {
        switch (role) {
            case 'setter':
                App.switchView('view-upload');
                break;
            case 'approver':
                App.switchView('view-approvals');
                break;
            case 'invigilator':
                App.switchView('view-unlock');
                break;
            case 'admin':
            default:
                App.switchView('view-dashboard');
                break;
        }
    },

    applyAuthState() {
        const isAuth = Boolean(this.currentUser && API.getToken());
        const user = this.currentUser;

        // Header and navigation elements
        const appHeader = document.getElementById('app-header');
        const userMenu = document.getElementById('user-menu');
        const navTabs = document.getElementById('main-nav-tabs');

        if (isAuth && user) {
            document.body.classList.remove('login-mode');
            if (appHeader) appHeader.style.display = 'flex';

            if (userMenu) {
                userMenu.style.display = 'flex';
                const nameEl = document.getElementById('user-display-name');
                if (nameEl) nameEl.textContent = user.name;
                
                const roleBadge = document.getElementById('user-display-role');
                if (roleBadge) {
                    roleBadge.textContent = user.role.toUpperCase();
                    roleBadge.className = `role-tag ${user.role}`;
                }

                const avatar = document.getElementById('user-avatar-initial');
                if (avatar) {
                    avatar.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
                }
            }

            if (navTabs) navTabs.style.display = 'flex';

            // Apply role-based filtering to navigation tabs
            this.applyRoleNavGuards(user.role);
        } else {
            document.body.classList.add('login-mode');
            if (appHeader) appHeader.style.display = 'none';
            if (userMenu) userMenu.style.display = 'none';
            if (navTabs) navTabs.style.display = 'none';
            App.switchView('view-login');
        }
    },

    applyRoleNavGuards(role) {
        const tabDashboard = document.getElementById('tab-dashboard');
        const tabUpload = document.getElementById('tab-upload');
        const tabApprovals = document.getElementById('tab-approvals');
        const tabUnlock = document.getElementById('tab-unlock');
        const tabAudit = document.getElementById('tab-audit');

        // Dashboard and Audit verification are available to all authenticated roles
        if (tabDashboard) tabDashboard.style.display = 'flex';
        if (tabAudit) tabAudit.style.display = 'flex';

        // Role-specific workflow actions
        if (role === 'setter') {
            if (tabUpload) tabUpload.style.display = 'flex';
            if (tabApprovals) tabApprovals.style.display = 'flex';
            if (tabUnlock) tabUnlock.style.display = 'none';
        } else if (role === 'approver') {
            if (tabUpload) tabUpload.style.display = 'none';
            if (tabApprovals) tabApprovals.style.display = 'flex';
            if (tabUnlock) tabUnlock.style.display = 'flex';
        } else if (role === 'invigilator') {
            if (tabUpload) tabUpload.style.display = 'none';
            if (tabApprovals) tabApprovals.style.display = 'flex';
            if (tabUnlock) tabUnlock.style.display = 'flex';
        } else if (role === 'admin') {
            // Admin role sees all workflow tabs
            if (tabUpload) tabUpload.style.display = 'flex';
            if (tabApprovals) tabApprovals.style.display = 'flex';
            if (tabUnlock) tabUnlock.style.display = 'flex';
        }
    }
};

window.Auth = Auth;
