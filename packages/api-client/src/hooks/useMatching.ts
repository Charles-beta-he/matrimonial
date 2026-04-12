import { api } from '../trpc';

export function useRecommendations() {
  return api.match.recommendations.useQuery();
}
