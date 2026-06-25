export type ReadingClueSentence = {
  id: string;
  text: string;
};

export type ReadingDetectiveRound = {
  questionId: string;
  passageTitle: string;
  passage: string;
  sentences: ReadingClueSentence[];
  correctClueId: string;
  question: string;
  options: Array<{ id: string; key: string; label: string }>;
  correctKey: string;
  analysis: string;
};

function normalizeText(raw: string): string {
  return String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function splitPassageSentences(passage: string): string[] {
  const trimmed = String(passage || '').trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length) return parts;
  return [trimmed];
}

function pickPassageText(q: Record<string, unknown>, fallback = ''): string {
  const fromQuestion = String(
    q.reading_passage || q.passage || q.material || q.article || q.context || '',
  ).trim();
  if (fromQuestion.length >= 20) return fromQuestion;
  return String(fallback || '').trim();
}

function pickAnalysis(q: Record<string, unknown>): string {
  const explanation = String(q.explanation || '')
    .replace(/（来源[^）]*）/g, '')
    .replace(/\(来源[^)]*\)/g, '')
    .trim();
  if (explanation.length >= 4) return explanation;
  const clue = String(q.clue_sentence || '').trim();
  if (clue) return `关键证据句：${clue}`;
  return '请回到文中定位支撑答案的句子。';
}

function resolveClueId(sentences: ReadingClueSentence[], clueRaw: string): string {
  if (!sentences.length) return '';
  const clue = normalizeText(clueRaw);
  if (!clue) return sentences[Math.min(1, sentences.length - 1)]?.id || sentences[0].id;

  const exact = sentences.find((s) => normalizeText(s.text) === clue);
  if (exact) return exact.id;

  const partial = sentences.find((s) => {
    const norm = normalizeText(s.text);
    return norm.includes(clue) || clue.includes(norm);
  });
  if (partial) return partial.id;

  return sentences[Math.min(sentences.length - 1, 1)]?.id || sentences[0].id;
}

function mapOptions(q: Record<string, unknown>): Array<{ id: string; key: string; label: string }> {
  const questionId = String(q.question_id || '').trim();
  const options = (q.options && typeof q.options === 'object') ? q.options as Record<string, string> : {};
  let keys = ['A', 'B', 'C', 'D'].filter((k) => String(options[k] || '').trim());

  if (keys.length < 2) {
    const correct = String(q.correct_answer || '').trim();
    if (/^(T|TRUE|F|FALSE)$/i.test(correct)) {
      return [
        { id: `${questionId}-T`, key: 'T', label: 'True · 命题成立' },
        { id: `${questionId}-F`, key: 'F', label: 'False · 命题不成立' },
      ];
    }
    return [];
  }

  return keys.map((key) => ({
    id: `${questionId}-${key}`,
    key,
    label: String(options[key]).trim(),
  }));
}

function resolveCorrectKey(q: Record<string, unknown>, options: Array<{ key: string; label: string }>): string {
  const raw = String(q.correct_answer || '').trim();
  const upper = raw.toUpperCase();
  if (options.some((o) => o.key === upper)) return upper;

  if (upper === 'TRUE' && options.some((o) => o.key === 'T')) return 'T';
  if (upper === 'FALSE' && options.some((o) => o.key === 'F')) return 'F';

  const norm = normalizeText(raw);
  const byLabel = options.find((o) => normalizeText(o.label) === norm);
  if (byLabel) return byLabel.key;

  const partial = options.find((o) => {
    const labelNorm = normalizeText(o.label);
    return labelNorm.includes(norm) || norm.includes(labelNorm);
  });
  if (partial) return partial.key;

  return options[0]?.key || '';
}

export function isArcadeSuitableReading(q: Record<string, unknown>, passageFallback = ''): boolean {
  const passage = pickPassageText(q, passageFallback);
  const sentences = splitPassageSentences(passage);
  if (sentences.length < 1) return false;

  const stem = String(q.question || '').trim();
  if (!stem) return false;

  const options = mapOptions(q);
  if (options.length < 2) return false;

  const correctKey = resolveCorrectKey(q, options);
  if (!options.some((o) => o.key === correctKey)) return false;

  return true;
}

export function mapReadingArcadeRound(
  q: Record<string, unknown>,
  passageMeta?: { title?: string; content?: string },
): ReadingDetectiveRound | null {
  if (!isArcadeSuitableReading(q, String(passageMeta?.content || ''))) return null;

  const questionId = String(q.question_id || '').trim();
  const passage = pickPassageText(q, String(passageMeta?.content || ''));
  const sentenceTexts = splitPassageSentences(passage);
  const sentences: ReadingClueSentence[] = sentenceTexts.map((text, idx) => ({
    id: `${questionId}-s${idx}`,
    text,
  }));

  const options = mapOptions(q).sort(() => Math.random() - 0.5);
  const correctKey = resolveCorrectKey(q, options);
  const clueRaw = String(q.clue_sentence || '').trim();

  return {
    questionId,
    passageTitle: String(passageMeta?.title || '残卷密文').trim() || '残卷密文',
    passage,
    sentences,
    correctClueId: resolveClueId(sentences, clueRaw),
    question: String(q.question || '').trim(),
    options,
    correctKey,
    analysis: pickAnalysis(q),
  };
}

export function mapReadingArcadeRounds(
  questions: unknown[],
  passageMeta?: { title?: string; content?: string },
): ReadingDetectiveRound[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) => mapReadingArcadeRound((q || {}) as Record<string, unknown>, passageMeta))
    .filter((r): r is ReadingDetectiveRound => !!r)
    .slice(0, 8);
}
