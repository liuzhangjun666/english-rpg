import { computed, ref, watch, type Ref } from 'vue';
import type { WritingValidation } from '../utils/writingTalisman';

export type ForgePhase = 'brief' | 'forge';

export type ForgeAngle = {
  id: string;
  label: string;
  hint: string;
  icon: string;
};

export const FORGE_ANGLES: ForgeAngle[] = [
  { id: 'examples', label: '例证为引', hint: '每段用一个具体例子支撑观点，如 for example / such as', icon: '📌' },
  { id: 'structure', label: '三段定势', hint: '首段总起 → 中段分述 2–3 点 → 末段总结', icon: '📐' },
  { id: 'voice', label: '以我灵笔', hint: '用 I think / In my experience 写出个人体会', icon: '✒️' },
];

export const RUNE_META: Record<string, { label: string; glyph: string }> = {
  nonEmpty: { label: '起笔', glyph: '墨' },
  firstUppercase: { label: '开光', glyph: '光' },
  endPunctuation: { label: '封缄', glyph: '缄' },
  minWords: { label: '充盈', glyph: '盈' },
  minLength: { label: '充盈', glyph: '盈' },
  requiredWords: { label: '聚灵', glyph: '灵' },
};

export function useWritingForge(options: {
  minWords: Ref<number>;
  liveValidation: Ref<WritingValidation | null>;
  content: Ref<string>;
  skipBrief?: Ref<boolean>;
}) {
  const phase = ref<ForgePhase>('brief');
  const selectedAngle = ref<ForgeAngle | null>(null);
  const forgeHeat = ref(0);
  const inkStreak = ref(0);
  let lastWordCount = 0;

  const showBrief = computed(() => {
    if (options.skipBrief?.value) return false;
    return options.minWords.value >= 60;
  });

  const runeNodes = computed(() => {
    const checks = options.liveValidation.value?.checks || [];
    const seen = new Set<string>();
    return checks
      .filter((c) => {
        if (seen.has(c.key)) return false;
        seen.add(c.key);
        return true;
      })
      .map((c) => ({
        key: c.key,
        label: RUNE_META[c.key]?.label || c.label,
        glyph: RUNE_META[c.key]?.glyph || '符',
        passed: c.passed,
      }));
  });

  const runesLit = computed(() => runeNodes.value.filter((r) => r.passed).length);
  const runesTotal = computed(() => runeNodes.value.length);
  const talismanGrade = computed(() => {
    if (!runesTotal.value) return 'blank';
    const ratio = runesLit.value / runesTotal.value;
    if (ratio >= 1) return 'perfect';
    if (ratio >= 0.6) return 'forming';
    if (ratio > 0) return 'sketch';
    return 'blank';
  });

  const sealReady = computed(() => {
    const v = options.liveValidation.value;
    return Boolean(v && v.status !== 'fail' && options.content.value.trim());
  });

  watch(
    () => options.content.value,
    () => {
      const words = options.content.value.trim().split(/\s+/).filter(Boolean).length;
      if (words > lastWordCount) {
        inkStreak.value += 1;
        forgeHeat.value = Math.min(100, forgeHeat.value + 4);
      } else if (words < lastWordCount) {
        inkStreak.value = 0;
        forgeHeat.value = Math.max(0, forgeHeat.value - 8);
      }
      lastWordCount = words;
      if (forgeHeat.value > 0 && inkStreak.value === 0) {
        forgeHeat.value = Math.max(0, forgeHeat.value - 1);
      }
    }
  );

  watch(
    () => options.liveValidation.value?.passedCount,
    (passed) => {
      if (passed && passed > 0) {
        forgeHeat.value = Math.min(100, forgeHeat.value + passed * 3);
      }
    }
  );

  function startForge(angle?: ForgeAngle) {
    selectedAngle.value = angle || FORGE_ANGLES[0];
    phase.value = 'forge';
  }

  function resetForge() {
    phase.value = showBrief.value ? 'brief' : 'forge';
    selectedAngle.value = null;
    forgeHeat.value = 0;
    inkStreak.value = 0;
    lastWordCount = 0;
  }

  function insertSpiritWord(word: string, textarea: HTMLTextAreaElement | null) {
    if (!textarea) {
      options.content.value = `${options.content.value}${options.content.value ? ' ' : ''}${word}`;
      return;
    }
    const start = textarea.selectionStart ?? options.content.value.length;
    const end = textarea.selectionEnd ?? start;
    const before = options.content.value.slice(0, start);
    const after = options.content.value.slice(end);
    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
    const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
    const insert = `${needsSpaceBefore ? ' ' : ''}${word}${needsSpaceAfter ? ' ' : ''}`;
    options.content.value = before + insert + after;
    const cursor = start + insert.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return {
    phase,
    selectedAngle,
    forgeHeat,
    inkStreak,
    showBrief,
    runeNodes,
    runesLit,
    runesTotal,
    talismanGrade,
    sealReady,
    startForge,
    resetForge,
    insertSpiritWord,
    FORGE_ANGLES,
  };
}
