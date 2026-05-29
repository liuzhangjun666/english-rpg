import { ref } from 'vue';

export function useComboSystem() {
  const combo = ref(0);
  const maxCombo = ref(0);

  /**
   * 增加连击数
   */
  const addCombo = () => {
    combo.value++;
    if (combo.value > maxCombo.value) {
      maxCombo.value = combo.value;
    }
  };

  /**
   * 重置当前连击数（不断开最高连击记录）
   */
  const resetCombo = () => {
    combo.value = 0;
  };

  /**
   * 彻底清空，包含最高记录
   */
  const clearAll = () => {
    combo.value = 0;
    maxCombo.value = 0;
  };

  return {
    combo,
    maxCombo,
    addCombo,
    resetCombo,
    clearAll,
  };
}
