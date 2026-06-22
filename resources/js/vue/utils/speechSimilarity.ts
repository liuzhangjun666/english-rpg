export function normalizeSpeechText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0–1，基于词重叠的口语相似度（轻量，无需后端） */
export function speechSimilarity(expected: string, spoken: string): number {
  const target = normalizeSpeechText(expected);
  const said = normalizeSpeechText(spoken);
  if (!target || !said) return 0;
  if (target === said) return 1;
  if (said.includes(target) || target.includes(said)) return 0.92;

  const targetWords = target.split(' ').filter(Boolean);
  const saidWords = new Set(said.split(' ').filter(Boolean));
  if (!targetWords.length) return 0;

  let hits = 0;
  for (const word of targetWords) {
    if (saidWords.has(word)) hits += 1;
  }

  return hits / targetWords.length;
}

export const SPEAKING_PASS_THRESHOLD = 0.62;
