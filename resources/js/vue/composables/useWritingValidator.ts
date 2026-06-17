import { computed, ref, watch, type Ref } from 'vue';
import {
  countWords,
  getValidationHeader,
  getWritingPlayMode,
  getWritingModeLabel,
  getWritingRules,
  validateWritingAnswer,
  type WritingPlayMode,
  type WritingValidation,
} from '../utils/writingTalisman';

export function useWritingValidator(prompt: Ref<Record<string, unknown> | null | undefined>, content: Ref<string>) {
  const liveValidation = ref<WritingValidation | null>(null);

  const playMode = computed<WritingPlayMode>(() => getWritingPlayMode(prompt.value));
  const modeLabel = computed(() => getWritingModeLabel(playMode.value));
  const rules = computed(() => getWritingRules(prompt.value));

  const minWords = computed(() => {
    const fromRules = rules.value.minWords;
    if (fromRules > 0) return fromRules;
    return Number(prompt.value?.word_limit_min || 50);
  });

  const maxWords = computed(() => Number(prompt.value?.word_limit_max || 150));

  const wordCount = computed(() => countWords(content.value));

  const inkPoolPercent = computed(() => {
    const ratio = wordCount.value / Math.max(1, minWords.value);
    return Math.min(100, Math.round(ratio * 100));
  });

  const isOverLimit = computed(() => wordCount.value > maxWords.value);

  const requiredWordStatus = computed(() => {
    const lower = content.value.toLowerCase();
    return rules.value.requiredWords.map((word) => ({
      word,
      active: lower.includes(word.toLowerCase()),
    }));
  });

  watch(
    [content, prompt],
    () => {
      if (!content.value.trim()) {
        liveValidation.value = null;
        return;
      }
      liveValidation.value = validateWritingAnswer(content.value, prompt.value);
    },
    { immediate: true }
  );

  function validate(): WritingValidation {
    const result = validateWritingAnswer(content.value, prompt.value);
    liveValidation.value = result;
    return result;
  }

  function validationHeader(status: WritingValidation['status']) {
    return getValidationHeader(status);
  }

  return {
    playMode,
    modeLabel,
    rules,
    minWords,
    maxWords,
    wordCount,
    inkPoolPercent,
    isOverLimit,
    requiredWordStatus,
    liveValidation,
    validate,
    validationHeader,
  };
}
