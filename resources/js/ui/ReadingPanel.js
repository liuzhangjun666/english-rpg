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
    }

    async showChapterList(level = 1) {
        this.currentLevel = level;
        this.game.ui.hideAllPanels();
        if (this.resumeSessionIfAvailable()) return;
        this.game.ui.showLoading('加载阅读副本...');

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
            <div class="panel-title">📚 阅读副本</div>
            <div class="reading-scene-row">
                <span class="reading-scene-tag">单关推进</span>
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
        this.game.ui.showLoading('进入阅读副本...');
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
        panel.innerHTML = `
            <div class="reading-immersive-bg" style="${this.getSceneCoverStyle(chapter.scene)}"></div>
            <div class="reading-immersive-mask"></div>
            <div class="reading-immersive-content">
                <div class="panel-title"><span class="reading-emblem">${this.getSceneEmblem(chapter.scene)}</span>${this.escapeHtml(chapter.title)}</div>
                <div class="reading-scene-hero-text-only"><span class="reading-emblem">${this.getSceneEmblem(chapter.scene)}</span>${this.escapeHtml(chapter.scene)}</div>
                <div class="reading-ambience">${this.escapeHtml(this.getSceneAmbience(chapter.scene))}</div>
                <div class="reading-meta">
                    <span>章节：${this.escapeHtml(chapter.id)}</span>
                    <span>场景：${this.escapeHtml(chapter.scene)}</span>
                    <span>难度：${this.renderDifficulty(chapter.difficulty)}</span>
                </div>
                <div class="reading-stage">
                    <div class="reading-stage-story">
                        <div class="reading-story-title">场景实录</div>
                        <div class="reading-scroll-frame">
                            <div class="reading-scroll-head">剧情卷轴</div>
                            <div class="reading-story-lines">
                                ${this.renderStoryLines(chapter.text)}
                            </div>
                        </div>
                        <div class="reading-vocabulary">线索词：${(chapter.vocabulary || []).map((v) => `<span class="reading-vocab-item">${this.escapeHtml(v)}</span>`).join('')}</div>
                    </div>
                    <div class="reading-stage-mission">
                        <div class="reading-mission-flavor" id="reading-pick-note">${this.escapeHtml(this.getTaskPrompt(activeTask, chapter.scene))}</div>
                        ${this.renderTask(activeTask, this.currentTaskIndex + 1, displayTasks.length, chapter.scene)}
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

                const note = panel.querySelector('#reading-pick-note');
                if (note) {
                    note.textContent = taskId.includes('-T1')
                        ? `你将「${value}」写入卷轴，灵光一闪。`
                        : `你做出判断：「${value}」。继续观察场景变化。`;
                }
                this.persistSession();
            });
        });

        document.getElementById('reading-task-back')?.addEventListener('click', () => this.showChapterList(chapter.level));
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

        const answers = tasks.map((task) => ({
            task_id: task.id,
            answer: String(this.answers[task.id] || ''),
        }));

        this.game.ui.showLoading('提交阅读结果...');
        const res = await this.game.api.post('/reading/submit-adventure', {
            chapter_id: chapter.id,
            answers,
        });
        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '提交失败');
            return;
        }

        const data = res.data || {};
        if (data.xp_gained) {
            this.game.store.updateUser({
                exp: (this.game.store.getState().user?.exp || 0) + data.xp_gained,
                spirit_stone: (this.game.store.getState().user?.spirit_stone || 0) + (data.spirit_stone_gained || 0),
            });
        }

        this.clearSession();
        this.showResult(data);
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
            <div class="reward-details">
                <div class="reward-row"><span>正确率</span><span class="${data.accuracy >= 60 ? 'text-gold' : 'text-red'}">${data.accuracy}%</span></div>
                <div class="reward-row"><span>修为奖励</span><span class="text-gold">+${data.xp_gained || 0}</span></div>
                <div class="reward-row"><span>灵石奖励</span><span class="text-gold">+${data.spirit_stone_gained || 0}</span></div>
                <div class="reward-row"><span>掉落道具</span><span class="text-blue">${this.escapeHtml(data.item_reward || '无')}</span></div>
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

    renderTask(task, index, total, scene) {
        const title = task.type === 'cloze' ? '线索补全' : '情境抉择';
        if (task.type === 'cloze') {
            return `
                <div class="reading-task-card reading-task-card--cloze reading-task-card-active">
                    <div class="reading-task-progress">事件 ${index}/${total}</div>
                    <div class="reading-task-title">任务${index} · ${title}</div>
                    <div class="reading-task-context">你在${this.escapeHtml(scene)}中发现一条线索卷轴，请补全关键词。</div>
                    <div class="reading-task-question">${this.escapeHtml(task.question)}</div>
                    <div class="reading-slot-wrap">
                        <span class="reading-slot-label">卷轴填槽</span>
                        <div class="reading-slot" data-task-id="${task.id}">____</div>
                    </div>
                    ${task.pos ? `<div class="reading-task-hint">词性提示：${this.escapeHtml(task.pos)}</div>` : ''}
                    <div class="reading-options reading-options--chips">
                        ${(task._displayOptions || []).map((op) => `<button class="reading-option reading-option-rune" data-task-id="${task.id}" data-value="${this.escapeHtml(op)}"><span class="reading-option-symbol">✦</span>${this.escapeHtml(op)}</button>`).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="reading-task-card reading-task-card--comprehension reading-task-card-active">
                <div class="reading-task-progress">事件 ${index}/${total}</div>
                <div class="reading-task-title">任务${index} · ${title}${task.reasoning ? '（推理）' : ''}</div>
                <div class="reading-task-context">师父在${this.escapeHtml(scene)}发问，做出你的现场判断。</div>
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
        if (!task) return `你已进入${scene}，准备开始任务。`;
        if (task.type === 'cloze') return `在${scene}中收集线索，把关键词写进卷轴。`;
        return `在${scene}中做出判断，选择最合理的行动解释。`;
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

        const options = task.type === 'comprehension'
            ? this.buildComprehensionOptions(task, scene)
            : (task.options || []);

        this.taskOptionCache[cacheKey] = options;
        return options;
    }

    restoreSelectionUI(panel, activeTask) {
        if (!panel || !activeTask?.id) return;
        const selectedValue = this.answers[activeTask.id];
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
