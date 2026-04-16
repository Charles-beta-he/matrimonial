import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
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

const mockQuickMatchMutateAsync = jest.fn().mockResolvedValue({ status: 'queued' });
const mockLeaveQuickMatchMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@matrimonial/api-client', () => ({
  useQuickMatch: () => ({
    mutateAsync: mockQuickMatchMutateAsync,
    isPending: false,
  }),
  useLeaveQuickMatch: () => ({
    mutateAsync: mockLeaveQuickMatchMutateAsync,
  }),
  useQuickMatchStatus: (_enabled: boolean) => ({
    data: null,
  }),
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let QuickMatchScreen: React.ComponentType;
beforeAll(() => {
  QuickMatchScreen = require('../../app/chat/quick-match').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('QuickMatchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuickMatchMutateAsync.mockResolvedValue({ status: 'queued' });
  });

  it('renders "视频速配" title', () => {
    const { getByText } = render(<QuickMatchScreen />);
    expect(getByText('视频速配')).toBeTruthy();
  });

  it('shows 开始匹配 button in idle state', () => {
    const { getByText } = render(<QuickMatchScreen />);
    expect(getByText('开始匹配')).toBeTruthy();
  });

  it('shows 3分钟视频速配 heading in idle state', () => {
    const { getByText } = render(<QuickMatchScreen />);
    expect(getByText('3分钟视频速配')).toBeTruthy();
  });

  it('shows description text in idle state', () => {
    const { getByText } = render(<QuickMatchScreen />);
    expect(getByText(/随机匹配异性/)).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<QuickMatchScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('transitions to matching state after pressing 开始匹配 (queued response)', async () => {
    const { getByText } = render(<QuickMatchScreen />);
    await act(async () => {
      fireEvent.press(getByText('开始匹配'));
    });
    expect(mockQuickMatchMutateAsync).toHaveBeenCalled();
    expect(getByText('正在匹配中...')).toBeTruthy();
  });

  it('shows 取消匹配 button in matching state', async () => {
    const { getByText } = render(<QuickMatchScreen />);
    await act(async () => {
      fireEvent.press(getByText('开始匹配'));
    });
    expect(getByText('取消匹配')).toBeTruthy();
  });

  it('pressing 取消匹配 returns to idle state', async () => {
    const { getByText } = render(<QuickMatchScreen />);
    await act(async () => {
      fireEvent.press(getByText('开始匹配'));
    });
    await act(async () => {
      fireEvent.press(getByText('取消匹配'));
    });
    expect(mockLeaveQuickMatchMutateAsync).toHaveBeenCalled();
    expect(getByText('开始匹配')).toBeTruthy();
  });

  it('shows alert when quick match call fails', async () => {
    mockQuickMatchMutateAsync.mockRejectedValueOnce(new Error('服务器错误'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<QuickMatchScreen />);
    await act(async () => {
      fireEvent.press(getByText('开始匹配'));
    });
    expect(alertSpy).toHaveBeenCalledWith('匹配失败', expect.any(String));
  });
});
