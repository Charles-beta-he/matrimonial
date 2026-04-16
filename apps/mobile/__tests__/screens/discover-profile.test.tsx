import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ userId: 'user-test-1' }),
  useRouter: () => ({ back: mockBack }),
}));

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
const mockRefetch = jest.fn();

let mockProfileQuery: any = { data: undefined, isLoading: true, error: null, refetch: mockRefetch };

jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      getById: {
        useQuery: (_id: string, _opts: any) => mockProfileQuery,
      },
    },
    match: {
      like: {
        useMutation: () => ({ mutate: mockLikeMutate, isPending: false }),
      },
      skip: {
        useMutation: () => ({ mutate: mockSkipMutate, isPending: false }),
      },
    },
  },
}));

jest.mock('@matrimonial/shared', () => ({
  calculateAge: () => 26,
  PROMPT_QUESTIONS: [{ id: 'q1', text: '我最喜欢的事' }],
}));

jest.mock('@matrimonial/ui', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    Badge: ({ label }: { label: string }) => (
      <View testID={`badge-${label}`}>
        <Text>{label}</Text>
      </View>
    ),
    EmptyState: ({
      title,
      action,
    }: {
      title: string;
      description?: string;
      action?: { label: string; onPress: () => void };
    }) => (
      <View testID="empty-state">
        <Text testID="empty-state-title">{title}</Text>
        {action && (
          <Pressable testID="empty-state-action" onPress={action.onPress}>
            <Text>{action.label}</Text>
          </Pressable>
        )}
      </View>
    ),
    PromptCard: ({ question, answer }: { question: string; answer: string }) => (
      <View testID="prompt-card">
        <Text testID="prompt-question">{question}</Text>
        <Text testID="prompt-answer">{answer}</Text>
      </View>
    ),
  };
});

// ── Fixture ────────────────────────────────────────────────────────────────

const makeProfile = (overrides: Record<string, any> = {}) => ({
  id: 'user-test-1',
  nickname: '小明',
  birthday: '1998-06-15',
  city: '北京',
  bio: '喜欢旅行',
  height: 175,
  education: '本科',
  occupation: '工程师',
  incomeRange: null,
  hometown: null,
  zodiac: null,
  mbti: null,
  verificationLevel: 'L1',
  photos: [{ url: 'https://example.com/photo1.jpg' }],
  tags: [{ tag: '旅行' }, { tag: '音乐' }],
  prompts: [{ questionId: 'q1', answerText: '爬山' }],
  isOnline: false,
  ...overrides,
});

// Lazy import after mocks
let UserProfileScreen: React.ComponentType;
beforeAll(() => {
  UserProfileScreen = require('../../app/discover/[userId]').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('UserProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileQuery = { data: undefined, isLoading: true, error: null, refetch: mockRefetch };
  });

  it('renders ActivityIndicator while loading', () => {
    mockProfileQuery = { data: undefined, isLoading: true, error: null, refetch: mockRefetch };
    const { UNSAFE_getByType } = render(<UserProfileScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('displays user nickname after data loads', () => {
    mockProfileQuery = {
      data: makeProfile(),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    const { getByText } = render(<UserProfileScreen />);
    expect(getByText(/小明/)).toBeTruthy();
  });

  it('displays user age calculated by calculateAge', () => {
    mockProfileQuery = {
      data: makeProfile(),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    const { getByText } = render(<UserProfileScreen />);
    // calculateAge mock returns 26; rendered as "小明, 26"
    expect(getByText(/26/)).toBeTruthy();
  });

  it('displays user tags as Badge components', () => {
    mockProfileQuery = {
      data: makeProfile(),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    const { getByTestId } = render(<UserProfileScreen />);
    expect(getByTestId('badge-旅行')).toBeTruthy();
    expect(getByTestId('badge-音乐')).toBeTruthy();
  });

  it('shows EmptyState with error title when query fails', () => {
    mockProfileQuery = {
      data: undefined,
      isLoading: false,
      error: new Error('network error'),
      refetch: mockRefetch,
    };
    const { getByTestId } = render(<UserProfileScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByTestId('empty-state-title').props.children).toBe('加载失败');
  });

  it('calls like mutation with NORMAL type when 喜欢 button is pressed', () => {
    mockProfileQuery = {
      data: makeProfile(),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    const { getByText } = render(<UserProfileScreen />);
    fireEvent.press(getByText('喜欢'));
    expect(mockLikeMutate).toHaveBeenCalledWith(
      { toUserId: 'user-test-1', type: 'NORMAL' },
      expect.any(Object),
    );
  });

  it('navigates back when the back button is pressed', () => {
    mockProfileQuery = {
      data: makeProfile(),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    const { UNSAFE_getAllByType } = render(<UserProfileScreen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    // Back button is the first Pressable rendered (top-left chevron)
    fireEvent.press(pressables[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
