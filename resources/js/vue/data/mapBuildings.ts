/** 3D 场景建筑 ID，与 WorldSceneManager.SECT_NODES 一致 */
export type SceneBuildingId =
  | 'sectHall'
  | 'swordHall'
  | 'scriptureHall'
  | 'alchemyHall'
  | 'innerDemonHall'
  | 'beastGarden'
  | 'farm';

export type AbilityIconKey =
  | 'vocab'
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'speaking';

export type MapBuildingAction =
  | { type: 'practice'; mode: string }
  | { type: 'reading' }
  | { type: 'exam' }
  | { type: 'mijing' }
  | { type: 'mall' }
  | { type: 'dailyQuest' }
  | { type: 'achievements' }
  | { type: 'profile' }
  | { type: 'review' }
  | { type: 'demons' }
  | { type: 'innerDemon'; autoChallenge: boolean }
  | { type: 'message'; text: string };

export interface MapSubNodeDef {
  key: string;
  title: string;
  iconKey: AbilityIconKey;
  action: MapBuildingAction;
}

export interface MapBuildingDef {
  sceneId: SceneBuildingId;
  title: string;
  unlockRealm: number;
  subNodes: MapSubNodeDef[];
}

/** 宗门地图建筑与子菜单（Hall / 地图 Overlay 共用） */
export const MAP_BUILDING_DEFS: MapBuildingDef[] = [
  {
    sceneId: 'sectHall',
    title: '练功殿',
    unlockRealm: 0,
    subNodes: [
      { key: 'practice-act', title: '修炼', iconKey: 'vocab', action: { type: 'practice', mode: 'vocab' } },
      { key: 'breakthrough', title: '突破', iconKey: 'reading', action: { type: 'message', text: '暂无心魔，无需突破！' } },
      { key: 'quest', title: '任务', iconKey: 'grammar', action: { type: 'dailyQuest' } },
      { key: 'signin', title: '签到', iconKey: 'listening', action: { type: 'dailyQuest' } },
    ],
  },
  {
    sceneId: 'scriptureHall',
    title: '藏经阁',
    unlockRealm: 0,
    subNodes: [
      { key: 'reading-game', title: '阅读', iconKey: 'reading', action: { type: 'reading' } },
      { key: 'vocab', title: '单词', iconKey: 'vocab', action: { type: 'practice', mode: 'vocab' } },
      { key: 'grammar', title: '语法', iconKey: 'grammar', action: { type: 'practice', mode: 'grammar' } },
      { key: 'listening', title: '听力', iconKey: 'listening', action: { type: 'practice', mode: 'listening' } },
    ],
  },
  {
    sceneId: 'swordHall',
    title: '符箓峰',
    unlockRealm: 0,
    subNodes: [
      { key: 'writing-game', title: '写作', iconKey: 'writing', action: { type: 'practice', mode: 'writing' } },
      { key: 'speaking', title: '口语', iconKey: 'speaking', action: { type: 'practice', mode: 'speaking' } },
      { key: 'ai', title: 'AI问道', iconKey: 'reading', action: { type: 'message', text: '通灵玉简连接中...' } },
    ],
  },
  {
    sceneId: 'alchemyHall',
    title: '天道峰',
    unlockRealm: 1,
    subNodes: [
      { key: 'exam-act', title: '考试', iconKey: 'writing', action: { type: 'exam' } },
      { key: 'rank', title: '排行榜', iconKey: 'reading', action: { type: 'message', text: '天机阁榜单更新中...' } },
      { key: 'dujie', title: '渡劫', iconKey: 'listening', action: { type: 'message', text: '雷劫尚未凝聚...' } },
    ],
  },
  {
    sceneId: 'innerDemonHall',
    title: '心魔禁地',
    unlockRealm: 2,
    subNodes: [
      { key: 'demon-record', title: '心魔录', iconKey: 'vocab', action: { type: 'demons' } },
      { key: 'challenge', title: '心魔试炼', iconKey: 'speaking', action: { type: 'innerDemon', autoChallenge: true } },
      { key: 'seal', title: '镇魔封印', iconKey: 'grammar', action: { type: 'innerDemon', autoChallenge: false } },
      { key: 'ask-heart', title: '问心崖', iconKey: 'listening', action: { type: 'message', text: '问心阵法推演中...' } },
    ],
  },
  {
    sceneId: 'beastGarden',
    title: '洞府',
    unlockRealm: 0,
    subNodes: [
      { key: 'info', title: '个人信息', iconKey: 'vocab', action: { type: 'profile' } },
      { key: 'achieve', title: '成就碑', iconKey: 'reading', action: { type: 'achievements' } },
      { key: 'pets', title: '灵宠园', iconKey: 'grammar', action: { type: 'message', text: '灵宠园修建中...' } },
      { key: 'storage', title: '仓库', iconKey: 'listening', action: { type: 'message', text: '储物袋整理中...' } },
    ],
  },
  {
    sceneId: 'farm',
    title: '虚空秘境',
    unlockRealm: 3,
    subNodes: [
      { key: 'dungeon', title: '副本', iconKey: 'writing', action: { type: 'mijing' } },
      { key: 'event', title: '活动', iconKey: 'speaking', action: { type: 'message', text: '秘境异象尚未开启' } },
      { key: 'world-boss', title: '世界挑战', iconKey: 'reading', action: { type: 'message', text: '上古大妖沉睡中...' } },
    ],
  },
];
