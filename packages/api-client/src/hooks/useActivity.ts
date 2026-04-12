import { api } from '../trpc';

export function useActivities(input?: { category?: string; status?: string }) {
  return api.activity.list.useQuery(input ?? {});
}

export function useActivity(id: string) {
  return api.activity.getById.useQuery(id);
}

export function useActivitySignup() {
  return api.activity.signup.useMutation();
}

export function useCancelSignup() {
  return api.activity.cancelSignup.useMutation();
}

export function useMySignups() {
  return api.activity.mySignups.useQuery();
}
