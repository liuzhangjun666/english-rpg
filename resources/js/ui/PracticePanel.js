// LevelUp 英语修仙 - 答题面板（即时反馈+连击版）
import herbIcon from '../../assets/images/herb_icon.png';

// ─── 写作模块专属 Panel ──────────────────────────────────────────────────────────
class WritingPanel {
    constructor(game) {
        this.game = game;
        this.prompts = [];
        this.currentIndex = 0;
        this.currentLevel = null;
        this.submittedResults = [];
        this.totalExpGained = 0;
        this.totalStonesGained = 0;
    }

    async start(levelId) {
        this.currentLevel = levelId;
        this.currentIndex = 0;
        this.submittedResults = [];
        this.totalExpGained = 0;
        this.totalStonesGained = 0;

        const [realm, stage] = levelId.split('-');
        this.game.ui.showLoading('加载写作题目...');
        const res = await this.game.api.get(`/writing/prompts?level=${realm}&stage=${stage}`);
        this.game.ui.hideLoading();

        if (!res?.success) {
            this.game.ui.showHermesBubble(res?.message || '暂无写作题目');
            return;
        }

        this.prompts = res.data.prompts;
        const spiritCost = res.data.spirit_cost || 0;
        const user = this.game.store.getState().user;

        if (user && user.spirit_power < spiritCost) {
            this.game.ui.showHermesBubble(`灵力不足（当前${user.spirit_power}，需要${spiritCost}），请明日再来修炼。`);
            return;
        }

        const confirmPanel = document.createElement('div');
        confirmPanel.className = 'panel';
        confirmPanel.id = 'spirit-confirm';
        confirmPanel.style.maxWidth = '380px';
        confirmPanel.innerHTML = `
            <div class="panel-title">准备写作修炼</div>
            <div style="text-align:center;color:var(--parchment-dark);font-size:14px;line-height:2;margin:12px 0;">
                <div>模块：✍️ 写作试炼 · ${levelId}</div>
                <div>题数：${this.prompts.length}题（命题+续写各1道）</div>
                <div>消耗灵力：<span style="color:var(--spirit-blue);font-weight:bold;">💧 ${spiritCost}</span></div>
                <div style="margin-top:8px;font-size:12px;">当前灵力：💧 ${user?.spirit_power || 0}</div>
            </div>
            <div style="font-size:12px;color:var(--parchment-dark);text-align:center;margin-bottom:12px;opacity:0.7;">✨ 每题写作后将获得 AI 即时评分</div>
            <button class="btn btn-primary" id="writing-confirm-yes">开始修炼</button>
            <button class="btn btn-secondary" id="writing-confirm-no" style="margin-top:8px;">返回</button>
        `;
        this.game.ui.overlay.appendChild(confirmPanel);

        document.getElementById('writing-confirm-yes').addEventListener('click', () => {
            confirmPanel.remove();
            document.getElementById('level-select-panel')?.remove();
            this.renderWritingQuestion();
        });
        document.getElementById('writing-confirm-no').addEventListener('click', () => confirmPanel.remove());
    }

    renderWritingQuestion() {
        document.getElementById('writing-panel')?.remove();
        const prompt = this.prompts[this.currentIndex];
        if (!prompt) return;

        const total = this.prompts.length;
        const isTopicType = prompt.writing_type === 'topic';
        const typeLabel = isTopicType ? '📝 命题作文' : '✍️ 续写';
        const minWords = prompt.word_limit_min || 50;
        const maxWords = prompt.word_limit_max || 150;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'writing-panel';
        panel.style.cssText = 'max-width:580px;';

        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title"><img src="${herbIcon}" class="herb-icon"> ${this.currentLevel}</span>
                <span class="practice-progress">${this.currentIndex + 1}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <span style="background:rgba(212,168,67,0.2);color:var(--gold);font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(212,168,67,0.4);">${typeLabel}</span>
                <span style="font-size:12px;color:var(--parchment-dark);">字数要求：${minWords}–${maxWords} 词</span>
            </div>

            <div style="padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,168,67,0.2);border-radius:10px;margin-bottom:12px;">
                <div style="font-size:15px;color:var(--gold-light);font-weight:bold;margin-bottom:8px;">${this.game.ui.escapeHtml(prompt.title)}</div>
                <div style="font-size:13px;color:var(--parchment-dark);line-height:1.7;">${this.game.ui.escapeHtml(prompt.topic)}</div>
            </div>

            ${prompt.passage ? `
            <div style="padding:12px 14px;background:rgba(78,192,122,0.06);border:1px dashed rgba(78,192,122,0.4);border-radius:10px;margin-bottom:12px;">
                <div style="font-size:12px;color:#9ee8bf;margin-bottom:6px;">📖 原文段落（请在此基础上续写）</div>
                <div style="font-size:13px;color:var(--parchment);line-height:1.8;font-style:italic;">${this.game.ui.escapeHtml(prompt.passage)}</div>
            </div>
            ` : ''}

            <div style="position:relative;">
                <textarea id="writing-textarea"
                    placeholder="在此输入你的英文写作..."
                    style="width:100%;min-height:160px;padding:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(212,168,67,0.3);border-radius:10px;color:var(--parchment);font-size:14px;line-height:1.7;resize:vertical;font-family:var(--font-body);box-sizing:border-box;outline:none;transition:border-color 0.2s;"
                    maxlength="5000"
                ></textarea>
                <div id="writing-wordcount" style="position:absolute;bottom:10px;right:12px;font-size:11px;color:var(--parchment-dark);pointer-events:none;">0 词</div>
            </div>
            <div id="writing-wordcount-hint" style="font-size:12px;color:var(--parchment-dark);margin-top:4px;margin-bottom:12px;opacity:0.7;">还需至少 <span id="words-needed">${minWords}</span> 词才能提交</div>

            <div class="practice-actions">
                <button class="btn btn-secondary btn-sm" id="writing-exit-btn">退出</button>
                <button class="btn btn-primary btn-sm" id="writing-submit-btn" disabled>提交写作 →</button>
            </div>
        `;

        this.game.ui.overlay.appendChild(panel);

        const textarea = document.getElementById('writing-textarea');
        const wordCountEl = document.getElementById('writing-wordcount');
        const wordsNeededEl = document.getElementById('words-needed');
        const submitBtn = document.getElementById('writing-submit-btn');
        const hintEl = document.getElementById('writing-wordcount-hint');

        const updateWordCount = () => {
            const text = textarea.value.trim();
            const wc = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
            wordCountEl.textContent = `${wc} 词`;
            if (wc >= minWords) {
                submitBtn.disabled = false;
                wordCountEl.style.color = wc > maxWords ? '#ff6b6b' : 'var(--gold)';
                hintEl.style.opacity = '0';
            } else {
                submitBtn.disabled = true;
                wordCountEl.style.color = 'var(--parchment-dark)';
                if (wordsNeededEl) wordsNeededEl.textContent = minWords - wc;
                hintEl.style.opacity = '0.7';
            }
        };

        textarea.addEventListener('input', updateWordCount);
        textarea.addEventListener('focus', () => { textarea.style.borderColor = 'rgba(212,168,67,0.7)'; });
        textarea.addEventListener('blur', () => { textarea.style.borderColor = 'rgba(212,168,67,0.3)'; });

        submitBtn.addEventListener('click', () => {
            const content = textarea.value.trim();
            if (!content) return;
            this.submitWriting(prompt, content);
        });

        document.getElementById('writing-exit-btn').addEventListener('click', async () => {
            const ok = await this.game.ui.showConfirmDialog({
                title: '退出确认',
                message: '确定退出写作？已提交的内容不会丢失。',
                confirmText: '退出',
                cancelText: '继续',
            });
            if (ok) { panel.remove(); this.game.enterHall(); }
        });
    }

    async submitWriting(prompt, content) {
        const panel = document.getElementById('writing-panel');
        const submitBtn = document.getElementById('writing-submit-btn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'AI评分中...'; }

        this.game.ui.showLoading('AI 正在评分，请稍候...');
        const res = await this.game.api.post('/writing/submit-one', { prompt_id: prompt.prompt_id, content });
        this.game.ui.hideLoading();
        if (panel) panel.remove();

        if (!res?.success) {
            this.game.ui.showHermesBubble(res?.message || '提交失败，请重试');
            return;
        }

        const data = res.data;
        this.totalExpGained += data.exp_gained || 0;
        this.totalStonesGained += data.stones_gained || 0;

        const updates = {};
        if (data.exp_gained) updates.exp = (this.game.store.getState().user?.exp || 0) + data.exp_gained;
        if (data.stones_gained) updates.spirit_stone = (this.game.store.getState().user?.spirit_stone || 0) + data.stones_gained;
        if (Object.keys(updates).length) this.game.store.updateUser(updates);

        this.submittedResults.push({ prompt, result: data });
        this.showScoreResult(prompt, data);
    }

    showScoreResult(prompt, data) {
        document.getElementById('writing-score-panel')?.remove();
        const isLast = this.currentIndex >= this.prompts.length - 1;
        const score = data.score || 0;
        const scoreColor = score >= 90 ? '#f0c040' : score >= 75 ? '#7bed9f' : score >= 60 ? '#70a1ff' : '#ff6b6b';
        const scoreIcon = score >= 90 ? '🌟' : score >= 75 ? '✨' : score >= 60 ? '✓' : '📝';

        const details = data.details || {};
        const detailsHtml = Object.keys(details).length ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;">
                ${this._detailItem('内容相关', details.relevance)}
                ${this._detailItem('语言表达', details.language)}
                ${this._detailItem('语法正确', details.grammar)}
                ${this._detailItem('结构逻辑', details.coherence)}
            </div>
        ` : '';

        const scorePanel = document.createElement('div');
        scorePanel.className = 'panel';
        scorePanel.id = 'writing-score-panel';
        scorePanel.style.maxWidth = '500px';
        scorePanel.innerHTML = `
            <div class="panel-title">✍️ AI 写作评分</div>
            <div style="text-align:center;margin:16px 0;">
                <div style="font-size:56px;font-family:var(--font-title);color:${scoreColor};line-height:1;">${score}</div>
                <div style="font-size:14px;color:${scoreColor};margin-top:4px;">${scoreIcon} ${score >= 90 ? '完美！' : score >= 75 ? '优秀' : score >= 60 ? '良好' : '继续加油'}</div>
            </div>
            ${detailsHtml}
            <div style="padding:12px;background:rgba(78,192,122,0.06);border:1px dashed rgba(78,192,122,0.3);border-radius:10px;margin:10px 0;">
                <div style="font-size:12px;color:#9ee8bf;margin-bottom:4px;">🧙 赫尔墨斯点评</div>
                <div style="font-size:13px;color:var(--parchment-dark);line-height:1.6;">${this.game.ui.escapeHtml(data.feedback || '写作完成，继续加油！')}</div>
            </div>
            <div style="display:flex;justify-content:center;gap:20px;margin:10px 0;font-size:13px;color:var(--parchment-dark);">
                <span>📝 字数：<b style="color:var(--gold)">${data.word_count || 0}</b></span>
                <span>✨ 修为：<b style="color:var(--gold)">+${data.exp_gained || 0}</b></span>
                <span>💎 灵石：<b style="color:var(--gold)">+${data.stones_gained || 0}</b></span>
            </div>
            <button class="btn btn-primary" id="writing-score-next">${isLast ? '查看总结' : '下一题 →'}</button>
            <button class="btn btn-secondary" id="writing-score-exit" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(scorePanel);

        document.getElementById('writing-score-next').addEventListener('click', () => {
            scorePanel.remove();
            if (isLast) { this.showFinalSummary(); }
            else { this.currentIndex++; this.renderWritingQuestion(); }
        });
        document.getElementById('writing-score-exit').addEventListener('click', () => {
            scorePanel.remove();
            this.game.enterHall();
        });
    }

    _detailItem(label, score) {
        if (score === undefined || score === null) return '';
        const pct = Math.min(100, Math.max(0, (score / 30) * 100));
        const color = pct >= 80 ? '#7bed9f' : pct >= 60 ? '#70a1ff' : '#ffa502';
        return `
            <div style="padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--parchment-dark);margin-bottom:4px;">
                    <span>${label}</span><span style="color:${color}">${score}</span>
                </div>
                <div style="height:3px;background:rgba(255,255,255,0.1);border-radius:2px;">
                    <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;"></div>
                </div>
            </div>`;
    }

    showFinalSummary() {
        document.getElementById('writing-final')?.remove();
        const avgScore = this.submittedResults.length
            ? Math.round(this.submittedResults.reduce((s, r) => s + (r.result.score || 0), 0) / this.submittedResults.length)
            : 0;
        const passed = avgScore >= 60;
        const hermesMsg = avgScore >= 90
            ? '妙哉！文采斐然，逻辑严密，实乃写作高手。此等功力，已入金丹之境！'
            : avgScore >= 75 ? '写得甚好！词句通顺，意思明晰。再打磨细节，必能更进一步。'
            : avgScore >= 60 ? '尚可入目。基础扎实，但需多加练习词汇与句式多样性。'
            : '初学者之作，无需气馁！多读多写，假以时日，必见长进。';

        const finalPanel = document.createElement('div');
        finalPanel.className = `reward-popup ${passed ? 'reward-pass' : 'reward-fail'}`;
        finalPanel.id = 'writing-final';
        finalPanel.innerHTML = `
            <div class="reward-icon">${passed ? (avgScore >= 90 ? '🌟' : '✓') : '📝'}</div>
            <div class="reward-title">${passed ? (avgScore >= 90 ? '完美通关！' : '写作完成') : '继续练习'}</div>
            <div class="reward-details">
                <div class="reward-row"><span>平均分</span><span class="${avgScore >= 80 ? 'text-gold' : avgScore >= 60 ? 'text-green' : 'text-red'}">${avgScore} 分</span></div>
                <div class="reward-row"><span>完成题数</span><span class="text-gold">${this.submittedResults.length} / ${this.prompts.length}</span></div>
                <div class="reward-row"><span>获得修为</span><span class="text-gold">+${this.totalExpGained}</span></div>
                <div class="reward-row"><span>获得灵石</span><span class="text-gold">+${this.totalStonesGained}</span></div>
            </div>
            <div class="hermes-judge">${hermesMsg}</div>
            <div class="reward-actions">
                <button class="btn btn-primary" id="writing-final-again">再练一关</button>
                <button class="btn btn-secondary" id="writing-final-back">返回宗门</button>
            </div>
        `;
        this.game.ui.overlay.appendChild(finalPanel);

        document.getElementById('writing-final-again').addEventListener('click', () => {
            finalPanel.remove();
            this.game.startPracticeModule('writing');
        });
        document.getElementById('writing-final-back').addEventListener('click', () => {
            finalPanel.remove();
            this.game.enterHall();
        });
    }
}
// ─────────────────────────────────────────────────────────────────────────────

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
    writing: { title: '✍️ 写作试炼', shortName: '写作试炼', countText: () => '2题（命题+续写）' },
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
        this.speakingRecordings = {};
        this.speakingMediaRecorder = null;
        this.speakingMediaStream = null;
        this.speakingMediaChunks = [];
        this.speakingRecording = false;
        this.vocabAlchemyStates = {};
        this.vocabFlightRoutes = {};
        // 写作专属子面板
        this._writingPanel = new WritingPanel(game);
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
            ${type === 'vocab' ? `
                <div style="padding:10px 12px;border:1px dashed rgba(212,168,67,0.35);border-radius:10px;background:rgba(212,168,67,0.06);margin-bottom:12px;font-size:12px;color:var(--parchment-dark);line-height:1.7;">
                    本关将随机触发三种玩法：炼丹拼词 / 采药识图 / 御剑辨义
                </div>
            ` : ''}
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
        // writing 类型走专属 WritingPanel 流程
        if (type === 'writing') {
            this.game.ui.hideAllPanels();
            await this._writingPanel.start(levelId);
            return;
        }

        this.game.ui.showLoading('加载题库...');
        this.currentType = type;
        this.currentLevel = levelId;
        this.currentIndex = 0;
        this.answers = {};
        this.combo = 0;
        this.maxCombo = 0;
        this._feedbackShown = false;
        this.speakingRecordings = {};
        this.vocabAlchemyStates = {};
        this.vocabFlightRoutes = {};
        this.stopSpeakingRecording(true);

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
        const isListening = this.currentType === 'listening';
        const isSpeaking = this.currentType === 'speaking';
        const isVocab = this.currentType === 'vocab';
        const pronounceWord = this.getPronounceWord(q);
        const listeningMaterial = isListening ? this.getListeningMaterialText(q) : '';
        const speakingMaterial = isSpeaking ? this.getSpeakingMaterialText(q) : '';
        const speakingRec = (isSpeaking && q.question_id) ? this.speakingRecordings[q.question_id] : null;
        const vocabPlayMode = isVocab ? this.getVocabPlayMode(q) : null;
        const isVocabAlchemy = vocabPlayMode === 'alchemy';
        const showPronounce = isVocab && pronounceWord;
        const showListeningPlayer = isListening;
        const showListeningMaterial = isListening && hasFeedback && !!(listeningMaterial && listeningMaterial.trim());
        const showSpeakingPanel = isSpeaking;
        const showOptionArea = !showSpeakingPanel;
        const promptText = this.getQuestionStemText(q);
        const basePrompt = (isListening && promptText === listeningMaterial)
            ? '请根据听力材料回答问题。'
            : (isSpeaking && (!promptText || promptText === speakingMaterial)
                ? '请朗读上方英文并录音。'
                : promptText);
        const targetWord = this.getVocabTargetWord(q) || pronounceWord || '';
        const resolvedPrompt = isVocab
            ? (vocabPlayMode === 'alchemy'
                ? '丹方缺失，请补全灵草名'
                : (vocabPlayMode === 'herb'
                    ? `寻药指令：Find the herb: ${targetWord || 'herb'}`
                    : `${targetWord || 'word'} 的中文意思是？`))
            : basePrompt;

        let vocabGameplayHtml = '';
        if (isVocab && showOptionArea) {
            if (vocabPlayMode === 'alchemy') {
                vocabGameplayHtml = this.renderVocabAlchemy(q, hasFeedback);
            } else if (vocabPlayMode === 'herb') {
                vocabGameplayHtml = this.renderVocabHerbOptions(q);
            } else {
                vocabGameplayHtml = this.renderVocabFlightOptions(q);
            }
        }

        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title"><img src="${herbIcon}" class="herb-icon"> ${this.currentLevel} ${isDemon ? '🧘' : ''}</span>
                <span class="practice-progress">${this.currentIndex + 1}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>
            ${this.combo >= 3 ? `<div class="combo-display">🔥 ${this.combo} 连击</div>` : ''}
            ${isVocab ? `<div class="vocab-mode-badge">${this.renderVocabModeBadge(vocabPlayMode)}</div>` : ''}
            ${showPronounce ? `
                <div class="word-pronounce-row">
                    <span class="word-pronounce-text">${this.game.ui.escapeHtml(pronounceWord)}</span>
                    <button class="word-pronounce-btn" id="word-pronounce-btn" title="播放读音">🔊</button>
                </div>
            ` : ''}
            ${showListeningPlayer ? `
                <div class="listening-audio-row">
                    <div class="listening-audio-title">🎧 听力音频</div>
                    <button class="btn btn-secondary btn-sm" id="listening-play-btn">播放听力</button>
                </div>
            ` : ''}
            ${showSpeakingPanel ? `
                <div class="listening-audio-row" style="display:block;">
                    <div class="listening-audio-title" style="margin-bottom:8px;">🗣️ 口语材料</div>
                    <div class="question-text" style="margin-bottom:10px;">${this.game.ui.escapeHtml(speakingMaterial || '暂无口语材料')}</div>
                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                        <button class="word-pronounce-btn" id="speaking-play-btn" title="播放口语材料">🔊</button>
                        <button class="btn btn-secondary btn-sm" id="speaking-record-btn">${this.speakingRecording ? '停止录音' : '开始录音'}</button>
                        <span id="speaking-record-status" style="font-size:12px;color:var(--parchment-dark);">${speakingRec ? '已录音' : (this.speakingRecording ? '录音中...' : '未录音')}</span>
                    </div>
                    ${speakingRec ? `<div style="margin-top:8px;"><audio controls src="${speakingRec.url}" style="width:100%;"></audio></div>` : ''}
                </div>
                <div class="question-text">${this.game.ui.escapeHtml(resolvedPrompt)}</div>
            ` : `
                ${isVocab ? '' : `<div class="question-text">${this.game.ui.escapeHtml(resolvedPrompt)}</div>`}
            `}
            ${showOptionArea ? `
                ${isVocab ? vocabGameplayHtml : `
                    <div class="options-container" id="options-container">
                        ${this.renderOptions(q.options, null)}
                    </div>
                `}
            ` : ''}
            <div id="answer-explain-box" style="display:none;margin:6px 0 12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(212,168,67,0.25);background:rgba(255,255,255,0.04);font-size:12px;line-height:1.8;color:var(--parchment-dark);"></div>
            ${showListeningPlayer ? `
                <div id="listening-material-box" style="margin:2px 0 14px;padding:12px;border:1px solid rgba(212,168,67,0.28);border-radius:12px;background:linear-gradient(180deg, rgba(212,168,67,0.09), rgba(212,168,67,0.04));display:${showListeningMaterial ? 'block' : 'none'};">
                    <div style="font-size:12px;color:var(--gold-light);letter-spacing:0.4px;margin-bottom:8px;font-weight:700;">Listening Transcript</div>
                    <div style="padding:10px 12px;border-radius:8px;background:rgba(8,12,24,0.22);font-size:14px;color:var(--parchment);line-height:1.8;white-space:pre-wrap;">
                        ${this.game.ui.escapeHtml(listeningMaterial || 'No transcript available')}
                    </div>
                </div>
            ` : ''}
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
            const playDialogue = () => this.playListeningDialogue(q);
            document.getElementById('listening-play-btn')?.addEventListener('click', playDialogue);
            if (!this.autoSpokenListeningQuestions.has(autoSpeakKey)) {
                this.autoSpokenListeningQuestions.add(autoSpeakKey);
                setTimeout(playDialogue, 300);
            }
        }

        if (showSpeakingPanel) {
            const playSpeaking = () => this.playSpeakingMaterial(q);
            document.getElementById('speaking-play-btn')?.addEventListener('click', playSpeaking);
            document.getElementById('speaking-record-btn')?.addEventListener('click', async () => {
                if (this.speakingRecording) {
                    this.stopSpeakingRecording();
                    return;
                }
                await this.startSpeakingRecording(q);
            });
        }

        // 选项点击 → 即时反馈
        const optionBtns = panel.querySelectorAll('.option-btn');
        const explainBox = document.getElementById('answer-explain-box');
        if (showOptionArea && !isVocabAlchemy && hasFeedback) {
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
            if (explainBox && currentAnswer && currentAnswer !== q.correct_answer) {
                explainBox.style.display = 'block';
                explainBox.innerHTML = this.buildAnswerExplainHtml(q, currentAnswer);
            }
        }
        if (isVocabAlchemy) {
            this.bindVocabAlchemy(panel, q, hasFeedback);
        } else {
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
                        this.playAnswerFeedbackTone(true, this.combo + 1);
                        this.combo++;
                        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                        if (this.combo >= 3) {
                            this.showComboFx(this.combo);
                        }
                    } else {
                        btn.classList.add('answer-wrong');
                        this.playAnswerFeedbackTone(false, 0);
                        this.combo = 0; // 连击中断
                        optionBtns.forEach(b => {
                            if (b.dataset.value === q.correct_answer) b.classList.add('answer-correct');
                        });
                        if (explainBox) {
                            explainBox.style.display = 'block';
                            explainBox.innerHTML = this.buildAnswerExplainHtml(q, selected);
                        }
                    }
                    this._feedbackShown = true;
                    document.getElementById('practice-next-btn').disabled = false;
                    if (showListeningPlayer) {
                        const materialBox = document.getElementById('listening-material-box');
                        if (materialBox) materialBox.style.display = 'block';
                    }
                    this.persistSession();
                });
            });
        }

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

    renderVocabModeBadge(mode) {
        if (mode === 'alchemy') return '⚗️ 炼丹玩法：拼词成丹';
        if (mode === 'herb') return '🌿 采药玩法：看词选图';
        return '🗡️ 御剑玩法：三路辨义';
    }

    getQuestionKey(question) {
        if (question?.question_id) return String(question.question_id);
        return `${this.currentLevel || 'L1-01'}:${this.currentIndex}`;
    }

    getOptionPairs(options) {
        if (!options || typeof options !== 'object') return [];
        return Object.entries(options).map(([key, text]) => ({
            key: String(key),
            text: String(text ?? ''),
        }));
    }

    shuffleArray(list) {
        const arr = Array.isArray(list) ? [...list] : [];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    getVocabTargetWord(question) {
        const byWord = String(question?.word || '').trim();
        if (byWord) {
            const cleaned = byWord.toLowerCase().replace(/[^a-z]/g, '');
            if (cleaned) return cleaned;
        }
        const fromQuestion = String(question?.question || '').match(/[A-Za-z][A-Za-z'-]{2,}/);
        return fromQuestion ? fromQuestion[0].toLowerCase().replace(/[^a-z]/g, '') : '';
    }

    getVocabPlayMode(question) {
        const options = this.getOptionPairs(question?.options);
        const targetWord = this.getVocabTargetWord(question);
        const canAlchemy = targetWord.length >= 4;
        const canHerb = options.length >= 2;
        const canFlight = options.length >= 3;

        const key = this.getQuestionKey(question);
        const hash = [...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        const ordered = ['alchemy', 'herb', 'flight'];
        const preferred = ordered[hash % ordered.length];
        const candidates = [preferred, ...ordered.filter((m) => m !== preferred)];

        for (const mode of candidates) {
            if (mode === 'alchemy' && canAlchemy) return mode;
            if (mode === 'herb' && canHerb) return mode;
            if (mode === 'flight' && canFlight) return mode;
        }
        return 'herb';
    }

    getHerbEmoji(text) {
        const raw = String(text || '');
        const map = [
            [/莲|荷|lotus/i, '🪷'],
            [/竹|bamboo/i, '🎋'],
            [/菇|mushroom/i, '🍄'],
            [/芝|ganoderma|lingzhi/i, '🌰'],
            [/花|rose|lily|orchid/i, '🌸'],
            [/草|herb|mint|leaf/i, '🌿'],
            [/果|apple|pear|berry|orange|grape/i, '🍎'],
            [/树|tree/i, '🌳'],
            [/云|cloud/i, '☁️'],
            [/火|fire/i, '🔥'],
            [/水|water/i, '💧'],
        ];
        for (const [regex, emoji] of map) {
            if (regex.test(raw)) return emoji;
        }
        return '🌿';
    }

    renderVocabHerbOptions(question) {
        const options = this.getOptionPairs(question?.options);
        const user = this.game.store.getState().user || {};
        const qi = Number(user.spirit_power || 0);
        const stageRemain = Math.max(1, this.questions.length - this.currentIndex);
        const targetWord = this.getVocabTargetWord(question) || 'lotus';
        return `
            <div class="vocab-scene-box vocab-scene-herb">
                <div class="vocab-scene-hud">
                    <span>🌿 灵气 ${qi}</span>
                    <span>余题 ${stageRemain}</span>
                </div>
                <div class="vocab-scene-prompt">寻找灵草：${this.game.ui.escapeHtml(targetWord)}</div>
                <div class="vocab-herb-grid options-container" id="options-container">
                    ${options.map((item) => `
                        <div class="option-btn vocab-herb-card" data-value="${this.game.ui.escapeHtml(item.key)}">
                            <span class="option-label vocab-card-tag">${this.game.ui.escapeHtml(item.key)}</span>
                            <span class="vocab-herb-emoji">${this.getHerbEmoji(item.text)}</span>
                            <span class="option-text">${this.game.ui.escapeHtml(item.text)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getVocabFlightLanes(question) {
        const key = this.getQuestionKey(question);
        if (this.vocabFlightRoutes[key]) return this.vocabFlightRoutes[key];

        const options = this.getOptionPairs(question?.options);
        const correct = options.find((item) => item.key === String(question?.correct_answer || ''));
        if (!correct) return [];

        const others = this.shuffleArray(options.filter((item) => item.key !== correct.key));
        const picked = [correct, ...others.slice(0, 2)];
        const shuffled = this.shuffleArray(picked).slice(0, 3);
        const laneNames = ['左路', '中路', '右路'];
        const lanes = shuffled.map((item, idx) => ({
            ...item,
            lane: laneNames[idx] || `路${idx + 1}`,
        }));
        this.vocabFlightRoutes[key] = lanes;
        return lanes;
    }

    renderVocabFlightOptions(question) {
        const lanes = this.getVocabFlightLanes(question);
        const user = this.game.store.getState().user || {};
        const qi = Number(user.spirit_power || 0);
        const targetWord = this.getVocabTargetWord(question) || 'cloud';
        const progress = Math.max(8, Math.round(((this.currentIndex + 1) / Math.max(1, this.questions.length)) * 100));
        return `
            <div class="vocab-scene-box vocab-scene-flight">
                <div class="vocab-scene-hud">
                    <span>🗡️ 剑势 ${qi}/100</span>
                    <span>⏸</span>
                </div>
                <div class="vocab-scene-prompt">${this.game.ui.escapeHtml(targetWord)} 的中文意思是？</div>
                <div class="vocab-flight-grid options-container" id="options-container">
                    ${lanes.map((item) => `
                        <div class="option-btn vocab-flight-lane" data-value="${this.game.ui.escapeHtml(item.key)}">
                            <span class="flight-lane-tag">${this.game.ui.escapeHtml(item.lane)}</span>
                            <span class="flight-lane-banner">${this.game.ui.escapeHtml(item.text)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="vocab-flight-footer">
                    <span>飞行进度</span>
                    <div class="vocab-flight-track"><i style="width:${progress}%"></i></div>
                </div>
            </div>
        `;
    }

    getOrInitAlchemyState(question, targetWord) {
        const key = this.getQuestionKey(question);
        if (this.vocabAlchemyStates[key]) return this.vocabAlchemyStates[key];

        const letters = this.shuffleArray(targetWord.split('')).map((char, idx) => ({
            id: `${idx}-${char}`,
            char,
        }));
        const state = {
            target: targetWord,
            letters,
            selected: [],
        };
        this.vocabAlchemyStates[key] = state;
        return state;
    }

    getAlchemyWordFromState(state) {
        const map = new Map((state?.letters || []).map((item) => [item.id, item.char]));
        return (state?.selected || []).map((id) => map.get(id) || '').join('');
    }

    renderVocabAlchemy(question, hasFeedback) {
        const targetWord = this.getVocabTargetWord(question);
        if (!targetWord) {
            return this.renderVocabHerbOptions(question);
        }
        this.getOrInitAlchemyState(question, targetWord);
        return `
            <div class="vocab-scene-box vocab-scene-alchemy" id="vocab-alchemy-box">
                <div class="vocab-scene-hud">
                    <span>⚗️ 丹炉已启</span>
                    <span>第 ${this.currentIndex + 1}/${this.questions.length} 炉</span>
                </div>
                <div class="vocab-alchemy-box">
                    <div class="vocab-scene-prompt">丹方缺失，请补全灵草名</div>
                    <div class="vocab-alchemy-word">${'□ '.repeat(targetWord.length).trim()}</div>
                    <div class="vocab-alchemy-pool" id="alchemy-pool"></div>
                    <div class="vocab-alchemy-slots" id="alchemy-slots"></div>
                    <div class="vocab-alchemy-cauldron">丹炉</div>
                    <div class="vocab-alchemy-actions">
                        <button class="btn btn-secondary btn-sm" id="alchemy-clear-btn">清空丹炉</button>
                        <button class="btn btn-primary btn-sm" id="alchemy-submit-btn">${hasFeedback ? '炼丹完成' : '开炉炼丹'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    updateAlchemyUi(panel, question, hasFeedback) {
        const targetWord = this.getVocabTargetWord(question);
        const state = this.getOrInitAlchemyState(question, targetWord);
        const slotsEl = panel.querySelector('#alchemy-slots');
        const poolEl = panel.querySelector('#alchemy-pool');
        const clearBtn = panel.querySelector('#alchemy-clear-btn');
        const submitBtn = panel.querySelector('#alchemy-submit-btn');
        if (!slotsEl || !poolEl || !clearBtn || !submitBtn) return;

        const letterMap = new Map(state.letters.map((item) => [item.id, item.char]));
        const currentLetters = hasFeedback
            ? targetWord.split('')
            : state.selected.map((id) => letterMap.get(id) || '');

        slotsEl.innerHTML = targetWord.split('').map((_, idx) => {
            const char = currentLetters[idx] || '';
            return `<button class="alchemy-slot ${char ? 'filled' : ''}" data-slot-index="${idx}" ${hasFeedback || !char ? 'disabled' : ''}>${this.game.ui.escapeHtml(char || '·')}</button>`;
        }).join('');

        const used = new Set(state.selected);
        const remain = state.letters.filter((item) => !used.has(item.id));
        poolEl.innerHTML = hasFeedback
            ? '<div class="vocab-alchemy-result">丹药已成，灵气回旋。</div>'
            : remain.map((item) => `<button class="alchemy-letter" data-letter-id="${this.game.ui.escapeHtml(item.id)}">${this.game.ui.escapeHtml(item.char)}</button>`).join('');

        clearBtn.disabled = hasFeedback || state.selected.length === 0;
        submitBtn.disabled = hasFeedback || state.selected.length !== targetWord.length;
    }

    bindVocabAlchemy(panel, question, hasFeedback) {
        const targetWord = this.getVocabTargetWord(question);
        if (!targetWord) return;

        const state = this.getOrInitAlchemyState(question, targetWord);
        const explainBox = panel.querySelector('#answer-explain-box');
        const nextBtn = panel.querySelector('#practice-next-btn');
        this.updateAlchemyUi(panel, question, hasFeedback);

        if (hasFeedback) {
            if (nextBtn) nextBtn.disabled = false;
            return;
        }

        panel.querySelector('#alchemy-pool')?.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-letter-id]');
            if (!btn || this._feedbackShown) return;
            const id = btn.dataset.letterId;
            if (!id || state.selected.includes(id)) return;
            if (state.selected.length >= targetWord.length) return;
            state.selected.push(id);
            this.updateAlchemyUi(panel, question, false);
        });

        panel.querySelector('#alchemy-slots')?.addEventListener('click', (event) => {
            const slot = event.target.closest('[data-slot-index]');
            if (!slot || this._feedbackShown) return;
            const idx = Number(slot.dataset.slotIndex);
            if (!Number.isInteger(idx) || idx < 0 || idx >= state.selected.length) return;
            state.selected.splice(idx, 1);
            this.updateAlchemyUi(panel, question, false);
        });

        panel.querySelector('#alchemy-clear-btn')?.addEventListener('click', () => {
            if (this._feedbackShown) return;
            state.selected = [];
            this.updateAlchemyUi(panel, question, false);
        });

        panel.querySelector('#alchemy-submit-btn')?.addEventListener('click', () => {
            if (this._feedbackShown) return;
            const word = this.getAlchemyWordFromState(state);
            if (word.length !== targetWord.length) return;

            if (word === targetWord) {
                this.answers[question.question_id] = question.correct_answer;
                this.game.store.answerQuestion(question.question_id, question.correct_answer);
                this.playAnswerFeedbackTone(true, this.combo + 1);
                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                if (this.combo >= 3) this.showComboFx(this.combo);

                this._feedbackShown = true;
                if (nextBtn) nextBtn.disabled = false;
                if (explainBox) {
                    explainBox.style.display = 'block';
                    explainBox.innerHTML = `<div style="color:#9ee8bf;">⚗️ 炼丹成功：${this.game.ui.escapeHtml(targetWord)}，获得一枚回灵丹。</div>`;
                }
                this.updateAlchemyUi(panel, question, true);
                this.persistSession();
                return;
            }

            this.playAnswerFeedbackTone(false, 0);
            this.combo = 0;
            if (explainBox) {
                explainBox.style.display = 'block';
                explainBox.innerHTML = `<div style="color:#ffb3b3;">丹炉震颤，丹方未成：${this.game.ui.escapeHtml(word.toUpperCase())}</div>
                    <div style="margin-top:4px;">💡 请重新排序字母再试一次。</div>`;
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

    buildAnswerExplainHtml(question, selected) {
        const options = question?.options || {};
        const selectedText = options[selected] || '';
        const correctKey = question?.correct_answer || '';
        const correctText = options[correctKey] || '';
        const explanation = String(question?.explanation || '').trim();
        const explainText = explanation || '这个选项在当前语境中不成立，建议对比正确答案的核心词义。';
        return `
            <div style="color:#ffb3b3;">✗ 你选择了 ${this.game.ui.escapeHtml(selected || '')}. ${this.game.ui.escapeHtml(selectedText)}</div>
            <div style="color:#9ee8bf;">✓ 正确答案：${this.game.ui.escapeHtml(correctKey)}. ${this.game.ui.escapeHtml(correctText)}</div>
            <div style="margin-top:4px;">💡 解析：${this.game.ui.escapeHtml(explainText)}</div>
        `;
    }

    playAnswerFeedbackTone(isCorrect, combo = 0) {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(isCorrect ? 40 : 80);
            }
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            const play = (freq, start, duration, gain = 0.02) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                g.gain.setValueAtTime(gain, start);
                g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + duration);
            };

            if (isCorrect) {
                play(880, now, 0.12, 0.03);
                if (combo >= 3) {
                    play(1100, now + 0.06, 0.12, 0.02);
                }
            } else {
                play(220, now, 0.28, 0.028);
            }
            setTimeout(() => ctx.close?.(), 450);
        } catch {
            // ignore audio failures
        }
    }

    /** 批量提交 */
    async submitAll() {
        const panel = document.getElementById('practice-panel');
        if (panel) panel.remove();
        this.stopSpeakingRecording(true);

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

    playListeningDialogue(question) {
        if (!('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        const voices = synth.getVoices();
        const femaleVoice = this.pickVoice(voices, 'female');
        const maleVoice = this.pickVoice(voices, 'male');
        const lines = this.getListeningDialogueLines(question);

        lines.forEach((line) => {
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

    getListeningMaterialText(question) {
        if (!question) return '';
        if (typeof question.listening_text === 'string' && question.listening_text.trim()) {
            return question.listening_text.trim();
        }
        return String(question.question || '').trim();
    }

    getQuestionStemText(question) {
        if (!question) return '';
        if (typeof question.prompt === 'string' && question.prompt.trim()) {
            return question.prompt.trim();
        }
        if (typeof question.stem === 'string' && question.stem.trim()) {
            return question.stem.trim();
        }
        return String(question.question || '').trim();
    }

    getListeningDialogueLines(question) {
        if (Array.isArray(question?.listening_dialogue) && question.listening_dialogue.length) {
            return question.listening_dialogue
                .map((item, idx) => {
                    const text = String(item?.text || '').trim();
                    if (!text) return null;
                    const rawGender = String(item?.gender || '').toLowerCase();
                    const gender = rawGender === 'male' ? 'male' : rawGender === 'female' ? 'female' : (idx % 2 === 0 ? 'female' : 'male');
                    return { role: item?.role || (idx % 2 === 0 ? 'A' : 'B'), text, gender };
                })
                .filter(Boolean);
        }

        const material = this.getListeningMaterialText(question);
        if (!material) return LISTENING_TEST_DIALOGUE;

        const rawLines = material
            .split(/\r?\n+/)
            .map((x) => x.trim())
            .filter(Boolean);
        if (!rawLines.length) {
            return LISTENING_TEST_DIALOGUE;
        }

        return rawLines.map((line, idx) => {
            const m = line.match(/^([A-Za-z\u4e00-\u9fa5]+)\s*[:：]\s*(.+)$/);
            const role = m ? m[1].trim() : (idx % 2 === 0 ? 'A' : 'B');
            const text = m ? m[2].trim() : line;
            const roleLower = role.toLowerCase();
            const femaleHints = ['a', 'f', 'female', 'girl', 'woman', '女'];
            const maleHints = ['b', 'm', 'male', 'boy', 'man', '男'];
            let gender = idx % 2 === 0 ? 'female' : 'male';
            if (femaleHints.some((hint) => roleLower.includes(hint))) gender = 'female';
            if (maleHints.some((hint) => roleLower.includes(hint))) gender = 'male';
            return { role, text, gender };
        });
    }

    playSpeakingMaterial(question) {
        const text = this.getSpeakingMaterialText(question);
        if (!text) {
            this.game.ui.showHermesBubble('口语材料为空');
            return;
        }
        this.speakWord(text);
    }

    getSpeakingMaterialText(question) {
        if (!question) return '';
        if (typeof question.speaking_text === 'string' && question.speaking_text.trim()) {
            return question.speaking_text.trim();
        }
        if (typeof question.listening_text === 'string' && question.listening_text.trim()) {
            return question.listening_text.trim();
        }
        return String(question.question || '').trim();
    }

    async startSpeakingRecording(question) {
        if (!question?.question_id) return;
        if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
            this.game.ui.showHermesBubble('当前浏览器不支持录音');
            return;
        }

        try {
            this.stopSpeakingRecording(true);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            this.speakingMediaStream = stream;
            this.speakingMediaRecorder = recorder;
            this.speakingMediaChunks = [];
            this.speakingRecording = true;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.speakingMediaChunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(this.speakingMediaChunks, { type: recorder.mimeType || 'audio/webm' });
                if (audioBlob.size > 0) {
                    const qid = question.question_id;
                    const old = this.speakingRecordings[qid];
                    if (old?.url && old.url.startsWith('blob:')) {
                        URL.revokeObjectURL(old.url);
                    }
                    const url = URL.createObjectURL(audioBlob);
                    this.speakingRecordings[qid] = {
                        url,
                        blob: audioBlob,
                        mimeType: audioBlob.type,
                        recordedAt: Date.now(),
                    };
                    this.answers[qid] = question.correct_answer || 'RECORDED';
                    this._feedbackShown = true;
                    this.persistSession();
                }

                this.speakingRecording = false;
                this.speakingMediaRecorder = null;
                this.speakingMediaChunks = [];
                if (this.speakingMediaStream) {
                    this.speakingMediaStream.getTracks().forEach((track) => track.stop());
                    this.speakingMediaStream = null;
                }

                const statusEl = document.getElementById('speaking-record-status');
                if (statusEl) statusEl.textContent = '已录音';
                const btn = document.getElementById('speaking-record-btn');
                if (btn) btn.textContent = '开始录音';
                const nextBtn = document.getElementById('practice-next-btn');
                if (nextBtn) nextBtn.disabled = false;
                this.renderQuestion();
            };

            recorder.start();
            const statusEl = document.getElementById('speaking-record-status');
            if (statusEl) statusEl.textContent = '录音中...';
            const btn = document.getElementById('speaking-record-btn');
            if (btn) btn.textContent = '停止录音';
        } catch (err) {
            this.speakingRecording = false;
            this.speakingMediaRecorder = null;
            this.speakingMediaChunks = [];
            if (this.speakingMediaStream) {
                this.speakingMediaStream.getTracks().forEach((track) => track.stop());
                this.speakingMediaStream = null;
            }
            this.game.ui.showHermesBubble(`录音失败：${err?.message || '无法访问麦克风'}`);
        }
    }

    stopSpeakingRecording(discard = false) {
        if (!this.speakingMediaRecorder) return;

        const recorder = this.speakingMediaRecorder;
        if (discard) {
            recorder.ondataavailable = null;
            recorder.onstop = null;
        }

        if (recorder.state !== 'inactive') {
            try {
                recorder.stop();
            } catch {
                // ignore invalid stop state
            }
        }

        if (discard) {
            this.speakingRecording = false;
            this.speakingMediaRecorder = null;
            this.speakingMediaChunks = [];
            if (this.speakingMediaStream) {
                this.speakingMediaStream.getTracks().forEach((track) => track.stop());
                this.speakingMediaStream = null;
            }
        }
    }

    stopSpeech() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.stopSpeakingRecording(true);
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
            vocabFlightRoutes: this.currentType === 'vocab' ? this.vocabFlightRoutes : {},
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
        this.vocabAlchemyStates = {};
        this.vocabFlightRoutes = data.vocabFlightRoutes || {};
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
