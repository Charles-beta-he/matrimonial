import { api } from '../trpc';

export function useConversations() {
  return api.chat.list.useQuery();
}
