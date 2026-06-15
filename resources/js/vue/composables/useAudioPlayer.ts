import { ref, onUnmounted } from 'vue';

export function useAudioPlayer() {
  const audio = ref<HTMLAudioElement | null>(null);
  const isPlaying = ref(false);
  const replayCount = ref(0);
  const maxReplays = ref(2); // 默认最多重播2次

  /**
   * 初始化并加载音频
   * @param src 音频URL
   */
  const loadAudio = (src: string) => {
    stop();
    audio.value = new Audio(src);
    audio.value.onended = () => {
      isPlaying.value = false;
    };
    audio.value.onerror = () => {
      isPlaying.value = false;
      console.error('音频加载失败:', src);
    };
  };

  /**
   * 播放音频
   * @param isReplay 是否计入重播次数
   * @returns boolean 是否允许播放
   */
  const play = (isReplay = false): boolean => {
    if (!audio.value) return false;
    
    if (isReplay) {
      if (replayCount.value >= maxReplays.value) {
        return false; // 超过重放限制
      }
      replayCount.value++;
    }

    isPlaying.value = true;
    audio.value.currentTime = 0;
    audio.value.play().catch(e => {
      console.error('播放失败:', e);
      isPlaying.value = false;
    });
    return true;
  };

  /**
   * 停止播放
   */
  const stop = () => {
    if (audio.value) {
      audio.value.pause();
      audio.value.currentTime = 0;
    }
    isPlaying.value = false;
  };

  /**
   * 重置重播次数
   */
  const resetReplayCount = () => {
    replayCount.value = 0;
  };

  onUnmounted(() => {
    stop();
    audio.value = null;
  });

  return {
    isPlaying,
    replayCount,
    maxReplays,
    loadAudio,
    play,
    stop,
    resetReplayCount
  };
}
