import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  X,
  Radio,
  Sparkles,
  Info,
  ShieldAlert,
  Globe,
  Cpu,
  Layers,
} from 'lucide-react';
import { ThemeConfig } from '../utils/theme';
import { sound } from '../utils/audio';
import {
  detectSpeechCapabilities,
  cyberTTS,
  BrowserSpeechCapabilities,
} from '../utils/speech';

// SpeechRecognition type declarations for TS
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface VoiceCommandHandlers {
  onTriggerDiagnostic: () => void;
  onTriggerOverload: () => void;
  onCycleTheme: () => void;
  onToggleScanlines: () => void;
  onToggleSound: () => void;
  onToggleSleepMode: () => void;
  onAddTask: (text: string) => void;
  onOpenWeather: () => void;
  onPurgeTrash: () => void;
  onSelectDriveLetter: (letter: string) => void;
}

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  handlers: VoiceCommandHandlers;
}

interface MessageLog {
  id: string;
  sender: 'user' | 'system' | 'ai';
  text: string;
  timestamp: string;
  type?: 'command' | 'status' | 'error' | 'success';
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  theme,
  handlers,
}) => {
  const [capabilities, setCapabilities] = useState<BrowserSpeechCapabilities>(
    detectSpeechCapabilities()
  );
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageLog[]>([
    {
      id: 'init-1',
      sender: 'system',
      text: 'CYBER COMM LINK INITIALIZED. VOICE AND KEYBOARD TERMINAL READY.',
      timestamp: new Date().toTimeString().split(' ')[0],
      type: 'status',
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update capabilities on mount or open
  useEffect(() => {
    if (isOpen) {
      const caps = detectSpeechCapabilities();
      setCapabilities(caps);
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [isOpen]);

  // Scroll to bottom of message list
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  // Stop listening and speech on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      cyberTTS.stop();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  // Add a message to log and optionally speak it
  const addMessage = (
    sender: 'user' | 'system' | 'ai',
    text: string,
    type: 'command' | 'status' | 'error' | 'success' = 'status',
    shouldSpeak = false
  ) => {
    const newMsg: MessageLog = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender,
      text,
      timestamp: new Date().toTimeString().split(' ')[0],
      type,
    };
    setMessages((prev) => [...prev, newMsg]);

    if (shouldSpeak && ttsEnabled) {
      setIsSpeaking(true);
      cyberTTS.speak(text, () => {
        setIsSpeaking(false);
      });
    }
  };

  // Command Execution Engine
  const executeCommand = (rawText: string) => {
    const cmd = rawText.trim().toLowerCase();
    if (!cmd) return;

    sound.playConfirm();
    addMessage('user', rawText.toUpperCase(), 'command');

    // 1. Diagnostic / System Scan
    if (cmd.includes('diagnostic') || cmd.includes('scan') || cmd.includes('sweep') || cmd.includes('check system') || cmd.includes('integrity')) {
      handlers.onTriggerDiagnostic();
      addMessage(
        'ai',
        'INITIATING SYSTEM DIAGNOSTIC SWEEP. SCANNING QUANTUM CORE AND LOGICAL VOLUMES.',
        'success',
        true
      );
      return;
    }

    // 2. Reactor Overload / Surge
    if (cmd.includes('overload') || cmd.includes('surge') || cmd.includes('burst') || cmd.includes('reactor')) {
      handlers.onTriggerOverload();
      addMessage(
        'ai',
        'WARNING: REACTOR OVERLOAD SURGE TEST INITIATED. DISCHARGING PLASMA CAPACITORS.',
        'error',
        true
      );
      return;
    }

    // 3. Theme Cycling / Palette
    if (cmd.includes('theme') || cmd.includes('color') || cmd.includes('palette')) {
      handlers.onCycleTheme();
      addMessage('ai', 'RECONFIGURING HUD HOLOGRAPHIC COLOR PALETTE MATRIX.', 'success', true);
      return;
    }

    // 4. CRT Scanlines
    if (cmd.includes('scanline') || cmd.includes('crt') || cmd.includes('filter') || cmd.includes('overlay')) {
      handlers.onToggleScanlines();
      addMessage('ai', 'TOGGLING CRT SCANLINE HOLOGRAPHIC FILTER.', 'status', true);
      return;
    }

    // 5. Audio SFX
    if (cmd.includes('mute') || cmd.includes('sound') || cmd.includes('audio') || cmd.includes('sfx')) {
      handlers.onToggleSound();
      addMessage('ai', 'UPDATING SYNTHESIZER AUDIO EMISSION STATE.', 'status', true);
      return;
    }

    // 6. Sleep / Standby
    if (cmd.includes('sleep') || cmd.includes('standby') || cmd.includes('dim') || cmd.includes('wake')) {
      handlers.onToggleSleepMode();
      addMessage('ai', 'SWITCHING HUD POWER STANDBY PROFILE.', 'status', true);
      return;
    }

    // 7. Weather / Satellite
    if (cmd.includes('weather') || cmd.includes('satellite') || cmd.includes('forecast') || cmd.includes('temperature') || cmd.includes('climate')) {
      handlers.onOpenWeather();
      addMessage('ai', 'OPENING METEOROLOGICAL RADAR SATELLITE HUD OVERLAY.', 'success', true);
      return;
    }

    // 8. Recycle Bin / Purge
    if (cmd.includes('purge') || cmd.includes('trash') || cmd.includes('recycle') || cmd.includes('empty bin') || cmd.includes('clean storage')) {
      handlers.onPurgeTrash();
      addMessage('ai', 'PURGING CORRUPTED SECTORS AND EMPTYING RECYCLE BIN.', 'success', true);
      return;
    }

    // 9. Add Task Command: "add task <text>"
    if (cmd.startsWith('add task') || cmd.startsWith('task add') || cmd.startsWith('new task') || cmd.startsWith('create task')) {
      const taskText = rawText.replace(/^(add task|task add|new task|create task)[:\s]*/i, '').trim();
      if (taskText) {
        handlers.onAddTask(taskText);
        addMessage('ai', `TASK LOGGED TO HUD TELEMETRY: "${taskText.toUpperCase()}".`, 'success', true);
      } else {
        addMessage('ai', 'PLEASE SPECIFY THE TASK CONTENT, E.G., "ADD TASK CALIBRATE ANTENNA".', 'status', true);
      }
      return;
    }

    // 10. Inspect Drive C-H
    const driveMatch = cmd.match(/drive\s+([c-h])/i) || cmd.match(/volume\s+([c-h])/i);
    if (driveMatch && driveMatch[1]) {
      const letter = driveMatch[1].toUpperCase();
      handlers.onSelectDriveLetter(letter);
      addMessage('ai', `MOUNTING TELEMETRY SPECTROGRAM FOR DRIVE [${letter}:\\].`, 'success', true);
      return;
    }

    // 11. Help / Commands list
    if (cmd.includes('help') || cmd.includes('command') || cmd.includes('what can you do')) {
      addMessage(
        'ai',
        'AVAILABLE COMMANDS: "RUN DIAGNOSTIC", "CYCLE THEME", "TRIGGER OVERLOAD", "WEATHER REPORT", "PURGE TRASH", "ADD TASK <TITLE>", "DRIVE C/D/E/F/G/H", "TOGGLE SCANLINES", "SLEEP MODE".',
        'status',
        true
      );
      return;
    }

    // Default Fallback
    addMessage(
      'ai',
      `COMMAND "${rawText.toUpperCase()}" PROCESSED IN KERNEL. SAY "HELP" OR CLICK A SHORTCUT BELOW FOR KNOWN DIRECTIVES.`,
      'status',
      true
    );
  };

  // Toggle Voice Recognition
  const toggleListening = () => {
    setMicError(null);

    // If already listening, stop
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setInterimTranscript('');
      sound.playClick(900);
      return;
    }

    // Check browser speech recognition availability
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const errorMsg = capabilities.isFirefox
        ? 'UNSUPPORTED — USE CHROME, EDGE OR SAFARI (FIREFOX LACKS SPEECH RECOGNITION API). KEYBOARD INPUT STILL WORKS.'
        : 'SPEECH RECOGNITION API NOT SUPPORTED IN THIS BROWSER. KEYBOARD STILL WORKS.';
      setMicError(errorMsg);
      addMessage('system', errorMsg, 'error', false);
      sound.playAlert();
      return;
    }

    // Check HTTPS or Localhost constraint
    if (!capabilities.isSecure) {
      const errorMsg =
        'NEEDS HTTPS OR LOCALHOST. OVER PLAIN HTTP://<LAN-IP> FROM YOUR PHONE, THE BROWSER REFUSES THE MIC. SPOKEN REPLIES & KEYBOARD STILL WORK.';
      setMicError(errorMsg);
      addMessage('system', errorMsg, 'error', false);
      sound.playAlert();
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
        sound.playScanSweep();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interim);

        if (final) {
          setInterimTranscript('');
          setIsListening(false);
          executeCommand(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition Error:', event.error);
        setIsListening(false);
        setInterimTranscript('');

        let message = `MIC ERROR: ${event.error.toUpperCase()}`;
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          message =
            'MIC PERMISSION DENIED OR BLOCKED. (NEEDS HTTPS OR LOCALHOST. OVER PLAIN HTTP://<LAN-IP>, THE BROWSER REFUSES THE MIC. SPOKEN REPLIES & KEYBOARD STILL WORK).';
        } else if (event.error === 'no-speech') {
          message = 'NO SPEECH DETECTED. TRY AGAIN OR USE KEYBOARD.';
        } else if (event.error === 'audio-capture') {
          message = 'NO MICROPHONE HARDWARE DETECTED.';
        }

        setMicError(message);
        addMessage('system', message, 'error', false);
        sound.playAlert();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      const errMsg = err?.message || 'FAILED TO INITIALIZE SPEECH RECOGNITION';
      setMicError(errMsg);
      addMessage('system', errMsg, 'error', false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedInput.trim()) {
      executeCommand(typedInput.trim());
      setTypedInput('');
    }
  };

  const sampleCommands = [
    { label: 'DIAGNOSTIC SWEEP', cmd: 'Run Diagnostic' },
    { label: 'CYCLE THEME', cmd: 'Cycle Theme' },
    { label: 'REACTOR SURGE', cmd: 'Trigger Overload' },
    { label: 'WEATHER SATELLITE', cmd: 'Weather Report' },
    { label: 'PURGE TRASH', cmd: 'Purge Trash' },
    { label: 'INSPECT DRIVE C:', cmd: 'Inspect Drive C' },
    { label: 'ADD TASK: CALIBRATE', cmd: 'Add Task Calibrate Subsystems' },
    { label: 'STANDBY MODE', cmd: 'Sleep Mode' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-mono select-none"
      >
        <motion.div
          initial={{ scale: 0.92, y: 25 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 25 }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-lg border-2 border-cyan-400 bg-[#020a14] text-cyan-300 shadow-[0_0_50px_rgba(0,229,255,0.35)] overflow-hidden"
        >
          {/* Top Tech Slanted Frame Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-300" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/40 bg-[#031120]/80">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Radio className={`w-5 h-5 ${isListening ? 'text-orange-400 animate-pulse' : 'text-cyan-400'}`} />
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                )}
              </div>
              <div>
                <span
                  className="text-sm sm:text-base font-black tracking-widest text-cyan-200 block"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  CYBER COMM LINK // JARVIS HUD VOICE
                </span>
                <span className="text-[9px] text-cyan-500/70 tracking-wider">
                  BROWSER: {capabilities.browserName.toUpperCase()} | ENGINE: {capabilities.hasSpeechRecognition ? 'WEB-SPEECH RECOGNITION' : 'KEYBOARD TERMINAL'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TTS Voice Audio Toggle */}
              <button
                onClick={() => {
                  sound.playClick();
                  const next = !ttsEnabled;
                  setTtsEnabled(next);
                  if (!next) cyberTTS.stop();
                }}
                className={`p-1.5 rounded border text-[10px] flex items-center gap-1 transition-all ${
                  ttsEnabled
                    ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200'
                    : 'border-cyan-500/30 bg-black/60 text-cyan-600'
                }`}
                title={ttsEnabled ? 'Spoken Voice Replies: ACTIVE (Web Speech TTS)' : 'Spoken Voice Replies: MUTED'}
              >
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-300" /> : <VolumeX className="w-3.5 h-3.5 text-cyan-700" />}
                <span className="hidden sm:inline">{ttsEnabled ? 'SPOKEN REPLIES ON' : 'VOICE MUTED'}</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="p-1 rounded text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Compatibility & Security Diagnostic Banner */}
          <div className="px-4 py-2 bg-black/70 border-b border-cyan-500/30 text-[10px] space-y-1">
            {/* Condition 1: Firefox / Unsupported Speech Recognition */}
            {!capabilities.hasSpeechRecognition && (
              <div className="p-2 rounded bg-amber-950/40 border border-amber-500/60 text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-bold block tracking-wider text-amber-200">
                    UNSUPPORTED — USE CHROME, EDGE OR SAFARI
                  </span>
                  <span className="text-[9px] text-amber-300/80">
                    Firefox has no native SpeechRecognition API. <span className="font-bold text-amber-100">Keyboard terminal still works 100%!</span> Spoken audio replies (TTS) are fully active.
                  </span>
                </div>
              </div>
            )}

            {/* Condition 2: Insecure HTTP from LAN-IP / Mobile */}
            {capabilities.hasSpeechRecognition && !capabilities.isSecure && (
              <div className="p-2 rounded bg-amber-950/40 border border-amber-500/60 text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-bold block tracking-wider text-amber-200">
                    NEEDS HTTPS OR LOCALHOST
                  </span>
                  <span className="text-[9px] text-amber-300/80">
                    Over plain http://&lt;lan-ip&gt; from your phone, the browser refuses the mic. Spoken replies & keyboard still work there!
                  </span>
                </div>
              </div>
            )}

            {/* Condition 3: Supported and Secure */}
            {capabilities.hasSpeechRecognition && capabilities.isSecure && (
              <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-bold tracking-wider text-[10px]">
                    SPEECH ENGINE READY: CHROME / EDGE / SAFARI
                  </span>
                </div>
                <span className="text-[9px] text-emerald-400/80 font-mono">
                  HTTPS SECURE CONTEXT [OK]
                </span>
              </div>
            )}

            {/* Mic error readout if user tried and was denied */}
            {micError && (
              <div className="p-1.5 rounded bg-red-950/50 border border-red-500/60 text-red-300 text-[9px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{micError}</span>
              </div>
            )}
          </div>

          {/* Interactive Waveform / Status Core */}
          <div className="p-4 bg-gradient-to-b from-[#020b17] to-[#041122] border-b border-cyan-500/30 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Animated Background Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className={`w-48 h-48 rounded-full border border-cyan-400 ${isListening ? 'animate-ping' : ''}`} />
              <div className="w-36 h-36 rounded-full border border-dashed border-cyan-500 animate-spin" style={{ animationDuration: '20s' }} />
            </div>

            {/* Main Microphone Action Button */}
            <div className="relative z-10 flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleListening}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center border-2 transition-all shadow-xl ${
                  isListening
                    ? 'border-orange-400 bg-orange-600/30 text-orange-200 shadow-[0_0_35px_rgba(255,84,0,0.7)] animate-pulse'
                    : capabilities.hasSpeechRecognition
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-900/60 shadow-[0_0_25px_rgba(0,229,255,0.4)]'
                    : 'border-cyan-500/40 bg-black/60 text-cyan-500 hover:border-cyan-400 cursor-pointer'
                }`}
                title={
                  capabilities.hasSpeechRecognition
                    ? isListening
                      ? 'Listening... Click to stop'
                      : 'Click to Activate Microphone Speech Recognition'
                    : 'Speech Recognition unavailable on this browser. Click to test fallback or type below.'
                }
              >
                {isListening ? (
                  <Mic className="w-8 h-8 text-orange-300 animate-bounce" />
                ) : capabilities.hasSpeechRecognition ? (
                  <Mic className="w-8 h-8 text-cyan-300" />
                ) : (
                  <MicOff className="w-8 h-8 text-cyan-500/70" />
                )}
                <span className="text-[8px] font-bold tracking-widest mt-1">
                  {isListening
                    ? 'LISTENING...'
                    : capabilities.hasSpeechRecognition
                    ? 'CLICK TO TALK'
                    : 'KEYBOARD ONLY'}
                </span>
              </motion.button>

              {/* Animated Waveform Bars */}
              <div className="flex items-center gap-1 mt-3 h-6">
                {Array.from({ length: 16 }).map((_, i) => {
                  const activeHeight = isListening
                    ? Math.sin(i * 0.8 + Date.now() * 0.005) * 12 + 14
                    : isSpeaking
                    ? Math.cos(i * 0.6 + Date.now() * 0.005) * 8 + 10
                    : 3;
                  return (
                    <motion.span
                      key={i}
                      animate={{
                        height: activeHeight,
                        backgroundColor: isListening
                          ? '#ff5400'
                          : isSpeaking
                          ? '#00e5ff'
                          : '#005577',
                      }}
                      transition={{ duration: 0.1 }}
                      className="w-1 rounded-full opacity-80"
                    />
                  );
                })}
              </div>

              {/* Live Transcript Display */}
              {interimTranscript && (
                <div className="mt-2 text-xs text-orange-300 font-mono tracking-wider animate-pulse bg-black/60 px-3 py-1 rounded border border-orange-500/50 max-w-md text-center">
                  "{interimTranscript}"
                </div>
              )}
            </div>
          </div>

          {/* Terminal Console Messages Log */}
          <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto p-3 space-y-2 bg-[#01060d] text-[10px] sm:text-xs font-mono scrollbar-thin scrollbar-thumb-cyan-500/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded border flex flex-col gap-0.5 ${
                  msg.sender === 'user'
                    ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200 ml-4'
                    : msg.sender === 'ai'
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200 mr-4'
                    : msg.type === 'error'
                    ? 'border-red-500/50 bg-red-950/40 text-red-300'
                    : 'border-cyan-500/20 bg-black/50 text-cyan-400/80'
                }`}
              >
                <div className="flex items-center justify-between text-[8px] opacity-60">
                  <span className="font-bold">
                    {msg.sender === 'user'
                      ? 'OPERATOR [VOICE/TEXT]'
                      : msg.sender === 'ai'
                      ? 'JARVIS AI REACTION'
                      : 'SYSTEM CORE'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="tracking-wide">{msg.text}</div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Directive Command Chips */}
          <div className="px-3 py-2 bg-[#020a14] border-t border-cyan-500/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[8px] text-cyan-500/70 font-bold shrink-0">DIRECTIVES:</span>
            {sampleCommands.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  executeCommand(item.cmd);
                }}
                className="shrink-0 px-2 py-0.5 rounded border border-cyan-500/40 bg-black/60 hover:bg-cyan-950/80 hover:border-cyan-300 text-cyan-300 text-[8px] sm:text-[9px] font-mono transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Keyboard Input Console */}
          <form
            onSubmit={handleTextSubmit}
            className="p-3 bg-[#030d1a] border-t border-cyan-500/40 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Terminal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                ref={inputRef}
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="TYPE HUD COMMAND (E.G. 'DIAGNOSTIC', 'THEME', 'WEATHER', 'PURGE')..."
                className="w-full pl-9 pr-3 py-2 bg-black/90 border border-cyan-500/60 rounded text-cyan-200 text-xs font-mono placeholder:text-cyan-700 focus:outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              />
            </div>
            <button
              type="submit"
              disabled={!typedInput.trim()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black font-bold text-xs rounded transition-colors flex items-center gap-1.5 font-mono"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
