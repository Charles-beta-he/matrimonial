import { api } from '../trpc';

export function useIcebreakers(targetUserId: string, enabled: boolean = true) {
  return api.ai.icebreakers.useQuery({ targetUserId }, { enabled });
}

export function useEvaluatePrompt() {
  return api.ai.evaluatePrompt.useMutation();
}
