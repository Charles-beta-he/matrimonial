import { create } from 'zustand';
import type { UserProfile } from '@matrimonial/shared';

/** Minimal matched user shape — may be a full UserProfile or a lightweight object with id. */
export type MatchedUser = (UserProfile & { id: string }) | { id: string; nickname: string; photo?: string };

interface MatchState {
  currentIndex: number;
  showMatchAnimation: boolean;
  matchedUser: MatchedUser | null;
  nextCard: () => void;
  setMatchAnimation: (show: boolean, user?: MatchedUser | null) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  currentIndex: 0,
  showMatchAnimation: false,
  matchedUser: null,
  nextCard: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
  setMatchAnimation: (show, user = null) =>
    set({ showMatchAnimation: show, matchedUser: user }),
}));
