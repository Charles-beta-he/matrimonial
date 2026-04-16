import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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

jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getContactsAsync: jest.fn().mockResolvedValue({ data: [] }),
  Fields: { PhoneNumbers: 'phoneNumbers' },
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('hashed'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const mockInvalidate = jest.fn();
const mockUpdatePrivacyMutateAsync = jest.fn().mockResolvedValue({});
let mockMeData: any = null;
let mockMeIsLoading = false;

jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      me: {
        useQuery: () => ({
          data: mockMeData,
          isLoading: mockMeIsLoading,
        }),
      },
      updatePrivacy: {
        useMutation: ({ onSuccess }: any) => ({
          mutateAsync: async (args: any) => {
            await mockUpdatePrivacyMutateAsync(args);
            onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      user: { me: { invalidate: mockInvalidate } },
    }),
  },
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let PrivacyScreen: React.ComponentType;
beforeAll(() => {
  PrivacyScreen = require('../../app/profile/privacy').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PrivacyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeData = null;
    mockMeIsLoading = false;
  });

  it('renders "隐私设置" title', () => {
    const { getByText } = render(<PrivacyScreen />);
    expect(getByText('隐私设置')).toBeTruthy();
  });

  it('renders all privacy setting titles', () => {
    const { getByText } = render(<PrivacyScreen />);
    expect(getByText('照片模糊')).toBeTruthy();
    expect(getByText('隐身模式')).toBeTruthy();
    expect(getByText('屏蔽通讯录')).toBeTruthy();
    expect(getByText('位置模糊')).toBeTruthy();
    expect(getByText('关闭访客记录')).toBeTruthy();
  });

  it('renders setting descriptions', () => {
    const { getByText } = render(<PrivacyScreen />);
    expect(getByText(/未匹配的用户看到模糊照片/)).toBeTruthy();
  });

  it('shows 会员 badge for incognito setting', () => {
    const { getByText } = render(<PrivacyScreen />);
    expect(getByText('会员')).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<PrivacyScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders switches for each setting', () => {
    const { UNSAFE_getAllByType } = render(<PrivacyScreen />);
    const { Switch } = require('react-native');
    const switches = UNSAFE_getAllByType(Switch);
    expect(switches.length).toBe(5);
  });

  it('shows alert for incognito toggle when user is not a member', async () => {
    mockMeData = { membership: 'FREE' };
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { UNSAFE_getAllByType } = render(<PrivacyScreen />);
    const { Switch } = require('react-native');
    const switches = UNSAFE_getAllByType(Switch);
    // incognito is the 2nd switch (index 1)
    await act(async () => {
      fireEvent(switches[1], 'valueChange', true);
    });
    expect(alertSpy).toHaveBeenCalledWith('会员专享', expect.any(String));
  });

  it('calls updatePrivacy mutation when toggling a non-member-only setting', async () => {
    mockMeData = { privacyBlurPhotos: false };
    const { UNSAFE_getAllByType } = render(<PrivacyScreen />);
    const { Switch } = require('react-native');
    const switches = UNSAFE_getAllByType(Switch);
    // blurPhotos is the 1st switch (index 0)
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
    });
    expect(mockUpdatePrivacyMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ blurPhotos: true }),
    );
  });
});
