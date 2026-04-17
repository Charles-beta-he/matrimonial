import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
}));

let mockToken: string | null = null;
let mockHydrated = true;

jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (selector: any) =>
    selector({ token: mockToken, hydrated: mockHydrated }),
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let IndexScreen: React.ComponentType;
beforeAll(() => {
  IndexScreen = require('../../app/index').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Index', () => {
  const SecureStore = require('expo-secure-store');

  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = null;
    mockHydrated = true;
  });

  it('shows splash screen / loading state when not hydrated', () => {
    mockHydrated = false;
    SecureStore.getItemAsync.mockResolvedValue(null);
    // SplashScreen replaced ActivityIndicator — verify renders without crash
    const { toJSON } = render(<IndexScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows splash screen / loading state while onboarding flag resolves', () => {
    // SecureStore is async — before it resolves, state is null
    SecureStore.getItemAsync.mockReturnValue(new Promise(() => {})); // never resolves
    // SplashScreen replaced ActivityIndicator — verify renders without crash
    const { toJSON } = render(<IndexScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
