import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockTrack = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

// @expo/vector-icons — already mocked in setup.ts (Ionicons: 'Ionicons')
// react-native-safe-area-context — already mocked in setup.ts
// @matrimonial/ui — in transform allow-list, renders directly

// ── Lazy import after mocks ────────────────────────────────────────────────

let ExploreTab: React.ComponentType;
beforeAll(() => {
  ExploreTab = require('../../app/(tabs)/explore').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ExploreTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page title "探索"', () => {
    const { getByText } = render(<ExploreTab />);
    expect(getByText('探索')).toBeTruthy();
  });

  it('displays "兴趣圈子" section', () => {
    const { getByText } = render(<ExploreTab />);
    expect(getByText('兴趣圈子')).toBeTruthy();
  });

  it('displays "线下活动" section', () => {
    const { getByText } = render(<ExploreTab />);
    expect(getByText('线下活动')).toBeTruthy();
  });

  it('displays "搭子广场" section', () => {
    const { getByText } = render(<ExploreTab />);
    expect(getByText('搭子广场')).toBeTruthy();
  });

  it('navigates to /explore/circles when "兴趣圈子" is pressed', () => {
    const { getByText } = render(<ExploreTab />);
    fireEvent.press(getByText('兴趣圈子'));
    expect(mockPush).toHaveBeenCalledWith('/explore/circles');
  });

  it('navigates to /explore/activities when "线下活动" is pressed', () => {
    const { getByText } = render(<ExploreTab />);
    fireEvent.press(getByText('线下活动'));
    expect(mockPush).toHaveBeenCalledWith('/explore/activities');
  });

  it('navigates to /explore/buddy when "搭子广场" is pressed', () => {
    const { getByText } = render(<ExploreTab />);
    fireEvent.press(getByText('搭子广场'));
    expect(mockPush).toHaveBeenCalledWith('/explore/buddy');
  });

  it('calls analytics track with screen_view on mount', () => {
    render(<ExploreTab />);
    expect(mockTrack).toHaveBeenCalledWith('screen_view', { screen_name: 'explore' });
  });
});
