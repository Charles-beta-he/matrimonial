import { api } from '../trpc';

export function useAdminUsers(input: { page?: number; pageSize?: number; search?: string }) {
  return api.admin.users.useQuery(input);
}

export function useAdminStats() {
  return api.admin.stats.useQuery();
}

export function usePendingReports() {
  return api.admin.pendingReports.useQuery();
}

export function useResolveReport() {
  return api.admin.resolveReport.useMutation();
}

export function usePendingPhotos() {
  return api.admin.pendingPhotos.useQuery();
}

export function useApprovePhoto() {
  return api.admin.approvePhoto.useMutation();
}

export function useRejectPhoto() {
  return api.admin.rejectPhoto.useMutation();
}
