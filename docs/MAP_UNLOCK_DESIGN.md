# 地图解锁系统 · 详细设计文档

> **解锁维度**：境界等级（only）
> **锁住交互**：tooltip 显示解锁境界 + 「领任务」按钮，跳到对应推荐练习
> **持久化方式**：解锁状态为**计算属性**，不存表，由 `current_realm + current_layer` 推导

---

## 1. 建筑解锁阶梯

| 顺序 | 建筑 ID | 名称 | 解锁境界 | 触发文案 |
|---|---|---|---|---|
| 1 | `swordHall` | 剑阁（词汇） | **默认开**（灵根测试完成即可） | — |
| 2 | `scriptureHall` | 藏经阁（阅读） | 炼气一层 | 练气一层方可借阅藏经阁典籍 |
| 3 | `farm` | 灵田（每日修炼） | 炼气三层 | 练气三层可垦灵田，日耕日勤 |
| 4 | `innerDemonHall` | 心魔殿(错题净化) | 炼气五层 | 练气五层方有伏魔之力 |
| 5 | `beastGarden` | 灵兽园（听力） | 炼气七层 | 练气七层方可驯灵兽 |
| 6 | `alchemyHall` | 炼丹殿（写作/语法） | 筑基一层 | 筑基大成方可启炼丹之业 |
| 7 | `sectHall` | 宗门大殿（主线/活动） | 金丹一层 | 金丹有成方可议宗门事 |

剑阁默认开 → 用户始终有事可做；其余 6 座覆盖练气一层到金丹一层的整个新手到中期阶段。

---

## 2. 数据模型

### 不需要新加 DB 字段

解锁状态**纯计算属性**，由 `current_realm + current_layer` 推导，不持久化。这样：
- 数据库简单
- 用户升降级时解锁状态自动跟着变
- 不会出现 "境界回退但建筑还开着" 的脏数据

### 后端单一计算源

```php
// app/Services/BuildingUnlockService.php
class BuildingUnlockService
{
    // 每座建筑的最低境界门槛（major_realm, layer）
    private const REQUIREMENTS = [
        'swordHall'      => null,                    // 默认开
        'scriptureHall'  => ['炼气', 1],
        'farm'           => ['炼气', 3],
        'innerDemonHall' => ['炼气', 5],
        'beastGarden'    => ['炼气', 7],
        'alchemyHall'    => ['筑基', 1],
        'sectHall'       => ['金丹', 1],
    ];

    public function isUnlocked(User $user, string $buildingId): bool;

    /** 给前端 tooltip 用 */
    public function getLockInfo(User $user, string $buildingId): array;
    // 返回 ['locked'=>bool, 'requirement'=>'练气三层', 'message'=>'...', 'recommended_quest'=>[...]]

    /** 一次性返回所有 7 座的状态，地图加载时调一次 */
    public function getAllStatuses(User $user): array;
}
```

### API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/map/unlocks` | 返回所有 7 座建筑的解锁状态 + 解锁条件，前端进入地图时拉一次 |
| GET | `/api/map/unlocks/:buildingId` | 单座详情（点击锁住建筑时拉，附 recommended_quest） |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "buildings": {
      "swordHall":     { "locked": false },
      "scriptureHall": {
        "locked": true,
        "requirement": "练气一层",
        "message": "练气一层方可借阅藏经阁典籍",
        "recommended_quest": {
          "id": "swordhall_intro",
          "title": "初试剑诀",
          "desc": "在剑阁完成 1 关词汇试炼，可助你冲击练气期",
          "target": "/practice?mode=vocab"
        }
      },
      "farm": { "locked": true, "requirement": "练气三层", "...": "..." }
    },
    "user_realm": { "major": "练气", "layer": 0, "label": "初入仙途" }
  }
}
```

---

## 3. "领任务"机制

每个锁住建筑都有一条**推荐任务**，点击 tooltip 上的「领任务」按钮：
- 任务面板展示具体目标（例如"在剑阁完成 5 关词汇练习"）
- 点"前往修炼" → `router.push('/practice?mode=vocab')`（直接送到能拿到经验的入口）

任务不需要后端记录状态（本质是"达到下一境界"的别名）。前端可以做个轻量"今日推荐"侧栏列出当前未解锁的下 1-2 个建筑的任务。

**推荐任务文案表**（按解锁建筑映射）：

| 锁住建筑 | 推荐任务标题 | 推荐任务描述 | 跳转目标 |
|---|---|---|---|
| scriptureHall | 初试剑诀 | 在剑阁完成 1 关词汇试炼，冲击练气一层 | `/practice?mode=vocab` |
| farm | 勤修不辍 | 继续在剑阁/藏经阁修炼，冲击练气三层 | `/practice?mode=vocab` |
| innerDemonHall | 厚积薄发 | 累计修炼至练气五层 | `/practice` |
| beastGarden | 道心已固 | 修炼至练气七层 | `/practice` |
| alchemyHall | 筑基大典 | 突破至筑基期 | `/practice` |
| sectHall | 凝结金丹 | 突破至金丹期 | `/practice` |

---

## 4. 前端集成点

### 4.1 SECT_NODES 配置扩展

`resources/js/vue/core/sect/SECT_NODES.ts` 每个节点加：

```ts
{
  id: 'scriptureHall',
  // ...原有字段
  unlockLabel: '练气一层',  // 静态文案，跟后端 REQUIREMENTS 保持一致
}
```

### 4.2 WorldMapOverlay / SectScene

**进入地图时：**

```ts
const { data } = await api.get('/map/unlocks');
const lockStates = data.buildings;  // { buildingId: { locked, ... } }
```

**Three.js 建筑材质：**
- `locked: true` → 加紫雾 shader pass + 灰阶滤镜 + 中心金色 🔒 icon CSS2DObject
- `locked: false` → 正常渲染

**点击拦截（WorldSceneManager.flyToBuilding）：**

```ts
async function onBuildingClick(buildingId: string) {
  if (lockStates[buildingId].locked) {
    showLockTooltip(buildingId);  // 出 tooltip
    return;  // 不飞镜头
  }
  flyToBuilding(buildingId);
}
```

### 4.3 锁住 Tooltip 组件

新建 `components/map/BuildingLockTooltip.vue`：
- 位置：跟 RadialMenu 一样，绝对定位到点击的屏幕坐标
- 内容：
  ```
  [建筑名]
  🔒 需要：{requirement}（例如"练气一层"）
  {message}（例如"练气一层方可借阅..."）
  当前境界：{user_realm.label}
  [前往修炼] 按钮
  ```
- 点"前往修炼"→ `router.push(recommended_quest.target)` + 关闭地图

### 4.4 解锁瞬间庆祝动画

后端结算（答题/突破）的响应里加一个字段：

```json
{
  "success": true,
  "data": {
    "exp_gained": 50,
    "newly_unlocked": ["scriptureHall"]
  }
}
```

前端 ApiClient 拦截器统一处理：

```ts
if (res.data?.newly_unlocked?.length) {
  ui.showUnlockCelebration(res.data.newly_unlocked);
  // 弹全屏覆盖层：金色光柱 + "藏经阁已解锁！" + 4s 后自动隐藏
}
```

> **简单做法**（推荐）：**完全前端 diff** —— `ui store` 里存 `previousUnlocks: Set<string>`，每次 `/map/unlocks` 拉新数据后跟旧的对比，新增的就播庆祝。后端零改动，省一个字段。

---

## 5. 视觉规范

### 锁定状态（三层叠加）

1. **建筑本体**：饱和度 -100%、亮度 -40%（灰阶）
2. **紫雾遮罩**：低高度雾环绕建筑底座，紫色 `#4a3a8c`，半透明，sin 波呼吸
3. **中心锁 icon**：CSS2DObject 浮在建筑上方 ~5 单位，金色锁 + 一圈金色光晕

### 临门一脚（解锁条件 80%+ 满足时）

- 紫雾透明度从 0.7 → 0.3
- 锁 icon 改为"裂纹"贴图，暗示即将解锁
- 增加金色火花粒子从建筑顶部往天空飘
- 给用户视觉暗示"再修炼一会就到了"

### 解锁瞬间

1. 紫雾向四周炸开消散（1.5s）
2. 一道金色光柱从天而降射中建筑（0.8s）
3. 全屏顶部弹中文金色大字「{建筑名} · 已解锁」+ 4s 后自动飞镜头到该建筑
4. 音效：钟声 + 灵气流动音

---

## 6. 边界 & 防御

| 场景 | 行为 |
|---|---|
| 灵根测试未完成的用户进入地图 | 路由 guard 已经拦截 → 重定向 `/vocab-assessment/intro` |
| 后端 `/map/unlocks` 返回失败 | 前端**全开**作为兜底（开放比误锁好），并 Sentry 上报 |
| 用户在练习页面达成解锁但未刷新地图 | 答题 API 响应里带 `newly_unlocked` → 自动触发庆祝并刷新 ui store |
| 老用户境界已经很高 | 进入地图后 `getAllStatuses` 一次性算出来，全部开着、不播庆祝（因为 previousUnlocks 初始化 = 全部已解锁的） |
| 境界回退（debug / 后端事故） | 解锁状态跟着回退（因为是计算属性），不会出现"降境了但建筑还开" |

---

## 7. 开发顺序建议

按风险递减、收益递增排序，每步可独立联调：

1. **后端 `BuildingUnlockService` + `/map/unlocks` 接口**（半天）
2. **前端拉接口 + 锁住建筑灰阶 + 锁 icon**（半天）
3. **Lock Tooltip + 「前往修炼」跳转**（半天）
4. **答题结算 newly_unlocked 字段 + 庆祝动画**（1 天）
5. **临门一脚视觉提示**（0.5 天，可选 polish）
6. **音效 + 整体动效调参**（0.5 天，可选）

总工作量约 **3-4 天**。

---

## 8. 后续可扩展（先不做）

- 加入"任务进度条"维度（例如"已答对 30 题 / 50 题"），让推荐任务有可视化进度
- 加入"师门好感度 / 称号系统"作为额外解锁条件
- 加入"限时活动建筑"（例如七夕灵犀殿），不进 SECT_NODES 主序列
- 解锁后建筑外观升级（青砖 → 玉砖 → 镶金），用现成 GLB 的多个变体
