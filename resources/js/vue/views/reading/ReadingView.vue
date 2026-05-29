<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="profile-overlay cultivation-theme" @click.self="handleOverlayClick">
        
        <!-- 容器宽度视状态而定 -->
        <div class="profile-container" :class="{ 'immersive-mode': step === 'reading' }" :style="{ maxWidth: containerWidth }">
          
          <div class="profile-header" v-if="step !== 'reading'">
            <div class="card-header" style="font-size: 20px; text-align: center; width: 100%;">
              {{ headerTitle }}
            </div>
            <button class="profile-close-btn" @click="closePanel" v-if="['list', 'result'].includes(step)">返回宗门</button>
          </div>

          <div class="profile-body" style="flex-direction: column; position: relative;" :style="{ padding: step === 'reading' ? '0' : '20px' }" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.8)">
            
            <!-- 1. 关卡列表 -->
            <div v-if="step === 'list'" class="reading-section">
              <div class="reading-scene-row" style="display:flex; justify-content:space-between; margin-bottom:16px;">
                  <span class="reading-scene-tag" style="background:rgba(212,168,67,0.2); color:#d4a843; padding:4px 8px; border-radius:4px; font-size:12px;">古籍试炼</span>
                  <span class="reading-scene-tag" style="color:#c8b685; font-size:13px;">当前：{{ nextChapter?.scene || '未知' }}</span>
              </div>
              <div class="reading-list" style="max-height: 400px; overflow-y: auto;">
                  <div v-for="chapter in chapters" :key="chapter.id" 
                       class="reading-chapter-card" :class="{ 'completed': chapter.completed }"
                       @click="openEntryConfirm(chapter)">
                      <div class="reading-chapter-head" style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px; color:#c8b685;">
                          <span>{{ chapter.id }}</span>
                          <span style="color:#d4a843;">{{ renderDifficulty(chapter.difficulty) }}</span>
                      </div>
                      <div class="reading-chapter-title" style="font-size:15px; color:#f7f3e8; font-weight:bold; margin-bottom:12px;">{{ chapter.title }}</div>
                      <div class="reading-chapter-foot" style="display:flex; justify-content:space-between; font-size:12px; color:#8a8a8a;">
                          <span>{{ chapter.task_count }} 任务</span>
                          <span :style="{ color: chapter.completed ? '#4ec07a' : '#d4a843' }">{{ chapter.completed ? '复习本关' : '开始本关' }}</span>
                      </div>
                  </div>
              </div>
            </div>

            <!-- 2. 进入确认 (灵力消耗) -->
            <div v-if="step === 'entry_confirm'" class="reading-section" style="text-align: center;">
              <div style="color:#c8b685; font-size:14px; line-height:2; margin:12px 0;">
                  <div>章节：<span style="color:#f7f3e8">{{ currentChapter?.id }}</span></div>
                  <div>场景：<span style="color:#f7f3e8">{{ currentChapter?.scene }}</span></div>
                  <div>任务数：<span style="color:#f7f3e8">{{ (currentChapter?.tasks || []).length }} 题</span></div>
                  <div style="margin-top:12px; font-size: 16px;">
                    消耗灵力：<span style="color:#4a90d9; font-weight:bold;">💧 {{ Number(currentChapter?.spirit_cost || 5) }}</span>
                  </div>
                  <div style="margin-top:8px; font-size:12px;">当前灵力：💧 {{ currentSpirit }}</div>
              </div>
              <button class="el-button full-btn" style="margin-top:16px;" @click="startChapter">开始阅读</button>
              <button class="el-button full-btn" style="margin-top:8px; background:rgba(255,255,255,0.05); border-color:transparent;" @click="step = 'list'">返回</button>
            </div>

            <!-- 3. 沉浸式阅读区 -->
            <div v-if="step === 'reading'" class="reading-immersive-panel" style="position:relative; width:100%; min-height:500px; display:flex; flex-direction:column; overflow:hidden;">
              <div class="reading-immersive-bg" :style="getSceneCoverStyle(currentChapter?.scene)"></div>
              <div class="reading-immersive-mask" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(10,15,35,0.85); z-index:1;"></div>
              
              <div class="reading-immersive-content" style="position:relative; z-index:2; padding:20px; display:flex; flex-direction:column; flex:1; height:100%; overflow-y:auto;">
                 <div class="panel-title" style="margin-bottom:8px;"><span class="reading-emblem">{{ getSceneEmblem(currentChapter?.scene) }}</span> 藏经阁</div>
                 <div class="reading-chapter-subtitle" style="font-size:18px; color:#f7f3e8; font-weight:bold; margin-bottom:8px;">{{ currentChapter?.title }}</div>
                 <div class="reading-scene-hero-text-only" style="color:#c8b685; font-size:13px; margin-bottom:4px;">
                    <span class="reading-emblem">{{ getSceneEmblem(currentChapter?.scene) }}</span> {{ currentChapter?.scene }}
                 </div>
                 <div class="reading-ambience" style="font-style:italic; color:#8a8a8a; font-size:12px; margin-bottom:16px;">{{ getSceneAmbience(currentChapter?.scene) }}</div>
                 
                 <div class="reading-meta" style="display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:#d4a843; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid rgba(212,168,67,0.2);">
                    <span>章节：{{ currentChapter?.id }}</span>
                    <span>难度：{{ renderDifficulty(currentChapter?.difficulty) }}</span>
                    <span>残卷修复：{{ repairedTaskSet.size }}/{{ displayTasks.length }}</span>
                 </div>

                 <div class="reading-stage" style="display:flex; flex-direction:column; gap:20px;">
                    <!-- 古籍正文 -->
                    <div class="reading-stage-story">
                        <div class="reading-story-title" style="color:#d4a843; font-weight:bold; margin-bottom:8px;">古籍残卷</div>
                        <div class="reading-scroll-frame reading-scroll-remnant" style="background:rgba(255,255,255,0.03); border:1px solid rgba(212,168,67,0.3); border-radius:8px; padding:16px;">
                            <div class="reading-story-lines" style="line-height:1.8; color:#f7f3e8; font-size:15px;">
                                <div v-for="(line, idx) in storyLines" :key="idx" class="reading-story-line" :class="idx % 2 ? 'npc' : 'player'" style="margin-bottom:8px;">
                                  {{ line }}.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 任务交互区 -->
                    <div class="reading-stage-mission" v-if="activeTask">
                        <div class="reading-mission-flavor" style="color:#c8b685; font-size:13px; margin-bottom:8px;">{{ getTaskPrompt(activeTask, currentChapter?.scene) }}</div>
                        <div class="reading-task-feedback" :class="activeTaskFeedbackClass" style="font-size:13px; min-height:20px; margin-bottom:12px; font-weight:bold;">
                            {{ activeTaskFeedbackMsg }}
                        </div>
                        
                        <!-- 任务卡片 -->
                        <div class="reading-task-card" style="background:rgba(0,0,0,0.3); border:1px solid rgba(212,168,67,0.4); border-radius:12px; padding:16px;">
                            <div class="reading-task-progress" style="font-size:12px; color:#d4a843; margin-bottom:4px;">机关 {{ currentTaskIndex + 1 }}/{{ displayTasks.length }}</div>
                            <div class="reading-task-title" style="font-size:15px; font-weight:bold; color:#f7f3e8; margin-bottom:12px;">机关问题{{ currentTaskIndex + 1 }} · {{ getTaskTitle(activeTask) }}</div>
                            
                            <div class="reading-task-question" style="font-size:14px; margin-bottom:16px;">{{ activeTask.question || '请补全缺失句子' }}</div>
                            
                            <!-- 完形填空槽位展示 -->
                            <div v-if="getTaskMode(activeTask) === 'cloze'" class="reading-slot-wrap" style="display:flex; align-items:center; gap:8px; margin-bottom:16px;">
                                <span class="reading-slot-label" style="font-size:12px; color:#c8b685;">残卷填槽</span>
                                <div class="reading-slot" :class="{ 'filled': !!answers[activeTask.id] }" style="padding:4px 12px; background:rgba(212,168,67,0.1); border-bottom:2px solid #d4a843; min-width:60px; text-align:center;">
                                  {{ answers[activeTask.id] || '____' }}
                                </div>
                            </div>
                            
                            <!-- 句子修复槽位展示 -->
                            <div v-if="getTaskMode(activeTask) === 'sentence_restore'" style="margin-bottom:16px;">
                                <div style="font-size:13px; color:#c8b685; line-height:1.6; margin-bottom:8px;">
                                  {{ getSentenceRestorePassage(activeTask) }}
                                </div>
                                <div style="font-size:12px; color:#d4a843;">
                                  修复位置：<span style="border-bottom:1px dashed #d4a843;">{{ activeTask.blank_hint || '【___】' }}</span>
                                </div>
                            </div>

                            <!-- 选项区 -->
                            <div class="reading-options" :class="getTaskMode(activeTask) === 'cloze' ? 'reading-options--chips' : 'reading-options--choices'" style="display:flex; flex-wrap:wrap; gap:10px;">
                                <button 
                                  v-for="(op, idx) in activeTask._displayOptions" 
                                  :key="idx"
                                  class="reading-option"
                                  :class="{ 'selected': answers[activeTask.id] === op }"
                                  :style="getOptionStyle(getTaskMode(activeTask), answers[activeTask.id] === op)"
                                  @click="selectTaskAnswer(activeTask, op)"
                                >
                                    <span v-if="getTaskMode(activeTask) === 'cloze'" style="margin-right:4px;">✦</span>
                                    <span v-else style="background:rgba(255,255,255,0.1); border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; margin-right:8px; font-size:11px;">{{ String.fromCharCode(65 + idx) }}</span>
                                    <span>{{ op }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 <!-- 底部动作条 -->
                 <div class="reading-actions" style="margin-top:24px; display:flex; justify-content:space-between; align-items:center; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">
                    <button class="el-button" style="background:transparent; border:1px solid #c8b685; color:#c8b685;" @click="step = 'list'">返回列表</button>
                    <div style="display:flex; gap:8px;">
                        <button class="el-button" style="background:rgba(255,255,255,0.1); color:#fff; border:none;" :disabled="currentTaskIndex === 0" @click="currentTaskIndex--">上一处</button>
                        <button class="el-button" style="background:rgba(255,255,255,0.1); color:#fff; border:none;" :disabled="currentTaskIndex >= displayTasks.length - 1" @click="currentTaskIndex++">下一处</button>
                    </div>
                    <button class="el-button btn-danger" style="background:#d4a843; border:none; color:#1a1a2e; font-weight:bold;" @click="submitChapter">提交阅读</button>
                 </div>
              </div>
            </div>

            <!-- 4. 命运分支选择 (Branch) -->
            <div v-if="step === 'branch'" class="reading-section">
                <div class="panel-title fate-panel-title" style="color:#d4a843; text-align:center; font-size:20px; margin-bottom:12px;">命运岔路口</div>
                <div class="fate-panel-intro" style="color:#c8b685; font-size:14px; text-align:center; margin-bottom:24px;">
                    你在残卷中发现了隐藏的英文符文，你的选择将决定未来的修行路线。
                </div>
                <div class="branch-options-container" style="display:flex; flex-direction:column; gap:12px;">
                    <div v-for="opt in currentChapter?.branch_options" :key="opt.id"
                         class="branch-option-card" 
                         style="background:rgba(255,255,255,0.05); border:1px solid rgba(212,168,67,0.4); border-radius:8px; padding:16px; cursor:pointer;"
                         @click="selectBranch(opt.id)">
                        <div class="branch-card-label" style="font-size:16px; font-weight:bold; color:#f7f3e8; margin-bottom:4px;">{{ opt.label }}</div>
                        <div class="branch-card-hint" style="font-size:13px; color:#c8b685; margin-bottom:8px;">{{ opt.hint }}</div>
                        <div class="branch-card-reward" style="font-size:12px; color:#d4a843;">
                            奖励预测：灵气+{{ opt.reward_delta?.lingqi || 0 }} 剧情钥匙+{{ opt.reward_delta?.story_keys || 0 }} 道心+{{ opt.reward_delta?.daoxin || 0 }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 5. 心魔拦截试炼 (Demon Trial) -->
            <div v-if="step === 'demon_trial'" class="reading-section">
                <div class="panel-title" style="color:#e74c3c; text-align:center; font-size:20px; margin-bottom:12px;">问心试炼 · 心魔破除</div>
                <div class="reading-demon-trial-tip" style="color:#c8b685; font-size:14px; text-align:center; margin-bottom:24px;">
                    问心路线已触发。请完成 {{ demonTrialQuestions.length }} 道近期错题，全部答对才可破除心魔并解锁隐藏命盘。
                </div>
                <div class="reading-demon-question-list" style="display:flex; flex-direction:column; gap:20px; max-height:400px; overflow-y:auto; padding-right:8px;">
                    <div v-for="(q, index) in demonTrialQuestions" :key="q.question_id" class="reading-demon-card" style="background:rgba(231,76,60,0.05); border:1px solid rgba(231,76,60,0.3); border-radius:8px; padding:16px;">
                        <div class="reading-demon-card-index" style="font-size:12px; color:#e74c3c; margin-bottom:8px;">第 {{ index + 1 }} 题</div>
                        <div class="reading-demon-card-question" style="font-size:14px; color:#f7f3e8; margin-bottom:12px;">{{ q.question }}</div>
                        <div class="reading-demon-option-group" style="display:flex; flex-direction:column; gap:8px;">
                            <button v-for="opt in normalizeDemonOptions(q.options)" :key="opt.value"
                                    class="reading-option"
                                    :style="demonAnswers[q.question_id] === opt.value ? 'background:rgba(231,76,60,0.2); border-color:#e74c3c; color:#f7f3e8;' : 'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); color:#c8b685;'"
                                    style="padding:10px 12px; border-radius:6px; text-align:left; cursor:pointer;"
                                    @click="demonAnswers[q.question_id] = opt.value">
                                <span style="display:inline-block; width:20px; font-weight:bold; color:#e74c3c;">{{ opt.label }}</span>
                                <span>{{ opt.text }}</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="reading-actions" style="margin-top:24px; display:flex; gap:12px;">
                    <button class="el-button full-btn" style="background:transparent; border:1px solid #c8b685; color:#c8b685;" @click="submitDemonTrial(true)">取消问心（回常规节点）</button>
                    <button class="el-button full-btn btn-danger" style="background:#e74c3c; border:none; color:#fff;" @click="submitDemonTrial(false)">提交心魔试炼</button>
                </div>
            </div>

            <!-- 6. 结算界面 (Result) -->
            <div v-if="step === 'result' && readingResult" class="reading-section" style="text-align: center;">
              <div style="font-size:60px; margin-bottom:10px;">{{ readingResult.passed ? '📜' : '🔁' }}</div>
              <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color:#d4a843;">
                  {{ readingResult.passed ? '阅读通关' : '继续修炼' }}
              </div>
              <div style="font-size:14px; color:#c8b685; margin-bottom:20px;">本层藏经阁试炼完成</div>
              
              <div class="reward-details" style="background:rgba(255,255,255,0.05); padding:16px; border-radius:12px; margin-bottom:20px; text-align:left; font-size:14px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>正确率</span><span :style="{color: readingResult.accuracy >= 60 ? '#d4a843' : '#e74c3c'}">{{ readingResult.accuracy }}%</span></div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>修为奖励</span><span style="color:#d4a843;">+{{ readingResult.xp_gained || 0 }}</span></div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>灵石奖励</span><span style="color:#d4a843;">+{{ readingResult.spirit_stone_gained || 0 }}</span></div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>掉落道具</span><span style="color:#4a90d9;">{{ readingResult.item_reward || '无' }}</span></div>
                  <div v-if="readingResult.demon_trial" style="display:flex; justify-content:space-between; margin-bottom:8px;">
                      <span>问心试炼</span>
                      <span :style="{color: readingResult.demon_trial.passed ? '#d4a843' : '#e74c3c'}">
                          {{ readingResult.demon_trial.passed ? '心魔破除' : '退回常规节点' }}
                      </span>
                  </div>
                  <div v-if="readingResult.selected_branch_id" style="display:flex; justify-content:space-between;">
                      <span>命盘变动</span><span style="color:#d4a843;">隐藏分支已记录</span>
                  </div>
              </div>
              
              <button class="el-button full-btn" @click="fetchChapters(currentLevel)">继续阅读</button>
            </div>

          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useApiClient } from '../../../services/api';
import { useUserStore } from '../../../stores/user';
import { ElMessage } from 'element-plus';

// 图片资源导入
import bgHall from '../../../assets/images/bg_hall.png';
import sceneCangjingge from '../../../assets/images/scene_cangjingge.png';
import sceneMijing from '../../../assets/images/scene_mijing.png';
import sceneShilian from '../../../assets/images/scene_shilian.png';
import sceneInitiation from '../../../assets/images/scene_initiation2.png';

const SCENE_BACKGROUNDS: Record<string, string> = {
    '宗门院落': bgHall,
    '宗门食堂': sceneCangjingge,
    '灵兽森林': sceneMijing,
    '师门小故事': sceneInitiation,
    '宗门后山探险': sceneShilian,
    '宗门课堂': sceneCangjingge,
};

const SCENE_AMBIENCE: Record<string, string> = {
    '宗门院落': '晨钟轻响，弟子列队，风过檐角。',
    '宗门食堂': '蒸汽袅袅，木勺轻碰瓷碗，饭香四起。',
    '灵兽森林': '林叶微颤，远处灵兽低鸣，脚步需更轻。',
    '师门小故事': '烛火摇曳，旧卷翻页声里藏着答案。',
    '宗门后山探险': '山雾起伏，石阶湿冷，每一步都需判断。',
    '宗门课堂': '戒尺轻敲，黑板落笔，推理从细节开始。',
};

const SCENE_EMBLEM: Record<string, string> = {
    '宗门院落': '院', '宗门食堂': '食', '灵兽森林': '森', '师门小故事': '卷', '宗门后山探险': '探', '宗门课堂': '课',
};

const COMPREHENSION_DISTRACTORS: Record<string, string[]> = {
    '宗门院落': ['因为钟声响起', '为了躲雨', '为了领取灵石'],
    '宗门食堂': ['因为饭菜太冷', '因为有人迟到', '为了避开人群'],
    '灵兽森林': ['因为风太大', '因为前方有迷雾', '因为灵兽在休息'],
    '师门小故事': ['因为卷轴损坏', '因为师兄催促', '因为时辰太晚'],
    '宗门后山探险': ['因为体力不足', '因为路线太短', '因为没有地图'],
    '宗门课堂': ['因为抄错题目', '因为忘记时间', '因为同伴离开'],
};

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const userStore = useUserStore();

type Step = 'list' | 'entry_confirm' | 'reading' | 'branch' | 'demon_trial' | 'result';
const step = ref<Step>('list');
const loading = ref(false);

const containerWidth = computed(() => step.value === 'reading' ? '900px' : '460px');
const headerTitle = computed(() => {
    switch(step.value) {
        case 'entry_confirm': return '准备入阁';
        case 'branch': return '命运抉择';
        case 'demon_trial': return '心魔试炼';
        default: return '📖 藏经阁';
    }
});

// --- 关卡列表 ---
const currentLevel = ref(1);
const chapters = ref<any[]>([]);
const nextChapter = computed(() => {
    if (!chapters.value.length) return null;
    return chapters.value.find((c) => !c.completed) || chapters.value[chapters.value.length - 1];
});

const currentSpirit = computed(() => Number(userStore.profile?.spirit_power || 0));

const fetchChapters = async (level = 1) => {
    step.value = 'list';
    currentLevel.value = level;
    loading.value = true;
    try {
        const res = await api.get(`/reading/chapters?level=${level}`);
        if (res?.success) {
            chapters.value = res.data?.chapters || [];
        } else {
            ElMessage.error(res?.message || '读取副本失败');
        }
    } catch (e) {
        ElMessage.error('网络异常');
    } finally {
        loading.value = false;
    }
};

// --- 进入确认 ---
const currentChapter = ref<any>(null);

const openEntryConfirm = async (chapter: any) => {
    loading.value = true;
    try {
        const res = await api.get(`/reading/chapters/${chapter.id}`);
        if (res?.success) {
            currentChapter.value = res.data;
            if (Number.isFinite(Number(res.data?.current_spirit_power))) {
                userStore.updateProfile({ spirit_power: Number(res.data.current_spirit_power) });
            }
            step.value = 'entry_confirm';
        } else {
            if (res.code === 'INSUFFICIENT_SPIRIT_POWER') {
                ElMessage.warning(`灵力不足，进入需 ${chapter.spirit_cost || 5} 灵力`);
            } else {
                ElMessage.error(res.message || '读取章节详情失败');
            }
        }
    } finally {
        loading.value = false;
    }
};

const startChapter = async () => {
    const cost = Number(currentChapter.value?.spirit_cost || 5);
    if (currentSpirit.value < cost) {
        ElMessage.warning(`当前灵力 ${currentSpirit.value} 不足，需要 ${cost}`);
        return;
    }
    
    loading.value = true;
    try {
        const res = await api.post('/user/consume-spirit', {
            amount: cost,
            reason: `reading:${currentChapter.value.id}`,
        });
        
        if (res?.success) {
            if (res.data?.current_spirit_power !== undefined) {
                userStore.updateProfile({ spirit_power: Number(res.data.current_spirit_power) });
            }
            initReadingSession();
            step.value = 'reading';
        } else {
            ElMessage.error(res?.message || '灵力扣除失败');
        }
    } finally {
        loading.value = false;
    }
};

// --- 阅读交互 ---
const answers = ref<Record<string, string>>({});
const currentTaskIndex = ref(0);
const repairedTaskSet = ref<Set<string>>(new Set());

const displayTasks = computed(() => {
    if (!currentChapter.value?.tasks) return [];
    return currentChapter.value.tasks.map((task: any) => ({
        ...task,
        _displayOptions: getTaskOptions(task, currentChapter.value.scene)
    }));
});

const activeTask = computed(() => displayTasks.value[currentTaskIndex.value]);

const storyLines = computed(() => {
    const text = currentChapter.value?.text || '';
    return text.split('.').map((l: string) => l.trim()).filter(Boolean);
});

const initReadingSession = () => {
    answers.value = {};
    currentTaskIndex.value = 0;
    repairedTaskSet.value = new Set();
};

const selectTaskAnswer = (task: any, value: string) => {
    answers.value[task.id] = value;
    
    // 检查正确性并反馈
    const isCorrect = isTaskAnswerCorrect(task, value);
    if (isCorrect) {
        repairedTaskSet.value.add(task.id);
    } else {
        repairedTaskSet.value.delete(task.id);
    }
};

const activeTaskFeedbackMsg = computed(() => {
    if (!activeTask.value || !answers.value[activeTask.value.id]) return '';
    const isCorrect = isTaskAnswerCorrect(activeTask.value, answers.value[activeTask.value.id]);
    return isCorrect ? '✅ 机关解开，古籍残卷修复 +1' : '❌ 机关未解，请回到原文寻找线索';
});

const activeTaskFeedbackClass = computed(() => {
    if (!activeTask.value || !answers.value[activeTask.value.id]) return '';
    return isTaskAnswerCorrect(activeTask.value, answers.value[activeTask.value.id]) ? 'text-green' : 'text-red';
});

// --- 分支与提交 ---
const selectedBranchId = ref<string | null>(null);

const submitChapter = async () => {
    const tasks = displayTasks.value;
    const missing = tasks.find(t => !answers.value[t.id]);
    if (missing) {
        ElMessage.warning('请先完成所有任务再提交');
        return;
    }
    
    const correctCount = tasks.filter(t => isTaskAnswerCorrect(t, answers.value[t.id])).length;
    const accuracy = tasks.length > 0 ? Math.round((correctCount / tasks.length) * 100) : 0;
    const passed = accuracy >= 60;
    
    if (passed && currentChapter.value?.branch_options?.length > 0) {
        step.value = 'branch';
        return;
    }
    
    executeSubmit();
};

const selectBranch = (branchId: string) => {
    selectedBranchId.value = branchId;
    executeSubmit();
};

const executeSubmit = async (demonTrialAnswers: any[] = null, skipDemonTrial = false) => {
    loading.value = true;
    const payload: any = {
        chapter_id: currentChapter.value.id,
        answers: displayTasks.value.map(t => ({ task_id: t.id, answer: answers.value[t.id] }))
    };
    if (selectedBranchId.value) payload.selected_branch_id = selectedBranchId.value;
    if (demonTrialAnswers) payload.demon_trial_answers = demonTrialAnswers;
    if (skipDemonTrial) payload.skip_demon_trial = true;

    try {
        const res = await api.post('/reading/submit-adventure', payload);
        if (res?.success) {
            const data = res.data || {};
            if (data.need_demon_trial) {
                setupDemonTrial(data);
                return;
            }
            
            if (data.xp_gained) {
                userStore.updateProfile({
                    exp: (userStore.profile?.exp || 0) + data.xp_gained,
                    spirit_stone: (userStore.profile?.spirit_stone || 0) + (data.spirit_stone_gained || 0),
                });
            }
            readingResult.value = data;
            step.value = 'result';
            selectedBranchId.value = null; // 重置
        } else {
            ElMessage.error(res?.message || '提交失败');
        }
    } finally {
        loading.value = false;
    }
};

// --- 心魔试炼 ---
const demonTrialQuestions = ref<any[]>([]);
const demonAnswers = ref<Record<string, string>>({});

const setupDemonTrial = (data: any) => {
    demonTrialQuestions.value = Array.isArray(data.demon_trial_questions) ? data.demon_trial_questions : [];
    if (!demonTrialQuestions.value.length) {
        executeSubmit([], false); // 跳过
        return;
    }
    demonAnswers.value = {};
    step.value = 'demon_trial';
};

const submitDemonTrial = (skip: boolean) => {
    if (skip) {
        executeSubmit([], true);
        return;
    }
    const answersList = demonTrialQuestions.value.map(q => ({
        question_id: String(q.question_id),
        answer: demonAnswers.value[q.question_id] || ''
    }));
    if (answersList.find(a => !a.answer)) {
        ElMessage.warning('请先完成全部心魔题再提交');
        return;
    }
    executeSubmit(answersList, false);
};

// --- 结果 ---
const readingResult = ref<any>(null);

// --- Helper Functions ---
const getSceneCoverStyle = (scene: string) => {
    const url = SCENE_BACKGROUNDS[scene] || bgHall;
    return `background-image: linear-gradient(135deg, rgba(10,15,35,0.55), rgba(10,15,35,0.75)), url('${url}'); background-size: cover; background-position: center;`;
};
const getSceneAmbience = (scene: string) => SCENE_AMBIENCE[scene] || '风声掠过，你在场景中阅读与作答。';
const getSceneEmblem = (scene: string) => SCENE_EMBLEM[scene] || '🎮';
const renderDifficulty = (level: number) => level === 1 ? '入门' : level === 2 ? '进阶' : '突破';

const getTaskMode = (task: any) => task?.mode || task?.type || 'comprehension';
const getTaskTitle = (task: any) => {
    const mode = getTaskMode(task);
    return mode === 'cloze' ? '残卷填词' : mode === 'sentence_restore' ? '残卷修复' : '语义判读';
};
const getTaskPrompt = (task: any, scene: string) => {
    const mode = getTaskMode(task);
    if (mode === 'cloze') return `在${scene}中收集线索，把关键词填回古籍残卷。`;
    if (mode === 'sentence_restore') return `残卷出现缺口，从候选句中选择正确句子修复古籍。`;
    return `请根据原文线索，在${scene}中解开当前机关问题。`;
};
const getSentenceRestorePassage = (task: any) => {
    return task?.passage_with_blank || task?.text_with_blank || task?.masked_text || '【___】';
};

const getTaskOptions = (task: any, scene: string) => {
    const mode = getTaskMode(task);
    if (mode === 'sentence_restore') return task.candidates || task.sentences || task.options || [];
    if (mode === 'cloze') return task.options || [];
    // Comprehension logic (简化版)
    const ans = String(Array.isArray(task.answer) ? task.answer[0] : task.answer);
    const pool = (COMPREHENSION_DISTRACTORS[scene] || []).concat(['因为经验不足', '为了更快完成任务']);
    const ops = [ans, ...pool.slice(0, 3)].sort(() => Math.random() - 0.5);
    return [...new Set(ops)];
};

const isTaskAnswerCorrect = (task: any, val: string) => {
    if (!task) return false;
    const ans = task.answer;
    const norm = (v: string) => String(v).trim().toLowerCase();
    if (Array.isArray(ans)) return ans.some(a => norm(a) === norm(val));
    return norm(ans) === norm(val);
};

const normalizeDemonOptions = (options: any) => {
    if (Array.isArray(options) && typeof options[0] === 'object') return options;
    if (Array.isArray(options)) return options.map((v, i) => ({ label: String.fromCharCode(65+i), text: v, value: String.fromCharCode(65+i) }));
    return Object.keys(options || {}).map(k => ({ label: k, text: options[k], value: k }));
};

const getOptionStyle = (mode: string, selected: boolean) => {
    if (mode === 'cloze') {
        return selected 
            ? 'background:#d4a843; color:#1a1a2e; border:1px solid #d4a843; padding:4px 12px; border-radius:16px;'
            : 'background:rgba(255,255,255,0.05); color:#c8b685; border:1px solid rgba(212,168,67,0.3); padding:4px 12px; border-radius:16px;';
    }
    return selected
        ? 'background:rgba(212,168,67,0.2); border:1px solid #d4a843; padding:12px; border-radius:8px; text-align:left; width:100%; color:#f7f3e8;'
        : 'background:rgba(255,255,255,0.05); border:1px solid rgba(212,168,67,0.3); padding:12px; border-radius:8px; text-align:left; width:100%; color:#c8b685;';
};

// --- 基础控制 ---
watch(() => props.visible, (val) => {
    if (val) fetchChapters(currentLevel.value);
});

const handleOverlayClick = () => {
    if (['reading', 'branch', 'demon_trial'].includes(step.value)) return;
    closePanel();
};

const closePanel = () => {
    emit('update:visible', false);
};
</script>

<style scoped>
.profile-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10, 10, 26, 0.85); display: flex; align-items: center; justify-content: center;
  z-index: 2000; backdrop-filter: blur(5px);
}
.profile-container {
  background: #1a1a2e; border: 2px solid var(--gold, #d4a843); border-radius: 12px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: max-width 0.3s ease; width: 90%;
}
.profile-container.immersive-mode {
  height: 90vh; /* 沉浸式高度 */
}
.profile-header {
  display: flex; justify-content: space-between; align-items: center; padding: 16px;
  background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(212,168,67,0.3);
}
.profile-close-btn {
  background: transparent; border: 1px solid var(--gold, #d4a843); color: var(--gold, #d4a843);
  padding: 4px 12px; border-radius: 4px; cursor: pointer; position: absolute; right: 16px;
}

.reading-chapter-card {
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(212, 168, 67, 0.2);
    border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s;
}
.reading-chapter-card:hover { background: rgba(212, 168, 67, 0.08); border-color: rgba(212, 168, 67, 0.5); }
.reading-chapter-card.completed { background: rgba(78, 192, 122, 0.05); border-color: rgba(78, 192, 122, 0.3); }

.text-green { color: #4ec07a; }
.text-red { color: #e74c3c; }
.full-btn { width: 100%; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
