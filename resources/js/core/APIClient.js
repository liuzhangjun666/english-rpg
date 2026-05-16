export class APIClient {
    constructor() {
        this.token = null;
        this.baseUrl = '/api';
        this.refreshing = false;
        this.pendingQueue = [];
        this.timeoutMs = 10000;
        this.maxRetry = 3;
        this.offlineQueueKey = 'levelup_offline_submit_queue_v1';
        window.addEventListener('online', () => {
            this.flushOfflineQueue();
        });
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('levelup_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('levelup_token');
    }

    getStoredToken() {
        return localStorage.getItem('levelup_token');
    }

    async request(method, path, data = null, meta = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };

        if (this.token) headers.Authorization = `Bearer ${this.token}`;

        const options = { method, headers };
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        const maxAttempt = this.shouldRetry(method, path) ? this.maxRetry : 1;
        let result = null;
        for (let attempt = 1; attempt <= maxAttempt; attempt++) {
            result = await this.fetchOnce(url, options);
            const networkLike = ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(result.payload?.code);
            if (!networkLike || attempt >= maxAttempt) {
                break;
            }
            const backoffMs = Math.min(250 * (2 ** (attempt - 1)), 1200);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
        // Avoid refresh recursion deadlock
        if (result.status === 401 && this.token && path !== '/auth/refresh') {
            const refreshed = await this.tryRefresh();
            if (refreshed) {
                headers.Authorization = `Bearer ${this.token}`;
                return this.request(method, path, data);
            }

            this.clearToken();
            window.dispatchEvent(new CustomEvent('auth:logout'));
            return {
                success: false,
                code: 'TOKEN_EXPIRED',
                message: '登录已过期，请重新登录',
            };
        }

        if (!meta.skipQueue && !result.payload?.success && ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(result.payload?.code)) {
            const queued = this.enqueueOfflineIfNeeded(method, path, data, result.payload?.code);
            if (queued) {
                return {
                    success: false,
                    code: 'OFFLINE_QUEUED',
                    message: '网络异常，答案已暂存，将在网络恢复后自动同步',
                };
            }
        }

        return result.payload;
    }

    async fetchOnce(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            const payload = await this.safeJson(response);
            return { status: response.status, payload };
        } catch (error) {
            if (error?.name === 'AbortError') {
                return {
                    status: 0,
                    payload: {
                        success: false,
                        code: 'REQUEST_TIMEOUT',
                        message: '请求超时，请稍后重试',
                    },
                };
            }
            return {
                status: 0,
                payload: {
                    success: false,
                    code: 'NETWORK_ERROR',
                    message: '网络连接失败，请检查网络',
                },
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async safeJson(response) {
        try {
            return await response.json();
        } catch {
            return {
                success: false,
                code: 'INVALID_RESPONSE',
                message: '服务响应异常，请稍后重试',
            };
        }
    }

    async tryRefresh() {
        if (this.refreshing) {
            return new Promise((resolve) => {
                this.pendingQueue.push(resolve);
            });
        }

        this.refreshing = true;
        try {
            const res = await this.post('/auth/refresh');
            if (res.success && res.data?.token) {
                this.setToken(res.data.token);
                this.refreshing = false;
                this.pendingQueue.forEach((r) => r(true));
                this.pendingQueue = [];
                return true;
            }
        } catch {
            // ignored
        }

        this.refreshing = false;
        this.pendingQueue.forEach((r) => r(false));
        this.pendingQueue = [];
        return false;
    }

    shouldRetry(method, path) {
        return String(method || '').toUpperCase() === 'GET' || path === '/auth/refresh';
    }

    shouldQueueOffline(method, path) {
        if (String(method || '').toUpperCase() !== 'POST') return false;
        const p = String(path || '');
        return /\/(submit|submit-batch|submit-one)$/.test(p);
    }

    enqueueOfflineIfNeeded(method, path, data, errorCode) {
        const offlineLike = !navigator.onLine || ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(errorCode);
        if (!offlineLike || !this.shouldQueueOffline(method, path) || !data) return false;

        try {
            const raw = localStorage.getItem(this.offlineQueueKey);
            const queue = raw ? JSON.parse(raw) : [];
            queue.push({
                method,
                path,
                data,
                ts: Date.now(),
            });
            localStorage.setItem(this.offlineQueueKey, JSON.stringify(queue.slice(-50)));
            return true;
        } catch {
            return false;
        }
    }

    async flushOfflineQueue() {
        let raw = null;
        try {
            raw = localStorage.getItem(this.offlineQueueKey);
        } catch {
            return;
        }
        if (!raw) return;

        let queue = [];
        try {
            queue = JSON.parse(raw) || [];
        } catch {
            queue = [];
        }
        if (!queue.length) return;

        const remaining = [];
        for (const item of queue) {
            try {
                const result = await this.request(item.method, item.path, item.data, { skipQueue: true });
                if (!result?.success && result?.code !== 'TOKEN_EXPIRED') {
                    remaining.push(item);
                }
            } catch {
                remaining.push(item);
            }
        }

        try {
            if (remaining.length) localStorage.setItem(this.offlineQueueKey, JSON.stringify(remaining));
            else localStorage.removeItem(this.offlineQueueKey);
        } catch {
            // ignore
        }
    }

    get(path) {
        return this.request('GET', path);
    }

    post(path, data) {
        return this.request('POST', path, data);
    }

    put(path, data) {
        return this.request('PUT', path, data);
    }

    patch(path, data) {
        return this.request('PATCH', path, data);
    }

    delete(path) {
        return this.request('DELETE', path);
    }
}
