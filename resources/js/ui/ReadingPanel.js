import bgHall from '../../assets/images/bg_hall.png';
import sceneCangjingge from '../../assets/images/scene_cangjingge.png';
import sceneMijing from '../../assets/images/scene_mijing.png';
import sceneShilian from '../../assets/images/scene_shilian.png';
import sceneInitiation from '../../assets/images/scene_initiation2.png';

const SCENE_BACKGROUNDS = {
    宗门院落: bgHall,
    宗门食堂: sceneCangjingge,
    灵兽森林: sceneMijing,
    师门小故事: sceneInitiation,
    宗门后山探险: sceneShilian,
    宗门课堂: sceneCangjingge,
};

const SCENE_AMBIENCE = {
    宗门院落: '晨钟轻响，弟子列队，风过檐角。',
    宗门食堂: '蒸汽袅袅，木勺轻碰瓷碗，饭香四起。',
    灵兽森林: '林叶微颤，远处灵兽低鸣，脚步需更轻。',
    师门小故事: '烛火摇曳，旧卷翻页声里藏着答案。',
    宗门后山探险: '山雾起伏，石阶湿冷，每一步都需判断。',
    宗门课堂: '戒尺轻敲，黑板落笔，推理从细节开始。',
};

const SCENE_EMBLEM = {
    宗门院落: '院',
    宗门食堂: '食',
    灵兽森林: '森',
    师门小故事: '卷',
    宗门后山探险: '探',
    宗门课堂: '课',
};

const COMPREHENSION_DISTRACTORS = {
    宗门院落: ['因为钟声响起', '为了躲雨', '为了领取灵石'],
    宗门食堂: ['因为饭菜太冷', '因为有人迟到', '为了避开人群'],
    灵兽森林: ['因为风太大', '因为前方有迷雾', '因为灵兽在休息'],
    师门小故事: ['因为卷轴损坏', '因为师兄催促', '因为时辰太晚'],
    宗门后山探险: ['因为体力不足', '因为路线太短', '因为没有地图'],
    宗门课堂: ['因为抄错题目', '因为忘记时间', '因为同伴离开'],
};

export class ReadingPanel {
    constructor(game) {
        this.game = game;
        this.currentLevel = 1;
        this.currentChapter = null;
        this.answers = {};
        this.currentTaskIndex = 0;
        this.taskOptionCache = {};
        this.taskFeedback = {};
        this.repairedTaskSet = new Set();
    }

    async showChapterList(level = 1, shouldResume = true) {
        this.currentLevel = level;
        this.game.ui.hideAllPanels();
        if (shouldResume && this.resumeSessionIfAvailable()) return;
        this.game.ui.showLoading('加载藏经阁...');

        const res = await this.game.api.get(`/reading/chapters?level=${level}`);
        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '读取阅读副本失败');
            if (res.code === 'LEVEL_LOCKED' && level !== 1) {
                this.showChapterList(1);
                return;
            }
            this.game.enterHall();
            return;
        }

        const data = res.data || {};
        const chapters = data.chapters || [];
        const nextChapter = this.pickNextChapter(chapters);
        if (!nextChapter) {
            this.game.ui.showHermesBubble('当前暂无可用章节');
            this.game.enterHall();
            return;
        }
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'reading-panel';
        panel.style.maxWidth = '500px';

        panel.innerHTML = `
            <div class="panel-title">📖 藏经阁</div>
            <div class="reading-scene-row">
                <span class="reading-scene-tag">古籍试炼</span>
                <span class="reading-scene-tag">当前：${this.escapeHtml(nextChapter.scene)}</span>
            </div>
            <div class="reading-list" id="reading-list">
                <div class="reading-chapter-card ${nextChapter.completed ? 'completed' : ''}" data-chapter-id="${nextChapter.id}">
                    <div class="reading-chapter-head">
                        <span>${this.escapeHtml(nextChapter.id)}</span>
                        <span>${this.renderDifficulty(nextChapter.difficulty)}</span>
                    </div>
                    <div class="reading-chapter-title">${this.escapeHtml(nextChapter.title)}</div>
                    <div class="reading-chapter-foot">
                        <span>${nextChapter.task_count}任务</span>
                        <span>${nextChapter.completed ? '复习本关' : '开始本关'}</span>
                    </div>
                </div>
            </div>
            <button class="btn btn-secondary" id="reading-back-btn" style="margin-top:12px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        panel.querySelectorAll('.reading-chapter-card').forEach((el) => {
            el.addEventListener('click', () => {
                const chapterId = el.dataset.chapterId;
                if (!chapterId) return;
                this.startChapter(chapterId);
            });
        });

        document.getElementById('reading-back-btn')?.addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }

    async startChapter(chapterId) {
        this.game.ui.showLoading('进入藏经阁...');
        const res = await this.game.api.get(`/reading/chapters/${chapterId}`);
        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '读取章节失败');
            return;
        }

        this.currentChapter = res.data;
        this.answers = {};
        this.currentTaskIndex = 0;
        this.taskOptionCache = {};
        this.taskFeedback = {};
        this.repairedTaskSet = new Set();
        this.persistSession();
        this.renderChapter();
    }

    renderChapter() {
        const chapter = this.currentChapter;
        if (!chapter) return;

        const oldPanel = document.getElementById('reading-panel');
        if (oldPanel) oldPanel.remove();
        const oldTask = document.getElementById('reading-task-panel');
        if (oldTask) oldTask.remove();

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'reading-task-panel';
        panel.classList.add('reading-immersive-panel');
        panel.style.overflowY = 'auto';

        const displayTasks = (chapter.tasks || []).map((task) => {
            return { ...task, _displayOptions: this.getTaskOptions(task, chapter.scene) };
        });

        const activeTask = displayTasks[this.currentTaskIndex];
        const activeFeedback = activeTask ? this.taskFeedback[activeTask.id] : null;
        panel.innerHTML = `
            <div class="reading-immersive-bg" style="${this.getSceneCoverStyle(chapter.scene)}"></div>
            <div class="reading-immersive-mask"></div>
            <div class="reading-immersive-content">
                <div class="panel-title"><span class="reading-emblem">${this.getSceneEmblem(chapter.scene)}</span>藏经阁</div>
                <div class="reading-chapter-subtitle">${this.escapeHtml(chapter.title)}</div>
                <div class="reading-scene-hero-text-only"><span class="reading-emblem">${this.getSceneEmblem(chapter.scene)}</span>${this.escapeHtml(chapter.scene)}</div>
                <div class="reading-ambience">${this.escapeHtml(this.getSceneAmbience(chapter.scene))}</div>
                <div class="reading-meta">
                    <span>章节：${this.escapeHtml(chapter.id)}</span>
                    <span>场景：${this.escapeHtml(chapter.scene)}</span>
                    <span>难度：${this.renderDifficulty(chapter.difficulty)}</span>
                    <span>残卷修复：${this.repairedTaskSet.size}/${displayTasks.length}</span>
                </div>
                <div class="reading-stage">
                    <div class="reading-stage-story">
                        <div class="reading-story-title">古籍残卷</div>
                        <div class="reading-scroll-frame reading-scroll-remnant">
                            <div class="reading-scroll-head">残卷原文</div>
                            <div class="reading-story-lines">
                                ${this.renderStoryLines(chapter.text)}
                            </div>
                        </div>
                        <div class="reading-vocabulary">线索词：${(chapter.vocabulary || []).map((v) => `<span class="reading-vocab-item">${this.escapeHtml(v)}</span>`).join('')}</div>
                    </div>
                    <div class="reading-stage-mission">
                        <div class="reading-mission-flavor" id="reading-pick-note">${this.escapeHtml(this.getTaskPrompt(activeTask, chapter.scene))}</div>
                        <div class="reading-task-feedback ${activeFeedback ? (activeFeedback.isCorrect ? 'reading-task-feedback-correct' : 'reading-task-feedback-wrong') : ''}" id="reading-task-feedback">
                            ${activeFeedback ? this.escapeHtml(activeFeedback.message) : ''}
                        </div>
                        ${this.renderTask(activeTask, this.currentTaskIndex + 1, displayTasks.length, chapter.scene, chapter.text)}
                    </div>
                </div>
                <div class="reading-actions">
                    <button class="btn btn-secondary" id="reading-task-back">返回章节列表</button>
                    <div class="reading-action-right">
                        <button class="btn btn-secondary" id="reading-task-prev" ${this.currentTaskIndex === 0 ? 'disabled' : ''}>上一个事件</button>
                        <button class="btn btn-secondary" id="reading-task-next" ${this.currentTaskIndex >= displayTasks.length - 1 ? 'disabled' : ''}>下一个事件</button>
                        <button class="btn btn-primary" id="reading-task-submit">提交阅读任务</button>
                    </div>
                </div>
            </div>
        `;
        this.game.ui.overlay.appendChild(panel);
        this.restoreSelectionUI(panel, activeTask);

        const taskMap = new Map(displayTasks.map((task) => [String(task.id), task]));
        panel.querySelectorAll('.reading-option').forEach((el) => {
            el.addEventListener('click', () => {
                const taskId = el.dataset.taskId;
                const value = el.dataset.value || '';
                if (!taskId) return;
                this.answers[taskId] = value;

                panel.querySelectorAll(`.reading-option[data-task-id="${taskId}"]`).forEach((node) => node.classList.remove('selected'));
                el.classList.add('selected');

                const slot = panel.querySelector(`.reading-slot[data-task-id="${taskId}"]`);
                if (slot) {
                    slot.textContent = value;
                    slot.classList.add('filled');
                }

                const task = taskMap.get(String(taskId));
                const isCorrect = this.isTaskAnswerCorrect(task, value);
                const feedbackMessage = this.getTaskFeedbackMessage(isCorrect);
                this.taskFeedback[taskId] = {
                    isCorrect: Boolean(isCorrect),
                    message: feedbackMessage,
                };
                if (isCorrect) this.repairedTaskSet.add(taskId);
                else this.repairedTaskSet.delete(taskId);
                this.updateTaskFeedbackUI(panel, taskId);

                const note = panel.querySelector('#reading-pick-note');
                if (note) {
                    note.textContent = feedbackMessage;
                }
                this.persistSession();
            });
        });

        document.getElementById('reading-task-back')?.addEventListener('click', () => this.showChapterList(chapter.level, false));
        document.getElementById('reading-task-prev')?.addEventListener('click', () => {
            this.currentTaskIndex = Math.max(0, this.currentTaskIndex - 1);
            this.persistSession();
            this.renderChapter();
        });
        document.getElementById('reading-task-next')?.addEventListener('click', () => {
            this.currentTaskIndex = Math.min(displayTasks.length - 1, this.currentTaskIndex + 1);
            this.persistSession();
            this.renderChapter();
        });
        document.getElementById('reading-task-submit')?.addEventListener('click', () => this.submitChapter());
    }

    async submitChapter() {
        const chapter = this.currentChapter;
        if (!chapter) return;

        const tasks = chapter.tasks || [];
        const missing = tasks.find((task) => !this.answers[task.id] || String(this.answers[task.id]).trim() === '');
        if (missing) {
            this.game.ui.showHermesBubble('请先完成所有任务再提交');
            return;
        }

        const correctCount = tasks.filter((task) => this.isTaskAnswerCorrect(task, this.answers[task.id])).length;
        const accuracy = tasks.length > 0 ? Math.round((correctCount / tasks.length) * 100) : 0;
        const passed = accuracy >= 60;

        if (passed && chapter.branch_options && chapter.branch_options.length > 0) {
            this.showBranchChoiceUI(chapter, tasks);
            return;
        }

        this.executeSubmit(chapter, tasks, null);
    }

    showBranchChoiceUI(chapter, tasks) {
        const panel = document.getElementById('reading-task-panel');
        if (panel) panel.style.display = 'none';

        // 创建模糊遮罩层以聚焦注意力
        const mask = document.createElement('div');
        mask.className = 'fate-overlay-mask';
        mask.id = 'reading-branch-mask';
        this.game.ui.overlay.appendChild(mask);

        const branchPanel = document.createElement('div');
        branchPanel.className = 'panel fate-branch-panel';
        branchPanel.id = 'reading-branch-panel';
        branchPanel.innerHTML = `
            <div class="panel-title fate-panel-title">命运岔路口</div>
            <div class="fate-panel-intro">
                你在残卷中发现了隐藏的英文符文，你的选择将决定未来的修行路线。
            </div>
            <div class="branch-options-container">
                ${chapter.branch_options.map(opt => {
                    let typeClass = '';
                    if (opt.id.includes('guardian')) typeClass = 'branch-guardian';
                    else if (opt.id.includes('explorer')) typeClass = 'branch-explorer';
                    else if (opt.id.includes('heretic')) typeClass = 'branch-heretic';

                    return `
                        <div class="branch-option-card ${typeClass}" data-branch-id="${opt.id}">
                            <div class="branch-card-label">${this.escapeHtml(opt.label)}</div>
                            <div class="branch-card-hint">${this.escapeHtml(opt.hint)}</div>
                            <div class="branch-card-reward">
                                奖励预测：灵气+${opt.reward_delta?.lingqi || 0} 剧情钥匙+${opt.reward_delta?.story_keys || 0} 道心+${opt.reward_delta?.daoxin || 0}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <button class="btn btn-secondary" id="reading-branch-back" style="margin-top: 20px;">重新考虑（返回阅卷）</button>
        `;
        this.game.ui.overlay.appendChild(branchPanel);

        branchPanel.querySelectorAll('.branch-option-card').forEach(card => {
            card.addEventListener('click', async () => {
                const branchId = card.dataset.branchId;
                if (!branchId) return;

                const preSync = await this.game.submitStoryChoice({
                    chapter_id: chapter.id,
                    node_id: branchId,
                    selected_branch_id: branchId,
                });
                if (!preSync) {
                    this.game.ui.showHermesBubble('分支已选择，正在排队同步到云端...');
                }

                branchPanel.remove();
                mask.remove();
                if (panel) panel.style.display = 'block';
                this.executeSubmit(chapter, tasks, branchId);
            });
        });

        document.getElementById('reading-branch-back')?.addEventListener('click', () => {
            branchPanel.remove();
            mask.remove();
            if (panel) panel.style.display = 'block';
        });
    }

    async executeSubmit(chapter, tasks, selectedBranchId, demonTrialAnswers = null, skipDemonTrial = false) {
        const answers = tasks.map((task) => ({
            task_id: task.id,
            answer: String(this.answers[task.id] || ''),
        }));

        this.game.ui.showLoading('提交阅读结果...');
        const payload = {
            chapter_id: chapter.id,
            answers,
        };
        if (selectedBranchId) {
            payload.selected_branch_id = selectedBranchId;
        }
        if (Array.isArray(demonTrialAnswers) && demonTrialAnswers.length > 0) {
            payload.demon_trial_answers = demonTrialAnswers;
        }
        if (skipDemonTrial) {
            payload.skip_demon_trial = true;
        }

        const res = await this.game.api.post('/reading/submit-adventure', payload);
        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '提交失败');
            return;
        }

        const data = res.data || {};
        if (data.need_demon_trial) {
            this.showDemonTrialPanel(data, chapter, tasks, selectedBranchId);
            return;
        }

        if (data.xp_gained) {
            this.game.store.updateUser({
                exp: (this.game.store.getState().user?.exp || 0) + data.xp_gained,
                spirit_stone: (this.game.store.getState().user?.spirit_stone || 0) + (data.spirit_stone_gained || 0),
            });
        }
        
        this.game.onReadingAdventureCompleted(data, chapter.id);
        this.game.scheduleStorySync('reading-submit');

        this.clearSession();
        this.showResult(data);
    }

    showDemonTrialPanel(data, chapter, tasks, selectedBranchId) {
        const questions = Array.isArray(data.demon_trial_questions) ? data.demon_trial_questions : [];
        if (!questions.length) {
            this.game.ui.showHermesBubble('未获取到心魔题，已跳过问心试炼');
            this.executeSubmit(chapter, tasks, selectedBranchId, []);
            return;
        }

        const old = document.getElementById('reading-demon-trial-panel');
        if (old) old.remove();

        const panel = document.createElement('div');
        panel.className = 'panel reading-demon-trial-panel';
        panel.id = 'reading-demon-trial-panel';

        panel.innerHTML = `
            <div class="panel-title">问心试炼 · 心魔破除</div>
            <div class="reading-demon-trial-tip">
                问心路线已触发。请完成 ${questions.length} 道近期错题，全部答对才可破除心魔并解锁隐藏命盘。
            </div>
            <div id="reading-demon-questions" class="reading-demon-question-list"></div>
            <div class="reading-actions reading-demon-actions">
                <button class="btn btn-secondary" id="reading-demon-cancel">取消问心（回常规节点）</button>
                <button class="btn btn-primary" id="reading-demon-submit">提交心魔试炼</button>
            </div>
        `;

        this.game.ui.overlay.appendChild(panel);
        const list = panel.querySelector('#reading-demon-questions');
        if (list) {
            list.innerHTML = questions.map((q, idx) => this.renderDemonQuestion(q, idx + 1)).join('');
            list.querySelectorAll('.reading-demon-option').forEach((node) => {
                node.addEventListener('click', () => {
                    const qid = node.dataset.questionId;
                    if (!qid) return;
                    list.querySelectorAll(`.reading-demon-option[data-question-id="${qid}"]`).forEach((el) => {
                        el.classList.remove('selected');
                    });
                    node.classList.add('selected');
                });
            });
        }

        panel.querySelector('#reading-demon-submit')?.addEventListener('click', async () => {
            const demonAnswers = questions.map((q) => {
                const qid = String(q.question_id || '');
                const selected = panel.querySelector(`.reading-demon-option.selected[data-question-id="${qid}"]`);
                return {
                    question_id: qid,
                    answer: selected?.dataset.value || '',
                };
            });

            const missing = demonAnswers.find((item) => !item.answer || !String(item.answer).trim());
            if (missing) {
                this.game.ui.showHermesBubble('请先完成全部心魔题再提交');
                return;
            }

            panel.remove();
            await this.executeSubmit(chapter, tasks, selectedBranchId, demonAnswers);
        });

        panel.querySelector('#reading-demon-cancel')?.addEventListener('click', async () => {
            panel.remove();
            await this.executeSubmit(chapter, tasks, selectedBranchId, [], true);
        });
    }

    renderDemonQuestion(question, index) {
        const stem = this.escapeHtml(question.question || `心魔题 ${index}`);
        const qid = this.escapeHtml(question.question_id || `Q${index}`);
        const options = this.normalizeDemonOptions(question.options);
        return `
            <div class="reading-demon-card">
                <div class="reading-demon-card-index">第 ${index} 题</div>
                <div class="reading-demon-card-question">${stem}</div>
                <div class="reading-demon-option-group">
                    ${options.map((opt) => `
                        <button class="reading-demon-option" data-question-id="${qid}" data-value="${this.escapeHtml(opt.value)}">
                            <span class="reading-demon-option-label">${this.escapeHtml(opt.label)}</span>
                            <span>${this.escapeHtml(opt.text)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    normalizeDemonOptions(options) {
        if (Array.isArray(options)) {
            if (options.length && typeof options[0] === 'object') {
                return options.map((item, idx) => ({
                    label: item.label || String.fromCharCode(65 + idx),
                    text: item.text || item.value || '',
                    value: item.value || item.label || String.fromCharCode(65 + idx),
                }));
            }
            return options.map((text, idx) => ({
                label: String.fromCharCode(65 + idx),
                text: String(text),
                value: String.fromCharCode(65 + idx),
            }));
        }
        if (options && typeof options === 'object') {
            return Object.keys(options).map((key) => ({
                label: key,
                text: String(options[key]),
                value: key,
            }));
        }
        return [];
    }

    showResult(data) {
        const panel = document.getElementById('reading-task-panel');
        if (panel) panel.remove();

        const popup = document.createElement('div');
        popup.className = `reward-popup ${data.passed ? 'reward-pass' : 'reward-fail'}`;
        popup.id = 'reading-result-popup';
        popup.innerHTML = `
            <div class="reward-icon">${data.passed ? '📜' : '🔁'}</div>
            <div class="reward-title">${data.passed ? '阅读通关' : '继续修炼'}</div>
            <div class="reading-result-banner">本层藏经阁试炼完成</div>
            <div class="reward-details">
                <div class="reward-row"><span>正确率</span><span class="${data.accuracy >= 60 ? 'text-gold' : 'text-red'}">${data.accuracy}%</span></div>
                <div class="reward-row"><span>修为奖励</span><span class="text-gold">+${data.xp_gained || 0}</span></div>
                <div class="reward-row"><span>灵石奖励</span><span class="text-gold">+${data.spirit_stone_gained || 0}</span></div>
                <div class="reward-row"><span>掉落道具</span><span class="text-blue">${this.escapeHtml(data.item_reward || '无')}</span></div>
                ${data.demon_trial ? `<div class="reward-row"><span>问心试炼</span><span class="${data.demon_trial.passed ? 'text-gold' : 'text-red'}">${data.demon_trial.passed ? '心魔破除' : '退回常规节点'}</span></div>` : ''}
                ${data.selected_branch_id ? `<div class="reward-row"><span>命盘变动</span><span class="text-gold">隐藏分支已记录</span></div>` : ''}
            </div>
            <div class="reward-actions">
                <button class="btn btn-primary" id="reading-result-continue">继续阅读</button>
                <button class="btn btn-secondary" id="reading-result-back">返回宗门</button>
            </div>
        `;
        this.game.ui.overlay.appendChild(popup);

        document.getElementById('reading-result-continue')?.addEventListener('click', () => {
            popup.remove();
            this.showChapterList(this.currentLevel);
        });
        document.getElementById('reading-result-back')?.addEventListener('click', () => {
            popup.remove();
            this.game.enterHall();
        });
    }

    renderTask(task, index, total, scene, chapterText = '') {
        const mode = this.getTaskMode(task);
        const title = mode === 'cloze' ? '残卷填词' : (mode === 'sentence_restore' ? '残卷修复' : '语义判读');
        if (mode === 'cloze') {
            return `
                <div class="reading-task-card reading-task-card--cloze reading-task-card-active">
                    <div class="reading-task-progress">机关 ${index}/${total}</div>
                    <div class="reading-task-title">机关问题${index} · ${title}</div>
                    <div class="reading-task-context">你在${this.escapeHtml(scene)}中发现古籍缺词，请补全关键词。</div>
                    <div class="reading-task-question">${this.escapeHtml(task.question)}</div>
                    <div class="reading-slot-wrap">
                        <span class="reading-slot-label">残卷填槽</span>
                        <div class="reading-slot" data-task-id="${task.id}">____</div>
                    </div>
                    ${task.pos ? `<div class="reading-task-hint">词性提示：${this.escapeHtml(task.pos)}</div>` : ''}
                    <div class="reading-options reading-options--chips">
                        ${(task._displayOptions || []).map((op) => `<button class="reading-option reading-option-rune" data-task-id="${task.id}" data-value="${this.escapeHtml(op)}"><span class="reading-option-symbol">✦</span>${this.escapeHtml(op)}</button>`).join('')}
                    </div>
                </div>
            `;
        }

        if (mode === 'sentence_restore') {
            return `
                <div class="reading-task-card reading-task-card--restore reading-task-card-active">
                    <div class="reading-task-progress">机关 ${index}/${total}</div>
                    <div class="reading-task-title">机关问题${index} · ${title}</div>
                    <div class="reading-task-context">观察古籍缺口，从候选句中选择正确句子修复残卷。</div>
                    <div class="reading-task-question">${this.escapeHtml(task.question || '请补全缺失句子')}</div>
                    <div class="reading-restore-passage">${this.escapeHtml(this.getSentenceRestorePassage(task, chapterText))}</div>
                    <div class="reading-task-hint">缺失位置：<span class="reading-restore-gap">${this.escapeHtml(task.blank_hint || '【___】')}</span></div>
                    <div class="reading-options reading-options--choices">
                        ${(task._displayOptions || []).map((op, idx) => `
                            <button class="reading-option reading-option-choice" data-task-id="${task.id}" data-value="${this.escapeHtml(op)}">
                                <span class="reading-choice-index">${String.fromCharCode(65 + idx)}</span>
                                <span>${this.escapeHtml(op)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="reading-task-card reading-task-card--comprehension reading-task-card-active">
                <div class="reading-task-progress">机关 ${index}/${total}</div>
                <div class="reading-task-title">机关问题${index} · ${title}${task.reasoning ? '（推理）' : ''}</div>
                <div class="reading-task-context">在${this.escapeHtml(scene)}解读语义线索，选择最合理答案。</div>
                <div class="reading-task-question">${this.escapeHtml(task.question)}</div>
                <div class="reading-options reading-options--choices">
                    ${(task._displayOptions || []).map((op, idx) => `
                        <button class="reading-option reading-option-choice" data-task-id="${task.id}" data-value="${this.escapeHtml(op)}">
                            <span class="reading-choice-index">${String.fromCharCode(65 + idx)}</span>
                            <span class="reading-choice-tag">${this.getChoiceTag(idx)}</span>
                            <span>${this.escapeHtml(op)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderStoryLines(text) {
        return String(text || '')
            .split('.')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, idx) => `<div class="reading-story-line ${idx % 2 ? 'npc' : 'player'}">${this.escapeHtml(line)}.</div>`)
            .join('');
    }

    groupByScene(chapters) {
        return chapters.reduce((map, chapter) => {
            const scene = chapter.scene || '其他';
            if (!map[scene]) map[scene] = [];
            map[scene].push(chapter);
            return map;
        }, {});
    }

    renderSceneGroup(scene, chapters) {
        return `
            <div class="reading-scene-group">
                <div class="reading-scene-title-banner" style="${this.getSceneCoverStyle(scene)}">
                    <div class="reading-scene-title-mask"></div>
                    <div class="reading-scene-title">${this.escapeHtml(scene)}</div>
                </div>
                <div class="reading-scene-grid">
                    ${chapters.map((chapter) => `
                        <div class="reading-chapter-card ${chapter.completed ? 'completed' : ''}" data-chapter-id="${chapter.id}">
                            <div class="reading-chapter-head">
                                <span>${this.escapeHtml(chapter.id)}</span>
                                <span>${this.renderDifficulty(chapter.difficulty)}</span>
                            </div>
                            <div class="reading-chapter-title">${this.escapeHtml(chapter.title)}</div>
                            <div class="reading-chapter-foot">
                                <span>${chapter.task_count}任务</span>
                                <span>${chapter.completed ? '已通关' : '未通关'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderDifficulty(level) {
        if (level === 1) return '入门';
        if (level === 2) return '进阶';
        return '突破';
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str ?? '');
        return div.innerHTML;
    }

    getSceneCoverStyle(scene) {
        const url = this.getSceneBackground(scene);
        return `background-image: linear-gradient(135deg, rgba(10,15,35,0.55), rgba(10,15,35,0.75)), url('${url}');`;
    }

    getSceneBackground(scene) {
        return SCENE_BACKGROUNDS[scene] || bgHall;
    }

    getSceneAmbience(scene) {
        return SCENE_AMBIENCE[scene] || '风声掠过，你在场景中阅读与作答。';
    }

    getSceneEmblem(scene) {
        return SCENE_EMBLEM[scene] || '🎮';
    }

    getChoiceTag(index) {
        return ['稳妥', '观察', '推理', '果断'][index] || '判断';
    }

    getTaskPrompt(task, scene) {
        if (!task) return `你已进入${scene}，准备破解机关问题。`;
        const mode = this.getTaskMode(task);
        if (mode === 'cloze') return `在${scene}中收集线索，把关键词填回古籍残卷。`;
        if (mode === 'sentence_restore') return `残卷出现缺口，从候选句中选择正确句子修复古籍。`;
        return `请根据原文线索，在${scene}中解开当前机关问题。`;
    }

    pickNextChapter(chapters) {
        if (!chapters.length) return null;
        const pending = chapters.find((c) => !c.completed);
        return pending || chapters[chapters.length - 1];
    }

    getSessionKey() {
        const userId = this.game.store.getState().user?.id || 'guest';
        return `levelup_session_reading_${userId}`;
    }

    persistSession() {
        if (!this.currentChapter?.id) return;
        const payload = {
            currentLevel: this.currentLevel,
            chapter: this.currentChapter,
            currentTaskIndex: this.currentTaskIndex,
            answers: this.answers,
            taskOptionCache: this.taskOptionCache,
            taskFeedback: this.taskFeedback,
            repairedTaskIds: Array.from(this.repairedTaskSet),
            ts: Date.now(),
        };
        localStorage.setItem(this.getSessionKey(), JSON.stringify(payload));
    }

    loadSession() {
        try {
            const raw = localStorage.getItem(this.getSessionKey());
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data?.chapter?.id) return null;
            return data;
        } catch {
            return null;
        }
    }

    resumeSessionIfAvailable() {
        const data = this.loadSession();
        if (!data) return false;

        this.currentLevel = data.currentLevel || 1;
        this.currentChapter = data.chapter;
        this.currentTaskIndex = Math.max(0, Math.min(data.currentTaskIndex || 0, (this.currentChapter.tasks?.length || 1) - 1));
        this.answers = data.answers || {};
        this.taskOptionCache = data.taskOptionCache || {};
        this.taskFeedback = data.taskFeedback || {};
        this.repairedTaskSet = new Set(data.repairedTaskIds || []);
        this.renderChapter();
        return true;
    }

    clearSession() {
        localStorage.removeItem(this.getSessionKey());
    }

    getTaskOptions(task, scene) {
        if (!task?.id) return [];
        const cacheKey = task.id;
        if (Array.isArray(this.taskOptionCache[cacheKey]) && this.taskOptionCache[cacheKey].length) {
            return this.taskOptionCache[cacheKey];
        }

        const mode = this.getTaskMode(task);
        let options = [];
        if (mode === 'comprehension') {
            options = this.buildComprehensionOptions(task, scene);
        } else if (mode === 'sentence_restore') {
            options = task.candidates || task.sentences || task.options || [];
        } else {
            options = task.options || [];
        }

        this.taskOptionCache[cacheKey] = options;
        return options;
    }

    restoreSelectionUI(panel, activeTask) {
        if (!panel || !activeTask?.id) return;
        const selectedValue = this.answers[activeTask.id];
        this.updateTaskFeedbackUI(panel, activeTask.id);
        if (!selectedValue) return;

        const option = Array.from(panel.querySelectorAll(`.reading-option[data-task-id="${activeTask.id}"]`))
            .find((el) => (el.dataset.value || '') === String(selectedValue));
        if (option) option.classList.add('selected');

        const slot = panel.querySelector(`.reading-slot[data-task-id="${activeTask.id}"]`);
        if (slot) {
            slot.textContent = selectedValue;
            slot.classList.add('filled');
        }
    }

    updateTaskFeedbackUI(panel, taskId) {
        const feedbackNode = panel.querySelector('#reading-task-feedback');
        const feedback = this.taskFeedback[taskId];
        if (!feedbackNode) return;
        if (!feedback) {
            feedbackNode.textContent = '';
            feedbackNode.classList.remove('reading-task-feedback-correct', 'reading-task-feedback-wrong');
            return;
        }
        feedbackNode.textContent = feedback.message || '';
        feedbackNode.classList.toggle('reading-task-feedback-correct', Boolean(feedback.isCorrect));
        feedbackNode.classList.toggle('reading-task-feedback-wrong', !feedback.isCorrect);
    }

    getTaskMode(task) {
        if (task?.mode) return String(task.mode);
        if (task?.type) return String(task.type);
        return 'comprehension';
    }

    getSentenceRestorePassage(task, chapterText = '') {
        return task?.passage_with_blank
            || task?.text_with_blank
            || task?.article_with_blank
            || task?.context_with_blank
            || task?.question_with_blank
            || task?.masked_text
            || String(chapterText || '').replace(/\s+$/, '') + '【___】';
    }

    isTaskAnswerCorrect(task, selectedValue) {
        if (!task) return false;
        const answer = task.answer;
        const normalizedValue = this.normalize(selectedValue);
        if (Array.isArray(answer)) {
            return answer.some((item) => this.normalize(item) === normalizedValue);
        }
        return this.normalize(answer) === normalizedValue;
    }

    getTaskFeedbackMessage(isCorrect) {
        return isCorrect
            ? '机关解开，古籍残卷修复 +1'
            : '机关未解，请回到原文寻找线索';
    }

    buildComprehensionOptions(task, scene) {
        const answer = this.getCanonicalAnswer(task.answer);
        const distractors = [...(COMPREHENSION_DISTRACTORS[scene] || []), '因为经验不足', '为了更快完成任务'];
        const normalizedAnswer = this.normalize(answer);
        const pool = distractors.filter((d) => this.normalize(d) !== normalizedAnswer).slice(0, 3);
        const options = [answer, ...pool];
        return this.shuffle(options);
    }

    getCanonicalAnswer(answer) {
        if (Array.isArray(answer) && answer.length > 0) {
            return String(answer[0]);
        }
        return String(answer ?? '');
    }

    normalize(v) {
        return String(v).trim().toLowerCase();
    }

    shuffle(arr) {
        const clone = [...arr];
        for (let i = clone.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [clone[i], clone[j]] = [clone[j], clone[i]];
        }
        return clone;
    }
}
