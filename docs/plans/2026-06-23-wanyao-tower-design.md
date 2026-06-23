# 万妖古塔 (Wanyao Tower) — 设计文档

- **日期**：2026-06-23
- **作者**：设计协作产出（brainstorming skill）
- **状态**：Approved · 待出实施计划
- **范围**：仅 Phase 1（词汇 MCQ 闯关 + 写作 Boss），Phase 2 扩展题型与视觉效果另议

---

## 1. 目标

新增一个独立的 PvE 副本「万妖古塔」，作为世界地图第 8 座建筑，提供与试炼场、秘境完全并列的纯闯关玩法：单层 = 5 道普通题 + 1 道 Boss 题。

**核心约束**

- 与试炼场 / 秘境**完全并列、独立机制**，不重构现有 PvE 架构。
- Vue 3 层新建，Canvas 3D 仅作背景装饰，沿用 Legacy Bridge 模式。
- 失败时错题入心魔池，复用 `HeartDemonService::recordWrong()`，零新增耦合点。
- Phase 1 题源**只用现有词汇 MCQ + 写作题**，不依赖 PracticeView 题型抽离（PracticeView 当前 2663 行未抽离，强行先抽会拖死进度）。

---

## 2. 架构 & 入口接入

### 2.1 世界地图新增建筑

- `SECT_NODES` 追加 `wanyaoTower`：
  ```ts
  { id: 'wanyaoTower', name: '万妖古塔', model: '/models/wanyaoTower.glb',
    position: [x, 0, z], accentColor: '#c41e3a' /* 妖魔赤 */ }
  ```
- 7→8 节点环形布局重排，置于 `innerDemonHall` 对角位（妖与心魔对称）。其它 7 座允许微调坐标。
- GLB 模型 Phase 1 用占位（高瘦塔型基础几何体），后续按现有压缩流程补真模型。

### 2.2 路由 & Bridge

- 新增 `/wanyao-tower` 路由 → `WanyaoTowerView.vue`。
- `WorldMapOverlay` 点击节点 → `ui.hideMapOverlay()` + `router.push('/wanyao-tower')`。
- `useLegacyBridge` 新增 `switchToWanyaoTowerScene()`，Phase 1 复用试炼场 3D 背景占位。

### 2.3 改动面（最小化）

- `SECT_NODES`：+1 项
- `WorldSceneManager`：8 点布局参数
- `router/index.ts`：+1 路由
- `useLegacyBridge`：+1 方法
- 其它已迁移模块零影响

---

## 3. 后端数据模型 & API

### 3.1 表结构

**`wanyao_tower_progress`**（每用户一行）

| 字段 | 类型 | 说明 |
|---|---|---|
| user_id | PK FK | |
| current_floor | int | 默认 1，正在打的层 |
| highest_floor | int | 历史最高（用于成就） |
| current_run_id | string? | 正在进行的 run id，NULL = 无 |
| updated_at | timestamp | |

**`wanyao_tower_runs`**（每次闯关一行）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | |
| user_id | FK | |
| floor | int | |
| questions_json | json | 抽到的题目快照（防刷新换题、防作弊） |
| boss_question_id | int | |
| status | enum | in_progress / cleared / failed / abandoned |
| correct_count | int | |
| started_at | timestamp | |
| ended_at | timestamp? | |

**约束**：`(user_id, status='in_progress')` 唯一索引——同一玩家同时只能有 1 个未结算 run。

### 3.2 API 端点

| Method | Path | 用途 |
|---|---|---|
| GET | `/wanyao-tower/status` | 拿 progress + 是否有未完成 run |
| POST | `/wanyao-tower/start` | 开始第 N 层，返回 5 道题 + Boss 题（无答案），写入 runs |
| POST | `/wanyao-tower/answer` | 提交单题答案，逐题幂等，返回正误 + 解析 |
| POST | `/wanyao-tower/settle` | 全部答完后结算，更新 progress、发奖励、失败时入心魔池 |
| POST | `/wanyao-tower/abandon` | 主动放弃当前 run |

### 3.3 题源复用

- 普通题：从现有词汇题库按层数难度区间随机抽 5 道 MCQ
- Boss 题：从对应妖境主题词条池抽 1 道写作题，评分走 `WritingService::submitWriting()`
- 不新建题表

---

## 4. 前端组件结构

### 4.1 View / 状态机

`WanyaoTowerView.vue`（`/wanyao-tower`），状态机：

```
idle → starting → answering → boss → settling → reward → idle
                                   ↘ failed ↗
```

### 4.2 子组件

| 组件 | 职责 |
|---|---|
| `TowerLobby.vue` | 进 View 默认态：当前层 / 历史最高 / 妖境主题 / 「登塔挑战」按钮；有 in_progress run 时变「继续闯关」 |
| `TowerQuestionRunner.vue` | 5 道 MCQ 串行答题，进度条 |
| `TowerMCQQuestion.vue` | 独立 MCQ 渲染（~80 行，不依赖 PracticeView） |
| `TowerBossPanel.vue` | Boss 题 UI：妖王立绘 + 60s 倒计时血条 + 写作输入框（最小 30 字） |
| `TowerSettleModal.vue` | 结算弹窗：奖励飘字 / 失败提示「错题已入心魔池」 |
| `TowerRewardCard.vue` | 单个奖励卡牌（灵石 / 心法碎片 / 称号） |

### 4.3 Pinia Store `useTowerStore`

```ts
state: {
  status: TowerStatus,
  currentFloor: number,
  highestFloor: number,
  currentRun: { questions, bossQuestion, answers, startedAt } | null,
  pendingReward: Reward[] | null,
}
actions: { fetchStatus, startRun, submitAnswer, settle, abandon }
```

### 4.4 心魔系统衔接

- 失败时前端**不调** `/demons/report-wrong`——后端 settle 自己批量入池
- View 仅根据 settle 响应的 `demons_added` 做 UI 提示

### 4.5 TopHud

- 进 View 设 `topHud.setContext('wanyao-tower')`
- 闯关中禁用【地图】按钮，硬切弹二次确认「将中断本次闯关」

---

## 5. 难度曲线 & 流程

### 5.1 难度分层

| 层数 | 词库等级 | 干扰项策略 |
|---|---|---|
| 1–20 | CET-4 高频 | 词性差异大 |
| 21–40 | CET-4 完整 | 同词性干扰 |
| 41–60 | CET-6 | 词形相近 |
| 61–80 | 考研 | 语义相近 |
| 81–100 | 雅思/GRE | 词义微差 |

每 10 层一个妖境主题（火/冰/雷/毒/兽/影/雾/风/雷霆/混沌），按主题 tag 抽词；无 tag 词归通用池兜底。

> **依赖**：词库会后续导入，需带主题 tag 字段。

### 5.2 单层流程时序

```
玩家点【登塔挑战】
  ↓
GET /status        → 当前层 N、有无 in_progress run
  ↓
POST /start        → 抽 5 MCQ + 1 Boss，写 runs(status=in_progress, snapshot)
  ↓
[answering] 串行 5 题，每题 POST /answer (qid, choice)
              FeedbackOverlay 显示 1.2s → 下一题
  ↓
[boss] 60s 倒计时血条
       写作 ≥ 30 字提交 → POST /answer (boss_qid, text) → WritingService 评分
       超时 / 字数不足 → 自动判失败
  ↓
POST /settle       → 通关：current_floor++、发奖励
                    失败：调 HeartDemonService.recordWrong 入池
                    返回 {result, rewards, demonsAdded, newHighest}
  ↓
[reward/failed] SettleModal → 「继续下一层 / 返回」
```

### 5.3 奖励曲线（运营可配）

| 触发条件 | 奖励 | 100 层期望频次 |
|---|---|---|
| 每层首通 | `floor × 10` 灵石 | 100 |
| 重打通关 | `floor × 3` 灵石（防刷） | 任意 |
| 单层 100% 正确 | 额外 `floor × 5` 灵石 | ~30–40 |
| 境界突破层（10/20/.../100） | 1 片该妖境心法碎片 | 10 |
| 集齐 5 片 | 合成 1 篇该境心法 | ≤ 2 篇 / 妖境 |
| 第 50 层首通 | 称号【塔中行者】+ 100 灵石 | 1 |
| 第 100 层首通 | 称号【万妖之巅】+ 隐藏心法 | 1 |

**关键设计**

- 心法是稀有终局奖励（满破 100 层全员上限 3 篇）
- 灵石做主货币，配合现有商城形成长期消费目标
- 数值参数全部写入 `TowerRewardConfig`，不硬编码：
  ```php
  STONE_BASE_PER_FLOOR = 10
  STONE_REPEAT_MULTIPLIER = 0.3
  PERFECT_BONUS_MULTIPLIER = 0.5
  FRAGMENTS_PER_TECHNIQUE = 5
  BREAKTHROUGH_FLOORS = [10,20,...,100]
  ```

### 5.4 断线 / 跨设备恢复

- `/start` 后任何时点刷新 → `/status` 看到 `current_run_id` → 弹「是否继续」→ 复用 `questions_json` 续答
- 已答 qid 用 `answered_qids` 数组记录，不重出
- 30 分钟无 `/answer` → 后台 5 分钟扫表标 abandoned

### 5.5 反作弊

- 答案校验全在后端，`questions_json` 不带答案下发
- DB 唯一索引强制单 in_progress run
- `/answer` 幂等：同 qid 重复以首次为准

---

## 6. 错误处理

| 场景 | 处理 |
|---|---|
| `/start` 时已有 in_progress run | 后端 409 + existing_run_id；前端弹「继续 / 放弃」 |
| `/answer` qid 不属于当前 run | 422 + 可疑请求日志 |
| `/answer` 同 qid 重复 | 幂等返同结果 |
| `/settle` 未答完 | 422 + `unanswered: [qids]` |
| WritingService 异常 | **降级**：判通关、`boss_score=null`、正常发奖、后台告警。不阻塞玩家 |
| 网络中断中途答题 | localStorage 队列 + 恢复后批量重放（依赖幂等） |
| 跨设备登录 | 服务端字段天然支持，questions_json 已快照 |

**安全**

- `/answer` `/settle` 验 `run.user_id === auth()->id()`（防 IDOR）
- Boss 写作 ≤ 2000 字 + XSS 过滤
- `/start` rate limit：每用户每分钟 ≤ 3 次

---

## 7. 测试策略

| 类别 | 用例 |
|---|---|
| 单元（后端） | TowerRewardConfig 数值、难度→词库等级映射、奖励合成 |
| Service 层 | startRun 已有 run 时拒绝；settle 通关/失败分支；failed → recordWrong 入池 |
| Feature Test | happy / fail / 并发 start 唯一约束 / 跨设备 resume / answer 幂等 |
| 前端单元（Vitest） | useTowerStore 状态机；TowerMCQQuestion 交互；倒计时归零自动提交 |
| E2E | 进 Tower → 答 5 题 → Boss → 结算 → 灵石 +N |
| 回归 | 心魔殿入池后 `/demons/list` 可见；商城灵石余额正确 |
| 性能 | `/start` 抽题 SQL ≤ 50ms（需验证词库主题 tag 字段索引） |

**埋点**：`tower.run_started` / `floor_cleared` / `floor_failed` / `boss_timeout` / `fragment_dropped`，或仅依赖 `wanyao_tower_runs` 表自身分析。

---

## 8. 决策记录（与已讨论替代方案）

| 决策点 | 选定 | 放弃方案 | 理由 |
|---|---|---|---|
| 与现有 PvE 关系 | 完全并列、独立机制 | 抽象统一 PvE / 作为试炼场 Tab | 避免重构既有代码；与试炼场调性区分 |
| 核心 loop | 纯闯关（5 题 + Boss） | 答题+RPG 数值 / Roguelike 词条 | Phase 1 控制开发量 2–3 周；后续可加 buff |
| 塔结构 | 线性百层 | 章节制 / 无限层赛季 | 数据模型最简，未来升章节制是非破坏升级 |
| 入口 | 世界地图第 8 座建筑 | 试炼场 Tab / 宗门大殿子菜单 | 存在感最强，与其它 PvE 入口并列 |
| 失败惩罚 | 错题入心魔池 | 仅清空 run 可重打 | 复用 HeartDemonService，无新增耦合点 |
| 奖励 | 灵石 + 偶发心法碎片 | 专属「妖丹」代币 | 避免新经济系统，复用现有商城货币 |
| 题型 Phase 1 | 仅词汇 MCQ + 写作 Boss | 全题型 / 抽离 PracticeView | PracticeView 2663 行抽离风险高，推迟到 Phase 2 |

---

## 9. 非目标 / 推迟事项

- 抽离 PracticeView 题型组件 → 单独立项
- 古塔 3D 视觉定制（紫黑云雾、塔影、妖气流光） → Phase 2
- 危险等级联动世界地图变天 → 心魔殿 Phase 2 一起做
- 章节制 / 无限层赛季 → 视 Phase 1 留存数据决定
- 词库主题 tag 字段导入 → 与题库导入工作并行
