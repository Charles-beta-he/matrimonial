import type { UserProfile } from './user';

export type LikeType = 'NORMAL' | 'SUPER';

export interface MatchCard extends UserProfile {
  matchScore: number;
  distance?: number;
}

export interface LikeResult {
  matched: boolean;
  conversationId?: string;
}

export type SwipeQuota = {
  remaining: number;
  total: number;
  quotaExhausted: boolean;
};

export type RecommendMeta = {
  score?: number;
  reason?: string;
};
