export class APIClient {
    constructor() {
        this.token = null;
        this.baseUrl = '/api';
        this.refreshing = false;
        this.pendingQueue = [];
        this.timeoutMs = 10000;
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

    async request(method, path, data = null) {
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
        options.signal = controller.signal;

        try {
            const response = await fetch(url, options);

            // Avoid refresh recursion deadlock
            if (response.status === 401 && this.token && path !== '/auth/refresh') {
                const refreshed = await this.tryRefresh();
                if (refreshed) {
                    headers.Authorization = `Bearer ${this.token}`;
                    return await this.fetchWithTimeout(url, { ...options, headers });
                }

                this.clearToken();
                window.dispatchEvent(new CustomEvent('auth:logout'));
                return {
                    success: false,
                    code: 'TOKEN_EXPIRED',
                    message: '登录已过期，请重新登录',
                };
            }

            return await this.safeJson(response);
        } catch (error) {
            if (error?.name === 'AbortError') {
                return {
                    success: false,
                    code: 'REQUEST_TIMEOUT',
                    message: '请求超时，请稍后重试',
                };
            }
            return {
                success: false,
                code: 'NETWORK_ERROR',
                message: '网络连接失败，请检查网络',
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            return await this.safeJson(response);
        } catch (error) {
            if (error?.name === 'AbortError') {
                return {
                    success: false,
                    code: 'REQUEST_TIMEOUT',
                    message: '请求超时，请稍后重试',
                };
            }
            return {
                success: false,
                code: 'NETWORK_ERROR',
                message: '网络连接失败，请检查网络',
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

    get(path) {
        return this.request('GET', path);
    }

    post(path, data) {
        return this.request('POST', path, data);
    }

    put(path, data) {
        return this.request('PUT', path, data);
    }

    delete(path) {
        return this.request('DELETE', path);
    }
}
