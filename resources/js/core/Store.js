// LevelUp 英语修仙 - 本地状态管理
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
        if (!user) return user;
        const normalized = { ...user };
        normalized.current_realm = normalized.current_realm || '练气一层';
        normalized.cultivation_energy = Number(normalized.cultivation_energy || 0);
        normalized.vocabulary = Number(normalized.vocabulary || 0);
        normalized.grammar = Number(normalized.grammar || 0);
        normalized.reading = Number(normalized.reading || 0);
        normalized.listening = Number(normalized.listening || 0);
        normalized.writing = Number(normalized.writing || 0);
        normalized.speaking = Number(normalized.speaking || 0);
        return normalized;
    }

    // 用户数据
    setUser(user) {
        this.state.user = this.normalizeRealmUser(user);
        this.notify();
    }

    updateUser(updates) {
        if (this.state.user) {
            Object.assign(this.state.user, this.normalizeRealmUser(updates));
            this.notify();
        }
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
