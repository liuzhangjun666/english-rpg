import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useUserStore } from '../stores/user';

export const SPIRIT_RECOVER_INTERVAL_SECONDS = 300;

export type SpiritPowerView = {
  current: number;
  max: number;
  isNaturalFull: boolean;
  countdownText: string;
};

export function getSpiritPowerView(
  profile: Record<string, any> | null | undefined,
  nowMs = Date.now(),
): SpiritPowerView {
  const max = Math.max(0, Number(profile?.spirit_power_max ?? 100));
  const stored = Math.max(0, Number(profile?.spirit_power ?? 0));

  if (max <= 0) {
    return { current: stored, max, isNaturalFull: true, countdownText: '--' };
  }

  if (stored >= max) {
    return {
      current: stored,
      max,
      isNaturalFull: true,
      countdownText: stored > max ? '溢满' : '已满',
    };
  }

  const rawLast = profile?.spirit_power_last_recover_at;
  const parsed = rawLast ? new Date(rawLast).getTime() : nowMs;
  const lastMs = Number.isFinite(parsed) ? parsed : nowMs;
  const elapsedSec = Math.max(0, Math.floor((nowMs - lastMs) / 1000));
  const ticks = Math.floor(elapsedSec / SPIRIT_RECOVER_INTERVAL_SECONDS);
  const current = Math.min(max, stored + ticks);

  if (current >= max) {
    return { current: max, max, isNaturalFull: true, countdownText: '已满' };
  }

  const remainSec = SPIRIT_RECOVER_INTERVAL_SECONDS - (elapsedSec % SPIRIT_RECOVER_INTERVAL_SECONDS);
  const mm = String(Math.floor(remainSec / 60)).padStart(2, '0');
  const ss = String(remainSec % 60).padStart(2, '0');

  return {
    current,
    max,
    isNaturalFull: false,
    countdownText: `${mm}:${ss}`,
  };
}

export function useSpiritPower() {
  const user = useUserStore();
  const nowMs = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;

  const view = computed(() => getSpiritPowerView(user.profile, nowMs.value));

  const spiritTitle = computed(() => {
    const { current, max, countdownText, isNaturalFull } = view.value;
    if (isNaturalFull) {
      return current > max
        ? `灵力 ${current}/${max}（道具溢出，自然恢复已满）`
        : `灵力 ${current}/${max}（已满）`;
    }
    return `灵力 ${current}/${max}，${countdownText} 后恢复 1 点`;
  });

  onMounted(() => {
    timer = setInterval(() => {
      nowMs.value = Date.now();
    }, 1000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { view, spiritTitle };
}
