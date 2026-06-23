import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useMapBuildings } from './useMapBuildings';
import { useMapNavigation } from './useMapNavigation';

export function useHallPanels(options: { beforeNavigate?: () => void } = {}) {
  const router = useRouter();
  const panels = reactive({
    showReview: false,
    showDemons: false,
    showAchievements: false,
    showProfile: false,
    showDailyQuest: false,
    showSignIn: false,
    showEvents: false,
    showInnerDemon: false,
    innerDemonAutoChallenge: false,
    showParentDashboard: false,
    showAiAsk: false,
    showPets: false,
    showStorage: false,
    showMail: false,
    showSettings: false,
    showWorldBoss: false,
  });

  const {
    goPractice,
    goReading,
    goExam,
    goMijing,
    goLeaderboard,
    goMall,
  } = useMapNavigation({ beforeNavigate: options.beforeNavigate });

  const { mapBuildings } = useMapBuildings({
    goPractice,
    goReading,
    goExam,
    goMijing,
    goWorldBoss: () => {
      panels.showWorldBoss = true;
    },
    goLeaderboard,
    goMall,
    showDailyQuest: () => { panels.showDailyQuest = true; },
    showSignIn: () => { panels.showSignIn = true; },
    showEvents: () => { panels.showEvents = true; },
    showAchievements: () => { panels.showAchievements = true; },
    showProfile: () => { panels.showProfile = true; },
    showReview: () => { panels.showReview = true; },
    showDemons: () => { panels.showDemons = true; },
    showInnerDemon: (autoChallenge) => {
      panels.innerDemonAutoChallenge = autoChallenge;
      panels.showInnerDemon = true;
    },
    showAskHeart: () => { panels.showReview = true; },
    showAiAsk: () => { panels.showAiAsk = true; },
    showPets: () => { panels.showPets = true; },
    showStorage: () => { panels.showStorage = true; },
    showMail: () => { panels.showMail = true; },
    showSettings: () => { panels.showSettings = true; },
  });

  return {
    mapBuildings,
    panels,
    navigation: {
      goMijing,
      goWorldBoss: () => {
        options.beforeNavigate?.();
        router.push({ path: '/mijing', query: { mode: 'boss' } });
      },
    },
  };
}

export type HallPanelsState = ReturnType<typeof useHallPanels>['panels'];
