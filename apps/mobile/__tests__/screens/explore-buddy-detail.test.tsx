import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ postId: 'post1' }),
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
  BUDDY_TYPES: [{ id: 'SPORT', label: '运动', icon: 'basketball-outline' }],
  BUDDY_TYPE_COLORS: { SPORT: '#f43f5e' },
}));

const mockApplyMutate = jest.fn();
const mockHandleApplyMutate = jest.fn();
const mockRefetch = jest.fn();

let mockMyPostsData: any[] = [];
let mockListData: any = { items: [] };
let mockPostData: any = undefined;
let mockIsLoading = false;

jest.mock('@matrimonial/api-client', () => ({
  api: {
    buddy: {
      myPosts: {
        useQuery: (_args: any, _opts: any) => ({
          data: mockMyPostsData,
        }),
      },
      detail: {
        useQuery: (_id: any, _opts: any) => ({
          data: mockPostData,
          isLoading: mockIsLoading,
          refetch: mockRefetch,
        }),
      },
      list: {
        useQuery: (_args: any, _opts: any) => ({
          data: mockListData,
          isLoading: mockIsLoading,
          refetch: mockRefetch,
        }),
      },
      applyPost: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockApplyMutate(args);
            onSuccess?.();
          },
          isPending: false,
        }),
      },
      handleApply: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockHandleApplyMutate(args);
            onSuccess?.(undefined, args);
          },
          isPending: false,
        }),
      },
    },
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Avatar: () => null,
    Badge: ({ label }: { label: string }) => <Text>{label}</Text>,
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} testID={`btn-${title}`} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children, className: _className }: any) => {
      return <View>{children}</View>;
    },
    EmptyState: ({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} testID="empty-action">
            <Text>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    toast: { success: jest.fn(), error: jest.fn() },
  };
});

// ── Lazy import ────────────────────────────────────────────────────────────

let BuddyDetailScreen: React.ComponentType;
beforeAll(() => {
  BuddyDetailScreen = require('../../app/explore/buddy/[postId]').default;
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makePost(overrides: any = {}) {
  return {
    id: 'post1',
    title: '周末爬山伙伴',
    description: '寻找一起爬山的朋友',
    type: 'SPORT',
    status: 'OPEN',
    location: '北京香山',
    scheduledAt: null,
    maxPeople: 4,
    _count: { applies: 2 },
    author: {
      id: 'user1',
      nickname: '小明',
      avatar: null,
      age: 28,
      city: '北京',
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BuddyPostDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMyPostsData = [];
    mockPostData = undefined;
    mockIsLoading = false;
  });

  it('shows loading indicator while fetching', () => {
    mockIsLoading = true;
    const { UNSAFE_getByType } = render(<BuddyDetailScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows empty state when post is not found', () => {
    mockIsLoading = false;
    mockPostData = undefined;
    const { getByTestId } = render(<BuddyDetailScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('renders post title when data loads', () => {
    mockPostData = makePost();
    const { getByText } = render(<BuddyDetailScreen />);
    expect(getByText('周末爬山伙伴')).toBeTruthy();
  });

  it('renders post description', () => {
    mockPostData = makePost();
    const { getByText } = render(<BuddyDetailScreen />);
    expect(getByText('寻找一起爬山的朋友')).toBeTruthy();
  });

  it('shows 帖子详情 header title', () => {
    mockPostData = makePost();
    const { getAllByText } = render(<BuddyDetailScreen />);
    expect(getAllByText('帖子详情').length).toBeGreaterThanOrEqual(1);
  });

  it('shows apply button for open post (non-owner)', () => {
    mockPostData = makePost({ status: 'OPEN' });
    const { getByTestId } = render(<BuddyDetailScreen />);
    expect(getByTestId('btn-我要参加')).toBeTruthy();
  });

  it('shows disabled button for closed post', () => {
    mockPostData = makePost({ status: 'CLOSED' });
    const { getByTestId } = render(<BuddyDetailScreen />);
    expect(getByTestId('btn-报名已关闭')).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    mockPostData = makePost();
    const { UNSAFE_getAllByType } = render(<BuddyDetailScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('tapping 我要参加 shows the apply input area', () => {
    mockPostData = makePost({ status: 'OPEN' });
    const { getByTestId } = render(<BuddyDetailScreen />);
    fireEvent.press(getByTestId('btn-我要参加'));
    // After press, apply input UI appears with 确认报名 button
    expect(getByTestId('btn-确认报名')).toBeTruthy();
  });

  it('shows author nickname', () => {
    mockPostData = makePost();
    const { getByText } = render(<BuddyDetailScreen />);
    expect(getByText('小明')).toBeTruthy();
  });
});
