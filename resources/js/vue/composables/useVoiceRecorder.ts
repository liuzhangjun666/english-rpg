import { ref, onUnmounted } from 'vue';

export function useVoiceRecorder() {
  const isRecording = ref(false);
  const error = ref<string | null>(null);
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioChunks: Blob[] = [];

  /**
   * 开始录音
   */
  const start = async () => {
    error.value = null;
    audioChunks = [];
    
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start();
      isRecording.value = true;
    } catch (err) {
      console.error('获取麦克风权限失败:', err);
      error.value = '无法访问麦克风，请检查权限设置。';
      isRecording.value = false;
    }
  };

  /**
   * 停止录音并返回音频 Blob
   * @returns Promise<Blob | null>
   */
  const stop = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        isRecording.value = false;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        releaseStream();
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  };

  /**
   * 释放麦克风轨道，防止红点持续显示和内存泄露
   */
  const releaseStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    mediaRecorder = null;
  };

  onUnmounted(() => {
    if (isRecording.value) {
      stop();
    } else {
      releaseStream();
    }
  });

  return {
    isRecording,
    error,
    start,
    stop
  };
}
