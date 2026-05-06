// LevelUp 英语修仙 - API 请求封装（含 token 自动刷新）
export class APIClient {
    constructor() {
        this.token = null;
        this.baseUrl = '/api';
        this.refreshing = false;
        this.pendingQueue = [];
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
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const options = { method, headers };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);

            if (response.status === 401 && this.token) {
                // Token 过期 → 尝试刷新
                const refreshed = await this.tryRefresh();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.token}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    const retryJson = await retryResponse.json();
                    return retryJson;
                }

                // 刷新失败 → 跳转登录
                this.clearToken();
                window.dispatchEvent(new CustomEvent('auth:logout'));
                return { success: false, code: 'TOKEN_EXPIRED', message: '登录已过期，请重新登录' };
            }

            const json = await response.json();
            return json;
        } catch (error) {
            console.error('API Error:', error);
            return {
                success: false,
                code: 'NETWORK_ERROR',
                message: '网络连接失败，请检查网络',
            };
        }
    }

    async tryRefresh() {
        if (this.refreshing) {
            // 正在刷新中，等待完成
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
                this.pendingQueue.forEach(r => r(true));
                this.pendingQueue = [];
                return true;
            }
        } catch (e) {
            // 刷新失败
        }

        this.refreshing = false;
        this.pendingQueue.forEach(r => r(false));
        this.pendingQueue = [];
        return false;
    }

    get(path) { return this.request('GET', path); }
    post(path, data) { return this.request('POST', path, data); }
    put(path, data) { return this.request('PUT', path, data); }
    delete(path) { return this.request('DELETE', path); }
}
