import { normalizeSpeechText, speechSimilarity } from './speechSimilarity';

export type EchoTier = 'clear' | 'true' | 'muffled' | 'broken';

export type StaffToken = {
  word: string;
  hit: boolean;
};

export type EchoTierInfo = {
  tier: EchoTier;
  label: string;
  icon: string;
  color: string;
};

const TIER_TABLE: Array<{ min: number; info: EchoTierInfo }> = [
  { min: 0.9, info: { tier: 'clear', label: '清音', icon: '🔔', color: '#7ee8ff' } },
  { min: 0.75, info: { tier: 'true', label: '正音', icon: '🎵', color: '#9ee8bf' } },
  { min: 0.62, info: { tier: 'muffled', label: '含混', icon: '🌫️', color: '#f4dfa1' } },
  { min: 0, info: { tier: 'broken', label: '破音', icon: '💨', color: '#ff9e9e' } },
];

export function getEchoTier(similarity: number): EchoTierInfo {
  const ratio = Math.max(0, Math.min(1, similarity));
  for (const row of TIER_TABLE) {
    if (ratio >= row.min) return row.info;
  }
  return TIER_TABLE[TIER_TABLE.length - 1].info;
}

export function splitStaffWords(text: string): string[] {
  return normalizeSpeechText(text).split(' ').filter(Boolean);
}

export function buildStaffTokens(expected: string, spoken = ''): StaffToken[] {
  const words = splitStaffWords(expected);
  if (!words.length) return [];
  const said = new Set(splitStaffWords(spoken));
  return words.map((word) => ({ word, hit: said.has(word) }));
}

export function calcEchoMatch(expected: string, spoken: string): number {
  return Math.round(speechSimilarity(expected, spoken) * 100);
}

export function getEchoVerdict(similarity: number, passed: boolean): string {
  if (!passed) return '声未达崖，回声消散在雾里……再试一次？';
  const tier = getEchoTier(similarity);
  if (tier.tier === 'clear') return '清音贯谷，崖壁回响久久不散！';
  if (tier.tier === 'true') return '正音稳落，回声与真言相合。';
  if (tier.tier === 'muffled') return '含混但能入耳，继续练会更亮。';
  return '勉强传声过关。';
}

/** 生成声纹柱高度（0–1），基于共鸣与随机微抖 */
export function buildWaveBars(matchPercent: number, count = 12, seed = 0): number[] {
  const base = matchPercent / 100;
  return Array.from({ length: count }, (_, i) => {
    const wobble = Math.sin((i + seed) * 1.7) * 0.15;
    return Math.max(0.08, Math.min(1, base * 0.6 + wobble + (i % 3) * 0.06));
  });
}
