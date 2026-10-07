export interface SpeechToTextProvider {
  readonly name: string;
  isSupported(): boolean;
  start(
    onText: (text: string) => void,
    onEnd: () => void,
    onError: (message: string) => void
  ): () => void;
}

export interface TextToSpeechProvider {
  readonly name: string;
  isSupported(): boolean;
  speak(text: string): void;
  stop(): void;
}
