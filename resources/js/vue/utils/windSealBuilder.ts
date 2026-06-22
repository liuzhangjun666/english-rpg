export type WindSealLeaf = {
  id: string;
  text: string;
};

export type WindSealBlank = {
  id: string;
  answer: string;
};

export type WindSealPuzzle = {
  templateParts: string[];
  blanks: WindSealBlank[];
  leaves: WindSealLeaf[];
};

type WindSealSource = {
  listening_text?: string;
  question?: string;
  options?: Record<string, unknown> | Array<unknown>;
  wind_seal?: {
    template?: string;
    answers?: string[];
    distractors?: string[];
  };
};

function normalizeWord(value: string) {
  return value.trim().toLowerCase();
}

function parseWindSealMeta(options: WindSealSource['options']) {
  if (!options || Array.isArray(options)) return null;
  const meta = (options as Record<string, unknown>).__wind_seal;
  if (!meta || typeof meta !== 'object') return null;
  const seal = meta as { template?: string; answers?: string[]; distractors?: string[] };
  if (!seal.template || !Array.isArray(seal.answers) || seal.answers.length === 0) return null;
  return seal;
}

function splitTemplate(template: string) {
  const parts = template.split('___');
  const blankCount = Math.max(0, parts.length - 1);
  return { parts, blankCount };
}

function buildLeaves(answers: string[], distractors: string[]) {
  const leaves: WindSealLeaf[] = [];
  answers.forEach((text, index) => {
    leaves.push({ id: `a-${index}`, text });
  });
  distractors.forEach((text, index) => {
    leaves.push({ id: `d-${index}`, text });
  });
  for (let i = leaves.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
  }
  return leaves;
}

function autoBuild(listeningText: string, question: string): WindSealPuzzle | null {
  const text = listeningText.trim();
  if (!text) return null;

  const stop = new Set(['i', 'a', 'an', 'the', 'is', 'are', 'at', 'in', 'on', 'to', 'and', 'or', 'so', 'it', 'my', 'we', 'you', 'by', 'not']);
  const tokens = text.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);
  const candidates = tokens.filter((word) => !stop.has(word.toLowerCase()) && word.length > 2);
  if (candidates.length < 2) return null;

  const q = question.toLowerCase();
  const ranked = [...candidates].sort((a, b) => {
    const score = (word: string) => {
      let s = word.length;
      if (q.includes(word.toLowerCase())) s += 6;
      if (/\d/.test(word)) s += 4;
      return s;
    };
    return score(b) - score(a);
  });

  const answers = ranked.slice(0, Math.min(3, ranked.length));
  let template = text;
  for (const answer of answers) {
    template = template.replace(new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '___');
  }

  const distractors = ['school', 'window', 'coffee', 'garden', 'brother']
    .filter((word) => !answers.some((answer) => normalizeWord(answer) === normalizeWord(word)))
    .slice(0, 3);

  const { parts, blankCount } = splitTemplate(template);
  if (blankCount !== answers.length) return null;

  return {
    templateParts: parts,
    blanks: answers.map((answer, index) => ({ id: `b-${index}`, answer })),
    leaves: buildLeaves(answers, distractors),
  };
}

export function buildWindSeal(question: WindSealSource | null | undefined): WindSealPuzzle | null {
  if (!question) return null;

  const meta = question.wind_seal || parseWindSealMeta(question.options);
  if (meta?.template && Array.isArray(meta.answers)) {
    const { parts, blankCount } = splitTemplate(meta.template);
    if (blankCount !== meta.answers.length) return null;
    return {
      templateParts: parts,
      blanks: meta.answers.map((answer, index) => ({ id: `b-${index}`, answer: String(answer) })),
      leaves: buildLeaves(
        meta.answers.map(String),
        (meta.distractors || []).map(String),
      ),
    };
  }

  return autoBuild(
    String(question.listening_text || ''),
    String(question.question || ''),
  );
}

export function isBlankAnswerCorrect(answer: string, placed: string) {
  return normalizeWord(answer) === normalizeWord(placed);
}
