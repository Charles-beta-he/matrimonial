import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockTrack = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

const mockPay = jest.fn();
jest.mock('../../hooks/usePayment', () => ({
  usePayment: () => ({ pay: mockPay, processing: false }),
}));

let mockMembershipData: any = { plan: 'FREE' };

jest.mock('@matrimonial/api-client', () => ({
  api: {
    payment: {
      membershipStatus: {
        useQuery: () => ({ data: mockMembershipData }),
        invalidate: jest.fn(),
      },
      getOrders: {
        useQuery: () => ({ data: [] }),
      },
    },
    useUtils: () => ({
      payment: { membershipStatus: { invalidate: jest.fn() } },
    }),
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@matrimonial/shared', () => ({
  MEMBERSHIP_PLAN_DETAILS: [
    { plan: 'MONTHLY', label: '月卡', price: 99, originalPrice: 129, features: ['无限喜欢', '高级筛选'] },
    { plan: 'QUARTERLY', label: '季卡', price: 249, originalPrice: 299, features: ['无限喜欢', '高级筛选', '隐身浏览'] },
    { plan: 'YEARLY', label: '年卡', price: 799, originalPrice: 999, features: ['无限喜欢', '高级筛选', '隐身浏览', '专属客服'] },
  ],
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let MembershipScreen: React.ComponentType;
beforeAll(() => {
  MembershipScreen = require('../../app/profile/membership').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MembershipScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembershipData = { plan: 'FREE' };
  });

  it('renders "会员中心" title', () => {
    const { getByText } = render(<MembershipScreen />);
    expect(getByText('会员中心')).toBeTruthy();
  });

  it('shows current plan as 免费用户 for FREE plan', () => {
    const { getByText } = render(<MembershipScreen />);
    expect(getByText(/免费用户/)).toBeTruthy();
  });

  it('shows current plan as 月卡会员 for MONTHLY plan', () => {
    mockMembershipData = { plan: 'MONTHLY', expiry: null };
    const { getByText } = render(<MembershipScreen />);
    expect(getByText(/月卡会员/)).toBeTruthy();
  });

  it('renders plan selection tabs', () => {
    const { getAllByText } = render(<MembershipScreen />);
    expect(getAllByText('月卡').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('季卡').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('年卡').length).toBeGreaterThanOrEqual(1);
  });

  it('renders feature comparison table', () => {
    const { getByText, getAllByText } = render(<MembershipScreen />);
    expect(getByText(/每日喜欢次数/)).toBeTruthy();
    expect(getByText(/查看谁喜欢了我/)).toBeTruthy();
    // 高级筛选 appears in both feature list and comparison table
    expect(getAllByText(/高级筛选/).length).toBeGreaterThanOrEqual(1);
  });

  it('tracks membership_view on mount', () => {
    render(<MembershipScreen />);
    expect(mockTrack).toHaveBeenCalledWith('membership_view', {});
  });

  it('shows payment Alert when subscribe button is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<MembershipScreen />);
    // Find subscribe button
    const btn = getByText('立即开通');
    fireEvent.press(btn);
    expect(alertSpy).toHaveBeenCalledWith(
      '选择支付方式',
      expect.stringContaining('季卡'),
      expect.any(Array),
    );
  });

  it('calls router.back when back chevron is pressed', () => {
    const { UNSAFE_getAllByType } = render(<MembershipScreen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
