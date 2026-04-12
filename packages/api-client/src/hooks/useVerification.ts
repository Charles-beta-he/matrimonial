import { api } from '../trpc';

export function useVerificationStatus() {
  return api.verification.getStatus.useQuery();
}

export function useSubmitRealName() {
  return api.verification.submitRealName.useMutation();
}

export function useSubmitFaceVerify() {
  return api.verification.submitFaceVerify.useMutation();
}

export function useSubmitEduVerify() {
  return api.verification.submitEduVerify.useMutation();
}
