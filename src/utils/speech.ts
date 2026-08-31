// Speech Recognition & Speech Synthesis Utility for CyberHUD

export type MicSupportStatus =
  | 'supported'
  | 'unsupported_browser'
  | 'insecure_http'
  | 'permission_denied'
  | 'error';

export interface BrowserSpeechCapabilities {
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  isSecure: boolean;
  isFirefox: boolean;
  browserName: string;
  micStatus: MicSupportStatus;
  statusMessage: string;
}

export function detectSpeechCapabilities(): BrowserSpeechCapabilities {
  if (typeof window === 'undefined') {
    return {
      hasSpeechRecognition: false,
      hasSpeechSynthesis: false,
      isSecure: false,
      isFirefox: false,
      browserName: 'Unknown',
      micStatus: 'unsupported_browser',
      statusMessage: 'SERVER ENVIRONMENT',
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isFirefox = /firefox|fxios/i.test(ua);
  const isEdge = /edg/i.test(ua);
  const isChrome = /chrome|chromium|crios/i.test(ua) && !isEdge;
  const isSafari = /safari/i.test(ua) && !isChrome && !isEdge;

  let browserName = 'Browser';
  if (isFirefox) browserName = 'Firefox';
  else if (isEdge) browserName = 'Microsoft Edge';
  else if (isChrome) browserName = 'Google Chrome';
  else if (isSafari) browserName = 'Apple Safari';

  const hasSpeechRecognition =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const hasSpeechSynthesis = 'speechSynthesis' in window;

  const isSecure =
    Boolean(window.isSecureContext) ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  let micStatus: MicSupportStatus = 'supported';
  let statusMessage = 'VOICE RECOGNITION ONLINE';

  if (!hasSpeechRecognition) {
    micStatus = 'unsupported_browser';
    statusMessage = isFirefox
      ? 'UNSUPPORTED — USE CHROME / EDGE / SAFARI (KEYBOARD STILL WORKS)'
      : 'SPEECH RECOGNITION NOT SUPPORTED (KEYBOARD STILL WORKS)';
  } else if (!isSecure) {
    micStatus = 'insecure_http';
    statusMessage =
      'NEEDS HTTPS OR LOCALHOST — OVER PLAIN HTTP://<LAN-IP> BROWSER REFUSES MIC (SPOKEN REPLIES & KEYBOARD STILL WORK)';
  }

  return {
    hasSpeechRecognition,
    hasSpeechSynthesis,
    isSecure,
    isFirefox,
    browserName,
    micStatus,
    statusMessage,
  };
}

// Futuristic Speech Synthesis
class CyberTTS {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private voiceLoaded: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth && typeof this.synth.onvoiceschanged !== 'undefined') {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      this.voiceLoaded = true;
      // Choose optimal English voice for futuristic HUD feel
      const preferred = voices.find(
        (v) =>
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Zira') ||
            v.name.includes('Victoria')) &&
          v.lang.startsWith('en')
      );
      this.voice = preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0];
    }
  }

  public speak(text: string, onEnd?: () => void) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    try {
      if (this.synth.speaking) {
        this.synth.cancel();
      }

      if (!this.voice && !this.voiceLoaded) {
        this.loadVoices();
      }

      const cleanText = text.replace(/\[.*?\]/g, '').replace(/[:\\_/*#]/g, ' ');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      if (this.voice) {
        utterance.voice = this.voice;
      }

      utterance.pitch = 1.08;
      utterance.rate = 1.06;
      utterance.volume = 0.95;

      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
    } catch {
      if (onEnd) onEnd();
    }
  }

  public stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }
}

export const cyberTTS = new CyberTTS();
