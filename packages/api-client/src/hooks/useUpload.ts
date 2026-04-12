import { api } from '../trpc';

export function useRequestUpload() {
  return api.upload.requestUpload.useMutation();
}

export function useConfirmUpload() {
  return api.upload.confirmUpload.useMutation();
}
