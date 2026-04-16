import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ circleId: 'circle1' }),
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
  CIRCLE_CATEGORIES: [
    { id: 'reading', label: '读书' },
    { id: 'fitness', label: '健身' },
  ],
}));

const mockJoinMutate = jest.fn();
const mockLeaveMutate = jest.fn();
const mockCreatePostMutate = jest.fn();
const mockRefetch = jest.fn();
const mockRefetchPosts = jest.fn();
const mockInvalidate = jest.fn();

let mockCircleData: any = null;
let mockIsLoading = false;
let mockError: any = null;
let mockPostsData: any = { items: [] };

jest.mock('@matrimonial/api-client', () => ({
  api: {
    circle: {
      getById: {
        useQuery: () => ({
          data: mockCircleData,
          isLoading: mockIsLoading,
          error: mockError,
          refetch: mockRefetch,
        }),
        invalidate: mockInvalidate,
      },
      posts: {
        useQuery: () => ({
          data: mockPostsData,
          isLoading: false,
          refetch: mockRefetchPosts,
          isRefetching: false,
        }),
      },
      join: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockJoinMutate(args);
            onSuccess?.();
          },
          isPending: false,
        }),
      },
      leave: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockLeaveMutate(args);
            onSuccess?.();
          },
          isPending: false,
        }),
      },
      createPost: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockCreatePostMutate(args);
            onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      circle: { getById: { invalidate: mockInvalidate } },
    }),
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Avatar: () => null,
    Badge: ({ label }: { label: string }) => <Text>{label}</Text>,
    Button: ({ title, onPress }: { title: string; onPress?: () => void }) => (
      <TouchableOpacity onPress={onPress} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
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
    Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <View testID="modal">{children}</View> : null,
    toast: { success: jest.fn(), error: jest.fn() },
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCircle(overrides: any = {}) {
  return {
    id: 'circle1',
    name: '书友会',
    description: '爱读书的人聚在一起',
    category: 'reading',
    memberCount: 42,
    isMember: false,
    posts: [],
    ...overrides,
  };
}

// ── Lazy import ────────────────────────────────────────────────────────────

let CircleDetailScreen: React.ComponentType;
beforeAll(() => {
  CircleDetailScreen = require('../../app/explore/circles/[circleId]').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CircleDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCircleData = null;
    mockIsLoading = false;
    mockError = null;
    mockPostsData = { items: [] };
  });

  it('shows loading indicator while fetching', () => {
    mockIsLoading = true;
    const { UNSAFE_getByType } = render(<CircleDetailScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows error empty state when fetch fails', () => {
    mockError = { message: '网络错误' };
    const { getByTestId } = render(<CircleDetailScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('renders circle name after data loads', () => {
    mockCircleData = makeCircle();
    const { getByText } = render(<CircleDetailScreen />);
    expect(getByText('书友会')).toBeTruthy();
  });

  it('renders circle description', () => {
    mockCircleData = makeCircle();
    const { getByText } = render(<CircleDetailScreen />);
    expect(getByText('爱读书的人聚在一起')).toBeTruthy();
  });

  it('shows "加入" button for non-member', () => {
    mockCircleData = makeCircle({ isMember: false });
    const { getByTestId } = render(<CircleDetailScreen />);
    expect(getByTestId('btn-加入')).toBeTruthy();
  });

  it('shows "已加入" button for member', () => {
    mockCircleData = makeCircle({ isMember: true });
    const { getByTestId } = render(<CircleDetailScreen />);
    expect(getByTestId('btn-已加入')).toBeTruthy();
  });

  it('calls join mutation when non-member presses join', () => {
    mockCircleData = makeCircle({ isMember: false });
    const { getByTestId } = render(<CircleDetailScreen />);
    fireEvent.press(getByTestId('btn-加入'));
    expect(mockJoinMutate).toHaveBeenCalledWith({ circleId: 'circle1' });
  });

  it('calls leave mutation when member presses "已加入"', () => {
    mockCircleData = makeCircle({ isMember: true });
    const { getByTestId } = render(<CircleDetailScreen />);
    fireEvent.press(getByTestId('btn-已加入'));
    expect(mockLeaveMutate).toHaveBeenCalledWith({ circleId: 'circle1' });
  });

  it('calls router.back when back button is pressed', () => {
    mockCircleData = makeCircle();
    const { UNSAFE_getAllByType } = render(<CircleDetailScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('retries fetch when retry button is pressed on error', () => {
    mockError = { message: '网络错误' };
    const { getByTestId } = render(<CircleDetailScreen />);
    fireEvent.press(getByTestId('empty-action'));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
