export type WritingPlayMode = 'template' | 'required_words' | 'upgrade' | 'topic' | 'continuation';

export type ValidationStatus = 'pass' | 'partial' | 'fail';

export type TalismanGrade = 'heaven' | 'earth' | 'human' | 'broken';

export interface WritingCheck {
  key: string;
  label: string;
  passed: boolean;
}

export interface WritingValidation {
  status: ValidationStatus;
  allPassed: boolean;
  checks: WritingCheck[];
  passedCount: number;
  totalCount: number;
  missingRequiredWords: string[];
  rules: {
    requiredWords: string[];
    minLength: number;
    minWords: number;
  };
}

export interface TalismanGradeInfo {
  grade: TalismanGrade;
  label: string;
  icon: string;
  color: string;
}

const MODE_LABELS: Record<WritingPlayMode, string> = {
  template: '📝 临摹符',
  required_words: '✒️ 聚灵符',
  upgrade: '🧩 续灵符',
  topic: '📜 开题符',
  continuation: '🧩 续灵符',
};

export function getWritingPlayMode(prompt: Record<string, unknown> | null | undefined): WritingPlayMode {
  const raw = String(prompt?.mode || prompt?.writing_mode || '').trim().toLowerCase();
  if (raw === 'template' || raw === 'template_sentence' || raw === 'sentence_template') return 'template';
  if (raw === 'required_words' || raw === 'keyword_sentence' || raw === '指定词造句') return 'required_words';
  if (raw === 'upgrade' || raw === 'sentence_upgrade' || raw === '句子升级') return 'upgrade';
  if (Array.isArray(prompt?.requiredWords) && prompt.requiredWords.length) return 'required_words';
  if (Array.isArray(prompt?.required_words) && prompt.required_words.length) return 'required_words';
  if (prompt?.writing_type === 'continuation') return 'continuation';
  if (prompt?.writing_type === 'topic') return 'topic';
  return 'template';
}

export function getWritingModeLabel(mode: WritingPlayMode): string {
  return MODE_LABELS[mode] || MODE_LABELS.template;
}

export function getWritingRules(prompt: Record<string, unknown> | null | undefined) {
  const requiredWordsRaw = prompt?.requiredWords
    || prompt?.required_words
    || (prompt?.rules as Record<string, unknown> | undefined)?.requiredWords
    || (prompt?.rules as Record<string, unknown> | undefined)?.required_words
    || [];
  const requiredWords = Array.isArray(requiredWordsRaw)
    ? requiredWordsRaw.map((w) => String(w || '').trim()).filter(Boolean)
    : String(requiredWordsRaw || '')
      .split(/[,\n，]/)
      .map((w) => w.trim())
      .filter(Boolean);
  const minLength = Number(
    prompt?.minLength
    || prompt?.min_length
    || (prompt?.rules as Record<string, unknown> | undefined)?.minLength
    || (prompt?.rules as Record<string, unknown> | undefined)?.min_length
    || 0
  );
  const minWords = Number(
    prompt?.minWords
    || prompt?.min_words
    || (prompt?.rules as Record<string, unknown> | undefined)?.minWords
    || (prompt?.rules as Record<string, unknown> | undefined)?.min_words
    || prompt?.word_limit_min
    || 0
  );
  return {
    requiredWords,
    minLength: Number.isFinite(minLength) && minLength > 0 ? Math.floor(minLength) : 0,
    minWords: Number.isFinite(minWords) && minWords > 0 ? Math.floor(minWords) : 0,
  };
}

export function countWords(text: string): number {
  const trimmed = String(text || '').trim();
  return trimmed ? trimmed.split(/\s+/).filter((w) => w.length > 0).length : 0;
}

export function validateWritingAnswer(answer: string, prompt: Record<string, unknown> | null | undefined): WritingValidation {
  const text = String(answer || '').trim();
  const rules = getWritingRules(prompt);
  const lower = text.toLowerCase();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const hasRequiredWords = rules.requiredWords.length > 0;
  const missingRequiredWords = hasRequiredWords
    ? rules.requiredWords.filter((w) => !lower.includes(String(w).toLowerCase()))
    : [];
  const minWordsTarget = rules.minWords || Number(prompt?.word_limit_min || 0);
  const checks: WritingCheck[] = [
    { key: 'nonEmpty', label: '灵墨落笔（内容非空）', passed: text.length > 0 },
    { key: 'firstUppercase', label: '符首开光（首字母大写）', passed: /^[A-Z]/.test(text) },
    { key: 'endPunctuation', label: '符尾封缄（句末标点 .?!）', passed: /[.?!]$/.test(text) },
  ];
  if (hasRequiredWords) {
    checks.push({ key: 'requiredWords', label: '灵词聚齐（包含指定词）', passed: missingRequiredWords.length === 0 });
  }
  if (rules.minLength > 0) {
    checks.push({ key: 'minLength', label: `灵墨充盈（至少 ${rules.minLength} 字符）`, passed: text.length >= rules.minLength });
  } else if (minWordsTarget > 0) {
    checks.push({ key: 'minWords', label: `灵墨充盈（至少 ${minWordsTarget} 词）`, passed: words.length >= minWordsTarget });
  }
  const passedCount = checks.filter((x) => x.passed).length;
  const totalCount = checks.length;
  const allPassed = passedCount === totalCount;
  const status: ValidationStatus = allPassed ? 'pass' : (passedCount >= Math.max(2, Math.ceil(totalCount * 0.6)) ? 'partial' : 'fail');
  return {
    status,
    allPassed,
    checks,
    passedCount,
    totalCount,
    missingRequiredWords,
    rules,
  };
}

export function getValidationHeader(status: ValidationStatus): { text: string; color: string } {
  if (status === 'pass') return { text: '符文圆满，可炼高阶符箓', color: '#9ee8bf' };
  if (status === 'partial') return { text: '符文初成，仍可继续打磨', color: '#f4dfa1' };
  return { text: '符文残缺，请补全要求', color: '#ffb3b3' };
}

export function getTalismanGrade(score: number): TalismanGradeInfo {
  if (score >= 90) {
    return { grade: 'heaven', label: '天符', icon: '🌟', color: '#ffd700' };
  }
  if (score >= 75) {
    return { grade: 'earth', label: '地符', icon: '✨', color: '#7bed9f' };
  }
  if (score >= 60) {
    return { grade: 'human', label: '人符', icon: '📜', color: '#f0c040' };
  }
  return { grade: 'broken', label: '残符', icon: '💔', color: '#ff6b6b' };
}

export function getInkPoolRatio(wordCount: number, minWords: number, maxWords: number): number {
  if (minWords <= 0) return Math.min(1, wordCount / Math.max(1, maxWords));
  return Math.min(1.2, wordCount / minWords);
}

export function draftStorageKey(userId: string | number, promptId: string): string {
  return `levelup_writing_draft_${userId}_${promptId}`;
}

export function saveWritingDraft(userId: string | number, promptId: string, content: string) {
  if (!promptId) return;
  localStorage.setItem(draftStorageKey(userId, promptId), content);
}

export function loadWritingDraft(userId: string | number, promptId: string): string {
  if (!promptId) return '';
  return localStorage.getItem(draftStorageKey(userId, promptId)) || '';
}

export function clearWritingDraft(userId: string | number, promptId: string) {
  if (!promptId) return;
  localStorage.removeItem(draftStorageKey(userId, promptId));
}

export function triggerWritingSceneEffect(effect: 'ink' | 'success' | 'partial' | 'fail' | 'heaven', ratio = 0) {
  const scene = (window as unknown as { game?: { scene?: { currentSceneObj?: Record<string, unknown> } } }).game?.scene?.currentSceneObj;
  if (!scene) return;
  if (effect === 'ink' && typeof scene.setInkLevel === 'function') {
    (scene.setInkLevel as (r: number) => void)(ratio);
  } else if (typeof scene.triggerForgeEffect === 'function') {
    (scene.triggerForgeEffect as (e: string) => void)(effect);
  }
}
