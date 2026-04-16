import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileTab from '../../app/(tabs)/profile';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockClearAuth = jest.fn();
jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({
      user: {
        id: 'user-1',
        nickname: '测试用户',
        city: '上海',
        age: 28,
        verificationLevel: 'L2',
        photos: [],
      },
      clearAuth: mockClearAuth,
    }),
}));

const mockTrack = jest.fn();
const mockClearUser = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack, clearUser: mockClearUser }),
}));

jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      me: { useQuery: () => ({ data: null }) },
      visitors: { useQuery: () => ({ data: [] }) },
    },
    match: {
      likedMe: { useQuery: () => ({ data: [] }) },
      matches: { useQuery: () => ({ data: [] }) },
    },
    auth: {
      logout: {
        useMutation: () => ({ mutateAsync: jest.fn().mockResolvedValue(undefined) }),
      },
    },
    checkin: {
      history: { useQuery: () => ({ data: { checkedInToday: false, currentStreak: 0 } }) },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProfileTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user nickname from store', () => {
    const { getByText } = render(<ProfileTab />);
    expect(getByText('测试用户')).toBeTruthy();
  });

  it('renders user city and age', () => {
    const { getByText } = render(<ProfileTab />);
    // Combined "28岁 · 上海" text
    expect(getByText(/28岁/)).toBeTruthy();
    expect(getByText(/上海/)).toBeTruthy();
  });

  it('renders edit profile button', () => {
    const { getByText } = render(<ProfileTab />);
    expect(getByText('编辑资料')).toBeTruthy();
  });

  it('navigates to edit profile on button press', () => {
    const { getByText } = render(<ProfileTab />);
    fireEvent.press(getByText('编辑资料'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('renders all menu items', () => {
    const { getByText } = render(<ProfileTab />);
    expect(getByText('认证中心')).toBeTruthy();
    expect(getByText('会员中心')).toBeTruthy();
    expect(getByText('隐私设置')).toBeTruthy();
    expect(getByText('邀请好友')).toBeTruthy();
    expect(getByText('安全工具')).toBeTruthy();
    expect(getByText('设置')).toBeTruthy();
  });

  it('renders logout button', () => {
    const { getByText } = render(<ProfileTab />);
    expect(getByText('退出登录')).toBeTruthy();
  });

  it('renders stat counters', () => {
    const { getByText } = render(<ProfileTab />);
    expect(getByText('获赞')).toBeTruthy();
    expect(getByText('匹配')).toBeTruthy();
    expect(getByText('来访')).toBeTruthy();
  });

  it('renders daily check-in card', () => {
    const { getByText } = render(<ProfileTab />);
    expect(getByText('每日签到')).toBeTruthy();
    expect(getByText('今日未签到，点击领取奖励')).toBeTruthy();
  });

  it('navigates to correct routes for menu items', () => {
    const { getByText } = render(<ProfileTab />);
    fireEvent.press(getByText('认证中心'));
    expect(mockPush).toHaveBeenCalledWith('/profile/verification');
    fireEvent.press(getByText('会员中心'));
    expect(mockPush).toHaveBeenCalledWith('/profile/membership');
  });

  it('tracks screen_view on mount', () => {
    render(<ProfileTab />);
    expect(mockTrack).toHaveBeenCalledWith('screen_view', { screen_name: 'my_profile' });
  });
});
