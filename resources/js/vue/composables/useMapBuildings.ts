import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import type { MapBuildingAction, SceneBuildingId } from '../data/mapBuildings';
import { MAP_BUILDING_DEFS } from '../data/mapBuildings';
import abilityReading from '../../../assets/images/ui/ability_reading.png';
import abilityVocab from '../../../assets/images/ui/ability_vocab.png';
import abilityGrammar from '../../../assets/images/ui/ability_grammar.png';
import abilityListening from '../../../assets/images/ui/ability_listening.png';
import abilityWriting from '../../../assets/images/ui/ability_writing.png';
import abilitySpeaking from '../../../assets/images/ui/ability_speaking.png';
import hallPractice from '../../../assets/images/ui/hall_practice.png';
import hallShilianchang from '../../../assets/images/ui/hall_shilianchang.png';
import hallReading from '../../../assets/images/ui/hall_reading.png';
import hallWriting from '../../../assets/images/ui/hall_writing.png';
import hallMijing from '../../../assets/images/ui/hall_mijing.png';
import hallDemons from '../../../assets/images/ui/hall_demons.png';
import hallProfile from '../../../assets/images/ui/hall_profile.png';

const ABILITY_ICONS = {
  vocab: abilityVocab,
  grammar: abilityGrammar,
  reading: abilityReading,
  listening: abilityListening,
  writing: abilityWriting,
  speaking: abilitySpeaking,
} as const;

const SCENE_BUILDING_IMAGES: Record<SceneBuildingId, string> = {
  sectHall: hallPractice,
  swordHall: hallWriting,
  scriptureHall: hallReading,
  alchemyHall: hallShilianchang,
  innerDemonHall: hallDemons,
  beastGarden: hallProfile,
  farm: hallMijing,
};

export interface MapBuildingHandlers {
  goPractice: (mode: string) => void;
  goReading: () => void;
  goExam: () => void;
  goMijing: () => void;
  goMall?: () => void;
  showDailyQuest: () => void;
  showAchievements: () => void;
  showProfile: () => void;
  showReview: () => void;
  showDemons: () => void;
  showInnerDemon: (autoChallenge: boolean) => void;
}

function resolveAction(action: MapBuildingAction, handlers: MapBuildingHandlers) {
  switch (action.type) {
    case 'practice':
      handlers.goPractice(action.mode);
      break;
    case 'reading':
      handlers.goReading();
      break;
    case 'exam':
      handlers.goExam();
      break;
    case 'mijing':
      handlers.goMijing();
      break;
    case 'mall':
      handlers.goMall?.();
      break;
    case 'dailyQuest':
      handlers.showDailyQuest();
      break;
    case 'achievements':
      handlers.showAchievements();
      break;
    case 'profile':
      handlers.showProfile();
      break;
    case 'review':
      handlers.showReview();
      break;
    case 'demons':
      handlers.showDemons();
      break;
    case 'innerDemon':
      handlers.showInnerDemon(action.autoChallenge);
      break;
    case 'message':
      ElMessage.info(action.text);
      break;
    default:
      break;
  }
}

export function useMapBuildings(handlers: MapBuildingHandlers) {
  const mapBuildings = computed(() =>
    MAP_BUILDING_DEFS.map((def) => ({
      key: def.sceneId,
      title: def.title,
      unlockRealm: def.unlockRealm,
      subNodes: def.subNodes.map((node) => ({
        key: node.key,
        title: node.title,
        icon: ABILITY_ICONS[node.iconKey],
        onClick: () => resolveAction(node.action, handlers),
      })),
    }))
  );

  return { mapBuildings };
}

export function getSceneBuildingImages() {
  return { ...SCENE_BUILDING_IMAGES };
}

export function findMapBuilding(buildings: Array<{ key: string }>, sceneId: string) {
  return buildings.find((building) => building.key === sceneId) ?? null;
}
