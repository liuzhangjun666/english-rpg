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

    getWritingPlayMode(prompt) {
        const raw = String(prompt?.mode || prompt?.writing_mode || '').trim().toLowerCase();
        if (raw === 'template' || raw === 'template_sentence' || raw === 'sentence_template') return 'template';
        if (raw === 'required_words' || raw === 'keyword_sentence' || raw === '指定词造句') return 'required_words';
        if (raw === 'upgrade' || raw === 'sentence_upgrade' || raw === '句子升级') return 'upgrade';
        if (Array.isArray(prompt?.requiredWords) && prompt.requiredWords.length) return 'required_words';
        if (Array.isArray(prompt?.required_words) && prompt.required_words.length) return 'required_words';
        if (prompt?.writing_type === 'continuation') return 'upgrade';
        return 'template';
    }

    getWritingModeLabel(mode) {
        if (mode === 'required_words') return '✒️ 指定词造句';
        if (mode === 'upgrade') return '🧩 句子升级';
        return '📝 模板造句';
    }

    getWritingRules(prompt) {
        const requiredWordsRaw = prompt?.requiredWords
            || prompt?.required_words
            || prompt?.rules?.requiredWords
            || prompt?.rules?.required_words
            || [];
        const requiredWords = Array.isArray(requiredWordsRaw)
            ? requiredWordsRaw.map((w) => String(w || '').trim()).filter(Boolean)
            : String(requiredWordsRaw || '')
                .split(/[,\n，]/)
                .map((w) => w.trim())
                .filter(Boolean);
        const minLength = Number(
            prompt?.minLength
            || prompt?.min_length
            || prompt?.rules?.minLength
            || prompt?.rules?.min_length
            || 0
        );
        const minWords = Number(
            prompt?.minWords
            || prompt?.min_words
            || prompt?.rules?.minWords
            || prompt?.rules?.min_words
            || prompt?.word_limit_min
            || 0
        );
        return {
            requiredWords,
            minLength: Number.isFinite(minLength) && minLength > 0 ? Math.floor(minLength) : 0,
            minWords: Number.isFinite(minWords) && minWords > 0 ? Math.floor(minWords) : 0,
        };
    }

    validateWritingAnswer(answer, prompt) {
        const text = String(answer || '').trim();
        const rules = this.getWritingRules(prompt);
        const lower = text.toLowerCase();
        const words = text ? text.split(/\s+/).filter(Boolean) : [];
        const hasRequiredWords = rules.requiredWords.length > 0;
        const missingRequiredWords = hasRequiredWords
            ? rules.requiredWords.filter((w) => !lower.includes(String(w).toLowerCase()))
            : [];
        const checks = [
            { key: 'nonEmpty', label: '内容非空', passed: text.length > 0 },
            { key: 'firstUppercase', label: '首字母大写', passed: /^[A-Z]/.test(text) },
            { key: 'endPunctuation', label: '句末标点（.?!）', passed: /[.?!]$/.test(text) },
        ];
        if (hasRequiredWords) {
            checks.push({ key: 'requiredWords', label: '包含指定词', passed: missingRequiredWords.length === 0 });
            if (rules.minLength > 0) {
                checks.push({ key: 'minLength', label: `达到最小长度（${rules.minLength}字符）`, passed: text.length >= rules.minLength });
            } else if (rules.minWords > 0) {
                checks.push({ key: 'minWords', label: `达到最小长度（${rules.minWords}词）`, passed: words.length >= rules.minWords });
            }
        }
        const passedCount = checks.filter((x) => x.passed).length;
        const totalCount = checks.length;
        const allPassed = passedCount === totalCount;
        const status = allPassed ? 'pass' : (passedCount >= Math.max(2, Math.ceil(totalCount * 0.6)) ? 'partial' : 'fail');
        return {
            status,
            allPassed,
            checks,
            passedCount,
            totalCount,
            missingRequiredWords,
            rules,
        };
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
            <div class="panel-title">准备符箓试炼</div>
            <div style="text-align:center;color:var(--parchment-dark);font-size:14px;line-height:2;margin:12px 0;">
                <div>模块：🪶 符箓台 · ${levelId}</div>
                <div>题数：${this.prompts.length}题</div>
                <div>消耗灵力：<span style="color:var(--spirit-blue);font-weight:bold;">💧 ${spiritCost}</span></div>
                <div style="margin-top:8px;font-size:12px;">当前灵力：💧 ${user?.spirit_power || 0}</div>
            </div>
            <div style="font-size:12px;color:var(--parchment-dark);text-align:center;margin-bottom:12px;opacity:0.7;">✨ 按题目规则炼制英文符箓</div>
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
        const writingMode = this.getWritingPlayMode(prompt);
        const typeLabel = this.getWritingModeLabel(writingMode);
        const writingRules = this.getWritingRules(prompt);
        const minWords = prompt.word_limit_min || 50;
        const maxWords = prompt.word_limit_max || 150;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'writing-panel';
        panel.style.cssText = 'max-width:580px;';

        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title"><img src="${herbIcon}" class="herb-icon"> 符箓台 · ${this.currentLevel}</span>
                <span class="practice-progress">${this.currentIndex + 1}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <span style="background:rgba(212,168,67,0.2);color:var(--gold);font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(212,168,67,0.4);">${typeLabel}</span>
                <span style="font-size:12px;color:var(--parchment-dark);">字数要求：${minWords}–${maxWords} 词</span>
            </div>
            <div style="padding:8px 10px;border:1px dashed rgba(212,168,67,0.35);border-radius:10px;background:rgba(212,168,67,0.08);margin-bottom:10px;font-size:12px;color:var(--parchment-dark);line-height:1.7;">
                <div><b>玩法：</b>${this.game.ui.escapeHtml(typeLabel)}</div>
                <div><b>规则：</b>非空、首字母大写、句末标点（.?!）${writingRules.requiredWords.length ? `、包含指定词（${this.game.ui.escapeHtml(writingRules.requiredWords.join(', '))}）` : ''}</div>
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
            <div id="writing-validate-box" style="display:none;margin:6px 0 12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(212,168,67,0.25);background:rgba(255,255,255,0.04);font-size:12px;line-height:1.8;color:var(--parchment-dark);"></div>

            <div class="practice-actions">
                <button class="btn btn-secondary btn-sm" id="writing-exit-btn">退出</button>
                <button class="btn btn-primary btn-sm" id="writing-submit-btn" disabled>炼符提交</button>
            </div>
        `;

        this.game.ui.overlay.appendChild(panel);

        const textarea = document.getElementById('writing-textarea');
        const wordCountEl = document.getElementById('writing-wordcount');
        const wordsNeededEl = document.getElementById('words-needed');
        const submitBtn = document.getElementById('writing-submit-btn');
        const hintEl = document.getElementById('writing-wordcount-hint');
        const validateBox = document.getElementById('writing-validate-box');

        const updateWordCount = () => {
            const text = textarea.value.trim();
            const wc = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
            wordCountEl.textContent = `${wc} 词`;
            if (text.length > 0) {
                submitBtn.disabled = false;
                wordCountEl.style.color = wc > maxWords ? '#ff6b6b' : 'var(--gold)';
                hintEl.style.opacity = '0';
            } else {
                submitBtn.disabled = true;
                wordCountEl.style.color = 'var(--parchment-dark)';
                if (wordsNeededEl) wordsNeededEl.textContent = Math.max(0, minWords - wc);
                hintEl.style.opacity = '0.7';
            }
        };

        textarea.addEventListener('input', updateWordCount);
        textarea.addEventListener('focus', () => { textarea.style.borderColor = 'rgba(212,168,67,0.7)'; });
        textarea.addEventListener('blur', () => { textarea.style.borderColor = 'rgba(212,168,67,0.3)'; });

        submitBtn.addEventListener('click', () => {
            const content = textarea.value.trim();
            const validation = this.validateWritingAnswer(content, prompt);
            if (validateBox) {
                const checkLines = validation.checks.map((item) => `<div>${item.passed ? '✓' : '✗'} ${this.game.ui.escapeHtml(item.label)}</div>`).join('');
                const missingWordsLine = validation.missingRequiredWords.length
                    ? `<div style="margin-top:4px;color:#ffd6d2;">缺失指定词：${this.game.ui.escapeHtml(validation.missingRequiredWords.join(', '))}</div>`
                    : '';
                let header = '符文残缺，请补全要求';
                let headerColor = '#ffb3b3';
                if (validation.status === 'pass') {
                    header = '炼符成功，获得高阶英文符箓';
                    headerColor = '#9ee8bf';
                } else if (validation.status === 'partial') {
                    header = '符文已成，但仍可继续打磨';
                    headerColor = '#f4dfa1';
                }
                validateBox.style.display = 'block';
                validateBox.innerHTML = `
                    <div style="color:${headerColor};margin-bottom:4px;">${header}</div>
                    ${checkLines}
                    ${missingWordsLine}
                `;
            }
            if (validation.status === 'fail') {
                this.game.ui.showHermesBubble('符文残缺，请补全要求');
                return;
            }
            this.submitWriting(prompt, content, validation);
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

    async submitWriting(prompt, content, validation) {
        const panel = document.getElementById('writing-panel');
        const submitBtn = document.getElementById('writing-submit-btn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '炼符中...'; }

        this.game.ui.showLoading('符箓炼制中，请稍候...');
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

        this.submittedResults.push({ prompt, result: data, validation });
        this.showScoreResult(prompt, data, validation);
    }

    showScoreResult(prompt, data, validation) {
        document.getElementById('writing-score-panel')?.remove();
        const isLast = this.currentIndex >= this.prompts.length - 1;
        const status = validation?.status || 'partial';
        const score = validation?.totalCount ? Math.round((validation.passedCount / validation.totalCount) * 100) : 0;
        const scoreColor = status === 'pass' ? '#7bed9f' : status === 'partial' ? '#f0c040' : '#ff6b6b';
        const scoreIcon = status === 'pass' ? '🌟' : status === 'partial' ? '✨' : '📝';
        const statusText = status === 'pass'
            ? '炼符成功，获得高阶英文符箓'
            : (status === 'partial' ? '符文已成，但仍可继续打磨' : '符文残缺，请补全要求');
        const checksHtml = Array.isArray(validation?.checks)
            ? `<div style="margin:10px 0;padding:10px;border:1px dashed rgba(212,168,67,0.35);border-radius:10px;background:rgba(255,255,255,0.03);">${validation.checks.map((item) => `<div>${item.passed ? '✓' : '✗'} ${this.game.ui.escapeHtml(item.label)}</div>`).join('')}</div>`
            : '';

        const scorePanel = document.createElement('div');
        scorePanel.className = 'panel';
        scorePanel.id = 'writing-score-panel';
        scorePanel.style.maxWidth = '500px';
        scorePanel.innerHTML = `
            <div class="panel-title">🪶 符箓台评定</div>
            <div style="text-align:center;margin:16px 0;">
                <div style="font-size:56px;font-family:var(--font-title);color:${scoreColor};line-height:1;">${score}</div>
                <div style="font-size:14px;color:${scoreColor};margin-top:4px;">${scoreIcon} ${this.game.ui.escapeHtml(statusText)}</div>
            </div>
            ${checksHtml}
            <div style="padding:12px;background:rgba(78,192,122,0.06);border:1px dashed rgba(78,192,122,0.3);border-radius:10px;margin:10px 0;">
                <div style="font-size:12px;color:#9ee8bf;margin-bottom:4px;">🧙 赫尔墨斯点评</div>
                <div style="font-size:13px;color:var(--parchment-dark);line-height:1.6;">${this.game.ui.escapeHtml(data.feedback || '符文已记录，继续修炼可精进表达。')}</div>
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
        const passCount = this.submittedResults.filter((x) => x.validation?.status === 'pass').length;
        const partialCount = this.submittedResults.filter((x) => x.validation?.status === 'partial').length;
        const failCount = this.submittedResults.filter((x) => x.validation?.status === 'fail').length;
        const total = this.submittedResults.length || this.prompts.length || 1;
        const avgScore = Math.round(((passCount + partialCount * 0.6) / total) * 100);
        const passed = failCount === 0;
        const hermesMsg = failCount > 0
            ? '符文残缺处已标记，回看规则再炼一轮，进步会很快。'
            : (partialCount > 0
                ? '符文已成，但仍可继续打磨。把指定词与句式再融合得更自然一些。'
                : '炼符成功，获得高阶英文符箓。此轮表达结构与格式都很稳。');
        const summaryTitle = failCount > 0
            ? '符文残缺，请补全要求'
            : (partialCount > 0 ? '符文已成，但仍可继续打磨' : '炼符成功，获得高阶英文符箓');

        const finalPanel = document.createElement('div');
        finalPanel.className = `reward-popup ${passed ? 'reward-pass' : 'reward-fail'}`;
        finalPanel.id = 'writing-final';
        finalPanel.innerHTML = `
            <div class="reward-icon">${passed ? (avgScore >= 90 ? '🌟' : '✓') : '📝'}</div>
            <div class="reward-title">${this.game.ui.escapeHtml(summaryTitle)}</div>
            <div class="reward-details">
                <div class="reward-row"><span>规则通过度</span><span class="${avgScore >= 80 ? 'text-gold' : avgScore >= 60 ? 'text-green' : 'text-red'}">${avgScore}%</span></div>
                <div class="reward-row"><span>完成题数</span><span class="text-gold">${this.submittedResults.length} / ${this.prompts.length}</span></div>
                <div class="reward-row"><span>全部通过</span><span class="text-green">${passCount}</span></div>
                <div class="reward-row"><span>部分通过</span><span class="text-gold">${partialCount}</span></div>
                <div class="reward-row"><span>未通过</span><span class="text-red">${failCount}</span></div>
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

const MODULE_META = {
    vocab: { title: '🌿 灵草园', shortName: '灵草园', countText: (stageNo) => (stageNo <= 3 ? '15题' : stageNo <= 6 ? '18题' : '20题') },
    grammar: { title: '🧭 阵法峰', shortName: '阵法峰', countText: () => '10题' },
    listening: { title: '🎐 听风谷', shortName: '听风谷', countText: () => '10题' },
    speaking: { title: '🗣️ 诵咒峰', shortName: '诵咒峰', countText: () => '10题' },
    reading: { title: '📚 阅读试炼', shortName: '阅读试炼', countText: () => '10题' },
    writing: { title: '🪶 符箓台', shortName: '符箓台', countText: () => '2题（命题+续写）' },
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
        this.listeningReplayStates = {};
        this.listeningAudioElement = null;
        this.speakingRecordings = {};
        this.speakingMediaRecorder = null;
        this.speakingMediaStream = null;
        this.speakingMediaChunks = [];
        this.speakingRecording = false;
        this.vocabAlchemyStates = {};
        this.vocabFlightRoutes = {};
        this.vocabAdventureState = null;
        this.vocabAutoNextTimer = null;
        this.grammarOrderStates = {};
        // 写作专属子面板
        this._writingPanel = new WritingPanel(game);
    }

    /** 打开关卡选择列表 */
    showLevelSelect(type) {
        this.game.ui.hideAllPanels();
        this.clearVocabAutoNextTimer();
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
                    本关将触发三种玩法：灵草采集（看英文选中文）/ 灵草识别（看图选词）/ 炼丹拼词
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
        this.clearVocabAutoNextTimer();
        this.currentLevel = levelId;
        this.currentIndex = 0;
        this.answers = {};
        this.combo = 0;
        this.maxCombo = 0;
        this._feedbackShown = false;
        this.speakingRecordings = {};
        this.listeningReplayStates = {};
        this.vocabAlchemyStates = {};
        this.vocabFlightRoutes = {};
        this.vocabAdventureState = null;
        this.grammarOrderStates = {};
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
        if (type === 'vocab') {
            this.initVocabAdventureState();
        }

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
        this.clearVocabAutoNextTimer();
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
        const isGrammar = this.currentType === 'grammar';
        const pronounceWord = this.getPronounceWord(q);
        const listeningMaterial = isListening ? this.getListeningMaterialText(q) : '';
        const listeningAudioUrl = isListening ? this.getListeningAudioUrl(q) : '';
        const listeningReplayInfo = isListening ? this.getListeningReplayInfo(q) : null;
        const listeningPlaybackHint = isListening ? this.getListeningPlaybackHint(q) : '';
        const speakingMaterial = isSpeaking ? this.getSpeakingMaterialText(q) : '';
        const speakingRec = (isSpeaking && q.question_id) ? this.speakingRecordings[q.question_id] : null;
        const speakingTodayCount = isSpeaking ? this.getSpeakingTodayCount() : 0;
        const vocabPlayMode = isVocab ? this.getVocabPlayMode(q) : null;
        const isVocabAlchemy = vocabPlayMode === 'alchemy';
        const isVocabChoiceGame = isVocab && !isVocabAlchemy;
        const grammarPlayMode = isGrammar ? this.getGrammarPlayMode(q) : null;
        const isGrammarWordOrder = isGrammar && grammarPlayMode === 'word_order';
        const showPronounce = isVocab && pronounceWord;
        const showListeningPlayer = isListening;
        const showListeningMaterial = isListening && hasFeedback && !!(listeningMaterial && listeningMaterial.trim());
        const showSpeakingPanel = isSpeaking;
        const showOptionArea = !showSpeakingPanel;
        const promptText = this.getQuestionStemText(q);
        const basePrompt = (isListening && promptText === listeningMaterial)
            ? '请根据听力材料回答问题。'
            : (isSpeaking && (!promptText || promptText === speakingMaterial)
                ? '请朗读咒语文本并完成跟读打卡。'
                : promptText);
        const targetWord = this.getVocabTargetWord(q) || pronounceWord || '';
        let resolvedPrompt = basePrompt;
        if (isVocab) {
            resolvedPrompt = vocabPlayMode === 'alchemy'
                ? '丹方缺失，请补全灵草名'
                : (vocabPlayMode === 'herb'
                    ? `寻药指令：Find the herb: ${targetWord || 'herb'}`
                    : `${targetWord || 'word'} 的中文意思是？`);
        } else if (isGrammar) {
            resolvedPrompt = grammarPlayMode === 'word_order'
                ? '词序布阵：请将词块组合成正确句子。'
                : (grammarPlayMode === 'bug_hunt'
                    ? '语法捉虫：找出正确语法结构。'
                    : '阵法择位：请选择正确语法位。');
        }
        const vocabQuestStatusHtml = isVocab ? this.renderVocabQuestStatus(vocabPlayMode, targetWord) : '';
        const grammarQuestStatusHtml = isGrammar ? this.renderGrammarQuestStatus(grammarPlayMode, q) : '';
        const vocabDoneCount = this.currentIndex + (hasFeedback ? 1 : 0);
        const progressHeaderHtml = isVocabChoiceGame
            ? this.renderVocabHarvestBasket(vocabDoneCount, total)
            : `${this.currentIndex + 1}/${total}`;
        const vocabComboHtml = isVocabChoiceGame
            ? `<div class="vocab-chain-indicator">连采 x${Math.max(0, this.combo)}</div>`
            : (this.combo >= 3 ? `<div class="combo-display">🔥 ${this.combo} 连击</div>` : '');

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
        let grammarGameplayHtml = '';
        if (isGrammar && showOptionArea) {
            if (isGrammarWordOrder) {
                grammarGameplayHtml = this.renderGrammarWordOrder(q, hasFeedback);
            } else {
                grammarGameplayHtml = this.renderGrammarChoiceOptions(q, grammarPlayMode);
            }
        }

        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title"><img src="${herbIcon}" class="herb-icon"> ${isVocab ? '灵草园 · ' : ''}${isGrammar ? '阵法峰 · ' : ''}${isListening ? '听风谷 · ' : ''}${isSpeaking ? '诵咒峰 · ' : ''}${this.currentLevel} ${isDemon ? '🧘' : ''}</span>
                <span class="practice-progress">${progressHeaderHtml}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>
            ${vocabComboHtml}
            ${isVocab ? `<div class="vocab-mode-badge">${this.renderVocabModeBadge(vocabPlayMode)}</div>` : ''}
            ${vocabQuestStatusHtml}
            ${isGrammar ? `<div class="grammar-mode-badge">${this.renderGrammarModeBadge(grammarPlayMode)}</div>` : ''}
            ${grammarQuestStatusHtml}
            ${isListening ? `<div class="listening-mode-badge">🎐 听风谷试炼：以传音玉辨析英文灵音</div>` : ''}
            ${isSpeaking ? `<div class="listening-mode-badge">🗣️ 诵咒峰：播放原音 + 跟读打卡（今日打卡 ${speakingTodayCount} 次）</div>` : ''}
            ${showPronounce ? `
                <div class="word-pronounce-row">
                    <span class="word-pronounce-text">${this.game.ui.escapeHtml(pronounceWord)}</span>
                    <button class="word-pronounce-btn" id="word-pronounce-btn" title="播放读音">🔊</button>
                </div>
            ` : ''}
            ${showListeningPlayer ? `
                <div class="listening-audio-row">
                    <div class="listening-audio-title">🎧 传音玉</div>
                    <div class="listening-jade-row">
                        <button class="btn btn-secondary btn-sm listening-jade-btn" id="listening-play-btn">传音玉 · 回听</button>
                        <span class="listening-replay-count" id="listening-replay-count">剩余回听：${this.game.ui.escapeHtml(this.formatListeningRemaining(listeningReplayInfo))}</span>
                    </div>
                    <div class="listening-audio-hint" id="listening-playback-hint">${this.game.ui.escapeHtml(listeningPlaybackHint || (listeningAudioUrl ? '已绑定音频源' : '将使用系统朗读兜底'))}</div>
                </div>
            ` : ''}
            ${showSpeakingPanel ? `
                <div class="listening-audio-row" style="display:block;">
                    <div class="listening-audio-title" style="margin-bottom:8px;">🪶 咒语文本</div>
                    <div class="question-text" style="margin-bottom:10px;">${this.game.ui.escapeHtml(speakingMaterial || '暂无口语材料')}</div>
                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" id="speaking-play-btn">播放原音</button>
                        <button class="btn btn-secondary btn-sm" id="speaking-record-btn">${this.speakingRecording ? '停止诵咒' : '开始诵咒'}</button>
                        <button class="btn btn-primary btn-sm" id="speaking-complete-btn">我已完成跟读</button>
                        <span id="speaking-record-status" style="font-size:12px;color:var(--parchment-dark);">${speakingRec ? '已录音，可回放' : (this.speakingRecording ? '诵咒录音中...' : '未录音（可直接打卡）')}</span>
                    </div>
                    ${speakingRec ? `<div style="margin-top:8px;"><audio controls src="${speakingRec.url}" style="width:100%;"></audio></div>` : ''}
                </div>
                <div class="question-text">${this.game.ui.escapeHtml(resolvedPrompt)}</div>
            ` : `
                ${(isVocab || isGrammar) ? '' : `<div class="question-text">${this.game.ui.escapeHtml(resolvedPrompt)}</div>`}
            `}
            ${showOptionArea ? `
                ${isVocab
                    ? vocabGameplayHtml
                    : (isGrammar
                        ? grammarGameplayHtml
                        : `
                            <div class="options-container" id="options-container">
                                ${this.renderOptions(q.options, null)}
                            </div>
                        `
                    )
                }
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
                ${isVocabChoiceGame ? '' : `
                    <button class="btn btn-primary btn-sm" id="practice-next-btn" ${hasFeedback ? '' : 'disabled'}>
                        ${this.currentIndex < total - 1 ? '下一题 →' : '查看结果'}
                    </button>
                `}
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
            const playDialogue = () => this.playListeningWithFallback(q);
            document.getElementById('listening-play-btn')?.addEventListener('click', playDialogue);
            this.updateListeningReplayUi(q);
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
            document.getElementById('speaking-complete-btn')?.addEventListener('click', () => {
                this.markSpeakingFollowDone(q);
            });
        }

        // 选项点击 → 即时反馈
        const optionBtns = panel.querySelectorAll('.option-btn');
        const explainBox = document.getElementById('answer-explain-box');
        if (showOptionArea && !isVocabAlchemy && !isGrammarWordOrder && hasFeedback) {
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
            if (isVocabChoiceGame && currentAnswer) {
                const selectedIndex = this.getVocabOptionIndexFromValue(q, currentAnswer, vocabPlayMode);
                this.moveVocabPetTo(panel, selectedIndex);
                this.scheduleVocabAutoNext(220);
            }
            if (explainBox && currentAnswer && currentAnswer !== q.correct_answer) {
                explainBox.style.display = 'block';
                if (isVocab) {
                    explainBox.innerHTML = `
                        <div style="color:#ffb3b3;">灵草识别失败，请查看释义</div>
                        ${this.buildAnswerExplainHtml(q, currentAnswer)}
                    `;
                } else if (isGrammar) {
                    explainBox.innerHTML = `
                        <div style="color:#ffb3b3;">阵眼错位，请查看规则提示</div>
                        ${this.buildAnswerExplainHtml(q, currentAnswer)}
                    `;
                } else if (isListening) {
                    explainBox.innerHTML = `
                        <div style="color:#ffb3b3;">灵音未辨清，可查看原文提示</div>
                        ${this.buildAnswerExplainHtml(q, currentAnswer)}
                    `;
                } else {
                    explainBox.innerHTML = this.buildAnswerExplainHtml(q, currentAnswer);
                }
            }
        }
        if (isVocabAlchemy) {
            this.bindVocabAlchemy(panel, q, hasFeedback);
        } else if (isGrammarWordOrder) {
            this.bindGrammarWordOrder(panel, q, hasFeedback);
        } else {
            optionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this._feedbackShown) return; // 已作答，不能改
                    optionBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');

                    const selected = btn.dataset.value;
                    const correct = selected === q.correct_answer;
                    const selectedIndex = Number(btn.dataset.laneIndex || 1);
                    if (isVocabChoiceGame) {
                        this.moveVocabPetTo(panel, selectedIndex);
                    }
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
                        if (isVocab && explainBox) {
                            const baseQi = 10;
                            const comboBonusQi = this.combo >= 3 ? 10 : 0;
                            this.applyVocabAdventureResult({
                                correct: true,
                                mode: vocabPlayMode,
                                targetWord,
                                qiGain: baseQi + comboBonusQi,
                            });
                            explainBox.style.display = 'block';
                            explainBox.innerHTML = `
                                <div style="color:#9ee8bf;">采集成功</div>
                                <div style="color:#9ee8bf;">灵草 +1 ｜ 灵气 +${baseQi} ｜ 连采 +1</div>
                                ${this.combo >= 3 ? '<div style="margin-top:4px;color:#f4dfa1;">灵草暴长，额外灵气 +10</div>' : ''}
                            `;
                        } else if (isGrammar && explainBox) {
                            const runeGain = this.getGrammarRuneReward(q);
                            const zhouTianBonus = this.combo === 3 ? '<div style="margin-top:4px;color:#f4dfa1;">连成小周天，额外获得语法灵纹</div>' : '';
                            explainBox.style.display = 'block';
                            explainBox.innerHTML = `
                                <div style="color:#9ee8bf;">阵法点亮，获得语法灵纹 +${runeGain}</div>
                                ${zhouTianBonus}
                            `;
                        } else if (isListening && explainBox) {
                            const lingyinGain = this.getListeningLingyinReward(q);
                            explainBox.style.display = 'block';
                            explainBox.innerHTML = `<div style="color:#9ee8bf;">听风辨音成功，获得清风灵音 +${lingyinGain}</div>`;
                        }
                    } else {
                        btn.classList.add('answer-wrong');
                        this.playAnswerFeedbackTone(false, 0);
                        this.combo = 0; // 连击中断
                        if (isVocab) {
                            this.applyVocabAdventureResult({
                                correct: false,
                                mode: vocabPlayMode,
                                targetWord,
                                qiGain: 0,
                            });
                        }
                        optionBtns.forEach(b => {
                            if (b.dataset.value === q.correct_answer) b.classList.add('answer-correct');
                        });
                        if (explainBox) {
                            explainBox.style.display = 'block';
                            if (isVocab) {
                                const correctText = String((q.options || {})[q.correct_answer] || '').trim();
                                const displayWord = targetWord || this.getPronounceWord(q) || 'word';
                                explainBox.innerHTML = `
                                    <div style="color:#ffb3b3;">采集失败，${this.game.ui.escapeHtml(displayWord)} = ${this.game.ui.escapeHtml(correctText)}</div>
                                    <div style="margin-top:4px;color:#ffd6d2;">连采清零，当前题已加入错题回炉</div>
                                `;
                            } else if (isGrammar) {
                                explainBox.innerHTML = `
                                    <div style="color:#ffb3b3;">阵眼错位，请查看规则提示</div>
                                    ${this.buildAnswerExplainHtml(q, selected)}
                                `;
                            } else if (isListening) {
                                explainBox.innerHTML = `
                                    <div style="color:#ffb3b3;">灵音未辨清，可查看原文提示</div>
                                    ${this.buildAnswerExplainHtml(q, selected)}
                                `;
                            } else {
                                explainBox.innerHTML = this.buildAnswerExplainHtml(q, selected);
                            }
                        }
                    }
                    this._feedbackShown = true;
                    const nextBtn = document.getElementById('practice-next-btn');
                    if (nextBtn) nextBtn.disabled = false;
                    if (showListeningPlayer) {
                        const materialBox = document.getElementById('listening-material-box');
                        if (materialBox) materialBox.style.display = 'block';
                    }
                    this.persistSession();
                    if (isVocabChoiceGame) {
                        this.scheduleVocabAutoNext();
                    }
                });
            });
        }

        // 下一题/提交
        const nextBtn = document.getElementById('practice-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goNextQuestionOrSubmit());
        }

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
                this.clearVocabAutoNextTimer();
                panel.remove();
                this.game.enterHall();
            }
        });
    }

    clearVocabAutoNextTimer() {
        if (this.vocabAutoNextTimer) {
            clearTimeout(this.vocabAutoNextTimer);
            this.vocabAutoNextTimer = null;
        }
    }

    goNextQuestionOrSubmit() {
        this.clearVocabAutoNextTimer();
        this._feedbackShown = false;
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.persistSession();
            this.renderQuestion();
        } else {
            this.submitAll();
        }
    }

    scheduleVocabAutoNext(delay = 800) {
        this.clearVocabAutoNextTimer();
        this.vocabAutoNextTimer = setTimeout(() => {
            this.goNextQuestionOrSubmit();
        }, Math.max(120, Number(delay || 800)));
    }

    getVocabOptionIndexFromValue(question, value, mode) {
        const key = String(value || '');
        if (mode === 'herb' || mode === 'flight') {
            const lanes = this.getVocabFlightLanes(question);
            const idx = lanes.findIndex((item) => item.key === key);
            return idx >= 0 ? idx : 1;
        }
        return 1;
    }

    moveVocabPetTo(panel, optionIndex) {
        const pet = panel?.querySelector('#vocab-pet-avatar');
        if (!pet) return;
        const offsetMap = [-90, 0, 90];
        const idx = Math.max(0, Math.min(2, Number(optionIndex || 0)));
        pet.style.transform = `translateX(${offsetMap[idx]}px)`;
    }

    renderVocabHarvestBasket(done, total) {
        const safeTotal = Math.max(1, Number(total || 0));
        const safeDone = Math.max(0, Math.min(safeTotal, Number(done || 0)));
        const items = Array.from({ length: safeTotal }, (_, idx) => (
            idx < safeDone ? '<span class="vocab-basket-item done">🌿</span>' : '<span class="vocab-basket-item">○</span>'
        ));
        return `<span class="vocab-harvest-basket">${items.join('')}</span>`;
    }

    renderVocabModeBadge(mode) {
        if (mode === 'alchemy') return '⚗️ 炼丹拼词：拼写单词';
        if (mode === 'herb') return '🌱 灵草识别：派灵宠采药';
        return '🌿 灵草采集：派灵宠采药';
    }

    initVocabAdventureState() {
        this.vocabAdventureState = {
            qi: 0,
            risk: 3,
            cleared: 0,
            rank: 1,
            lastAction: '灵植师已就位，准备进入灵草园。',
            drops: [],
        };
    }

    ensureVocabAdventureState() {
        if (!this.vocabAdventureState) this.initVocabAdventureState();
        return this.vocabAdventureState;
    }

    getVocabObjective(mode, targetWord) {
        if (mode === 'alchemy') return `炼制单词丹：拼出 ${targetWord || 'target'}。`;
        if (mode === 'herb') return '识别灵草图谱，选出正确英文。';
        return `采集灵草释义：为 ${targetWord || 'target'} 选择中文含义。`;
    }

    getVocabRoleAction(mode) {
        if (mode === 'alchemy') return '角色动作：控火排字，稳定丹炉。';
        if (mode === 'herb') return '角色动作：观察图谱，识别灵草。';
        return '角色动作：御行采集，锁定词义。';
    }

    getVocabDropText(mode, targetWord, qiGain) {
        if (mode === 'alchemy') return `回灵丹 x1（${targetWord || 'word'}）`;
        if (mode === 'herb') return `灵草样本 x1（${targetWord || 'herb'}）`;
        return `词义灵叶 x1（灵气 +${qiGain}）`;
    }

    applyVocabAdventureResult({ correct, mode, targetWord, qiGain }) {
        const state = this.ensureVocabAdventureState();
        if (correct) {
            state.qi += Math.max(1, Number(qiGain || 0));
            state.cleared += 1;
            if (state.risk < 3) state.risk += 1;
            state.lastAction = `采集完成：${targetWord || '灵草'}。前进一格。`;
            const drop = this.getVocabDropText(mode, targetWord, qiGain);
            state.drops.unshift(drop);
            state.drops = state.drops.slice(0, 6);
            const nextRank = 1 + Math.floor(state.qi / 60);
            if (nextRank > state.rank) {
                state.rank = nextRank;
                state.drops.unshift(`境界提升：词修境 Lv.${state.rank}`);
                state.drops = state.drops.slice(0, 6);
                state.lastAction = `灵气突破，词修境提升至 Lv.${state.rank}。`;
            }
            return;
        }

        state.risk = Math.max(0, state.risk - 1);
        state.qi = Math.max(0, state.qi - 3);
        state.lastAction = state.risk > 0
            ? `遭遇干扰：稳定度 -1（剩余 ${state.risk}/3）。`
            : '防护失效：本轮进入高风险状态。';
    }

    renderVocabQuestStatus(mode, targetWord) {
        const state = this.ensureVocabAdventureState();
        const total = Math.max(1, this.questions.length || 1);
        const objective = this.getVocabObjective(mode, targetWord);
        const action = this.getVocabRoleAction(mode);
        const riskPct = Math.max(0, Math.min(100, Math.round((state.risk / 3) * 100)));
        const progressPct = Math.max(0, Math.min(100, Math.round((state.cleared / total) * 100)));
        const riskClass = state.risk <= 1 ? 'vocab-risk-danger' : '';
        const dropsHtml = state.drops.length
            ? state.drops.slice(0, 4).map((d) => `<span class="vocab-drop-chip">${this.game.ui.escapeHtml(d)}</span>`).join('')
            : '<span class="vocab-drop-empty">暂无掉落</span>';

        return `
            <div class="vocab-quest-panel">
                <div class="vocab-quest-row"><b>目标：</b>${this.game.ui.escapeHtml(objective)}</div>
                <div class="vocab-quest-row"><b>行动：</b>${this.game.ui.escapeHtml(action)}</div>
                <div class="vocab-quest-stats">
                    <span>灵气 ${state.qi}</span>
                    <span>稳定度 ${state.risk}/3</span>
                    <span>进度 ${state.cleared}/${total}</span>
                    <span>词修境 Lv.${state.rank}</span>
                </div>
                <div class="vocab-quest-bars">
                    <div class="vocab-quest-bar"><i style="width:${progressPct}%"></i></div>
                    <div class="vocab-quest-bar ${riskClass}"><i style="width:${riskPct}%"></i></div>
                </div>
                <div class="vocab-quest-row vocab-last-action">${this.game.ui.escapeHtml(state.lastAction)}</div>
                <div class="vocab-drop-zone">${dropsHtml}</div>
            </div>
        `;
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
        const rawMode = String(question?.mode || '').trim().toLowerCase();
        const modeAliasMap = {
            alchemy: 'alchemy',
            spell: 'alchemy',
            spelling: 'alchemy',
            word_spell: 'alchemy',
            word_spelling: 'alchemy',
            拼词: 'alchemy',
            拼写: 'alchemy',
            炼丹拼词: 'alchemy',
            herb: 'herb',
            identify: 'herb',
            herb_identify: 'herb',
            image_to_word: 'herb',
            picture_to_word: 'herb',
            看图选词: 'herb',
            灵草识别: 'herb',
            flight: 'flight',
            collect: 'flight',
            herb_collect: 'flight',
            en_to_cn: 'flight',
            word_to_cn: 'flight',
            translation: 'flight',
            看英文选中文: 'flight',
            灵草采集: 'flight',
        };

        const mapped = modeAliasMap[rawMode];
        if (mapped === 'alchemy' && canAlchemy) return mapped;
        if (mapped === 'herb' && canHerb) return mapped;
        if (mapped === 'flight' && canFlight) return mapped;

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

    getVocabSceneImage(question) {
        const direct = question?.image || question?.image_url || question?.picture || question?.img;
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
        if (question?.content && typeof question.content === 'object') {
            const nested = question.content.image || question.content.image_url || question.content.picture || question.content.img;
            if (typeof nested === 'string' && nested.trim()) return nested.trim();
        }
        return '';
    }

    getVocabQiReward(question) {
        const reward = question?.reward || {};
        const fromReward =
            Number(reward.energy || reward.exp || reward.qi || reward.spirit || 0);
        const fromQuestion =
            Number(question?.exp_gained || question?.exp || question?.reward_exp || 0);
        const resolved = fromReward || fromQuestion || 10;
        return Number.isFinite(resolved) && resolved > 0 ? Math.floor(resolved) : 10;
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
        const options = this.getVocabFlightLanes(question);
        const user = this.game.store.getState().user || {};
        const qi = Number(user.spirit_power || 0);
        const stageRemain = Math.max(1, this.questions.length - this.currentIndex);
        const targetWord = this.getVocabTargetWord(question) || 'lotus';
        const sceneImage = this.getVocabSceneImage(question);
        return `
            <div class="vocab-scene-box vocab-scene-herb">
                <div class="vocab-scene-hud">
                    <span>🌿 灵气 ${qi}</span>
                    <span>余题 ${stageRemain}</span>
                </div>
                <div class="vocab-scene-prompt">灵草识别：请选择对应单词</div>
                <div style="display:flex;align-items:center;justify-content:center;min-height:110px;margin-bottom:10px;border:1px solid rgba(212,168,67,0.28);border-radius:12px;background:rgba(255,255,255,0.06);overflow:hidden;">
                    ${sceneImage
                        ? `<img src="${this.game.ui.escapeHtml(sceneImage)}" alt="vocab-scene" style="width:100%;max-height:180px;object-fit:cover;object-position:center;">`
                        : `<span style="font-size:56px;line-height:1;">${this.getHerbEmoji(targetWord)}</span>`
                    }
                </div>
                <div class="vocab-garden-grid options-container" id="options-container">
                    ${options.map((item, idx) => `
                        <div class="option-btn vocab-farm-card" data-value="${this.game.ui.escapeHtml(item.key)}" data-lane-index="${idx}">
                            <span class="option-label vocab-card-tag">${this.game.ui.escapeHtml(item.key)}</span>
                            <span class="vocab-herb-emoji">${this.getHerbEmoji(item.text || item.key)}</span>
                            <span class="option-text">${this.game.ui.escapeHtml(item.text)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="vocab-pet-lane">
                    <div class="vocab-pet-avatar" id="vocab-pet-avatar">🐾🧑‍🌾</div>
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
        return `
            <div class="vocab-scene-box vocab-scene-flight">
                <div class="vocab-scene-hud">
                    <span>🗡️ 灵宠体力 ${qi}/100</span>
                    <span>灵草园</span>
                </div>
                <div class="vocab-scene-prompt">灵草采集：${this.game.ui.escapeHtml(targetWord)} 的中文释义是？</div>
                <div class="vocab-garden-grid options-container" id="options-container">
                    ${lanes.map((item, idx) => `
                        <div class="option-btn vocab-farm-card" data-value="${this.game.ui.escapeHtml(item.key)}" data-lane-index="${idx}">
                            <span class="flight-lane-tag">${this.game.ui.escapeHtml(item.lane)}</span>
                            <span class="flight-lane-banner vocab-farm-text">${this.game.ui.escapeHtml(item.text)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="vocab-pet-lane">
                    <div class="vocab-pet-avatar" id="vocab-pet-avatar">🐉</div>
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
            ? '<div class="vocab-alchemy-result">炼丹成功，获得回灵丹</div>'
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
                    this.applyVocabAdventureResult({
                        correct: true,
                        mode: 'alchemy',
                        targetWord,
                        qiGain: this.getVocabQiReward(question),
                    });
                    explainBox.style.display = 'block';
                    explainBox.innerHTML = `<div style="color:#9ee8bf;">炼丹成功，获得回灵丹</div>`;
                }
                this.updateAlchemyUi(panel, question, true);
                this.persistSession();
                return;
            }

            this.playAnswerFeedbackTone(false, 0);
            this.combo = 0;
            if (explainBox) {
                this.applyVocabAdventureResult({
                    correct: false,
                    mode: 'alchemy',
                    targetWord,
                    qiGain: 0,
                });
                explainBox.style.display = 'block';
                explainBox.innerHTML = `<div style="color:#ffb3b3;">丹炉不稳，再试一次</div>`;
            }
        });
    }

    renderGrammarModeBadge(mode) {
        if (mode === 'word_order') return '🧩 词序布阵：重排词块';
        if (mode === 'bug_hunt') return '🐞 语法捉虫：识别错误结构';
        return '🧭 阵法择位：语法选择题';
    }

    getGrammarPlayMode(question) {
        if (Array.isArray(question?.words) && question.words.length >= 2) return 'word_order';
        const rawMode = String(question?.mode || '').trim().toLowerCase();
        const bugModes = new Set(['bug', 'bug_hunt', 'error', 'error_fix', 'grammar_bug', '语法改错', '语法捉虫']);
        if (bugModes.has(rawMode) || String(question?.question || '').includes('改错')) return 'bug_hunt';
        return 'choice';
    }

    getGrammarRuneReward(question) {
        const reward = question?.reward || {};
        const fromReward = Number(reward.energy || reward.exp || reward.rune || reward.grammar || 0);
        const fromQuestion = Number(question?.exp_gained || question?.exp || question?.reward_exp || 0);
        const resolved = fromReward || fromQuestion || 8;
        return Number.isFinite(resolved) && resolved > 0 ? Math.floor(resolved) : 8;
    }

    getGrammarTargetSentence(question) {
        const candidates = [
            question?.answer,
            question?.target_sentence,
            question?.correct_text,
            question?.content?.answer,
            question?.content?.target_sentence,
            question?.content?.correct_text,
        ];
        for (const v of candidates) {
            if (typeof v === 'string' && v.trim()) return v.trim();
        }
        const byCorrectAnswer = String(question?.correct_answer || '').trim();
        if (byCorrectAnswer && /\s/.test(byCorrectAnswer)) return byCorrectAnswer;
        return '';
    }

    normalizeGrammarSentence(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[.!?]+$/, '');
    }

    buildGrammarRuleHint(question, sentence = '') {
        const explanation = String(question?.explanation || '').trim();
        const expected = this.getGrammarTargetSentence(question);
        const expectedLine = expected
            ? `<div style="color:#9ee8bf;">参考阵式：${this.game.ui.escapeHtml(expected)}</div>`
            : '';
        const userLine = sentence
            ? `<div style="color:#ffd6d2;">当前布阵：${this.game.ui.escapeHtml(sentence)}</div>`
            : '';
        const explainLine = explanation
            ? `<div style="margin-top:4px;">规则提示：${this.game.ui.escapeHtml(explanation)}</div>`
            : '<div style="margin-top:4px;">规则提示：请先确定主语，再放谓语，最后补齐宾语/状语。</div>';
        return `${userLine}${expectedLine}${explainLine}`;
    }

    renderGrammarQuestStatus(mode, question) {
        const objective = mode === 'word_order'
            ? '阵法盘重排词块，复原完整语序。'
            : (mode === 'bug_hunt'
                ? '定位语法错位点，修正阵眼。'
                : '选择正确语法位，点亮阵纹。');
        const action = mode === 'word_order'
            ? '点击词块入阵，确认后完成布阵。'
            : (mode === 'bug_hunt'
                ? '观察句式冲突，排除错误选项。'
                : '判断语法结构，选择正确阵位。');
        return `
            <div class="grammar-quest-panel">
                <div class="grammar-quest-row"><b>目标：</b>${this.game.ui.escapeHtml(objective)}</div>
                <div class="grammar-quest-row"><b>行动：</b>${this.game.ui.escapeHtml(action)}</div>
                <div class="grammar-quest-row"><b>阵法盘：</b>当前第 ${this.currentIndex + 1}/${this.questions.length} 题</div>
            </div>
        `;
    }

    renderGrammarChoiceOptions(question, mode) {
        const prompt = this.getQuestionStemText(question);
        return `
            <div class="grammar-pan">
                <div class="grammar-pan-title">阵法盘</div>
                <div class="question-text grammar-pan-prompt">${this.game.ui.escapeHtml(prompt)}</div>
                <div class="options-container" id="options-container">
                    ${this.renderOptions(question.options, null)}
                </div>
            </div>
        `;
    }

    getOrInitGrammarOrderState(question) {
        const key = this.getQuestionKey(question);
        if (this.grammarOrderStates[key]) return this.grammarOrderStates[key];
        const words = Array.isArray(question?.words)
            ? question.words.map((w) => String(w || '').trim()).filter(Boolean)
            : [];
        const shuffled = this.shuffleArray(words).map((word, idx) => ({ id: `${idx}-${word}`, word }));
        const state = { words: shuffled, selected: [] };
        this.grammarOrderStates[key] = state;
        return state;
    }

    getGrammarOrderSentenceFromState(state) {
        const map = new Map((state?.words || []).map((item) => [item.id, item.word]));
        return (state?.selected || []).map((id) => map.get(id) || '').join(' ').trim();
    }

    renderGrammarWordOrder(question, hasFeedback) {
        const target = this.getGrammarTargetSentence(question);
        this.getOrInitGrammarOrderState(question);
        return `
            <div class="grammar-pan" id="grammar-order-pan">
                <div class="grammar-pan-title">阵法盘</div>
                <div class="question-text grammar-pan-prompt">${this.game.ui.escapeHtml(this.getQuestionStemText(question) || '请将词块排成正确句子。')}</div>
                <div class="grammar-order-box">
                    <div class="grammar-order-tip">词序布阵：先点下方词块，再在答案槽回撤。</div>
                    <div class="grammar-order-slots" id="grammar-order-slots"></div>
                    <div class="grammar-order-pool" id="grammar-order-pool"></div>
                    <div class="grammar-order-actions">
                        <button class="btn btn-secondary btn-sm" id="grammar-order-clear-btn">清空阵法</button>
                        <button class="btn btn-primary btn-sm" id="grammar-order-submit-btn">${hasFeedback ? '布阵完成' : '确认布阵'}</button>
                    </div>
                    <div class="grammar-order-target">阵法目标：${this.game.ui.escapeHtml(target || '依据题意完成语序')}</div>
                </div>
            </div>
        `;
    }

    updateGrammarOrderUi(panel, question, hasFeedback) {
        const state = this.getOrInitGrammarOrderState(question);
        const slotsEl = panel.querySelector('#grammar-order-slots');
        const poolEl = panel.querySelector('#grammar-order-pool');
        const clearBtn = panel.querySelector('#grammar-order-clear-btn');
        const submitBtn = panel.querySelector('#grammar-order-submit-btn');
        if (!slotsEl || !poolEl || !clearBtn || !submitBtn) return;

        const wordMap = new Map(state.words.map((item) => [item.id, item.word]));
        const selectedWords = state.selected.map((id) => wordMap.get(id) || '').filter(Boolean);
        const used = new Set(state.selected);
        const remain = state.words.filter((item) => !used.has(item.id));

        slotsEl.innerHTML = selectedWords.length
            ? selectedWords.map((word, idx) => `<button class="grammar-slot filled" data-slot-index="${idx}" ${hasFeedback ? 'disabled' : ''}>${this.game.ui.escapeHtml(word)}</button>`).join('')
            : '<span class="grammar-slot-empty">点击下方词块加入阵法</span>';

        poolEl.innerHTML = hasFeedback
            ? '<div class="grammar-order-locked">阵法已锁定</div>'
            : remain.map((item) => `<button class="grammar-word-chip" data-word-id="${this.game.ui.escapeHtml(item.id)}">${this.game.ui.escapeHtml(item.word)}</button>`).join('');

        clearBtn.disabled = hasFeedback || state.selected.length === 0;
        const expectedWordsCount = Array.isArray(question?.words) ? question.words.length : 0;
        submitBtn.disabled = hasFeedback || state.selected.length !== expectedWordsCount;
    }

    bindGrammarWordOrder(panel, question, hasFeedback) {
        const state = this.getOrInitGrammarOrderState(question);
        const explainBox = panel.querySelector('#answer-explain-box');
        const nextBtn = panel.querySelector('#practice-next-btn');
        const expected = this.getGrammarTargetSentence(question);

        this.updateGrammarOrderUi(panel, question, hasFeedback);
        if (hasFeedback) {
            if (nextBtn) nextBtn.disabled = false;
            return;
        }

        panel.querySelector('#grammar-order-pool')?.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-word-id]');
            if (!btn || this._feedbackShown) return;
            const id = btn.dataset.wordId;
            if (!id || state.selected.includes(id)) return;
            state.selected.push(id);
            this.updateGrammarOrderUi(panel, question, false);
        });

        panel.querySelector('#grammar-order-slots')?.addEventListener('click', (event) => {
            const slot = event.target.closest('[data-slot-index]');
            if (!slot || this._feedbackShown) return;
            const idx = Number(slot.dataset.slotIndex);
            if (!Number.isInteger(idx) || idx < 0 || idx >= state.selected.length) return;
            state.selected.splice(idx, 1);
            this.updateGrammarOrderUi(panel, question, false);
        });

        panel.querySelector('#grammar-order-clear-btn')?.addEventListener('click', () => {
            if (this._feedbackShown) return;
            state.selected = [];
            this.updateGrammarOrderUi(panel, question, false);
        });

        panel.querySelector('#grammar-order-submit-btn')?.addEventListener('click', () => {
            if (this._feedbackShown) return;
            const sentence = this.getGrammarOrderSentenceFromState(state);
            const isCorrect = this.normalizeGrammarSentence(sentence) === this.normalizeGrammarSentence(expected);
            this.answers[question.question_id] = isCorrect ? (question.correct_answer || expected || sentence) : sentence;
            this.game.store.answerQuestion(question.question_id, this.answers[question.question_id]);

            if (isCorrect) {
                this.playAnswerFeedbackTone(true, this.combo + 1);
                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                if (this.combo >= 3) this.showComboFx(this.combo);
                const runeGain = this.getGrammarRuneReward(question);
                const zhouTianBonus = this.combo === 3 ? '<div style="margin-top:4px;color:#f4dfa1;">连成小周天，额外获得语法灵纹</div>' : '';
                if (explainBox) {
                    explainBox.style.display = 'block';
                    explainBox.innerHTML = `
                        <div style="color:#9ee8bf;">阵法点亮，获得语法灵纹 +${runeGain}</div>
                        ${zhouTianBonus}
                    `;
                }
            } else {
                this.playAnswerFeedbackTone(false, 0);
                this.combo = 0;
                if (explainBox) {
                    explainBox.style.display = 'block';
                    explainBox.innerHTML = `
                        <div style="color:#ffb3b3;">阵眼错位，请查看规则提示</div>
                        ${this.buildGrammarRuleHint(question, sentence)}
                    `;
                }
            }

            this._feedbackShown = true;
            this.updateGrammarOrderUi(panel, question, true);
            if (nextBtn) nextBtn.disabled = false;
            this.persistSession();
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
        this.clearVocabAutoNextTimer();
        const panel = document.getElementById('practice-panel');
        if (panel) panel.remove();
        this.stopSpeakingRecording(true);

        const submitLoadingText = this.currentType === 'listening' ? '提交听风试炼结果...' : '提交灵草...';
        this.game.ui.showLoading(submitLoadingText);

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
        const isListening = this.currentType === 'listening';
        const listeningLingyin = Number(data.total_exp || 0);
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
                ${isListening ? `<div class="reward-row"><span>清风灵音</span><span class="text-gold">+${listeningLingyin}</span></div>` : ''}
                ${isListening ? `<div class="reward-row"><span>listening 能力提升</span><span class="text-blue">${passed ? '已提升' : '继续积累中'}</span></div>` : ''}
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

    getListeningAudioUrl(question) {
        if (!question) return '';
        const candidates = [
            question.audioUrl,
            question.audio_url,
            question.audio,
            question.listening_audio,
            question.content?.audioUrl,
            question.content?.audio_url,
        ];
        for (const item of candidates) {
            if (typeof item === 'string' && item.trim()) return item.trim();
        }
        return '';
    }

    getListeningReplayLimit(question) {
        const raw = Number(
            question?.replay_limit
            || question?.listen_limit
            || question?.rewind_limit
            || question?.repeat_limit
            || question?.max_replay
            || 3
        );
        if (!Number.isFinite(raw) || raw <= 0) return 3;
        return Math.floor(raw);
    }

    getListeningReplayInfo(question) {
        const key = this.getQuestionKey(question);
        if (this.listeningReplayStates[key]) return this.listeningReplayStates[key];
        const max = this.getListeningReplayLimit(question);
        const state = { max, remaining: max };
        this.listeningReplayStates[key] = state;
        return state;
    }

    formatListeningRemaining(info) {
        if (!info) return '0';
        return String(Math.max(0, Number(info.remaining || 0)));
    }

    getListeningPlaybackHint(question) {
        return this.getListeningAudioUrl(question)
            ? '播放来源：题目音频'
            : '播放来源：系统朗读（兜底）';
    }

    updateListeningReplayUi(question) {
        const btn = document.getElementById('listening-play-btn');
        const count = document.getElementById('listening-replay-count');
        const hint = document.getElementById('listening-playback-hint');
        const info = this.getListeningReplayInfo(question);
        if (count) {
            count.textContent = `剩余回听：${this.formatListeningRemaining(info)}`;
        }
        if (hint) {
            hint.textContent = this.getListeningPlaybackHint(question);
        }
        if (btn) {
            btn.disabled = info.remaining <= 0;
        }
    }

    async playListeningWithFallback(question) {
        const replayInfo = this.getListeningReplayInfo(question);
        if (replayInfo.remaining <= 0) {
            this.game.ui.showHermesBubble('传音玉灵力已耗尽，本题回听次数已用完');
            this.updateListeningReplayUi(question);
            return;
        }
        const played = this.getListeningAudioUrl(question)
            ? await this.playListeningAudioByUrl(this.getListeningAudioUrl(question), question)
            : this.playListeningDialogue(question);
        if (!played) {
            return;
        }
        replayInfo.remaining = Math.max(0, replayInfo.remaining - 1);
        this.updateListeningReplayUi(question);
        this.persistSession();
    }

    async playListeningAudioByUrl(audioUrl, question) {
        try {
            if (!audioUrl) return false;
            if (!this.listeningAudioElement) {
                this.listeningAudioElement = new Audio();
                this.listeningAudioElement.preload = 'auto';
            }
            const audio = this.listeningAudioElement;
            audio.pause();
            audio.src = audioUrl;
            audio.currentTime = 0;
            await audio.play();
            return true;
        } catch {
            this.game.ui.showHermesBubble('音频播放失败，将尝试系统朗读');
            return this.playListeningDialogue(question);
        }
    }

    playListeningDialogue(question) {
        if (!('speechSynthesis' in window)) {
            this.game.ui.showHermesBubble('当前浏览器不支持语音朗读，请检查题目音频');
            return false;
        }
        const synth = window.speechSynthesis;
        synth.cancel();

        const voices = synth.getVoices();
        const femaleVoice = this.pickVoice(voices, 'female');
        const maleVoice = this.pickVoice(voices, 'male');
        const lines = this.getListeningDialogueLines(question);
        if (!lines.length) {
            this.game.ui.showHermesBubble('未找到可朗读的英文内容');
            return false;
        }

        lines.forEach((line) => {
            const utterance = new SpeechSynthesisUtterance(line.text);
            utterance.lang = 'en-US';
            utterance.rate = 0.92;
            utterance.pitch = line.gender === 'female' ? 1.15 : 0.9;
            utterance.voice = line.gender === 'female' ? femaleVoice : maleVoice;
            synth.speak(utterance);
        });
        return true;
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
        if (!material) return [];

        const rawLines = material
            .split(/\r?\n+/)
            .map((x) => x.trim())
            .filter(Boolean);
        if (!rawLines.length) return [];

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

    getListeningLingyinReward(question) {
        const reward = question?.reward || {};
        const fromReward = Number(reward.energy || reward.exp || reward.listening || reward.lingyin || 0);
        const fromQuestion = Number(question?.exp_gained || question?.exp || question?.reward_exp || 0);
        const resolved = fromReward || fromQuestion || 8;
        return Number.isFinite(resolved) && resolved > 0 ? Math.floor(resolved) : 8;
    }

    playSpeakingMaterial(question) {
        const text = this.getSpeakingMaterialText(question);
        if (!text) {
            this.game.ui.showHermesBubble('口语材料为空');
            return;
        }
        this.speakWord(text);
    }

    getSpeakingCheckinKey() {
        const userId = this.game.store.getState().user?.id || 'guest';
        return `levelup_speaking_checkin_${userId}`;
    }

    getTodayDateKey() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    getSpeakingTodayCount() {
        try {
            const raw = localStorage.getItem(this.getSpeakingCheckinKey());
            if (!raw) return 0;
            const data = JSON.parse(raw);
            const today = this.getTodayDateKey();
            if (data?.date !== today) return 0;
            return Number(data?.count || 0);
        } catch {
            return 0;
        }
    }

    registerSpeakingCheckin() {
        const today = this.getTodayDateKey();
        let count = 0;
        try {
            const raw = localStorage.getItem(this.getSpeakingCheckinKey());
            if (raw) {
                const data = JSON.parse(raw);
                if (data?.date === today) {
                    count = Number(data?.count || 0);
                }
            }
        } catch {
            // ignore parse issues and reset
        }
        count += 1;
        localStorage.setItem(this.getSpeakingCheckinKey(), JSON.stringify({ date: today, count }));
        return count;
    }

    markSpeakingFollowDone(question) {
        const qid = question?.question_id;
        if (!qid) return;
        if (this.answers[qid]) return;
        this.answers[qid] = question.correct_answer || 'FOLLOWED';
        this.game.store.answerQuestion(qid, this.answers[qid]);
        this._feedbackShown = true;
        const todayCount = this.registerSpeakingCheckin();
        const explainBox = document.getElementById('answer-explain-box');
        if (explainBox) {
            explainBox.style.display = 'block';
            explainBox.innerHTML = `
                <div style="color:#9ee8bf;">诵咒完成，获得灵音印记 +1</div>
                ${todayCount > 1 ? '<div style="margin-top:4px;color:#f4dfa1;">今日咒语熟练度提升</div>' : ''}
                ${this.speakingRecordings[qid] ? '<div style="margin-top:4px;color:var(--parchment-dark);">已保存本地录音，可回放复听。</div>' : '<div style="margin-top:4px;color:var(--parchment-dark);">当前为模拟跟读打卡，后续可接入语音识别评定。</div>'}
            `;
        }
        const nextBtn = document.getElementById('practice-next-btn');
        if (nextBtn) nextBtn.disabled = false;
        this.persistSession();
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
            this.game.ui.showHermesBubble('当前设备暂不支持录音，可先完成跟读打卡');
            return;
        }

        // 预留扩展点：后续可在此接入 Web Speech API / 语音识别服务做诵咒评分。

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
                if (btn) btn.textContent = '开始诵咒';
                this.persistSession();
                this.renderQuestion();
            };

            recorder.start();
            const statusEl = document.getElementById('speaking-record-status');
            if (statusEl) statusEl.textContent = '诵咒录音中...';
            const btn = document.getElementById('speaking-record-btn');
            if (btn) btn.textContent = '停止诵咒';
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
        this.clearVocabAutoNextTimer();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this.listeningAudioElement) {
            try {
                this.listeningAudioElement.pause();
                this.listeningAudioElement.currentTime = 0;
            } catch {
                // ignore audio cleanup failures
            }
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
            listeningReplayStates: this.currentType === 'listening' ? this.listeningReplayStates : {},
            vocabFlightRoutes: this.currentType === 'vocab' ? this.vocabFlightRoutes : {},
            vocabAdventureState: this.currentType === 'vocab' ? this.vocabAdventureState : null,
            grammarOrderStates: this.currentType === 'grammar' ? this.grammarOrderStates : {},
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
        this.listeningReplayStates = data.listeningReplayStates || {};
        this.vocabAlchemyStates = {};
        this.vocabFlightRoutes = data.vocabFlightRoutes || {};
        this.vocabAdventureState = data.vocabAdventureState || null;
        this.grammarOrderStates = data.grammarOrderStates || {};
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
