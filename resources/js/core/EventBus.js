export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(eventName, listener) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        const set = this.listeners.get(eventName);
        set.add(listener);
        return () => this.off(eventName, listener);
    }

    off(eventName, listener) {
        const set = this.listeners.get(eventName);
        if (!set) return;
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(eventName);
    }

    emit(eventName, payload = {}) {
        const set = this.listeners.get(eventName);
        if (!set || set.size === 0) return;
        for (const listener of set) {
            try {
                listener(payload);
            } catch (error) {
                console.error(`[EventBus] listener failed: ${eventName}`, error);
            }
        }
    }
}
