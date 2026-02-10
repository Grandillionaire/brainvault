/**
 * Voice Recorder Component
 * Record and transcribe voice notes using Web Speech API
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, X, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onClose?: () => void;
  compact?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscript,
  onClose,
  compact = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for Web Speech API support
  const isSupported = typeof window !== "undefined" && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => prev + (prev ? " " : "") + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied");
      } else if (event.error !== "aborted") {
        toast.error("Speech recognition error");
      }
      stopRecording();
    };

    recognition.onend = () => {
      if (isRecording) {
        // Restart if still recording (browser may stop after silence)
        try {
          recognition.start();
        } catch {
          // Ignore if already started
        }
      }
    };

    return recognition;
  }, [isSupported, isRecording]);

  // Audio visualization
  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error("Audio visualization error:", error);
    }
  };

  const stopAudioVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
  };

  // Start recording
  const startRecording = async () => {
    if (!isSupported) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    setTranscript("");
    setInterimTranscript("");
    setDuration(0);

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      startAudioVisualization();

      // Timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      toast.success("Recording started");
    } catch (error) {
      toast.error("Failed to start recording");
      console.error(error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    stopAudioVisualization();
    setIsRecording(false);
  };

  // Confirm and insert transcript
  const handleConfirm = () => {
    const finalText = (transcript + " " + interimTranscript).trim();
    if (finalText) {
      onTranscript(finalText);
      toast.success("Transcript inserted");
    }
    stopRecording();
    setTranscript("");
    setInterimTranscript("");
    onClose?.();
  };

  // Cancel recording
  const handleCancel = () => {
    stopRecording();
    setTranscript("");
    setInterimTranscript("");
    onClose?.();
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Speech recognition is not supported in this browser.</p>
        <p className="text-sm mt-2">Try Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  // Compact mode (toolbar button)
  if (compact) {
    return (
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          "p-2 rounded-md transition-all",
          isRecording
            ? "bg-red-500 text-white animate-pulse"
            : "hover:bg-accent text-muted-foreground hover:text-foreground"
        )}
        title={isRecording ? "Stop recording" : "Voice note"}
      >
        {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    );
  }

  // Full recording interface
  return (
    <div className="p-6 space-y-6">
      {/* Waveform visualization */}
      <div className="flex items-center justify-center h-24">
        {isRecording ? (
          <div className="flex items-end justify-center gap-1 h-full">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-2 bg-primary rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(8, audioLevel * 100 * (0.5 + Math.random() * 0.5))}%`,
                  opacity: 0.6 + audioLevel * 0.4,
                }}
              />
            ))}
          </div>
        ) : transcript || interimTranscript ? (
          <div className="flex items-center gap-2 text-green-500">
            <Check className="w-8 h-8" />
            <span className="text-lg">Ready to insert</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Mic className="w-12 h-12" />
            <span>Click to start recording</span>
          </div>
        )}
      </div>

      {/* Duration */}
      {isRecording && (
        <div className="text-center">
          <span className="text-2xl font-mono text-primary">{formatDuration(duration)}</span>
        </div>
      )}

      {/* Transcript preview */}
      {(transcript || interimTranscript) && (
        <div className="p-4 bg-muted rounded-lg max-h-40 overflow-y-auto">
          <p className="text-sm">
            {transcript}
            {interimTranscript && (
              <span className="text-muted-foreground italic"> {interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isRecording && !transcript && !interimTranscript ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <Square className="w-5 h-5" />
            Stop
          </button>
        ) : (
          <>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!transcript && !interimTranscript}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Insert
            </button>
          </>
        )}
      </div>

      {/* Tips */}
      <p className="text-xs text-center text-muted-foreground">
        Speak clearly. Transcription happens in real-time.
      </p>
    </div>
  );
};

// Voice note modal wrapper
interface VoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

export const VoiceNoteModal: React.FC<VoiceNoteModalProps> = ({
  isOpen,
  onClose,
  onTranscript,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Voice Note</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        <VoiceRecorder onTranscript={onTranscript} onClose={onClose} />
      </div>
    </div>
  );
};

export default VoiceRecorder;
