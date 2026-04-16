import { api } from '../trpc';

export function useStart1v1Call() {
  return api.video.start1v1.useMutation();
}

export function useVideoRooms() {
  return api.video.listRooms.useQuery();
}

export function useCreateVideoRoom() {
  return api.video.createRoom.useMutation();
}

export function useJoinVideoRoom() {
  return api.video.joinRoom.useMutation();
}

export function useLeaveVideoRoom() {
  return api.video.leaveRoom.useMutation();
}

export function useQuickMatch() {
  return api.video.quickMatch.useMutation();
}

export function useLeaveQuickMatch() {
  return api.video.leaveQuickMatch.useMutation();
}

export function useQuickMatchStatus(enabled: boolean) {
  return api.video.quickMatchStatus.useQuery(undefined, {
    enabled,
    refetchInterval: 3000,
  });
}
