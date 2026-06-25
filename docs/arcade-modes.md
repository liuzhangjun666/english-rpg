# 悟道试炼（Arcade）设计稿

该文档用于定义一条与当前常规答题流不同的玩法线：短局、强反馈、连击、失败惩罚、奖励分层。

## 入口建议

- 一级入口：`练功殿` 增加 `悟道试炼`
- 二级入口：六维各一项
  - 符文追猎（单词）
  - 句式铸炉（语法）
  - 残卷推理（阅读）
  - 回声识音（听力）
  - 灵符速写（写作）
  - 音律对决（口语）

## 回合结构

1. 选择模式 + 难度
2. 60~120 秒局内挑战
3. 即时反馈（连击、失误、技能）
4. 结算（评级 + 奖励）

## 统一计分模型

- 动作得分：`basePerAction`
- 连击倍率：`1 + combo * comboStep`（上限 `comboCap`）
- 失误扣分：`missPenalty`
- 超时扣分：`timeoutPenalty`
- 彩蛋加分：`bonusScore`

## 统一奖励模型

见 `resources/js/vue/data/arcadeModes.ts` 的 `calcArcadeRewards()`：

- 评级：S/A/B/C（由总分区间决定）
- 奖励：修为、灵石、试炼令牌
- 修正项：
  - 评级倍率（S 最高）
  - 连修天数加成（每 3 天一档）
  - 分数因子（scoreDivisor）

## 前端接入建议

- 模式定义：`ARCADE_MODE_DEFS`
- 结算函数：`calcArcadeRewards()`
- 推荐流程：
  - 读取 `ARCADE_MODE_DEFS` 渲染模式入口卡片
  - 局内按 `score` 字段更新分数与连击
  - 结算调用 `calcArcadeRewards({ mode, score, streakDays })`

## 图标生成提示词（与 mode 一一对应）

每个模式定义里都带有 `iconPrompt`，可直接用于图标生成工具。风格建议统一：

- Chinese fantasy + English learning
- dark navy background
- cyan/gold accent
- circular icon composition
- no text/no watermark

