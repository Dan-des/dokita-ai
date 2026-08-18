import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionHook {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

export const useSpeechRecognition = (
  onTranscriptChange?: (text: string) => void
): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  // Track the index of the last FINAL result to avoid duplicate accumulation
  const lastFinalIndexRef = useRef<number>(0);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Use 'mul' for multilingual or leave unset so browser auto-detects
    // Pidgin/Yoruba/Hausa/Igbo map best to 'en-NG' on most browsers
    recognition.lang = 'en-NG';

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      // Only iterate from lastFinalIndex to avoid re-reading old final results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          lastFinalIndexRef.current = i + 1;
        } else {
          interimText += result[0].transcript;
        }
      }

      // Build cumulative text from all prior finals + current interim
      let cumulativeFinals = '';
      for (let i = 0; i < lastFinalIndexRef.current; i++) {
        if (event.results[i]?.isFinal) {
          cumulativeFinals += event.results[i][0].transcript;
        }
      }

      const fullText = (cumulativeFinals + interimText).trim();
      setTranscript(fullText);
      if (onTranscriptChange) {
        onTranscriptChange(fullText);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Speech Recognition Error]', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone in your browser settings.');
      } else if (event.error === 'network') {
        setError('Network error during speech recognition. Check your connection.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Speech recognition issue: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    lastFinalIndexRef.current = 0;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e: any) {
      console.warn('Recognition start exception:', e.message);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (_) {}
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    lastFinalIndexRef.current = 0;
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error,
  };
};
