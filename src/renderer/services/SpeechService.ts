export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface SpeechServiceOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "pt-BR";
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  startListening(options?: SpeechServiceOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition not supported"));
        return;
      }

      if (this.isListening) {
        reject(new Error("Already listening"));
        return;
      }

      if (options?.lang) {
        this.recognition.lang = options.lang;
      }
      if (options?.continuous !== undefined) {
        this.recognition.continuous = options.continuous;
      }
      if (options?.interimResults !== undefined) {
        this.recognition.interimResults = options.interimResults;
      }

      this.recognition.onstart = () => {
        this.isListening = true;
        resolve();
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        reject(new Error(event.error));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    if (this.recognition) {
      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          const isFinal = event.results[i].isFinal;
          callback({ transcript, confidence, isFinal });
        }
      };
    }
  }

  async speak(text: string, lang?: string): Promise<void> {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      throw new Error("Speech synthesis not supported");
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang) {
        utterance.lang = lang;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));

      window.speechSynthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  isSpeaking(): boolean {
    return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
  }
}

export const speechService = new SpeechService();
export default speechService;