import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MessagesTab from '../../app/(tabs)/messages';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));

jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({ user: { id: 'user-1', nickname: '我' } }),
}));

const mockIsUserOnline = jest.fn().mockReturnValue(false);
jest.mock('../../stores/useSocketStore', () => ({
  useSocketStore: (selector: (s: any) => any) =>
    selector({ isUserOnline: mockIsUserOnline, onlineUsers: new Set() }),
}));

// Default mock: loading state (must be prefixed with 'mock' to be accessible inside jest.mock factory)
let mockConversationsQuery = {
  data: undefined as any,
  isLoading: true,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
};
let mockMatchesQuery = {
  data: undefined as any,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@matrimonial/api-client', () => ({
  api: {
    chat: {
      list: {
        useQuery: () => mockConversationsQuery,
      },
    },
    match: {
      matches: {
        useQuery: () => mockMatchesQuery,
      },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MessagesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationsQuery = {
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    };
    mockMatchesQuery = {
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
  });

  it('renders header title', () => {
    const { getByText } = render(<MessagesTab />);
    expect(getByText('消息')).toBeTruthy();
  });

  it('shows loading indicator when fetching', () => {
    const { getByText } = render(<MessagesTab />);
    expect(getByText('正在加载...')).toBeTruthy();
  });

  it('shows empty state when no conversations', () => {
    mockConversationsQuery = { data: [], isLoading: false, isError: false, isFetching: false, refetch: jest.fn() };
    const { getByText } = render(<MessagesTab />);
    expect(getByText('还没有消息')).toBeTruthy();
    expect(getByText('去发现页匹配新朋友吧')).toBeTruthy();
  });

  it('shows conversation list when data loaded', () => {
    mockConversationsQuery = {
      data: [
        {
          conversationId: 'conv-1',
          otherUser: {
            id: 'user-2',
            nickname: '小明',
            photos: [{ url: 'https://example.com/avatar.jpg' }],
          },
          lastMessage: { type: 'TEXT', content: '你好', createdAt: '2026-01-01T00:00:00Z' },
          lastMessageAt: '2026-01-01T00:00:00Z',
          lastReadAt: null,
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    };
    const { getByText } = render(<MessagesTab />);
    expect(getByText('小明')).toBeTruthy();
    expect(getByText('你好')).toBeTruthy();
  });

  it('shows error state with retry button', () => {
    const refetch = jest.fn();
    mockConversationsQuery = { data: undefined, isLoading: false, isError: true, isFetching: false, refetch };
    const { getByText } = render(<MessagesTab />);
    expect(getByText('加载失败')).toBeTruthy();
    fireEvent.press(getByText('重试'));
    expect(refetch).toHaveBeenCalled();
  });

  it('navigates to chat on conversation press', () => {
    mockConversationsQuery = {
      data: [
        {
          conversationId: 'conv-1',
          otherUser: { id: 'user-2', nickname: '小红', photos: [] },
          lastMessage: null,
          lastMessageAt: null,
          lastReadAt: null,
        },
      ],
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    };
    const { getByText } = render(<MessagesTab />);
    fireEvent.press(getByText('小红'));
    expect(mockPush).toHaveBeenCalledWith('/chat/conv-1');
  });

  it('navigates to discover from empty state CTA', () => {
    mockConversationsQuery = { data: [], isLoading: false, isError: false, isFetching: false, refetch: jest.fn() };
    const { getByText } = render(<MessagesTab />);
    fireEvent.press(getByText('去匹配'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)');
  });
});
