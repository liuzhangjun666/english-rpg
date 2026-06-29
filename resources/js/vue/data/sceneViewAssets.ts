import sceneGrammar from '../../../assets/images/scene_grammar.png';
import { ARCADE_ASSETS } from './arcadeAssets';
import { writingAssets } from './writingAssets';
import { speakingAssets } from './speakingAssets';
import sceneTime from '../../../assets/images/ui/listening/scene_time.png';
import sceneLocation from '../../../assets/images/ui/listening/scene_location.png';
import sceneWeather from '../../../assets/images/ui/listening/scene_weather.png';
import sceneDialogue from '../../../assets/images/ui/listening/scene_dialogue.png';
import valleyBg from '../../../assets/images/ui/listening/valley_bg.png';
import windLeafIcon from '../../../assets/images/ui/listening/wind_leaf.png';
import sealPanelBg from '../../../assets/images/ui/listening/seal_panel.png';
import windBellPlay from '../../../assets/images/ui/listening/wind_bell_play.png';
import windChimeFragment from '../../../assets/images/ui/listening/wind_chime_fragment.png';
import hallListeningIcon from '../../../assets/images/ui/hall_listening.png';
import wsSceneBg from '../../../assets/images/ui/wood_stake/background.png';
import wsTopBack from '../../../assets/images/ui/wood_stake/back.png';
import wsTopHelp from '../../../assets/images/ui/wood_stake/introduction.png';
import wsTopTitlePlate from '../../../assets/images/ui/wood_stake/title.png';
import wsTopCombo from '../../../assets/images/ui/wood_stake/lianji.png';
import wsStakePlain from '../../../assets/images/ui/wood_stake/question.png';
import wsOptionBoard from '../../../assets/images/ui/wood_stake/choose.png';
import wsOptionBoardActive from '../../../assets/images/ui/wood_stake/correct_choose.png';
import wsFxHit from '../../../assets/images/ui/wood_stake/zhengquetexiao.png';
import zfSceneBg from '../../../assets/images/ui/zhenfafeng/background.png';
import zfTopBack from '../../../assets/images/ui/zhenfafeng/back.png';
import zfTopTitlePlate from '../../../assets/images/ui/zhenfafeng/title.png';
import zfQuestionPanel from '../../../assets/images/ui/zhenfafeng/question.png';
import zfOptionStone from '../../../assets/images/ui/zhenfafeng/choose.png';
import zfOptionStoneActive from '../../../assets/images/ui/zhenfafeng/correct_choose.png';
import zfBridgeCorrect from '../../../assets/images/ui/zhenfafeng/correct_bridge.png';
import zfBridgeError from '../../../assets/images/ui/zhenfafeng/error_bridge.png';
import fzSceneBg from '../../../assets/images/ui/writing/background.png';
import szSceneBg from '../../../assets/images/ui/speaking/background.png';
import cangjingBg from '../../../assets/images/ui/cangjingge/background.png';
import cangjingBack from '../../../assets/images/ui/cangjingge/back.png';
import cangjingQuestion from '../../../assets/images/ui/cangjingge/question.png';
import cangjingOption from '../../../assets/images/ui/cangjingge/options.png';

export type PracticeSceneMode = 'vocab' | 'grammar' | 'listening' | 'speaking' | 'writing' | 'reading';

function uniqueUrls(...groups: string[][]): string[] {
  return [...new Set(groups.flat().filter(Boolean))];
}

function urlsFromRecord(record: Record<string, string>): string[] {
  return uniqueUrls(Object.values(record));
}

const VOCAB_ASSETS = [
  wsSceneBg, wsTopBack, wsTopHelp, wsTopTitlePlate, wsTopCombo,
  wsStakePlain, wsOptionBoard, wsOptionBoardActive, wsFxHit,
];

const GRAMMAR_ASSETS = [
  zfSceneBg, zfTopBack, zfTopTitlePlate, zfQuestionPanel,
  zfOptionStone, zfOptionStoneActive, zfBridgeCorrect, zfBridgeError,
  sceneGrammar,
];

const LISTENING_ASSETS = uniqueUrls([
  valleyBg, windLeafIcon, sealPanelBg, windBellPlay, windChimeFragment, hallListeningIcon,
  sceneTime, sceneLocation, sceneWeather, sceneDialogue,
]);

const SPEAKING_ASSETS = uniqueUrls(urlsFromRecord(speakingAssets), [szSceneBg]);

const WRITING_ASSETS = uniqueUrls(urlsFromRecord(writingAssets), [fzSceneBg]);

const READING_ASSETS = [cangjingBg, cangjingBack, cangjingQuestion, cangjingOption];

const ARCADE_ALL = urlsFromRecord(ARCADE_ASSETS as unknown as Record<string, string>);

const MALL_ASSETS = ['/images/bg_hall_map.png'];

/** 练功房 / 语法峰各模式场景图 */
export function getPracticeSceneAssets(mode: string): string[] {
  const key = String(mode || 'vocab').toLowerCase();
  switch (key) {
    case 'grammar':
      return uniqueUrls(GRAMMAR_ASSETS, ARCADE_ALL);
    case 'listening':
      return LISTENING_ASSETS;
    case 'speaking':
      return SPEAKING_ASSETS;
    case 'writing':
      return WRITING_ASSETS;
    case 'reading':
      return uniqueUrls(READING_ASSETS, ARCADE_ALL);
    case 'vocab':
    default:
      return uniqueUrls(VOCAB_ASSETS, ARCADE_ALL);
  }
}

export function getReadingSceneAssets(): string[] {
  return uniqueUrls(READING_ASSETS, ARCADE_ALL);
}

export function getMallSceneAssets(): string[] {
  return MALL_ASSETS;
}

export const SCENE_ENTRY_TEXT: Record<string, string> = {
  vocab: '进入木桩练功房...',
  grammar: '进入阵法峰...',
  listening: '进入听风谷...',
  speaking: '进入诵咒峰...',
  writing: '进入符箓台...',
  reading: '进入藏经阁...',
  exam: '进入试炼场...',
  mijing: '进入秘境...',
  'wanyao-tower': '进入万妖塔...',
  mall: '进入灵石坊市...',
  leaderboard: '进入天骄榜...',
};
