import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));

// Shared constants
jest.mock('@matrimonial/shared', () => ({
  BUDDY_TYPES: [
    { id: 'meal', label: '饭搭子', icon: 'restaurant-outline' },
    { id: 'sports', label: '运动搭子', icon: 'fitness-outline' },
  ],
  BUDDY_TYPE_COLORS: {
    meal: '#f97316',
    sports: '#22c55e',
  },
  formatPrice: (cents: number) => `¥${(cents / 100).toFixed(0)}`,
}));

// UI components
jest.mock('@matrimonial/ui', () => {
  const { View, Text } = require('react-native');
  return {
    Badge: ({ label }: { label: string }) => <Text>{label}</Text>,
    Card: ({ children }: any) => <View>{children}</View>,
    EmptyState: ({ title, description }: { title: string; description?: string }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
        {description ? <Text>{description}</Text> : null}
      </View>
    ),
  };
});

// api-client — mutable control vars
let mockBuddyIsLoading = false;
let mockBuddyData: any = undefined;
let mockBuddyError: any = null;
const mockRefetch = jest.fn();

jest.mock('@matrimonial/api-client', () => ({
  api: {
    buddy: {
      list: {
        useQuery: () => ({
          data: mockBuddyData,
          isLoading: mockBuddyIsLoading,
          error: mockBuddyError,
          refetch: mockRefetch,
          isRefetching: false,
        }),
      },
    },
  },
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let BuddyScreen: React.ComponentType;
beforeAll(() => {
  BuddyScreen = require('../../app/explore/buddy/index').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BuddyScreen (搭子广场)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuddyIsLoading = false;
    mockBuddyData = undefined;
    mockBuddyError = null;
  });

  it('renders the "搭子广场" title', () => {
    mockBuddyData = { items: [] };
    const { getByText } = render(<BuddyScreen />);
    expect(getByText('搭子广场')).toBeTruthy();
  });

  it('shows ActivityIndicator while loading', () => {
    mockBuddyIsLoading = true;
    mockBuddyData = undefined;
    const { UNSAFE_getByType } = render(<BuddyScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('displays post titles and type labels after data loads', () => {
    mockBuddyData = {
      items: [
        {
          id: 'p1',
          title: '周末一起吃火锅',
          description: '求一起吃饭的朋友',
          type: 'meal',
          location: '上海',
          scheduledAt: null,
          applyCount: 3,
          maxPeople: 6,
        },
        {
          id: 'p2',
          title: '羽毛球搭子',
          description: '每周打球',
          type: 'sports',
          location: '北京',
          scheduledAt: null,
          applyCount: 1,
          maxPeople: null,
        },
      ],
    };
    const { getByText } = render(<BuddyScreen />);
    expect(getByText('周末一起吃火锅')).toBeTruthy();
    expect(getByText('羽毛球搭子')).toBeTruthy();
  });

  it('navigates to buddy detail when a post card is pressed', () => {
    mockBuddyData = {
      items: [
        {
          id: 'buddy-77',
          title: '导航测试帖',
          description: null,
          type: 'meal',
          location: null,
          scheduledAt: null,
          applyCount: 0,
          maxPeople: null,
        },
      ],
    };
    const { getByText } = render(<BuddyScreen />);
    fireEvent.press(getByText('导航测试帖'));
    expect(mockPush).toHaveBeenCalledWith('/explore/buddy/buddy-77');
  });

  it('navigates to create page when FAB "+" is pressed', () => {
    mockBuddyData = { items: [] };
    const { UNSAFE_getAllByType } = render(<BuddyScreen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    // FAB is the last Pressable (absolute positioned at bottom)
    const fab = pressables[pressables.length - 1];
    fireEvent.press(fab);
    expect(mockPush).toHaveBeenCalledWith('/explore/buddy/create');
  });

  it('shows empty state when there are no posts', () => {
    mockBuddyData = { items: [] };
    const { getByTestId, getByText } = render(<BuddyScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('暂无搭子帖')).toBeTruthy();
  });

  it('shows error empty state when loading fails', () => {
    mockBuddyError = { message: '服务器错误' };
    mockBuddyData = undefined;
    const { getByTestId, getByText } = render(<BuddyScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('加载失败')).toBeTruthy();
  });

  it('renders type filter tabs', () => {
    mockBuddyData = { items: [] };
    const { getByText } = render(<BuddyScreen />);
    expect(getByText('全部')).toBeTruthy();
    expect(getByText('饭搭子')).toBeTruthy();
    expect(getByText('运动搭子')).toBeTruthy();
  });

  it('shows apply count for each post', () => {
    mockBuddyData = {
      items: [
        {
          id: 'p3',
          title: '报名测试',
          description: null,
          type: 'meal',
          location: null,
          scheduledAt: null,
          applyCount: 5,
          maxPeople: 10,
        },
      ],
    };
    const { getByText } = render(<BuddyScreen />);
    expect(getByText('5 人报名 / 共 10 人')).toBeTruthy();
  });
});
