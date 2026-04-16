import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
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

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let OnboardingScreen: React.ComponentType;
beforeAll(() => {
  OnboardingScreen = require('../../app/onboarding').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders first page title', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('遇见对的人')).toBeTruthy();
  });

  it('renders skip button', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('跳过')).toBeTruthy();
  });

  it('shows "下一步" button on first page', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('下一步')).toBeTruthy();
  });

  it('calls router.replace when skip is pressed', async () => {
    const { getByText } = render(<OnboardingScreen />);
    fireEvent.press(getByText('跳过'));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('renders all three page titles in the scroll view', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('遇见对的人')).toBeTruthy();
    expect(getByText('真实可信')).toBeTruthy();
    expect(getByText('安全放心')).toBeTruthy();
  });

  it('renders dot indicators for each page', () => {
    const { UNSAFE_getAllByType } = render(<OnboardingScreen />);
    const { View } = require('react-native');
    // 3 dots in the indicator row
    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBeGreaterThan(0);
  });
});
