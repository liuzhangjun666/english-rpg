export const ASSESSMENT_REALM_BY_LEVEL: Record<number, string> = {
  1: '练气期',
  2: '练气期',
  3: '筑基期',
  4: '金丹期',
  5: '元婴期',
  6: '元婴期',
  7: '化神期',
};

export const ASSESSMENT_STAGE_BY_LEVEL: Record<number, string> = {
  1: '小学低段',
  2: '小学高段',
  3: '初中',
  4: '高中',
  5: '大学/四级',
  6: '六级/考研',
  7: '研究生/学术',
};

export const START_LEVEL_BY_SCHOOL_GRADE: Record<string, number> = {
  primary: 1,
  junior: 3,
  senior: 4,
  college: 5,
  graduate: 7,
};

export function realmLabelForLevel(level: number): string {
  return ASSESSMENT_REALM_BY_LEVEL[Number(level) || 1] || '练气期';
}

export function stageLabelForLevel(level: number): string {
  return ASSESSMENT_STAGE_BY_LEVEL[Number(level) || 1] || '未知';
}

export function formatAssessmentLevel(level: number): string {
  const lv = Number(level) || 1;
  return `L${lv} · ${realmLabelForLevel(lv)}`;
}
