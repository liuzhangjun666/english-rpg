import sceneTime from '../../../assets/images/ui/listening/scene_time.png';
import sceneLocation from '../../../assets/images/ui/listening/scene_location.png';
import sceneWeather from '../../../assets/images/ui/listening/scene_weather.png';
import sceneDialogue from '../../../assets/images/ui/listening/scene_dialogue.png';

export const WIND_CHIME_FRAGMENTS_KEY = 'listening_wind_chimes';

export const WIND_CHIME_TOPICS = [
  'time',
  'location',
  'weather',
  'number',
  'preference',
  'direction',
  'schedule',
  'action',
  'food',
  'transport',
] as const;

export type WindChimeTopic = (typeof WIND_CHIME_TOPICS)[number];

export const WIND_CHIME_LABELS: Record<WindChimeTopic, string> = {
  time: '时辰',
  location: '方位',
  weather: '天候',
  number: '数纹',
  preference: '偏好',
  direction: '指路',
  schedule: '日程',
  action: '行令',
  food: '食味',
  transport: '行旅',
};

/** CSS hue-rotate per topic so one sprite reads as nine distinct chimes. */
export const WIND_CHIME_HUE: Record<WindChimeTopic, number> = {
  time: 0,
  location: 42,
  weather: 95,
  number: 155,
  preference: 200,
  direction: 248,
  schedule: 285,
  action: 320,
  food: 12,
  transport: 68,
};

const SCENE_BY_TOPIC: Record<WindChimeTopic, string> = {
  time: sceneTime,
  schedule: sceneTime,
  number: sceneTime,
  location: sceneLocation,
  direction: sceneLocation,
  transport: sceneLocation,
  weather: sceneWeather,
  preference: sceneDialogue,
  action: sceneDialogue,
  food: sceneDialogue,
};

export function normalizeWindChimeTopic(raw: string): WindChimeTopic | null {
  const key = String(raw || '').trim().toLowerCase();
  return (WIND_CHIME_TOPICS as readonly string[]).includes(key) ? (key as WindChimeTopic) : null;
}

export function sceneImageForTopic(topic: string): string {
  const key = normalizeWindChimeTopic(topic);
  if (key) return SCENE_BY_TOPIC[key];
  return sceneDialogue;
}

export function readWindChimeFragments(): WindChimeTopic[] {
  try {
    const raw = localStorage.getItem(WIND_CHIME_FRAGMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeWindChimeTopic(String(item)))
      .filter((item): item is WindChimeTopic => Boolean(item));
  } catch {
    return [];
  }
}

export function collectWindChimeFragment(topic: string): boolean {
  const key = normalizeWindChimeTopic(topic);
  if (!key) return false;
  const list = readWindChimeFragments();
  if (list.includes(key)) return false;
  list.push(key);
  localStorage.setItem(WIND_CHIME_FRAGMENTS_KEY, JSON.stringify(list));
  return true;
}
