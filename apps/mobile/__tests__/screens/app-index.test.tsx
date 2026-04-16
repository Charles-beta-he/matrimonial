import React from 'react';
import { render } from '@testing-library/react-native';

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

  it('shows loading indicator when not hydrated', () => {
    mockHydrated = false;
    SecureStore.getItemAsync.mockResolvedValue(null);
    const { UNSAFE_getByType } = render(<IndexScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows loading indicator while onboarding flag resolves', () => {
    // SecureStore is async — before it resolves, state is null
    SecureStore.getItemAsync.mockReturnValue(new Promise(() => {})); // never resolves
    const { UNSAFE_getByType } = render(<IndexScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
