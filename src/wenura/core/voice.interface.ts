export interface SpeechToTextEngine {
  startListening(onResult: (text: string, isFinal: boolean) => void): Promise<void>;
  stopListening(): Promise<void>;
}

export interface TextToSpeechEngine {
  speak(text: string, voiceId?: string): Promise<void>;
  stop(): Promise<void>;
}

export interface VoiceEngine {
  stt: SpeechToTextEngine;
  tts: TextToSpeechEngine;
}
