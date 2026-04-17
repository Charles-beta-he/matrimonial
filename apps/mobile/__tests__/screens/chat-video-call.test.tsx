import React from 'react';
import { Pressable } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockLeaveRoomMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@matrimonial/api-client', () => ({
  api: {
    video: {
      leaveRoom: {
        useMutation: () => ({ mutateAsync: mockLeaveRoomMutateAsync }),
      },
    },
  },
}));

// ── Test state ──────────────────────────────────────────────────────────────

let mockParams: Record<string, string> = {};
let VideoCallScreen: React.ComponentType;

beforeAll(() => {
  VideoCallScreen = require('../../app/chat/video-call').default;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockParams = {
    roomName: 'test-room',
    token: 'test-token',
    wsUrl: 'wss://example.com',
    userName: '测试用户',
    roomId: 'room-123',
  };
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('VideoCallScreen', () => {
  it('shows connecting state initially', () => {
    const { getByText } = render(<VideoCallScreen />);
    expect(getByText('连接中...')).toBeTruthy();
  });

  it('redirects back when roomName missing', () => {
    mockParams = { token: 'test-token' };
    render(<VideoCallScreen />);
    expect(mockBack).toHaveBeenCalled();
  });

  it('redirects back when token missing', () => {
    mockParams = { roomName: 'test-room' };
    render(<VideoCallScreen />);
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows userName after connect timer fires', () => {
    const { getByText } = render(<VideoCallScreen />);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(getByText('测试用户')).toBeTruthy();
  });

  it('uses fallback "用户" when userName not provided', () => {
    mockParams = { roomName: 'test-room', token: 'test-token' };
    const { getByText } = render(<VideoCallScreen />);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(getByText('用户')).toBeTruthy();
  });

  it('calls leaveRoom with roomId and navigates back on end', async () => {
    const { UNSAFE_getAllByType } = render(<VideoCallScreen />);
    // End button is the middle Pressable (index 1): mute | end | video
    const pressables = UNSAFE_getAllByType(Pressable);
    const endButton = pressables[1];
    await act(async () => {
      fireEvent.press(endButton);
    });
    expect(mockLeaveRoomMutateAsync).toHaveBeenCalledWith({ roomId: 'room-123' });
    expect(mockBack).toHaveBeenCalled();
  });

  it('navigates back without leaveRoom when roomId absent', async () => {
    mockParams = { roomName: 'test-room', token: 'test-token' };
    const { UNSAFE_getAllByType } = render(<VideoCallScreen />);
    const pressables = UNSAFE_getAllByType(Pressable);
    const endButton = pressables[1];
    await act(async () => {
      fireEvent.press(endButton);
    });
    expect(mockLeaveRoomMutateAsync).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows duration timer after connected', () => {
    const { getByText } = render(<VideoCallScreen />);
    act(() => {
      jest.advanceTimersByTime(1500); // connect
    });
    act(() => {
      jest.advanceTimersByTime(3000); // 3 seconds elapsed
    });
    expect(getByText('00:03')).toBeTruthy();
  });
});
