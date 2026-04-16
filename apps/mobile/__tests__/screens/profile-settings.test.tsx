import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}));

const mockClearAuth = jest.fn();
jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({ clearAuth: mockClearAuth }),
}));

const mockDisconnect = jest.fn();
jest.mock('../../stores/useSocketStore', () => ({
  useSocketStore: {
    getState: () => ({ disconnect: mockDisconnect }),
  },
}));

const mockLogoutMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockUpdateNotifMutate = jest.fn();

// Mutable holder so individual tests can swap data without resetModules
// Must start with "mock" to be accessible inside jest.mock() factory
let mockNotifPrefsData: any = null;

jest.mock('@matrimonial/api-client', () => ({
  api: {
    auth: {
      logout: {
        useMutation: () => ({ mutateAsync: mockLogoutMutateAsync }),
      },
    },
    user: {
      getNotifPrefs: {
        useQuery: () => ({ data: mockNotifPrefsData }),
      },
      updateNotifPrefs: {
        useMutation: () => ({ mutate: mockUpdateNotifMutate }),
      },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

let Screen: React.ComponentType;

describe('SettingsPage', () => {
  beforeAll(() => {
    Screen = require('../../app/profile/settings').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifPrefsData = null;
    mockLogoutMutateAsync.mockResolvedValue(undefined);
  });

  it('renders page title and all section headings', () => {
    const { getByText } = render(<Screen />);
    expect(getByText('设置')).toBeTruthy();
    expect(getByText('账号安全')).toBeTruthy();
    expect(getByText('通知设置')).toBeTruthy();
    expect(getByText('通用')).toBeTruthy();
    expect(getByText('关于')).toBeTruthy();
    expect(getByText('账号')).toBeTruthy();
  });

  it('renders all notification toggles', () => {
    const { getByText } = render(<Screen />);
    expect(getByText('新消息通知')).toBeTruthy();
    expect(getByText('匹配成功通知')).toBeTruthy();
    expect(getByText('活动提醒')).toBeTruthy();
    expect(getByText('营销推送')).toBeTruthy();
  });

  it('calls updateNotifPrefs mutation when toggling a notification switch', () => {
    const { UNSAFE_getAllByType } = render(<Screen />);
    const { Switch } = require('react-native');
    const switches = UNSAFE_getAllByType(Switch);
    expect(switches.length).toBe(4);
    // Toggle the first switch (新消息通知, default true → false)
    fireEvent(switches[0], 'valueChange', false);
    expect(mockUpdateNotifMutate).toHaveBeenCalledWith({ newMessage: false });
  });

  it('hydrates notification toggles from server data', async () => {
    mockNotifPrefsData = {
      newMessage: false,
      matchSuccess: false,
      activityReminder: true,
      marketing: true,
    };
    const { UNSAFE_getAllByType } = render(<Screen />);
    const { Switch } = require('react-native');
    await act(async () => {}); // flush useEffect hydration
    const switches = UNSAFE_getAllByType(Switch);
    // First two off, last two on (hydrated via useEffect)
    expect(switches[0].props.value).toBe(false);
    expect(switches[1].props.value).toBe(false);
    expect(switches[2].props.value).toBe(true);
    expect(switches[3].props.value).toBe(true);
  });

  it('pressing back chevron calls router.back()', () => {
    const { UNSAFE_getAllByType } = render(<Screen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('pressing 清除缓存 shows alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<Screen />);
    fireEvent.press(getByText('清除缓存'));
    expect(alertSpy).toHaveBeenCalledWith('清除缓存', '缓存已清除');
  });

  it('pressing 注销账号 navigates to delete-account page', () => {
    const { getByText } = render(<Screen />);
    fireEvent.press(getByText('注销账号'));
    expect(mockPush).toHaveBeenCalledWith('/profile/delete-account');
  });

  it('pressing 退出登录 shows confirmation alert and performs logout on confirm', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<Screen />);
    fireEvent.press(getByText('退出登录'));
    expect(alertSpy).toHaveBeenCalledWith(
      '退出登录',
      '确定要退出登录吗？',
      expect.arrayContaining([
        expect.objectContaining({ text: '取消' }),
        expect.objectContaining({ text: '确定' }),
      ]),
    );
    const confirmButton = (alertSpy.mock.calls[0][2] as any[]).find(
      (b: any) => b.text === '确定',
    );
    await act(async () => {
      await confirmButton?.onPress?.();
    });
    expect(mockLogoutMutateAsync).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
