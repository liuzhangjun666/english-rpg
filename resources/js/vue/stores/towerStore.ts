import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '../services/api';
import type {
  TowerStatus,
  TowerRunPayload,
  TowerStatusPayload,
  SettleResult,
} from '../types/wanyaoTower';

export const useTowerStore = defineStore('tower', () => {
  const status = ref<TowerStatus>('idle');
  const currentFloor = ref(1);
  const highestFloor = ref(0);
  const inProgressRunId = ref<number | null>(null);
  const currentRun = ref<TowerRunPayload | null>(null);
  const answerIndex = ref(0); // 当前答到第几题
  const correctMap = ref<Record<number, boolean>>({});
  const lastSettle = ref<SettleResult | null>(null);

  async function fetchStatus(): Promise<void> {
    const api = useApiClient();
    const data = (await api.get('/wanyao-tower/status')) as TowerStatusPayload;
    currentFloor.value = data.current_floor;
    highestFloor.value = data.highest_floor;
    inProgressRunId.value = data.in_progress_run_id;
  }

  async function startRun(): Promise<void> {
    status.value = 'starting';
    try {
      const api = useApiClient();
      const data = (await api.post('/wanyao-tower/start', null)) as TowerRunPayload;
      currentRun.value = data;
      answerIndex.value = 0;
      correctMap.value = {};
      status.value = 'answering';
    } catch (e) {
      status.value = 'idle';
      throw e;
    }
  }

  async function submitAnswer(qid: number, answer: string): Promise<boolean> {
    if (!currentRun.value) {
      throw new Error('No active tower run');
    }
    const api = useApiClient();
    const data = (await api.post('/wanyao-tower/answer', {
      run_id: currentRun.value.run_id,
      qid,
      answer,
    })) as { correct: boolean };
    correctMap.value[qid] = data.correct;
    return data.correct;
  }

  function advanceAfterAnswer(): void {
    answerIndex.value++;
    if (currentRun.value && answerIndex.value >= currentRun.value.questions.length) {
      status.value = 'boss';
    }
  }

  async function settle(bossText: string | null): Promise<void> {
    if (!currentRun.value) {
      throw new Error('No active tower run');
    }
    status.value = 'settling';
    const api = useApiClient();
    const data = (await api.post('/wanyao-tower/settle', {
      run_id: currentRun.value.run_id,
      boss_text: bossText,
    })) as SettleResult;
    lastSettle.value = data;
    status.value = data.cleared ? 'reward' : 'failed';
    if (data.cleared) {
      currentFloor.value = data.new_floor;
      highestFloor.value = data.highest_floor;
    }
    currentRun.value = null;
  }

  async function abandon(): Promise<void> {
    if (!currentRun.value) return;
    const api = useApiClient();
    await api.post('/wanyao-tower/abandon', { run_id: currentRun.value.run_id });
    currentRun.value = null;
    status.value = 'idle';
    inProgressRunId.value = null;
  }

  function resetToIdle(): void {
    status.value = 'idle';
    lastSettle.value = null;
  }

  return {
    status,
    currentFloor,
    highestFloor,
    inProgressRunId,
    currentRun,
    answerIndex,
    correctMap,
    lastSettle,
    fetchStatus,
    startRun,
    submitAnswer,
    advanceAfterAnswer,
    settle,
    abandon,
    resetToIdle,
  };
});
