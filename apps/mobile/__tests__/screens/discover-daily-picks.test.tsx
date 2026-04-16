import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
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

jest.mock('@matrimonial/shared', () => ({
  calculateAge: () => 27,
  PROMPT_QUESTIONS: [],
}));

const mockRefetch = jest.fn();
let mockIsLoading = false;
let mockData: any[] | undefined = [];
let mockError: any = null;

jest.mock('@matrimonial/api-client', () => ({
  api: {
    match: {
      dailyPicks: {
        useQuery: () => ({
          data: mockData,
          isLoading: mockIsLoading,
          error: mockError,
          refetch: mockRefetch,
        }),
      },
    },
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    EmptyState: ({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
        {action ? (
          <TouchableOpacity onPress={action.onPress} testID="empty-action">
            <Text>{action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    ProfileCard: ({ user }: { user: any }) => (
      <View testID={`profile-card-${user.id}`}>
        <Text>{user.nickname}</Text>
      </View>
    ),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUser(id: string) {
  return {
    id,
    nickname: `User${id}`,
    birthday: '1997-06-15',
    city: 'Shanghai',
    photos: [{ url: `https://example.com/${id}.jpg` }],
    tags: [],
    prompts: [],
    verificationLevel: 'L1',
    isOnline: false,
  };
}

// ── Lazy import ────────────────────────────────────────────────────────────

let DailyPicksScreen: React.ComponentType;
beforeAll(() => {
  DailyPicksScreen = require('../../app/discover/daily-picks').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('DailyPicksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading = false;
    mockData = [];
    mockError = null;
  });

  it('renders "今日精选" title', () => {
    const { getByText } = render(<DailyPicksScreen />);
    expect(getByText('今日精选')).toBeTruthy();
  });

  it('shows loading indicator while fetching', () => {
    mockIsLoading = true;
    mockData = undefined;
    const { UNSAFE_getByType } = render(<DailyPicksScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows empty state when no picks', () => {
    mockData = [];
    const { getByTestId, getByText } = render(<DailyPicksScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('暂无精选')).toBeTruthy();
  });

  it('shows error empty state on failure', () => {
    mockError = { message: '网络错误' };
    mockData = undefined;
    const { getByTestId, getByText } = render(<DailyPicksScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('加载失败')).toBeTruthy();
  });

  it('calls refetch when retry button is pressed', () => {
    mockError = { message: '网络错误' };
    mockData = undefined;
    const { getByTestId } = render(<DailyPicksScreen />);
    fireEvent.press(getByTestId('empty-action'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders profile cards for each pick', () => {
    mockData = [makeUser('p1'), makeUser('p2')];
    const { getByTestId } = render(<DailyPicksScreen />);
    expect(getByTestId('profile-card-p1')).toBeTruthy();
    expect(getByTestId('profile-card-p2')).toBeTruthy();
  });

  it('navigates to user profile on card press', () => {
    mockData = [makeUser('p3')];
    const { UNSAFE_getAllByType } = render(<DailyPicksScreen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    // Find the card pressable (not the back button)
    const cardPressable = pressables.find((_: any, i: number) => i > 0);
    if (cardPressable) fireEvent.press(cardPressable);
    expect(mockPush).toHaveBeenCalledWith('/discover/p3');
  });

  it('navigates back when chevron is pressed', () => {
    const { UNSAFE_getAllByType } = render(<DailyPicksScreen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
