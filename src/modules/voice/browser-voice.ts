import type {
  SpeechToTextProvider,
  TextToSpeechProvider
} from "@/providers/speech/types";

interface RecognitionEvent {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
}

type RecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

class BrowserSpeechToTextProvider implements SpeechToTextProvider {
  readonly name = "browser-web-speech-stt";

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(
      window.SpeechRecognition || window.webkitSpeechRecognition
    );
  }

  start(
    onText: (text: string) => void,
    onEnd: () => void,
    onError: (message: string) => void
  ): () => void {
    const Ctor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Ctor) {
      throw new Error("Speech recognition is not supported");
    }

    const recognition = new Ctor();
    recognition.lang = "fa-IR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onText(transcript);
    };

    recognition.onerror = (event) => onError(event.error);
    recognition.onend = onEnd;
    recognition.start();

    return () => recognition.stop();
  }
}

class BrowserTextToSpeechProvider implements TextToSpeechProvider {
  readonly name = "browser-web-speech-tts";

  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      Boolean(window.speechSynthesis)
    );
  }

  speak(text: string): void {
    if (!this.isSupported()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fa-IR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

export const browserSpeechToText = new BrowserSpeechToTextProvider();
export const browserTextToSpeech = new BrowserTextToSpeechProvider();
