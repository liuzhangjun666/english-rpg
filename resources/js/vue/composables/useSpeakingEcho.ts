import { computed, ref, watch, type Ref } from 'vue';
import {
  buildStaffTokens,
  buildWaveBars,
  calcEchoMatch,
  getEchoTier,
  type StaffToken,
} from '../utils/speakingEcho';
import { speechSimilarity } from '../utils/speechSimilarity';

export type EchoState = 'ready' | 'casting' | 'returned';

export function useSpeakingEcho(expectedText: Ref<string>) {
  const echoState = ref<EchoState>('ready');
  const liveSpoken = ref('');
  const finalSpoken = ref('');
  const finalSimilarity = ref(0);
  const rippleTick = ref(0);

  const staffTokens = computed<StaffToken[]>(() => {
    const spoken = echoState.value === 'returned' ? finalSpoken.value : liveSpoken.value;
    return buildStaffTokens(expectedText.value, spoken);
  });

  const matchPercent = computed(() => {
    const spoken = echoState.value === 'returned' ? finalSpoken.value : liveSpoken.value;
    return calcEchoMatch(expectedText.value, spoken);
  });

  const tokensLit = computed(() => staffTokens.value.filter((t) => t.hit).length);
  const tokensTotal = computed(() => staffTokens.value.length);

  const waveBars = computed(() => buildWaveBars(matchPercent.value, 14, rippleTick.value));

  const echoTier = computed(() => {
    if (echoState.value !== 'returned') return null;
    return getEchoTier(finalSimilarity.value);
  });

  watch(liveSpoken, () => {
    if (echoState.value === 'casting') {
      rippleTick.value += 1;
    }
  });

  watch(expectedText, () => resetEcho());

  function resetEcho() {
    echoState.value = 'ready';
    liveSpoken.value = '';
    finalSpoken.value = '';
    finalSimilarity.value = 0;
    rippleTick.value = 0;
  }

  function startCast() {
    echoState.value = 'casting';
    liveSpoken.value = '';
    rippleTick.value = 0;
  }

  function returnEcho(spoken: string) {
    finalSpoken.value = spoken;
    finalSimilarity.value = speechSimilarity(expectedText.value, spoken);
    echoState.value = 'returned';
  }

  function retryCast() {
    echoState.value = 'ready';
    liveSpoken.value = '';
    finalSpoken.value = '';
    finalSimilarity.value = 0;
  }

  return {
    echoState,
    liveSpoken,
    finalSpoken,
    finalSimilarity,
    staffTokens,
    matchPercent,
    tokensLit,
    tokensTotal,
    waveBars,
    echoTier,
    resetEcho,
    startCast,
    returnEcho,
    retryCast,
  };
}
