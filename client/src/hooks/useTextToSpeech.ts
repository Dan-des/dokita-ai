import { useState, useEffect, useCallback, useRef } from 'react';

export const useTextToSpeech = () => {
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  const cleanTextForSpeech = (rawText: string): string => {
    if (!rawText) return '';
    return rawText
      // Remove medical disclaimer from speech so audio is concise
      .replace(/---[\s\S]*Medical Disclaimer[\s\S]*$/i, '')
      // Remove markdown links [title](url) -> title
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown formatting: asterisks, headers, hashtags, bullet characters
      .replace(/[*#_~`>]/g, '')
      .replace(/^-\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/\n+/g, ' ')
      .trim();
  };

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
    setIsPaused(false);
  }, []);

  const speak = useCallback(
    (text: string, index: number) => {
      if (!isSupported) {
        alert('Text-to-speech audio is not supported in your current browser.');
        return;
      }

      // If already speaking this message, toggle stop
      if (speakingIndex === index) {
        stop();
        return;
      }

      // Stop any ongoing speech
      stop();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utteranceRef.current = utterance;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => (v.lang.startsWith('en') || v.lang.startsWith('pcm')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri'))
      ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 0.95; // Natural conversational pace
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setSpeakingIndex(index);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setSpeakingIndex(null);
        setIsPaused(false);
      };

      utterance.onerror = (e) => {
        console.error('[TextToSpeech Error]', e);
        setSpeakingIndex(null);
        setIsPaused(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, speakingIndex, stop]
  );

  return {
    speak,
    stop,
    speakingIndex,
    isPaused,
    isSupported,
  };
};
