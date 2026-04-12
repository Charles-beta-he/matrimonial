import { api } from '../trpc';

export function useCreditsBalance() {
  return api.credits.balance.useQuery();
}
