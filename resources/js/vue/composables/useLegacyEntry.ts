import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useUiStore } from '../stores/ui';

export function useLegacyEntry() {
  const ui = useUiStore();
  const entering = ref(false);

  async function enter(label: string, task: () => Promise<void>) {
    if (entering.value) return;
    entering.value = true;
    ui.showLoading(label);
    try {
      await task();
    } catch {
      ElMessage.error('页面加载失败，请重试');
    } finally {
      ui.hideLoading();
      entering.value = false;
    }
  }

  return {
    entering,
    enter,
  };
}
