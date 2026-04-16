import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ activityId: 'act1' }),
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

const mockVoteMutate = jest.fn();
const mockParticipantsRefetch = jest.fn();

let mockActivityData: any = null;
let mockParticipantsData: any = undefined;
let mockParticipantsLoading = false;

jest.mock('@matrimonial/api-client', () => ({
  api: {
    activity: {
      getById: {
        useQuery: (_id: any) => ({ data: mockActivityData }),
      },
      votableParticipants: {
        useQuery: (_args: any, _opts: any) => ({
          data: mockParticipantsData,
          isLoading: mockParticipantsLoading,
          refetch: mockParticipantsRefetch,
        }),
      },
      vote: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockVoteMutate(args);
            onSuccess?.({ isMutual: false, conversationId: null });
          },
          isPending: false,
        }),
      },
    },
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { View, Text } = require('react-native');
  return {
    Card: ({ children }: any) => <View>{children}</View>,
    EmptyState: ({ title }: { title: string }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
      </View>
    ),
    toast: { success: jest.fn(), error: jest.fn() },
  };
});

// ── Lazy import ────────────────────────────────────────────────────────────

let ActivityVoteScreen: React.ComponentType;
beforeAll(() => {
  ActivityVoteScreen = require('../../app/explore/activities/[activityId]/vote').default;
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeParticipant(overrides: any = {}) {
  return {
    id: 'user2',
    nickname: '小红',
    gender: 'female',
    birthday: '1998-05-15',
    city: '上海',
    avatarUrl: null,
    myRating: null,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ActivityVoteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActivityData = null;
    mockParticipantsData = undefined;
    mockParticipantsLoading = false;
  });

  it('renders "活动互评" title', () => {
    const { getByText } = render(<ActivityVoteScreen />);
    expect(getByText('活动互评')).toBeTruthy();
  });

  it('shows loading indicator while fetching participants', () => {
    mockParticipantsLoading = true;
    const { UNSAFE_getByType } = render(<ActivityVoteScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows empty state when no participants', () => {
    mockParticipantsData = [];
    const { getByTestId } = render(<ActivityVoteScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('shows instruction banner text', () => {
    const { getByText } = render(<ActivityVoteScreen />);
    expect(getByText(/双方都给了 3 分以上/)).toBeTruthy();
  });

  it('renders participant nickname when data loads', () => {
    mockParticipantsData = [makeParticipant()];
    const { getByText } = render(<ActivityVoteScreen />);
    expect(getByText('小红')).toBeTruthy();
  });

  it('renders participant city', () => {
    mockParticipantsData = [makeParticipant()];
    const { getByText } = render(<ActivityVoteScreen />);
    expect(getByText(/上海/)).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<ActivityVoteScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('calls vote mutation when star is pressed', () => {
    mockParticipantsData = [makeParticipant()];
    const { UNSAFE_getAllByType } = render(<ActivityVoteScreen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    // First pressable is back button; star pressables come after
    // Find the star buttons — 5 stars per participant
    const starButtons = pressables.filter((_: any, i: number) => i > 0);
    fireEvent.press(starButtons[0]);
    expect(mockVoteMutate).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: 'act1', votedId: 'user2' }),
    );
  });

  it('shows activity title in header when activity data is loaded', () => {
    mockActivityData = { title: '春日相亲局' };
    const { getByText } = render(<ActivityVoteScreen />);
    expect(getByText('春日相亲局')).toBeTruthy();
  });
});
