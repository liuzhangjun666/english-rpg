// LevelUp 英语修仙 - 本地状态管理
import { pinia } from '../vue/main';
import { useUserStore } from '../vue/stores/user';
import { mergeRealmPatch, normalizeUserProfile } from '../utils/cultivation.js';

export class Store {
    constructor() {
        this.state = {
            user: null,
            daily: {
                minutes: 0,
                questions_done: 0,
                accuracy: 0,
            },
            currentSession: {
                scene: null,
                level: null,
                stage: null,
                questions: [],
                currentIndex: 0,
                answers: [],
                totalExp: 0,
                totalSpiritCost: 0,
            },
            hermes: {
                messages: [],
            },
            story: {
                progress: null,
                currencies: null,
            },
        };

        this.listeners = [];
    }

    subscribe(fn) {
        this.listeners.push(fn);
        return () => {
            this.listeners = this.listeners.filter(l => l !== fn);
        };
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }

    normalizeRealmUser(user) {
        return normalizeUserProfile(user);
    }

    /** Partial updates must not inject default realm labels into Pinia. */
    sanitizeUserPatch(updates) {
        if (!updates) return updates;
        const patch = { ...updates };
        if ('cultivation_energy' in patch) patch.cultivation_energy = Number(patch.cultivation_energy || 0);
        if ('vocabulary' in patch) patch.vocabulary = Number(patch.vocabulary || 0);
        if ('grammar' in patch) patch.grammar = Number(patch.grammar || 0);
        if ('reading' in patch) patch.reading = Number(patch.reading || 0);
        if ('listening' in patch) patch.listening = Number(patch.listening || 0);
        if ('writing' in patch) patch.writing = Number(patch.writing || 0);
        if ('speaking' in patch) patch.speaking = Number(patch.speaking || 0);
        return patch;
    }

    // 用户数据
    setUser(user) {
        this.state.user = this.normalizeRealmUser(user);
        this.notify();
        // [BRIDGE] 同步到 Pinia，供 Vue 3 组件使用
        try {
            const userStore = useUserStore(pinia);
            userStore.setProfile(this.state.user);
        } catch (e) {
            console.error('桥接 Pinia 失败:', e);
        }
    }

    updateUser(updates) {
        if (this.state.user) {
            const sanitized = this.sanitizeUserPatch(updates);
            const patch = mergeRealmPatch(this.state.user, sanitized);
            Object.assign(this.state.user, patch);
            this.state.user = normalizeUserProfile(this.state.user);
            this.notify();
            // [BRIDGE] 同步到 Pinia，供 Vue 3 组件使用
            try {
                const userStore = useUserStore(pinia);
                userStore.setProfile(this.state.user);
            } catch (e) {
                console.error('桥接 Pinia 失败:', e);
            }
        }
    }

    setStoryProgress(progress) {
        this.state.story.progress = progress;
        this.notify();
    }

    setProgressCurrencies(currencies) {
        this.state.story.currencies = currencies;
        this.notify();
    }

    updateStoryProgress(updates) {
        const current = this.state.story.progress || {};
        this.state.story.progress = { ...current, ...updates };
        this.notify();
    }

    updateProgressCurrencies(updates) {
        const current = this.state.story.currencies || {};
        this.state.story.currencies = { ...current, ...updates };
        this.notify();
    }

    // 每日数据
    updateDaily(data) {
        Object.assign(this.state.daily, data);
        this.notify();
    }

    // 当前答题会话
    startLevel(scene, level, stage, questions) {
        this.state.currentSession = {
            scene,
            level,
            stage,
            questions,
            currentIndex: 0,
            answers: [],
            totalExp: 0,
            totalSpiritCost: 0,
        };
        this.notify();
    }

    answerQuestion(questionId, answer) {
        const session = this.state.currentSession;
        const existing = session.answers.find(a => a.question_id === questionId);
        if (existing) {
            existing.answer = answer;
        } else {
            session.answers.push({ question_id: questionId, answer });
        }
        this.notify();
    }

    nextQuestion() {
        this.state.currentSession.currentIndex++;
        this.notify();
    }

    // Hermes 消息
    addHermesMessage(text, type = 'hermes') {
        this.state.hermes.messages.push({ text, type, time: Date.now() });
        this.notify();
    }

    // 场景切换
    switchScene(scene) {
        this.state.currentSession.scene = scene;
        this.notify();
    }

    getState() {
        return this.state;
    }
}
