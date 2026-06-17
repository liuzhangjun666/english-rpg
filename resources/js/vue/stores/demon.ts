import { defineStore } from 'pinia';
import { ref } from 'vue';

export type DemonEncounterType = 'manual' | 'random' | 'tribulation' | 'boss' | 'story';
export type DemonTheme = 'red' | 'thunder' | 'boss' | 'void';

export const useDemonStore = defineStore('demon', () => {
  const isEncounterActive = ref(false);
  const encounterType = ref<DemonEncounterType>('manual');
  const encounterTheme = ref<DemonTheme>('red');
  const encounterTitle = ref('');
  const encounterSubtitle = ref('');
  const encounterQueue = ref<any[]>([]);
  let resolveEncounter: ((result: any) => void) | null = null;

  function triggerEncounter(questions: any[], options: {
    type?: DemonEncounterType;
    theme?: DemonTheme;
    title?: string;
    subtitle?: string;
  } = {}): Promise<any> {
    encounterQueue.value = questions;
    encounterType.value = options.type || 'manual';
    encounterTheme.value = options.theme || 'red';
    encounterTitle.value = options.title || '心魔突袭';
    encounterSubtitle.value = options.subtitle || '识海激荡，魔念横生';
    isEncounterActive.value = true;
    return new Promise((resolve) => {
      resolveEncounter = resolve;
    });
  }

  function finishEncounter(result: any) {
    isEncounterActive.value = false;
    encounterQueue.value = [];
    if (resolveEncounter) {
      resolveEncounter(result);
      resolveEncounter = null;
    }
  }

  return {
    isEncounterActive,
    encounterType,
    encounterTheme,
    encounterTitle,
    encounterSubtitle,
    encounterQueue,
    triggerEncounter,
    finishEncounter
  };
});
