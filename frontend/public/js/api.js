'use strict';

/**
 * Secure Exam Question Paper System — API Client
 * Person D Frontend & Integration Module
 */

const API = {
    baseUrl: '/api',

    getToken() {
        return localStorage.getItem('exam_auth_token');
    },

    setToken(token) {
        if (token) {
            localStorage.setItem('exam_auth_token', token);
        } else {
            localStorage.removeItem('exam_auth_token');
        }
    },

    getUser() {
        try {
            const raw = localStorage.getItem('exam_auth_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    setUser(user) {
        if (user) {
            localStorage.setItem('exam_auth_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('exam_auth_user');
        }
    },

    clearAuth() {
        localStorage.removeItem('exam_auth_token');
        localStorage.removeItem('exam_auth_user');
    },

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = options.headers || {};

        const token = this.getToken();
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle blob downloads (e.g. PDF decryption)
            if (options.isBlob) {
                if (!response.ok) {
                    const errJson = await response.json();
                    throw new Error(errJson.message || 'Download failed');
                }
                const blob = await response.blob();
                return { ok: true, blob };
            }

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
                    // Token expired or invalid
                    this.clearAuth();
                    window.dispatchEvent(new CustomEvent('auth:expired'));
                }
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (err) {
            console.error(`[API Error] ${endpoint}:`, err.message);
            throw err;
        }
    },

    // Auth Endpoints
    auth: {
        login(email, password) {
            return API.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        },
        signup(payload) {
            return API.request('/auth/signup', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        me() {
            return API.request('/auth/me');
        },
        getDemoAccounts() {
            return API.request('/auth/demo-accounts');
        }
    },

    // Paper Endpoints
    papers: {
        getAll() {
            return API.request('/papers');
        },
        getById(id) {
            return API.request(`/papers/${id}`);
        },
        upload(formData) {
            return API.request('/papers/upload', {
                method: 'POST',
                body: formData
            });
        },
        requestUnlock(id, payload) {
            return API.request(`/papers/${id}/request-unlock`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        approve(id, payload) {
            return API.request(`/papers/${id}/approve`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        download(id) {
            return API.request(`/papers/${id}/download`, {
                isBlob: true
            });
        }
    },

    // Audit Endpoints (Part 3, 4, 5)
    audit: {
        getLogs(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/audit/logs${query ? `?${query}` : ''}`);
        },
        verify(logCheck = false) {
            return API.request(`/audit/verify${logCheck ? '?logCheck=true' : ''}`);
        },
        simulateTamper(recordIndex, field, newValue) {
            return API.request('/audit/tamper-test', {
                method: 'POST',
                body: JSON.stringify({ recordIndex, field, newValue })
            });
        },
        restore() {
            return API.request('/audit/restore', {
                method: 'POST'
            });
        }
    }
};

window.API = API;
