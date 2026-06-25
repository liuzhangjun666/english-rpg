import iconVocab from '../../../assets/images/ui/arcade/icon_mode_vocab_rune_hunt.svg';
import iconGrammar from '../../../assets/images/ui/arcade/icon_mode_grammar_forge.svg';
import iconReading from '../../../assets/images/ui/arcade/icon_mode_reading_detective.svg';
import iconListening from '../../../assets/images/ui/arcade/icon_mode_listening_echo.svg';
import iconWriting from '../../../assets/images/ui/arcade/icon_mode_writing_spellcraft.svg';
import iconSpeaking from '../../../assets/images/ui/arcade/icon_mode_speaking_duel.svg';

export type ArcadeModeId =
  | 'vocab_rune_hunt'
  | 'grammar_forge'
  | 'reading_detective'
  | 'listening_echo'
  | 'writing_spellcraft'
  | 'speaking_duel';

export type ArcadeAbility = 'vocab' | 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking';

export type PracticeVariant = 'classic' | 'arcade';

const ARCADE_ICON_BY_ID: Record<ArcadeModeId, string> = {
  vocab_rune_hunt: iconVocab,
  grammar_forge: iconGrammar,
  reading_detective: iconReading,
  listening_echo: iconListening,
  writing_spellcraft: iconWriting,
  speaking_duel: iconSpeaking,
};

export interface ArcadeScoreRule {
  basePerAction: number;
  comboStep: number;
  comboCap: number;
  missPenalty: number;
  timeoutPenalty: number;
  bonusTrigger?: string;
  bonusScore?: number;
}

export interface ArcadeRewardRule {
  expBase: number;
  stoneBase: number;
  tokenBase: number;
  scoreDivisor: number;
  streakBonusPer3: number;
  rankMultiplier: {
    s: number;
    a: number;
    b: number;
    c: number;
  };
}

export interface ArcadeModeDefinition {
  id: ArcadeModeId;
  title: string;
  ability: ArcadeAbility;
  durationSec: number;
  coreLoop: string[];
  failState: string[];
  score: ArcadeScoreRule;
  reward: ArcadeRewardRule;
  iconPath: string;
  iconPrompt: string;
}

export const ARCADE_MODE_DEFS: ArcadeModeDefinition[] = [
  {
    id: 'vocab_rune_hunt',
    title: '符文追猎',
    ability: 'vocab',
    durationSec: 90,
    coreLoop: [
      '每回合给出目标词义，场上掉落字母符文',
      '玩家在时限内拖拽符文拼出目标单词',
      '连续拼对提升连击倍率，错拼会断连',
    ],
    failState: ['本回合超时', '拼写错误超过 3 次'],
    score: {
      basePerAction: 120,
      comboStep: 0.18,
      comboCap: 2.2,
      missPenalty: 45,
      timeoutPenalty: 70,
      bonusTrigger: '无误连拼 10 词',
      bonusScore: 240,
    },
    reward: {
      expBase: 24,
      stoneBase: 18,
      tokenBase: 3,
      scoreDivisor: 260,
      streakBonusPer3: 0.08,
      rankMultiplier: { s: 1.35, a: 1.18, b: 1.0, c: 0.82 },
    },
    iconPath: iconVocab,
    iconPrompt:
      'A glowing ancient scroll with letter runes swirling into full English words, cyan and gold, fantasy RPG icon, no text.',
  },
  {
    id: 'grammar_forge',
    title: '句式铸炉',
    ability: 'grammar',
    durationSec: 100,
    coreLoop: [
      '给出词块与语法约束（时态/语序/从句）',
      '玩家拖拽词块到句槽，组出正确句式',
      '语法正确且语义成立才判定成功',
    ],
    failState: ['错误组句 4 次', '回合时间耗尽'],
    score: {
      basePerAction: 140,
      comboStep: 0.16,
      comboCap: 2.0,
      missPenalty: 50,
      timeoutPenalty: 80,
      bonusTrigger: '连续 5 句零错误',
      bonusScore: 260,
    },
    reward: {
      expBase: 26,
      stoneBase: 18,
      tokenBase: 3,
      scoreDivisor: 280,
      streakBonusPer3: 0.08,
      rankMultiplier: { s: 1.35, a: 1.18, b: 1.0, c: 0.82 },
    },
    iconPath: iconGrammar,
    iconPrompt:
      'A floating forge anvil forming a sentence chain from grammar runes, blue flame and amber highlights, clean game icon, no text.',
  },
  {
    id: 'reading_detective',
    title: '残卷推理',
    ability: 'reading',
    durationSec: 120,
    coreLoop: [
      '阅读短文并在文段中标注证据句',
      '根据线索回答因果/动机/时间线问题',
      '证据命中越高，推理分越高',
    ],
    failState: ['关键证据误判超过 3 次', '最终推理错误'],
    score: {
      basePerAction: 160,
      comboStep: 0.14,
      comboCap: 1.9,
      missPenalty: 55,
      timeoutPenalty: 90,
      bonusTrigger: '全证据命中',
      bonusScore: 300,
    },
    reward: {
      expBase: 30,
      stoneBase: 20,
      tokenBase: 4,
      scoreDivisor: 300,
      streakBonusPer3: 0.1,
      rankMultiplier: { s: 1.38, a: 1.2, b: 1.0, c: 0.82 },
    },
    iconPath: iconReading,
    iconPrompt:
      'A jade magnifier over an ancient manuscript with highlighted clue lines, teal and gold fantasy style, no text.',
  },
  {
    id: 'listening_echo',
    title: '回声识音',
    ability: 'listening',
    durationSec: 90,
    coreLoop: [
      '播放切片语音，玩家重排时间轴片段',
      '可使用慢放/降噪技能，但会扣分',
      '片段顺序与关键词同时正确才过关',
    ],
    failState: ['误排 4 次', '关键词漏判超过阈值'],
    score: {
      basePerAction: 130,
      comboStep: 0.17,
      comboCap: 2.1,
      missPenalty: 48,
      timeoutPenalty: 76,
      bonusTrigger: '无技能通关',
      bonusScore: 220,
    },
    reward: {
      expBase: 24,
      stoneBase: 18,
      tokenBase: 3,
      scoreDivisor: 270,
      streakBonusPer3: 0.08,
      rankMultiplier: { s: 1.35, a: 1.18, b: 1.0, c: 0.82 },
    },
    iconPath: iconListening,
    iconPrompt:
      'A bronze bell emitting concentric sound waves and phoneme runes, purple-blue gradient background, no text.',
  },
  {
    id: 'writing_spellcraft',
    title: '灵符速写',
    ability: 'writing',
    durationSec: 120,
    coreLoop: [
      '给定情境与限制词，在倒计时内完成微写作',
      '实时反馈关键词覆盖、句式多样与语法风险',
      '结束后按结构完整度与表达清晰度评分',
    ],
    failState: ['字数不足下限', '限制词命中不足'],
    score: {
      basePerAction: 180,
      comboStep: 0.12,
      comboCap: 1.8,
      missPenalty: 60,
      timeoutPenalty: 95,
      bonusTrigger: '限制词全部高质量命中',
      bonusScore: 320,
    },
    reward: {
      expBase: 32,
      stoneBase: 20,
      tokenBase: 4,
      scoreDivisor: 320,
      streakBonusPer3: 0.1,
      rankMultiplier: { s: 1.4, a: 1.22, b: 1.0, c: 0.8 },
    },
    iconPath: iconWriting,
    iconPrompt:
      'A calligraphy brush writing luminous English lines on talisman paper, cyan and orange glow, fantasy icon, no text.',
  },
  {
    id: 'speaking_duel',
    title: '音律对决',
    ability: 'speaking',
    durationSec: 100,
    coreLoop: [
      'NPC 连续发问，玩家进行跟读与应答',
      '系统按发音清晰度、节奏与关键词打分',
      '连击来自稳定命中与情绪语调匹配',
    ],
    failState: ['关键回合连续失败 3 次', '有效音频不足'],
    score: {
      basePerAction: 170,
      comboStep: 0.15,
      comboCap: 2.0,
      missPenalty: 58,
      timeoutPenalty: 88,
      bonusTrigger: '关键回合全满分',
      bonusScore: 280,
    },
    reward: {
      expBase: 30,
      stoneBase: 20,
      tokenBase: 4,
      scoreDivisor: 300,
      streakBonusPer3: 0.1,
      rankMultiplier: { s: 1.38, a: 1.2, b: 1.0, c: 0.82 },
    },
    iconPath: iconSpeaking,
    iconPrompt:
      'Two spirit masks releasing speech waves that collide at center, dual crimson and blue, RPG icon style, no text.',
  },
];

export function getArcadeModeByAbility(ability: ArcadeAbility): ArcadeModeDefinition | undefined {
  return ARCADE_MODE_DEFS.find((def) => def.ability === ability);
}

export function getArcadeIcon(modeId: ArcadeModeId): string {
  return ARCADE_ICON_BY_ID[modeId];
}

export function parsePracticeVariant(raw: unknown): PracticeVariant {
  return String(raw || '').toLowerCase() === 'arcade' ? 'arcade' : 'classic';
}

const VARIANT_PREF_PREFIX = 'practice_variant_';

export function loadVariantPreference(ability: string): PracticeVariant {
  try {
    const saved = localStorage.getItem(`${VARIANT_PREF_PREFIX}${ability}`);
    if (saved === 'arcade' || saved === 'classic') return saved;
  } catch { /* ignore */ }
  return 'classic';
}

export function saveVariantPreference(ability: string, variant: PracticeVariant) {
  try {
    localStorage.setItem(`${VARIANT_PREF_PREFIX}${ability}`, variant);
  } catch { /* ignore */ }
}

/** 试炼玩法 MVP 已接入的模块 */
export const ARCADE_PLAYABLE_ABILITIES: ArcadeAbility[] = ['vocab', 'grammar', 'reading', 'listening'];

export function isArcadePlayable(ability: ArcadeAbility): boolean {
  return ARCADE_PLAYABLE_ABILITIES.includes(ability);
}

/** 试炼拼词仅保留 a-z，过滤空格/标点避免空白符文 */
export function sanitizeArcadeWord(raw: string): string {
  return String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function calcArcadeRank(score: number): 's' | 'a' | 'b' | 'c' {
  if (score >= 1800) return 's';
  if (score >= 1300) return 'a';
  if (score >= 900) return 'b';
  return 'c';
}

export function calcArcadeRewards(params: {
  mode: ArcadeModeDefinition;
  score: number;
  streakDays: number;
}): { exp: number; stones: number; tokens: number; rank: 's' | 'a' | 'b' | 'c' } {
  const { mode, score, streakDays } = params;
  const rank = calcArcadeRank(score);
  const rankMul = mode.reward.rankMultiplier[rank];
  const streakMul = 1 + Math.floor(Math.max(0, streakDays) / 3) * mode.reward.streakBonusPer3;
  const scoreFactor = Math.max(0, score) / Math.max(1, mode.reward.scoreDivisor);
  const totalMul = rankMul * streakMul;

  const exp = Math.max(0, Math.round((mode.reward.expBase + scoreFactor * 10) * totalMul));
  const stones = Math.max(0, Math.round((mode.reward.stoneBase + scoreFactor * 6) * totalMul));
  const tokens = Math.max(1, Math.round((mode.reward.tokenBase + scoreFactor * 2) * rankMul));

  return { exp, stones, tokens, rank };
}

