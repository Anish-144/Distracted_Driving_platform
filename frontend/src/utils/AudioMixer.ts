/**
 * Web Audio API Mixer for Immersion Engine
 * Manages audio priority and volume ducking across different channels.
 */

export enum AudioPriority {
  EMERGENCY = 1,
  HIGH_EVENT = 2,
  GPS_ALERT = 3,
  PASSENGER = 4,
  AMBIENT = 5
}

class AudioMixer {
  private static instance: AudioMixer;
  private audioCtx: AudioContext | null = null;
  private mainGain: GainNode | null = null;
  
  private channels: Map<AudioPriority, {
    gainNode: GainNode;
    baseVolume: number;
    activeSources: number;
  }> = new Map();

  private constructor() {
    // Cannot initialize AudioContext here safely due to browser autoplay policies.
    // Must be initialized upon user interaction.
  }

  public static getInstance(): AudioMixer {
    if (!AudioMixer.instance) {
      AudioMixer.instance = new AudioMixer();
    }
    return AudioMixer.instance;
  }

  public init() {
    if (this.audioCtx) return;
    
    // @ts-ignore - Fallback for older webkit browsers
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return; // Not supported
    
    this.audioCtx = new AudioContextClass();
    this.mainGain = this.audioCtx.createGain();
    this.mainGain.connect(this.audioCtx.destination);
    
    // Initialize channels
    const priorities = [
      { p: AudioPriority.EMERGENCY, v: 1.0 },
      { p: AudioPriority.HIGH_EVENT, v: 0.9 },
      { p: AudioPriority.GPS_ALERT, v: 0.8 },
      { p: AudioPriority.PASSENGER, v: 0.9 }, // Synthesized speech can be quiet
      { p: AudioPriority.AMBIENT, v: 0.15 }
    ];
    
    priorities.forEach(({ p, v }) => {
      const g = this.audioCtx!.createGain();
      g.gain.value = v;
      g.connect(this.mainGain!);
      this.channels.set(p, { gainNode: g, baseVolume: v, activeSources: 0 });
    });
  }

  /**
   * Connect an HTMLAudioElement to the mixer on a specific priority channel.
   * Returns a function to clean up / disconnect when done.
   */
  public playAudioElement(audioElement: HTMLAudioElement, priority: AudioPriority): () => void {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return () => {};
    
    // Resume context if suspended
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const channel = this.channels.get(priority);
    if (!channel) return () => {};

    const source = this.audioCtx.createMediaElementSource(audioElement);
    source.connect(channel.gainNode);
    
    this.registerActiveSource(priority);
    
    const onEnded = () => {
      this.unregisterActiveSource(priority);
      source.disconnect();
      audioElement.removeEventListener('ended', onEnded);
      audioElement.removeEventListener('pause', onEnded);
    };
    
    audioElement.addEventListener('ended', onEnded);
    audioElement.addEventListener('pause', onEnded); // handle early stop
    
    return onEnded;
  }
  
  /**
   * Directly play a Text-to-Speech utterance and route through Web Audio API
   * Note: Web Speech API (speechSynthesis) does NOT natively route through AudioContext.
   * We simulate the ducking by triggering the duck states manually for the duration of the speech.
   */
  public playTTS(text: string, priority: AudioPriority = AudioPriority.PASSENGER): Promise<void> {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to find a natural-sounding English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.includes('en') && !v.name.includes('Microsoft Desktop'));
      if (preferred) utterance.voice = preferred;
      
      utterance.rate = 0.95; // Slightly slower for relaxed conversation
      utterance.pitch = 1.0;
      
      this.registerActiveSource(priority);
      
      utterance.onend = () => {
        this.unregisterActiveSource(priority);
        resolve();
      };
      utterance.onerror = () => {
        this.unregisterActiveSource(priority);
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }

  public stopAllTTS() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      // Hard reset all active TTS sources registered
      const pChan = this.channels.get(AudioPriority.PASSENGER);
      if (pChan && pChan.activeSources > 0) {
          pChan.activeSources = 0;
          this.applyDucking();
      }
    }
  }

  private registerActiveSource(priority: AudioPriority) {
    const channel = this.channels.get(priority);
    if (channel) {
      channel.activeSources++;
      this.applyDucking();
    }
  }

  private unregisterActiveSource(priority: AudioPriority) {
    const channel = this.channels.get(priority);
    if (channel && channel.activeSources > 0) {
      channel.activeSources--;
      this.applyDucking();
    }
  }

  /**
   * Core ducking logic.
   * If a higher priority channel is active, duck all lower priority channels.
   */
  private applyDucking() {
    if (!this.audioCtx) return;
    
    // Find the highest priority currently active (1 is highest)
    let highestActive = 999;
    this.channels.forEach((channel, priority) => {
      if (channel.activeSources > 0 && priority < highestActive) {
        highestActive = priority;
      }
    });

    const now = this.audioCtx.currentTime;
    
    this.channels.forEach((channel, priority) => {
      const { gainNode, baseVolume } = channel;
      gainNode.gain.cancelScheduledValues(now);
      
      if (priority > highestActive) {
        // Duck this lower priority channel (reduce to 20% of base)
        const duckedVol = baseVolume * 0.2;
        gainNode.gain.linearRampToValueAtTime(duckedVol, now + 0.5); // smooth fade out
      } else {
        // Restore to base volume
        gainNode.gain.linearRampToValueAtTime(baseVolume, now + 0.5); // smooth fade in
      }
    });
  }
}

export const audioMixer = AudioMixer.getInstance();
