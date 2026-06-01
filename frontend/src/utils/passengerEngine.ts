/**
 * Passenger Conversation Engine
 * Handles randomized personality selection and fetches pre-generated chatter.
 */

import chatterData from '@/data/passenger_chatter.json';

export enum PassengerPersonality {
  QUIET = 'QUIET',
  NORMAL = 'NORMAL',
  CHATTY = 'CHATTY',
  CURIOUS = 'CURIOUS',
  STORYTELLER = 'STORYTELLER'
}

export interface ChatterSnippet {
  text: string;
  category: string;
}

class PassengerEngine {
  private personality: PassengerPersonality = PassengerPersonality.NORMAL;
  private availableSnippets: ChatterSnippet[] = [];
  
  constructor() {
    this.resetSession();
  }

  public resetSession() {
    // Randomize personality for this session
    const personalities = Object.values(PassengerPersonality);
    this.personality = personalities[Math.floor(Math.random() * personalities.length)];
    
    // Load and shuffle snippets to prevent repetition
    this.availableSnippets = [...chatterData].sort(() => Math.random() - 0.5);
  }

  public getPersonality(): PassengerPersonality {
    return this.personality;
  }

  /**
   * Returns the next available snippet, or null if exhausted (unlikely with 500+).
   */
  public getNextSnippet(): ChatterSnippet | null {
    if (this.availableSnippets.length === 0) return null;
    return this.availableSnippets.pop() || null;
  }

  /**
   * Determine silence gap (in milliseconds) based on personality.
   */
  public getNextSilenceGap(): number {
    const base = 5000;
    let multiplier = 1;
    
    switch(this.personality) {
      case PassengerPersonality.QUIET:
        multiplier = 3.0; // 15-25 seconds
        break;
      case PassengerPersonality.CHATTY:
      case PassengerPersonality.STORYTELLER:
        multiplier = 0.5; // 2.5-7.5 seconds
        break;
      case PassengerPersonality.CURIOUS:
        multiplier = 0.8; // 4-12 seconds
        break;
      case PassengerPersonality.NORMAL:
      default:
        multiplier = 1.0; // 5-15 seconds
        break;
    }

    const minSilence = base * multiplier;
    const randomVariance = 10000 * multiplier;
    
    return minSilence + (Math.random() * randomVariance);
  }
}

export const passengerEngine = new PassengerEngine();
