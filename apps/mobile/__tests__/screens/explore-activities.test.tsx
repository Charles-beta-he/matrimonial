import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockTrack = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

// Shared helpers
jest.mock('@matrimonial/shared', () => ({
  formatPrice: (cents: number) => `¥${(cents / 100).toFixed(0)}`,
  CIRCLE_CATEGORIES: [],
  BUDDY_TYPES: [],
  BUDDY_TYPE_COLORS: {},
}));

// UI components
jest.mock('@matrimonial/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Badge: ({ label }: { label: string }) => <Text>{label}</Text>,
    Card: ({ children }: any) => <View>{children}</View>,
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    EmptyState: ({ title, description }: { title: string; description?: string }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
        {description ? <Text>{description}</Text> : null}
      </View>
    ),
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

// api-client — mutable control vars
let mockActivitiesIsLoading = false;
let mockActivitiesData: any = undefined;
let mockActivitiesError: any = null;
const mockRefetch = jest.fn();
const mockSignupMutate = jest.fn();

jest.mock('@matrimonial/api-client', () => ({
  api: {
    activity: {
      list: {
        useQuery: () => ({
          data: mockActivitiesData,
          isLoading: mockActivitiesIsLoading,
          error: mockActivitiesError,
          refetch: mockRefetch,
          isRefetching: false,
        }),
      },
      signup: {
        useMutation: () => ({
          mutate: mockSignupMutate,
          isPending: false,
        }),
      },
      cancelSignup: {
        useMutation: () => ({ mutate: jest.fn(), isPending: false }),
      },
      activityMatches: {
        useQuery: () => ({ data: [] }),
      },
      mySignups: {
        useQuery: () => ({ data: [] }),
      },
    },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeActivity(id: string, overrides: Partial<any> = {}) {
  return {
    id,
    title: `活动${id}`,
    description: '活动描述',
    category: '户外',
    location: '上海市徐汇区',
    startTime: '2026-05-10T10:00:00.000Z',
    fee: '50',
    status: 'UPCOMING',
    signupCount: 5,
    maxMale: 10,
    maxFemale: 10,
    coverUrl: null,
    ...overrides,
  };
}

// ── Lazy import ────────────────────────────────────────────────────────────

let ActivitiesScreen: React.ComponentType;
beforeAll(() => {
  ActivitiesScreen = require('../../app/explore/activities/index').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ActivitiesScreen (线下活动)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActivitiesIsLoading = false;
    mockActivitiesData = undefined;
    mockActivitiesError = null;
  });

  it('renders the "线下活动" title', () => {
    mockActivitiesData = [];
    const { getByText } = render(<ActivitiesScreen />);
    expect(getByText('线下活动')).toBeTruthy();
  });

  it('shows ActivityIndicator while loading', () => {
    mockActivitiesIsLoading = true;
    mockActivitiesData = undefined;
    const { UNSAFE_getByType } = render(<ActivitiesScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('displays activity title and location after data loads', () => {
    mockActivitiesData = [
      makeActivity('a1', { title: '周末爬山活动', location: '北京香山' }),
    ];
    const { getByText } = render(<ActivitiesScreen />);
    expect(getByText('周末爬山活动')).toBeTruthy();
    expect(getByText('北京香山')).toBeTruthy();
  });

  it('displays activity start time', () => {
    mockActivitiesData = [
      makeActivity('a2', { startTime: '2026-05-10T10:00:00.000Z' }),
    ];
    const { getByText } = render(<ActivitiesScreen />);
    // formatStartTime formats as "5月10日 HH:MM" — just check month/day part
    expect(getByText(/5月10日/)).toBeTruthy();
  });

  it('shows empty state when there are no activities', () => {
    mockActivitiesData = [];
    const { getByTestId, getByText } = render(<ActivitiesScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('暂无活动')).toBeTruthy();
  });

  it('shows error empty state when loading fails', () => {
    mockActivitiesError = { message: '请求失败' };
    mockActivitiesData = undefined;
    const { getByTestId, getByText } = render(<ActivitiesScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('加载失败')).toBeTruthy();
  });

  it('shows fee text for paid activity', () => {
    mockActivitiesData = [makeActivity('a3', { fee: '100' })];
    const { getByText } = render(<ActivitiesScreen />);
    // feeToYuanText converts fee=100 → formatPrice(10000) + '/人' = '¥100/人'
    expect(getByText('¥100/人')).toBeTruthy();
  });

  it('shows "免费" for zero-fee activity', () => {
    mockActivitiesData = [makeActivity('a4', { fee: '0' })];
    const { getByText } = render(<ActivitiesScreen />);
    expect(getByText('免费')).toBeTruthy();
  });

  it('calls signup mutation when "报名" button is pressed', () => {
    mockActivitiesData = [makeActivity('a5', { status: 'UPCOMING' })];
    const { getByTestId } = render(<ActivitiesScreen />);
    fireEvent.press(getByTestId('btn-报名'));
    expect(mockSignupMutate).toHaveBeenCalledWith({ activityId: 'a5' });
  });

  it('calls analytics track with screen_view on mount', () => {
    mockActivitiesData = [];
    render(<ActivitiesScreen />);
    expect(mockTrack).toHaveBeenCalledWith('screen_view', { screen_name: 'explore_activities' });
  });

  it('renders category filter tabs', () => {
    mockActivitiesData = [];
    const { getByText } = render(<ActivitiesScreen />);
    expect(getByText('全部')).toBeTruthy();
    expect(getByText('户外')).toBeTruthy();
    expect(getByText('文化')).toBeTruthy();
  });

  it('shows signup count and capacity for each activity', () => {
    mockActivitiesData = [
      makeActivity('a6', { signupCount: 3, maxMale: 5, maxFemale: 5 }),
    ];
    const { getByText } = render(<ActivitiesScreen />);
    expect(getByText(/已报名 3/)).toBeTruthy();
  });
});
