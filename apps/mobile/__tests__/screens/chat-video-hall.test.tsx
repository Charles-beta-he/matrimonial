import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
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

const mockJoinRoomMutateAsync = jest.fn();
const mockCreateRoomMutateAsync = jest.fn();
const mockRoomsRefetch = jest.fn();

let mockRoomsData: any[] = [];
let mockRoomsLoading = false;
let mockRoomsError = false;
let mockRoomsFetching = false;

jest.mock('@matrimonial/api-client', () => ({
  useVideoRooms: () => ({
    data: mockRoomsData,
    isLoading: mockRoomsLoading,
    isError: mockRoomsError,
    isFetching: mockRoomsFetching,
    refetch: mockRoomsRefetch,
  }),
  useCreateVideoRoom: () => ({
    mutateAsync: mockCreateRoomMutateAsync,
    isPending: false,
  }),
  useJoinVideoRoom: () => ({
    mutateAsync: mockJoinRoomMutateAsync,
    isPending: false,
  }),
}));

jest.mock('@matrimonial/ui', () => {
  const { View } = require('react-native');
  return {
    Card: ({ children }: any) => <View>{children}</View>,
    toast: { success: jest.fn(), error: jest.fn() },
  };
});

// ── Lazy import ────────────────────────────────────────────────────────────

let VideoHallScreen: React.ComponentType;
beforeAll(() => {
  VideoHallScreen = require('../../app/chat/video-hall').default;
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(overrides: any = {}) {
  return {
    id: 'room1',
    title: '周末闲聊',
    category: '综合',
    hostName: '小红',
    participantCount: 2,
    maxParticipants: 8,
    roomName: 'room-xyz',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('VideoHallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomsData = [];
    mockRoomsLoading = false;
    mockRoomsError = false;
    mockRoomsFetching = false;
  });

  it('renders "视频相亲大厅" title', () => {
    const { getByText } = render(<VideoHallScreen />);
    expect(getByText('视频相亲大厅')).toBeTruthy();
  });

  it('renders the two tabs', () => {
    const { getByText } = render(<VideoHallScreen />);
    expect(getByText('1v1 快速匹配')).toBeTruthy();
    expect(getByText('红娘主持房')).toBeTruthy();
  });

  it('shows 1v1 content by default', () => {
    const { getByText } = render(<VideoHallScreen />);
    expect(getByText('1v1 视频快聊')).toBeTruthy();
  });

  it('shows quick match entry card', () => {
    const { getByText } = render(<VideoHallScreen />);
    expect(getByText('视频速配')).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<VideoHallScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('switches to hosted tab when pressed', () => {
    const { getByText } = render(<VideoHallScreen />);
    fireEvent.press(getByText('红娘主持房'));
    expect(getByText('暂无开放房间，点击 + 创建一个')).toBeTruthy();
  });

  it('shows loading indicator in hosted tab while fetching', () => {
    mockRoomsLoading = true;
    const { getByText, UNSAFE_getByType } = render(<VideoHallScreen />);
    fireEvent.press(getByText('红娘主持房'));
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows empty state message when no rooms in hosted tab', () => {
    mockRoomsData = [];
    const { getByText } = render(<VideoHallScreen />);
    fireEvent.press(getByText('红娘主持房'));
    expect(getByText('暂无开放房间，点击 + 创建一个')).toBeTruthy();
  });

  it('renders room title in hosted tab when rooms exist', () => {
    mockRoomsData = [makeRoom()];
    const { getByText } = render(<VideoHallScreen />);
    fireEvent.press(getByText('红娘主持房'));
    expect(getByText('周末闲聊')).toBeTruthy();
  });

  it('shows error state with retry button when rooms fail to load', () => {
    mockRoomsError = true;
    const { getByText } = render(<VideoHallScreen />);
    fireEvent.press(getByText('红娘主持房'));
    expect(getByText('加载失败')).toBeTruthy();
    fireEvent.press(getByText('重试'));
    expect(mockRoomsRefetch).toHaveBeenCalled();
  });

  it('navigates to quick-match screen when quick match card is pressed', () => {
    const { getByText } = render(<VideoHallScreen />);
    fireEvent.press(getByText('视频速配'));
    expect(mockPush).toHaveBeenCalledWith('/chat/quick-match');
  });
});
