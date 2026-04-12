import { api } from '../trpc';

export function useCurrentUser() {
  return api.user.me.useQuery();
}
