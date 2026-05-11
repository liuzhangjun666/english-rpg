// LevelUp 英语修仙 - 答题面板（即时反馈+连击版）
import herbIcon from '../../assets/images/herb_icon.png';

const LISTENING_TEST_DIALOGUE = [
    { role: 'A', text: 'Can I learn to play weiqi?', gender: 'female' },
    { role: 'B', text: 'Sure, you can.', gender: 'male' },
    { role: 'A', text: 'Do you want to join a club?', gender: 'female' },
    { role: 'B', text: 'Yes, I want to join the music club.', gender: 'male' },
];

const MODULE_META = {
    vocab: { title: '📖 采药识灵', shortName: '采药识灵', countText: (stageNo) => (stageNo <= 3 ? '15题' : stageNo <= 6 ? '18题' : '20题') },
    grammar: { title: '🔮 基础功法', shortName: '基础功法', countText: () => '10题' },
    listening: { title: '🎧 听力试炼', shortName: '听力试炼', countText: () => '10题' },
    speaking: { title: '🗣️ 口语试炼', shortName: '口语试炼', countText: () => '10题' },
    reading: { title: '📚 阅读试炼', shortName: '阅读试炼', countText: () => '10题' },
    writing: { title: '✍️ 写作试炼', shortName: '写作试炼', countText: () => '10题' },
};

export class PracticePanel {
    constructor(game) {
        this.game = game;
        this.container = null;
        this.currentLevel = null;
        this.currentType = null;
        this.questions = [];
        this.currentIndex = 0;
        this.answers = {};
        this.selectedOption = null;
        this.combo = 0;
        this.maxCombo = 0;
        this._feedbackShown = false;
        this.autoSpokenQuestions = new Set();
        this.autoSpokenListeningQuestions = new Set();
    }

    /** 打开关卡选择列表 */
    showLevelSelect(type) {
        this.game.ui.hideAllPanels();
        this.currentLevel = null;
        this.combo = 0;
        this.maxCombo = 0;
        this._feedbackShown = false;

        const moduleMeta = this.getModuleMeta(type);
        const { levelId, realm, stageNo, index, total } = this.getCurrentPlayableLevel(type);
        const resumable = this.loadSession(type);
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'level-select-panel';
        panel.style.maxWidth = '420px';
        panel.innerHTML = `
            <div class="panel-title">${moduleMeta.title}</div>
            ${resumable ? `
                <div style="padding:10px 12px;border:1px dashed rgba(78,192,122,0.55);border-radius:10px;background:rgba(78,192,122,0.08);margin-bottom:12px;">
                    <div style="font-size:13px;color:#9ee8bf;margin-bottom:4px;">发现未完成进度</div>
                    <div style="font-size:12px;color:var(--parchment-dark);">关卡 ${resumable.currentLevel} · 第 ${resumable.currentIndex + 1} 题</div>
                </div>
            ` : ''}
            <div style="padding:12px;border:1px solid rgba(212,168,67,0.25);border-radius:10px;background:rgba(255,255,255,0.04);margin-bottom:12px;">
                <div style="font-size:14px;color:var(--gold-light);margin-bottom:8px;">当前关卡</div>
                <div style="font-size:20px;font-family:var(--font-title);color:var(--gold);margin-bottom:4px;">${this.game.ui.getRealmName(realm)} · 第${String(stageNo).padStart(2, '0')}关</div>
                <div style="font-size:12px;color:var(--parchment-dark);">进度：${index + 1}/${total} · 题量：${moduleMeta.countText(stageNo)}</div>
            </div>
            ${resumable ? `<button class="btn btn-primary" id="level-resume-btn">继续上次进度</button>` : ''}
            <button class="btn btn-primary" id="level-start-btn" style="${resumable ? 'margin-top:8px;' : ''}">${resumable ? '重新开始本关' : '开始本关'}</button>
            <button class="btn btn-secondary" id="level-select-back" style="margin-top:12px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('level-resume-btn')?.addEventListener('click', () => this.resumeSession(type));
        document.getElementById('level-start-btn')?.addEventListener('click', () => this.startLevel(type, levelId));

        document.getElementById('level-select-back').addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }

    /** 开始一关的答题 */
    async startLevel(type, levelId) {
        this.game.ui.showLoading('加载题库...');
        this.currentType = type;
        this.currentLevel = levelId;
        this.currentIndex = 0;
        this.answers = {};
        this.combo = 0;
        this.maxCombo = 0;
        this._feedbackShown = false;

        const [realm, stage] = levelId.split('-');
        const res = await this.game.api.get(`/${type}/questions?level=${realm}&stage=${stage}`);

        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '该关卡暂无题目');
            return;
        }

        this.questions = res.data.questions;
        const cost = res.data.spirit_cost || this.questions.length;

        // 检查灵力
        const user = this.game.store.getState().user;
        if (user && user.spirit_power < cost) {
            this.game.ui.showHermesBubble(`灵力不足（当前${user.spirit_power}，需要${cost}），请明日再来修炼。`);
            return;
        }

        // 灵力消耗确认弹窗
        const moduleMeta = this.getModuleMeta(type);
        const confirmPanel = document.createElement('div');
        confirmPanel.className = 'panel';
        confirmPanel.id = 'spirit-confirm';
        confirmPanel.style.maxWidth = '380px';
        confirmPanel.innerHTML = `
            <div class="panel-title">准备修炼</div>
            <div style="text-align:center;color:var(--parchment-dark);font-size:14px;line-height:2;margin:12px 0;">
                <div>模块：${moduleMeta.shortName} · ${levelId}</div>
                <div>题数：${this.questions.length}题</div>
                <div>消耗灵力：<span style="color:var(--spirit-blue);font-weight:bold;">💧 ${cost}</span>
                    ${res.data.demon_injected ? `<span style="color:var(--gold);font-size:12px;">（含${res.data.demon_injected}心魔题，不扣灵力）</span>` : ''}
                </div>
                <div style="margin-top:8px;font-size:12px;">当前灵力：💧 ${user?.spirit_power || 0}</div>
            </div>
            <button class="btn btn-primary" id="spirit-confirm-yes">开始修炼</button>
            <button class="btn btn-secondary" id="spirit-confirm-no" style="margin-top:8px;">返回</button>
        `;
        this.game.ui.overlay.appendChild(confirmPanel);

        document.getElementById('spirit-confirm-yes').addEventListener('click', () => {
            confirmPanel.remove();
            const selectPanel = document.getElementById('level-select-panel');
            if (selectPanel) selectPanel.remove();
            this.renderQuestion();
            this.game.store.startLevel(type, realm, stage, this.questions);
            this.persistSession();
        });
        document.getElementById('spirit-confirm-no').addEventListener('click', () => { confirmPanel.remove(); });
    }

    /** 渲染当前题目（即时反馈版） */
    renderQuestion() {
        const existing = document.getElementById('practice-panel');
        if (existing) existing.remove();

        const q = this.questions[this.currentIndex];
        if (!q) return;
        const total = this.questions.length;
        const isDemon = q._is_demon;
        const currentAnswer = q.question_id ? this.answers[q.question_id] : null;
        const hasFeedback = !!(this._feedbackShown && currentAnswer); // 当前题是否已作答+显示反馈
        if (this._feedbackShown && !currentAnswer) {
            this._feedbackShown = false;
        }

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'practice-panel';
        panel.style.maxWidth = '520px';
        const pronounceWord = this.getPronounceWord(q);
        const showPronounce = this.currentType === 'vocab' && pronounceWord;
        const showListeningPlayer = this.currentType === 'listening';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title"><img src="${herbIcon}" class="herb-icon"> ${this.currentLevel} ${isDemon ? '🧘' : ''}</span>
                <span class="practice-progress">${this.currentIndex + 1}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>
            ${this.combo >= 3 ? `<div class="combo-display">🔥 ${this.combo} 连击</div>` : ''}
            ${showPronounce ? `
                <div class="word-pronounce-row">
                    <span class="word-pronounce-text">${this.game.ui.escapeHtml(pronounceWord)}</span>
                    <button class="word-pronounce-btn" id="word-pronounce-btn" title="播放读音">🔊</button>
                </div>
            ` : ''}
            ${showListeningPlayer ? `
                <div class="listening-audio-row">
                    <div class="listening-audio-title">🎧 听力测试对话（A 女生 / B 男生）</div>
                    <button class="btn btn-secondary btn-sm" id="listening-play-btn">播放听力</button>
                </div>
            ` : ''}
            <div class="question-text">${this.game.ui.escapeHtml(q.question)}</div>
            <div class="options-container" id="options-container">
                ${this.renderOptions(q.options, null)}
            </div>
            <div class="practice-actions">
                <button class="btn btn-secondary btn-sm" id="practice-back-btn">退出</button>
                <button class="btn btn-primary btn-sm" id="practice-next-btn" ${hasFeedback ? '' : 'disabled'}>
                    ${this.currentIndex < total - 1 ? '下一题 →' : '查看结果'}
                </button>
            </div>
        `;
        this.game.ui.overlay.appendChild(panel);

        if (showPronounce) {
            const speak = () => this.speakWord(pronounceWord);
            document.getElementById('word-pronounce-btn')?.addEventListener('click', speak);
            if (!this.autoSpokenQuestions.has(q.question_id)) {
                this.autoSpokenQuestions.add(q.question_id);
                setTimeout(speak, 250);
            }
        }

        if (showListeningPlayer) {
            const autoSpeakKey = this.getAutoSpeakKey(q);
            const playDialogue = () => this.playListeningDialogue();
            document.getElementById('listening-play-btn')?.addEventListener('click', playDialogue);
            if (!this.autoSpokenListeningQuestions.has(autoSpeakKey)) {
                this.autoSpokenListeningQuestions.add(autoSpeakKey);
                setTimeout(playDialogue, 300);
            }
        }

        // 选项点击 → 即时反馈
        const optionBtns = panel.querySelectorAll('.option-btn');
        if (hasFeedback) {
            optionBtns.forEach((b) => {
                if (b.dataset.value === currentAnswer) {
                    b.classList.add('selected');
                    if (currentAnswer === q.correct_answer) {
                        b.classList.add('answer-correct');
                    } else {
                        b.classList.add('answer-wrong');
                    }
                }
                if (b.dataset.value === q.correct_answer) {
                    b.classList.add('answer-correct');
                }
                b.style.pointerEvents = 'none';
            });
        }
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this._feedbackShown) return; // 已作答，不能改
                optionBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                const selected = btn.dataset.value;
                const correct = selected === q.correct_answer;
                this.answers[q.question_id] = selected;
                this.game.store.answerQuestion(q.question_id, selected);

                // 即时反馈：正确绿闪，错误红闪
                optionBtns.forEach(b => b.style.pointerEvents = 'none');
                if (correct) {
                    btn.classList.add('answer-correct');
                    this.combo++;
                    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                    // 显示连击特效
                    if (this.combo >= 3) {
                        this.showComboFx(this.combo);
                    }
                } else {
                    btn.classList.add('answer-wrong');
                    this.combo = 0; // 连击中断
                    // 显示正确答案
                    optionBtns.forEach(b => {
                        if (b.dataset.value === q.correct_answer) b.classList.add('answer-correct');
                    });
                }
                this._feedbackShown = true;
                document.getElementById('practice-next-btn').disabled = false;
                this.persistSession();
            });
        });

        // 下一题/提交
        document.getElementById('practice-next-btn').addEventListener('click', () => {
            this._feedbackShown = false;
            if (this.currentIndex < total - 1) {
                this.currentIndex++;
                this.persistSession();
                this.renderQuestion();
            } else {
                this.submitAll();
            }
        });

        // 退出
        document.getElementById('practice-back-btn').addEventListener('click', async () => {
            const ok = await this.game.ui.showConfirmDialog({
                title: '退出确认',
                message: '确定退出？当前进度不会丢失。',
                confirmText: '退出',
                cancelText: '继续',
            });
            if (ok) {
                this.stopSpeech();
                panel.remove();
                this.game.enterHall();
            }
        });
    }

    renderOptions(options, savedAnswer) {
        if (!options) return '';
        return Object.entries(options).map(([key, text]) => {
            return `<div class="option-btn" data-value="${key}">
                <span class="option-label">${key}</span>
                <span class="option-text">${this.game.ui.escapeHtml(text)}</span>
            </div>`;
        }).join('');
    }

    /** 连击特效 */
    showComboFx(count) {
        const existing = document.getElementById('combo-fx');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.id = 'combo-fx';
        el.className = 'combo-fx';
        el.textContent = `🔥 ${count}连击！`;
        document.body.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 1200);
    }

    /** 批量提交 */
    async submitAll() {
        const panel = document.getElementById('practice-panel');
        if (panel) panel.remove();

        this.game.ui.showLoading('提交灵草...');

        const [realm, stage] = this.currentLevel.split('-');
        const answersList = Object.entries(this.answers).map(([qid, ans]) => ({
            question_id: qid,
            answer: ans,
        }));

        const res = await this.game.api.post(`/${this.currentType}/submit-batch`, {
            level: realm,
            stage,
            answers: answersList,
        });

        this.game.ui.hideLoading();

        if (res.success) {
            const updates = {};
            if (res.data.total_exp) {
                updates.exp = (this.game.store.getState().user?.exp || 0) + res.data.total_exp;
            }
            if (res.data.total_spirit_cost) {
                updates.spirit_power = Math.max(0, (this.game.store.getState().user?.spirit_power || 0) - res.data.total_spirit_cost);
            }
            this.game.store.updateUser(updates);

            // 附加 maxCombo 数据传给结果面板
            res.data._maxCombo = this.maxCombo;
            this.showRewardPopup(res.data);
        } else {
            this.game.ui.showHermesBubble(res.message || '提交失败');
            this.game.enterHall();
        }
    }

    /** 结果弹窗（含连击统计） */
    showRewardPopup(data) {
        const existing = document.getElementById('reward-popup');
        if (existing) existing.remove();

        const moduleMeta = this.getModuleMeta(this.currentType);
        const passed = data.passed;
        const perfect = data.accuracy === 100;
        const popup = document.createElement('div');
        popup.className = `reward-popup ${passed ? 'reward-pass' : 'reward-fail'}`;
        popup.id = 'reward-popup';

        const hermesMsg = passed
            ? (perfect ? '妙哉！此关已通，修为大进。继续修炼，筑基可期。' : '尚可。略有瑕疵，但无伤大雅。')
            : '无妨。修炼之路本有坎坷。不妨回顾错处，再战一局。';

        popup.innerHTML = `
            <div class="reward-icon">${passed ? (perfect ? '🌟' : '✓') : '🔄'}</div>
            <div class="reward-title">${passed ? (perfect ? '完美通关！' : '通关') : '未通过'}</div>
            <div class="reward-details">
                <div class="reward-row"><span>正确率</span><span class="${data.accuracy >= 80 ? 'text-gold' : data.accuracy >= 60 ? 'text-green' : 'text-red'}">${data.accuracy}%</span></div>
                <div class="reward-row"><span>最大连击</span><span class="text-gold">🔥 ${data._maxCombo || 0}</span></div>
                <div class="reward-row"><span>获得修为</span><span class="text-gold">+${data.total_exp}</span></div>
                <div class="reward-row"><span>消耗灵力</span><span class="text-blue">-${data.total_spirit_cost}</span></div>
                <div class="reward-row"><span>获得灵石</span><span class="text-gold">+${data.stones_gained || 0}</span></div>
            </div>
            <div class="hermes-judge">${hermesMsg}</div>
            <div class="reward-actions">
                ${passed
                    ? `<button class="btn btn-primary" id="reward-next-btn">继续下一关</button>`
                    : `<button class="btn btn-primary" id="reward-retry-btn">再来一次</button>`
                }
                <button class="btn btn-secondary" id="reward-back-btn">返回宗门</button>
            </div>
        `;
        this.game.ui.overlay.appendChild(popup);

        if (passed) {
            this.clearSession(this.currentType);
            this.unlockNextLevel(this.currentType, this.currentLevel);
            document.getElementById('reward-next-btn').addEventListener('click', () => {
                popup.remove();
                const next = this.getCurrentPlayableLevel(this.currentType);
                if (next.levelId === this.currentLevel) {
                    this.game.enterHall();
                    return;
                }
                this.startLevel(this.currentType, next.levelId);
            });
        } else {
            document.getElementById('reward-retry-btn').addEventListener('click', () => {
                popup.remove();
                this.startLevel(this.currentType, this.currentLevel);
            });
        }
        document.getElementById('reward-back-btn').addEventListener('click', () => {
            popup.remove();
            this.game.enterHall();
        });
    }

    getModuleMeta(type) {
        return MODULE_META[type] || MODULE_META.vocab;
    }

    getPronounceWord(question) {
        if (!question) return '';
        if (typeof question.word === 'string' && question.word.trim()) {
            return question.word.trim();
        }
        const text = String(question.question || '');
        const m = text.match(/\b[A-Za-z][A-Za-z'-]{1,}\b/);
        return m ? m[0] : '';
    }

    speakWord(word) {
        if (!word || !('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voices = synth.getVoices();
        const preferred = voices.find(v => /en(-|_)?(US|GB|AU)/i.test(v.lang))
            || voices.find(v => /^en/i.test(v.lang));
        if (preferred) utterance.voice = preferred;

        synth.speak(utterance);
    }

    playListeningDialogue() {
        if (!('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        const voices = synth.getVoices();
        const femaleVoice = this.pickVoice(voices, 'female');
        const maleVoice = this.pickVoice(voices, 'male');

        LISTENING_TEST_DIALOGUE.forEach((line) => {
            const utterance = new SpeechSynthesisUtterance(line.text);
            utterance.lang = 'en-US';
            utterance.rate = 0.92;
            utterance.pitch = line.gender === 'female' ? 1.15 : 0.9;
            utterance.voice = line.gender === 'female' ? femaleVoice : maleVoice;
            synth.speak(utterance);
        });
    }

    pickVoice(voices, targetGender) {
        if (!Array.isArray(voices) || !voices.length) return null;
        const english = voices.filter(v => /^en/i.test(v.lang));
        const list = english.length ? english : voices;

        const femaleHints = ['female', 'zira', 'samantha', 'victoria', 'karen', 'hazel', 'susan', 'anna', 'siri'];
        const maleHints = ['male', 'david', 'mark', 'alex', 'tom', 'daniel', 'george', 'fred', 'james'];
        const hints = targetGender === 'female' ? femaleHints : maleHints;

        const exact = list.find(v => hints.some(h => `${v.name} ${v.voiceURI}`.toLowerCase().includes(h)));
        if (exact) return exact;

        if (list.length >= 2) {
            return targetGender === 'female' ? list[0] : list[1];
        }
        return list[0];
    }

    stopSpeech() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    getAutoSpeakKey(question) {
        if (question?.question_id) return `qid:${question.question_id}`;
        return `idx:${this.currentLevel || 'unknown'}:${this.currentIndex}`;
    }

    getLevelSequence() {
        const levels = [];
        ['L1', 'L2', 'L3'].forEach((realm) => {
            for (let s = 1; s <= 9; s++) {
                levels.push({
                    realm,
                    stageNo: s,
                    levelId: `${realm}-${String(s).padStart(2, '0')}`,
                });
            }
        });
        return levels;
    }

    getProgressKey(type) {
        return `levelup_progress_${type}`;
    }

    getCurrentPlayableLevel(type) {
        const sequence = this.getLevelSequence();
        const raw = Number(localStorage.getItem(this.getProgressKey(type)) || '0');
        const index = Math.min(Math.max(raw, 0), sequence.length - 1);
        return { ...sequence[index], index, total: sequence.length };
    }

    unlockNextLevel(type, currentLevelId) {
        const sequence = this.getLevelSequence();
        const currentIdx = sequence.findIndex((x) => x.levelId === currentLevelId);
        if (currentIdx < 0) return;

        const key = this.getProgressKey(type);
        const unlocked = Number(localStorage.getItem(key) || '0');
        const next = Math.min(sequence.length - 1, currentIdx + 1);
        if (next > unlocked) {
            localStorage.setItem(key, String(next));
        }
    }

    getSessionKey(type) {
        const userId = this.game.store.getState().user?.id || 'guest';
        return `levelup_session_practice_${userId}_${type}`;
    }

    persistSession() {
        if (!this.currentType || !this.currentLevel || !this.questions?.length) return;
        const payload = {
            currentType: this.currentType,
            currentLevel: this.currentLevel,
            currentIndex: this.currentIndex,
            answers: this.answers,
            questions: this.questions,
            combo: this.combo,
            maxCombo: this.maxCombo,
            feedbackShown: !!this._feedbackShown,
            ts: Date.now(),
        };
        localStorage.setItem(this.getSessionKey(this.currentType), JSON.stringify(payload));
    }

    loadSession(type) {
        try {
            const raw = localStorage.getItem(this.getSessionKey(type));
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data?.currentLevel || !Array.isArray(data.questions) || !data.questions.length) return null;
            return data;
        } catch {
            return null;
        }
    }

    resumeSession(type) {
        const data = this.loadSession(type);
        if (!data) {
            this.game.ui.showHermesBubble('没有可恢复的进度');
            return;
        }
        this.currentType = data.currentType;
        this.currentLevel = data.currentLevel;
        this.currentIndex = Math.max(0, Math.min(data.currentIndex || 0, data.questions.length - 1));
        this.answers = data.answers || {};
        this.questions = data.questions || [];
        this.combo = data.combo || 0;
        this.maxCombo = data.maxCombo || 0;
        this._feedbackShown = !!data.feedbackShown;
        const currentQuestion = this.questions[this.currentIndex];
        if (!currentQuestion?.question_id || !this.answers[currentQuestion.question_id]) {
            this._feedbackShown = false;
        }

        const selectPanel = document.getElementById('level-select-panel');
        if (selectPanel) selectPanel.remove();
        this.renderQuestion();
    }

    clearSession(type) {
        localStorage.removeItem(this.getSessionKey(type));
    }
}
