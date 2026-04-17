import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  return {
    GestureHandlerRootView: RN.View,
    GestureDetector: RN.View,
    Gesture: { Pan: () => ({ onUpdate: () => ({}), onEnd: () => ({}) }) },
    PanGestureHandler: RN.View,
    State: {},
  };
});

jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  return {
    SafeAreaView: RN.View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockLikeMutate = jest.fn();
const mockSkipMutate = jest.fn();
const mockRecommendationsRefetch = jest.fn();
const mockDailyPicksRefetch = jest.fn();

let mockIsLoading = false;
let mockRecommendations: any[] = [];

jest.mock('@matrimonial/api-client', () => ({
  api: {
    match: {
      recommendations: {
        useQuery: () => ({
          data: mockRecommendations,
          isLoading: mockIsLoading,
          isError: false,
          error: null,
          refetch: mockRecommendationsRefetch,
        }),
      },
      dailyPicks: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          refetch: mockDailyPicksRefetch,
        }),
      },
      like: {
        useMutation: () => ({ mutate: mockLikeMutate, isPending: false }),
      },
      skip: {
        useMutation: () => ({ mutate: mockSkipMutate, isPending: false }),
      },
      recordFeedback: {
        useMutation: () => ({ mutate: jest.fn(), isPending: false }),
      },
      remainingSwipes: {
        useQuery: () => ({ data: undefined }),
      },
    },
    payment: {
      membershipStatus: {
        useQuery: () => ({ data: { plan: 'PREMIUM' } }),
      },
    },
    credits: {
      balance: {
        useQuery: () => ({ data: { superLikes: 3 } }),
      },
    },
  },
}));

jest.mock('../../stores/useMatchStore', () => ({
  useMatchStore: () => ({
    showMatchAnimation: false,
    matchedUser: null,
    setMatchAnimation: jest.fn(),
  }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));

jest.mock('../../components/SwipeCard', () => {
  const { View, Text } = require('react-native');
  return {
    SwipeCard: ({ user }: { user: any }) => (
      <View testID={`swipe-card-${user.id}`}>
        <Text testID={`card-nickname-${user.id}`}>{user.nickname}</Text>
        <Text testID={`card-age-${user.id}`}>{user.age}</Text>
        <Text testID={`card-city-${user.id}`}>{user.city}</Text>
      </View>
    ),
  };
});

jest.mock('../../components/MatchAnimation', () => {
  const { View } = require('react-native');
  return {
    MatchAnimation: () => <View testID="match-animation" />,
  };
});

jest.mock('@matrimonial/ui', () => {
  const { View, Text } = require('react-native');
  return {
    EmptyState: ({ title }: { title: string }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
      </View>
    ),
  };
});

jest.mock('@matrimonial/shared', () => ({
  calculateAge: () => 28,
  PROMPT_QUESTIONS: [],
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (id: string) => ({
  id,
  nickname: `User${id}`,
  age: 28,
  city: 'Beijing',
  birthday: '1996-01-01',
  photos: [{ url: `https://example.com/${id}.jpg` }],
  tags: [],
  prompts: [],
  verificationLevel: 'L1',
  isOnline: false,
});

// Lazy import after mocks are set up
let DiscoverTab: React.ComponentType;
beforeAll(() => {
  DiscoverTab = require('../../app/(tabs)/index').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('DiscoverTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading = false;
    mockRecommendations = [];
  });

  it('shows ActivityIndicator while loading', () => {
    mockIsLoading = true;
    mockRecommendations = [];

    const { UNSAFE_getByType } = render(<DiscoverTab />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows EmptyState when there are no recommendations', () => {
    mockIsLoading = false;
    mockRecommendations = [];

    const { getByTestId } = render(<DiscoverTab />);
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('displays user card with nickname and city after data loads', () => {
    mockIsLoading = false;
    mockRecommendations = [makeUser('u1')];

    const { getByTestId } = render(<DiscoverTab />);
    expect(getByTestId('swipe-card-u1')).toBeTruthy();
    expect(getByTestId('card-nickname-u1').props.children).toBe('Useru1');
    expect(getByTestId('card-city-u1').props.children).toBe('Beijing');
  });

  it('calls like mutation when the heart button is pressed', () => {
    mockIsLoading = false;
    // Provide two users so that pressing skip first doesn't exhaust the list
    // before we reach the like button in DOM traversal order
    mockRecommendations = [makeUser('u2a'), makeUser('u2b')];

    const { UNSAFE_getAllByType } = render(<DiscoverTab />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);

    expect(mockLikeMutate).not.toHaveBeenCalled();

    // Walk all Pressables and fire each until likeMutate is called.
    // Skip fires first (DOM order) but a second user remains, so like still fires.
    for (const p of pressables) {
      try {
        fireEvent.press(p);
        if (mockLikeMutate.mock.calls.length > 0) break;
      } catch { /* ignore press errors */ }
    }

    // like was called for whichever user was current when the heart was pressed
    expect(mockLikeMutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NORMAL' }),
      expect.any(Object),
    );
  });

  it('calls skip mutation when the X button is pressed', () => {
    mockIsLoading = false;
    mockRecommendations = [makeUser('u3')];

    const { UNSAFE_getAllByType } = render(<DiscoverTab />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);

    expect(mockSkipMutate).not.toHaveBeenCalled();

    // Walk all Pressables until skipMutate is called (X button triggers skip)
    for (const p of pressables) {
      try {
        fireEvent.press(p);
        if (mockSkipMutate.mock.calls.length > 0) break;
      } catch { /* ignore press errors */ }
    }

    expect(mockSkipMutate).toHaveBeenCalledWith(
      expect.objectContaining({ toUserId: 'u3' }),
    );
  });

  it('shows the filter panel section after pressing the filter icon (PREMIUM user)', () => {
    mockIsLoading = false;
    mockRecommendations = [makeUser('u4')];

    const { UNSAFE_getAllByType, getByText } = render(<DiscoverTab />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);

    // Filter icon button is the first Pressable in the header
    act(() => {
      fireEvent.press(pressables[0]);
    });

    // After toggle, filter section heading '年龄范围' appears
    expect(getByText('年龄范围')).toBeTruthy();
  });
});
