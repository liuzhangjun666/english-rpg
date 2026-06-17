import { getDemonRealmInfo } from '../utils/demonRealm';

export interface RawDemonData {
  demon: {
    id?: number;
    wrong_count: number;
    reviewed_count: number;
    mastery: number;
  };
  question: {
    question_id: string;
    question: string;
    options: unknown;
    correct_answer: string;
  };
}

export class DemonViewModel {
  public id: string;
  public wrongCount: number;
  public mastery: number;
  public questionId: string;
  public questionText: string;
  public options: unknown;
  public correctAnswer: string;
  public rawData: any;

  constructor(raw: RawDemonData) {
    this.rawData = raw;
    this.id = String(raw.demon?.id || raw.question?.question_id || Math.random());
    this.wrongCount = Number(raw.demon?.wrong_count || 1);
    this.mastery = Number(raw.demon?.mastery || 0);
    this.questionId = raw.question?.question_id || '';
    this.questionText = raw.question?.question || this.questionId;
    this.options = raw.question?.options;
    this.correctAnswer = raw.question?.correct_answer || '';
  }

  get realm() {
    return getDemonRealmInfo(this.wrongCount);
  }

  get isBoss() {
    return this.wrongCount >= 10 && this.mastery < 50;
  }

  get sealProgress() {
    return this.mastery;
  }

  get title() {
    // 截取题目一部分作为心魔的化身称呼
    const shortText = this.questionText.length > 20 ? this.questionText.substring(0, 20) + '...' : this.questionText;
    return `${this.realm.name} · ${shortText}`;
  }

  get auraClass() {
    return this.realm.class;
  }
}
