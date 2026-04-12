import type { MembershipPlan } from './user';

export type ProductType =
  | 'MEMBERSHIP'
  | 'SUPER_LIKE'
  | 'BOOST'
  | 'LOVE_LETTER'
  | 'VIDEO_TICKET';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED';

export interface MembershipPlanDetail {
  plan: MembershipPlan;
  price: number;
  originalPrice: number;
  features: string[];
}

export interface PaymentOrderDetail {
  id: string;
  productType: ProductType;
  amount: number;
  status: PaymentStatus;
  channel: string;
  createdAt: string;
}
