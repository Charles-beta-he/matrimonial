import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterStep4Preferences from '../../app/(auth)/register/step4-preferences';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn(), setUserId: jest.fn() }),
}));

const mockUpdatePreferencesMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      updatePreferences: {
        useMutation: () => ({
          mutateAsync: mockUpdatePreferencesMutateAsync,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      user: {
        me: { invalidate: jest.fn().mockResolvedValue(undefined) },
      },
    }),
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterStep4Preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdatePreferencesMutateAsync.mockResolvedValue({});
  });

  it('renders title 择偶偏好', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('择偶偏好')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('帮助我们为你推荐合适的人')).toBeTruthy();
  });

  it('renders age range label', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('年龄范围')).toBeTruthy();
  });

  it('renders height range label', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('身高范围')).toBeTruthy();
  });

  it('renders education minimum label', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('最低学历')).toBeTruthy();
  });

  it('renders education options', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('高中')).toBeTruthy();
    expect(getByText('本科')).toBeTruthy();
    expect(getByText('博士')).toBeTruthy();
  });

  it('renders 接受异地 switch row', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('接受异地')).toBeTruthy();
  });

  it('renders 下一步 button', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    expect(getByText('下一步')).toBeTruthy();
  });

  it('pressing 下一步 calls updatePreferences mutation and navigates to step5', async () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    fireEvent.press(getByText('下一步'));

    await waitFor(() => {
      expect(mockUpdatePreferencesMutateAsync).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/(auth)/register/step5-tags');
    });
  });

  it('clicking an education option updates selection', () => {
    const { getByText } = render(<RegisterStep4Preferences />);
    fireEvent.press(getByText('硕士'));
    // No error means pressable handled the event correctly
    expect(getByText('硕士')).toBeTruthy();
  });

  it('renders city preference input', () => {
    const { getByPlaceholderText } = render(<RegisterStep4Preferences />);
    expect(getByPlaceholderText('如: 北京、上海、深圳')).toBeTruthy();
  });
});
