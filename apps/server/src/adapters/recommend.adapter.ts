import { logger } from '../lib/logger';
import { env } from '../lib/env';

const RECOMMEND_SERVICE_URL = env.RECOMMEND_SERVICE_URL;

export interface RecommendCandidate {
  userId: string;
  score: number;
  reason?: string;
}

export const RecommendAdapter = {
  /** Fetch recommendations from Python service. Fallback to basic ranking on failure. */
  async getRecommendations(userId: string, limit: number = 20): Promise<RecommendCandidate[]> {
    try {
      const res = await fetch(`${RECOMMEND_SERVICE_URL}/api/recommend?user_id=${userId}&limit=${limit}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: any = await res.json();
      return (data.items ?? []).slice(0, limit);
    } catch (err: any) {
      logger.warn('recommend service unavailable, using fallback', { error: err?.message });
      return [];
    }
  },

  async scorePair(userA: any, userB: any): Promise<number> {
    try {
      const res = await fetch(`${RECOMMEND_SERVICE_URL}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_a: userA, user_b: userB }),
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return 0.5;
      const data: any = await res.json();
      return Number(data.score) || 0.5;
    } catch {
      return 0.5;
    }
  },
};
