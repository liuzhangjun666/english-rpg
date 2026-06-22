import { ref } from 'vue';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognizer() {
  const isListening = ref(false);
  const transcript = ref('');
  const error = ref<string | null>(null);

  let recognition: SpeechRecognition | null = null;
  let stopResolver: ((value: string) => void) | null = null;

  function isSupported(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  function start(): boolean {
    error.value = null;
    transcript.value = '';

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      error.value = '当前浏览器不支持语音识别，请使用 Chrome / Edge，或点「已完成朗读」继续。';
      return false;
    }

    recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      transcript.value = text.trim();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        error.value = `语音识别失败：${event.error}`;
      }
    };

    recognition.onend = () => {
      isListening.value = false;
      if (stopResolver) {
        stopResolver(transcript.value);
        stopResolver = null;
      }
    };

    try {
      recognition.start();
      isListening.value = true;
      return true;
    } catch {
      error.value = '无法启动语音识别';
      isListening.value = false;
      return false;
    }
  }

  function stop(): Promise<string> {
    return new Promise((resolve) => {
      if (!recognition || !isListening.value) {
        resolve(transcript.value);
        return;
      }
      stopResolver = resolve;
      try {
        recognition.stop();
      } catch {
        isListening.value = false;
        resolve(transcript.value);
        stopResolver = null;
      }
    });
  }

  function reset() {
    transcript.value = '';
    error.value = null;
  }

  return {
    isListening,
    transcript,
    error,
    isSupported,
    start,
    stop,
    reset,
  };
}
