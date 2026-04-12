import { api } from '../trpc';

export function useCreateReport() {
  return api.report.create.useMutation();
}

export function useMyReports() {
  return api.report.myReports.useQuery();
}
