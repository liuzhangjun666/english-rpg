import { ref, onUnmounted } from 'vue';

export function usePracticeTimer() {
  const timerId = ref<number | null>(null);
  const isRunning = ref(false);

  /**
   * 启动一个延时定时器
   * @param callback 回调函数
   * @param ms 延迟毫秒数
   */
  const startTimer = (callback: () => void, ms: number) => {
    clearTimer();
    isRunning.value = true;
    timerId.value = window.setTimeout(() => {
      isRunning.value = false;
      callback();
    }, ms);
  };

  /**
   * 清除当前定时器
   */
  const clearTimer = () => {
    if (timerId.value !== null) {
      window.clearTimeout(timerId.value);
      timerId.value = null;
    }
    isRunning.value = false;
  };

  // 组件卸载时自动清理，防止内存泄露
  onUnmounted(() => {
    clearTimer();
  });

  return {
    isRunning,
    startTimer,
    clearTimer,
  };
}
