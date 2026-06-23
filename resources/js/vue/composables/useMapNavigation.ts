import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/user';

export function useMapNavigation(options: { beforeNavigate?: () => void } = {}) {
  const router = useRouter();
  const userStore = useUserStore();

  function runNav(fn: () => void) {
    options.beforeNavigate?.();
    fn();
  }

  function isWritingUnlocked(): boolean {
    const realmCode = String(userStore.profile?.realm || 'L1').toUpperCase();
    const layer = Math.max(1, Math.min(9, Number(userStore.profile?.realm_stage || 1)));
    if (realmCode.startsWith('L')) {
      return layer >= 7;
    }
    return true;
  }

  function goPractice(mode = 'vocab') {
    if (String(mode) === 'writing' && !isWritingUnlocked()) {
      ElMessage.warning('符篆台将在练气七层解锁');
      return;
    }
    if (String(mode) === 'grammar') {
      runNav(() => { router.push('/grammar'); });
      return;
    }
    runNav(() => { router.push({ path: '/practice', query: { mode } }); });
  }

  function goReading() {
    runNav(() => { router.push('/reading'); });
  }

  function goExam() {
    runNav(() => { router.push('/exam'); });
  }

  function goMijing() {
    runNav(() => { router.push('/mijing'); });
  }

  function goMall() {
    runNav(() => { router.push('/mall'); });
  }

  function goLeaderboard() {
    runNav(() => { router.push('/leaderboard'); });
  }

  function goWorldBoss() {
    runNav(() => { router.push({ path: '/mijing', query: { mode: 'boss' } }); });
  }

  return {
    goPractice,
    goReading,
    goExam,
    goMijing,
    goWorldBoss,
    goLeaderboard,
    goMall,
  };
}
