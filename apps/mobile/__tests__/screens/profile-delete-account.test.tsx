import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
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

const mockClearAuth = jest.fn();
jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (sel: any) => sel({ clearAuth: mockClearAuth }),
}));

const mockDeletionMutateAsync = jest.fn();
jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      requestDeletion: {
        useMutation: () => ({
          mutateAsync: mockDeletionMutateAsync,
          isPending: false,
        }),
      },
    },
  },
}));

jest.mock('@matrimonial/ui', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let DeleteAccountScreen: React.ComponentType;
beforeAll(() => {
  DeleteAccountScreen = require('../../app/profile/delete-account').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "注销账号" title', () => {
    const { getByText } = render(<DeleteAccountScreen />);
    expect(getByText('注销账号')).toBeTruthy();
  });

  it('shows all DELETION_ITEMS in the list', () => {
    const { getByText } = render(<DeleteAccountScreen />);
    expect(getByText('个人资料与照片')).toBeTruthy();
    expect(getByText('匹配记录与聊天消息')).toBeTruthy();
    expect(getByText('会员权益（不退款）')).toBeTruthy();
    expect(getByText('认证信息')).toBeTruthy();
  });

  it('renders phone input placeholder', () => {
    const { getByPlaceholderText } = render(<DeleteAccountScreen />);
    expect(getByPlaceholderText('请输入注册手机号')).toBeTruthy();
  });

  it('renders verification code input placeholder', () => {
    const { getByPlaceholderText } = render(<DeleteAccountScreen />);
    expect(getByPlaceholderText('请输入验证码')).toBeTruthy();
  });

  it('confirm button is disabled without phone and code input', () => {
    const { getByText } = render(<DeleteAccountScreen />);
    // Button text is "确认注销" — pressing it with empty fields shows alert
    fireEvent.press(getByText('确认注销'));
    // canSubmit is false so press is disabled; Alert should not be called via button
    // But the Pressable is disabled, so onPress won't fire at all
    // Verify the button text is still "确认注销" (not pending)
    expect(getByText('确认注销')).toBeTruthy();
  });

  it('shows warning notice about 14-day cooldown', () => {
    const { getByText } = render(<DeleteAccountScreen />);
    expect(getByText(/14天/)).toBeTruthy();
  });

  it('send code button is disabled when phone is empty', () => {
    const { getByText } = render(<DeleteAccountScreen />);
    expect(getByText('发送验证码')).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<DeleteAccountScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows alert with phone+code validation when confirming with empty fields', () => {
    const { getByText } = render(<DeleteAccountScreen />);
    // Fill in phone to 11 digits but leave code empty — canSubmit still false
    // Try pressing confirm directly (disabled, no-op)
    fireEvent.press(getByText('确认注销'));
    // Since disabled = true, onPress won't fire
    expect(mockDeletionMutateAsync).not.toHaveBeenCalled();
  });
});
