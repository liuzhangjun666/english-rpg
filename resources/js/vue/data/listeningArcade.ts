import { buildWindSeal } from '../utils/windSealBuilder';

export type ListeningEchoRound = {
  questionId: string;
  question: string;
  listeningText: string;
  audioUrl: string;
  word: string;
  correctKey: string;
  options: Array<{ key: string; text: string }>;
  windSeal?: {
    template?: string;
    answers?: string[];
    distractors?: string[];
  };
};

export function mapListeningArcadeRounds(rawList: any[]): ListeningEchoRound[] {
  return rawList
    .map((raw) => {
      const opts = raw?.options;
      let options: Array<{ key: string; text: string }> = [];
      let windSeal: ListeningEchoRound['windSeal'];

      if (Array.isArray(opts)) {
        options = opts
          .map((item: any) => ({
            key: String(item?.key || '').trim().toUpperCase(),
            text: String(item?.text || '').trim(),
          }))
          .filter((item) => item.key && item.text);
      } else if (opts && typeof opts === 'object') {
        options = Object.entries(opts)
          .filter(([key]) => key !== '__wind_seal')
          .map(([key, text]) => ({
            key: String(key || '').trim().toUpperCase(),
            text: String(text ?? '').trim(),
          }))
          .filter((item) => item.key && item.text);

        const meta = (opts as Record<string, unknown>).__wind_seal;
        if (meta && typeof meta === 'object') {
          const seal = meta as { template?: string; answers?: string[]; distractors?: string[] };
          windSeal = {
            template: String(seal.template || '').trim(),
            answers: Array.isArray(seal.answers) ? seal.answers.map((item) => String(item || '').trim()).filter(Boolean) : [],
            distractors: Array.isArray(seal.distractors) ? seal.distractors.map((item) => String(item || '').trim()).filter(Boolean) : [],
          };
        }
      }

      const round: ListeningEchoRound = {
        questionId: String(raw?.question_id || '').trim(),
        question: String(raw?.question || raw?.stem || '').trim(),
        listeningText: String(raw?.listening_text || '').trim(),
        audioUrl: String(raw?.audio_url || raw?.audioUrl || '').trim(),
        word: String(raw?.word || '').trim(),
        correctKey: String(raw?.correct_answer || '').trim().toUpperCase(),
        options,
        windSeal,
      };

      return round;
    })
    .filter((round) => {
      if (!round.questionId || !round.correctKey || round.options.length < 2) return false;
      if (!round.listeningText && !round.audioUrl) return false;
      return Boolean(buildWindSeal({
        listening_text: round.listeningText,
        question: round.question,
        options: Object.fromEntries(round.options.map((item) => [item.key, item.text])),
        wind_seal: round.windSeal,
      }));
    })
    .slice(0, 8);
}
