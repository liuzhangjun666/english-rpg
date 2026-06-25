export type GrammarForgeRound = {
  questionId: string;
  hint: string;
  stemBefore: string;
  stemAfter: string;
  tokens: Array<{ id: string; key: string; label: string }>;
  correctKey: string;
};

/** 仅识别英文填空线，不把 ( ) 当作句槽 */
const BLANK_RE = /_{2,}|…+|\.{3,}/;

function pickHint(q: Record<string, unknown>): string {
  const explanation = String(q.explanation || '')
    .replace(/（来源[^）]*）/g, '')
    .replace(/\(来源[^)]*\)/g, '')
    .split('。')[0]
    .split('；')[0]
    .split(';')[0]
    .trim();
  if (explanation && explanation.length >= 6) return explanation;
  const stem = String(q.question || '').trim();
  if (stem.length <= 56) return stem;
  return stem.slice(0, 56) + '…';
}

function splitStem(stem: string): { before: string; after: string } {
  const match = stem.match(BLANK_RE);
  if (!match || match.index == null) {
    return { before: '', after: '' };
  }
  const idx = match.index;
  return {
    before: stem.slice(0, idx).trim(),
    after: stem.slice(idx + match[0].length).trim(),
  };
}

/** 试炼排除小学「选出不同类」等词汇题，保留语法填空/句法题 */
export function isArcadeSuitableGrammar(q: Record<string, unknown>): boolean {
  const stem = String(q.question || '').trim();
  if (!stem) return false;

  if (/选出不同类|不同类的一项|读一读，选|哪一项不同|different from others/i.test(stem)) {
    return false;
  }

  const blankMatches = stem.match(/_{2,}/g) || [];
  const hasBlank = blankMatches.length > 0;

  if (hasBlank) {
    if (blankMatches.length > 1) return false;
    if (/[a-zA-Z]/.test(stem)) return true;
    if (/填入|正确的|时态|语态|从句|被动|疑问句|否定句|复数|语序/.test(stem)) return true;
    return false;
  }

  return false;
}

export function mapGrammarArcadeRound(q: Record<string, unknown>): GrammarForgeRound | null {
  if (!isArcadeSuitableGrammar(q)) return null;

  const questionId = String(q.question_id || '').trim();
  const options = (q.options && typeof q.options === 'object') ? q.options as Record<string, string> : {};
  const keys = ['A', 'B', 'C', 'D'].filter((k) => String(options[k] || '').trim());
  const correctKey = String(q.correct_answer || '').trim().toUpperCase();
  if (!questionId || keys.length < 2 || !keys.includes(correctKey)) return null;

  const stem = String(q.question || '').trim().replace(/\s*\(\s*\)\s*$/g, '').trim();
  const { before, after } = splitStem(stem);
  if (!before && !after) return null;

  const tokens = keys
    .map((key) => ({
      id: `${questionId}-${key}`,
      key,
      label: String(options[key]).trim(),
    }))
    .sort(() => Math.random() - 0.5);

  return {
    questionId,
    hint: pickHint(q),
    stemBefore: before,
    stemAfter: after,
    tokens,
    correctKey,
  };
}

export function mapGrammarArcadeRounds(list: unknown[]): GrammarForgeRound[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((q) => mapGrammarArcadeRound((q || {}) as Record<string, unknown>))
    .filter((r): r is GrammarForgeRound => !!r)
    .slice(0, 10);
}
