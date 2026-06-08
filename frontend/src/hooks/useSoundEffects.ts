import { useCallback, useEffect, useRef, useState } from 'react';

export function useSoundEffects() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Load setting from local storage
    const saved = localStorage.getItem('safedrive_sound_effects');
    if (saved !== null) {
      setSoundEnabled(saved === 'true');
    }

    if (typeof window !== 'undefined' && !audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('safedrive_sound_effects', String(next));
      return next;
    });
  }, []);

  const playTone = useCallback(
    (frequency: number, type: OscillatorType, duration: number, vol = 0.1) => {
      if (!soundEnabled || !audioCtxRef.current) return;
      try {
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);

        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        // silently fail if audio context fails
      }
    },
    [soundEnabled]
  );

  const playClick = useCallback(() => playTone(600, 'sine', 0.1, 0.05), [playTone]);
  
  const playPop = useCallback(() => playTone(800, 'sine', 0.1, 0.05), [playTone]);
  
  const playDing = useCallback(() => {
    if (!soundEnabled) return;
    playTone(1200, 'sine', 0.3, 0.1);
    setTimeout(() => playTone(1600, 'sine', 0.5, 0.1), 100);
  }, [playTone, soundEnabled]);

  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return;
    playTone(440, 'square', 0.2, 0.05); // A4
    setTimeout(() => playTone(554.37, 'square', 0.2, 0.05), 150); // C#5
    setTimeout(() => playTone(659.25, 'square', 0.4, 0.05), 300); // E5
    setTimeout(() => playTone(880, 'square', 0.6, 0.05), 450); // A5
  }, [playTone, soundEnabled]);

  const playError = useCallback(() => {
    if (!soundEnabled) return;
    playTone(300, 'sawtooth', 0.2, 0.05);
    setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.05), 150);
  }, [playTone, soundEnabled]);

  return { soundEnabled, toggleSound, playClick, playPop, playDing, playLevelUp, playError };
}
