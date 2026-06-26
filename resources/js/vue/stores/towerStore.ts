import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '../services/api';
import type {
  TowerStatus,
  TowerRunPayload,
  TowerStatusPayload,
  SettleResult,
} from '../types/wanyaoTower';

function towerErrorMessage(data: Record<string, unknown> | null | undefined, fallback: string): string {
  if (!data) return fallback;
  if (typeof data.message === 'string' && data.message) return data.message;
  if (data.error === 'run_in_progress') return '已有进行中的闯关，正在为你恢复…';
  if (data.error === 'no_questions') return '题库不足，暂无法闯关';
  return fallback;
}

function isTowerRunPayload(data: unknown): data is TowerRunPayload {
  if (!data || typeof data !== 'object') return false;
  const payload = data as TowerRunPayload;
  return typeof payload.run_id === 'number'
    && Array.isArray(payload.questions)
    && payload.questions.length > 0;
}

export const useTowerStore = defineStore('tower', () => {
  const status = ref<TowerStatus>('idle');
  const currentFloor = ref(1);
  const highestFloor = ref(0);
  const inProgressRunId = ref<number | null>(null);
  const currentRun = ref<TowerRunPayload | null>(null);
  const answerIndex = ref(0);
  const correctMap = ref<Record<number, boolean>>({});
  const lastSettle = ref<SettleResult | null>(null);

  function applyRunPayload(data: TowerRunPayload) {
    if (!isTowerRunPayload(data)) {
      throw new Error('闯关数据异常，请稍后重试');
    }

    currentRun.value = data;
    inProgressRunId.value = data.run_id;
    answerIndex.value = data.answered_count ?? 0;
    correctMap.value = {};
    status.value = answerIndex.value >= data.questions.length ? 'boss' : 'answering';
  }

  async function fetchStatus(): Promise<void> {
    const api = useApiClient();
    const data = (await api.get('/wanyao-tower/status')) as TowerStatusPayload;
    currentFloor.value = data.current_floor;
    highestFloor.value = data.highest_floor;
    inProgressRunId.value = data.in_progress_run_id;
  }

  async function resumeRun(runId?: number | null): Promise<void> {
    const id = runId ?? inProgressRunId.value;
    if (!id) {
      throw new Error('没有进行中的闯关');
    }

    status.value = 'starting';
    try {
      const api = useApiClient();
      const data = await api.get(`/wanyao-tower/run/${id}`);
      if (data?.error) {
        throw new Error(towerErrorMessage(data, '恢复闯关失败'));
      }
      applyRunPayload(data as TowerRunPayload);
    } catch (e) {
      status.value = 'idle';
      throw e;
    }
  }

  async function startRun(): Promise<void> {
    status.value = 'starting';
    try {
      const api = useApiClient();
      const data = await api.post('/wanyao-tower/start', null);

      if (data?.error === 'run_in_progress' && data?.run_id) {
        await resumeRun(Number(data.run_id));
        return;
      }

      if (data?.error) {
        throw new Error(towerErrorMessage(data, '启动闯关失败'));
      }

      applyRunPayload(data as TowerRunPayload);
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
    const previousStatus = status.value;
    status.value = 'settling';
    try {
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
      inProgressRunId.value = null;
    } catch (e) {
      status.value = previousStatus;
      throw e;
    }
  }

  async function abandonInProgress(): Promise<void> {
    const runId = currentRun.value?.run_id ?? inProgressRunId.value;
    if (!runId) return;

    const api = useApiClient();
    await api.post('/wanyao-tower/abandon', { run_id: runId });
    currentRun.value = null;
    inProgressRunId.value = null;
    status.value = 'idle';
  }

  async function restartRun(): Promise<void> {
    if (inProgressRunId.value || currentRun.value) {
      await abandonInProgress();
    }
    await startRun();
  }

  async function abandon(): Promise<void> {
    await abandonInProgress();
  }

  function pauseRun(): void {
    if (currentRun.value) {
      inProgressRunId.value = currentRun.value.run_id;
    }
    currentRun.value = null;
    answerIndex.value = 0;
    correctMap.value = {};
    status.value = 'idle';
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
    resumeRun,
    submitAnswer,
    advanceAfterAnswer,
    settle,
    abandon,
    abandonInProgress,
    restartRun,
    pauseRun,
    resetToIdle,
  };
});
