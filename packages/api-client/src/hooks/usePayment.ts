import { api } from '../trpc';

export function useCreateOrder() {
  return api.payment.createOrder.useMutation();
}
