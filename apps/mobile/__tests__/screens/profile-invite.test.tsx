import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
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

const mockSetStringAsync = jest.fn();
jest.mock('expo-clipboard', () => ({
  setStringAsync: mockSetStringAsync,
}));

const mockTrack = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

const mockApplyMutate = jest.fn();
const mockStatsRefetch = jest.fn();

let mockCodeData: any = null;
let mockStatsData: any = null;

jest.mock('@matrimonial/api-client', () => ({
  api: {
    invite: {
      getMyCode: {
        useQuery: () => ({ data: mockCodeData }),
      },
      stats: {
        useQuery: () => ({ data: mockStatsData, refetch: mockStatsRefetch }),
      },
      applyCode: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockApplyMutate(args);
            onSuccess?.({ inviterNickname: '张三' });
          },
          isPending: false,
        }),
      },
    },
  },
}));

const mockToastShow = jest.fn();
jest.mock('@matrimonial/ui', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    toast: {
      show: mockToastShow,
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

// ── Lazy import ────────────────────────────────────────────────────────────

let InviteScreen: React.ComponentType;
beforeAll(() => {
  InviteScreen = require('../../app/profile/invite').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('InviteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCodeData = null;
    mockStatsData = null;
  });

  it('renders "邀请好友" title', () => {
    const { getByText } = render(<InviteScreen />);
    expect(getByText('邀请好友')).toBeTruthy();
  });

  it('shows my invite code section heading', () => {
    const { getByText } = render(<InviteScreen />);
    expect(getByText('我的邀请码')).toBeTruthy();
  });

  it('displays the invite code from API', () => {
    mockCodeData = { code: 'ABC123' };
    const { getByText } = render(<InviteScreen />);
    expect(getByText('ABC123')).toBeTruthy();
  });

  it('shows default placeholder code when data is null', () => {
    const { getByText } = render(<InviteScreen />);
    expect(getByText('------')).toBeTruthy();
  });

  it('renders invite rewards section', () => {
    const { getByText } = render(<InviteScreen />);
    expect(getByText('邀请奖励')).toBeTruthy();
    expect(getByText('3 Super Like')).toBeTruthy();
    expect(getByText('2 Super Like')).toBeTruthy();
  });

  it('renders enter invite code section with text input', () => {
    const { getByText, getByPlaceholderText } = render(<InviteScreen />);
    expect(getByText('输入邀请码')).toBeTruthy();
    expect(getByPlaceholderText('输入6位邀请码')).toBeTruthy();
  });

  it('shows invite stats count', () => {
    mockStatsData = { inviteCount: 5, invitees: [] };
    const { getByText } = render(<InviteScreen />);
    expect(getByText(/已邀请 5 人/)).toBeTruthy();
  });

  it('shows empty state when no invitees', () => {
    mockStatsData = { inviteCount: 0, invitees: [] };
    const { getByText } = render(<InviteScreen />);
    expect(getByText('还没有邀请记录')).toBeTruthy();
  });

  it('shows error toast when apply code is less than 6 chars', () => {
    const { getByPlaceholderText, getByText } = render(<InviteScreen />);
    fireEvent.changeText(getByPlaceholderText('输入6位邀请码'), 'ABC');
    fireEvent.press(getByText('确认'));
    expect(mockToastShow).toHaveBeenCalledWith({ type: 'error', text1: '请输入6位邀请码' });
  });

  it('calls applyCode mutation with uppercased 6-char code', () => {
    const { getByPlaceholderText, getByText } = render(<InviteScreen />);
    fireEvent.changeText(getByPlaceholderText('输入6位邀请码'), 'abc123');
    fireEvent.press(getByText('确认'));
    expect(mockApplyMutate).toHaveBeenCalledWith({ code: 'ABC123' });
  });

  it('tracks screen_view on mount', () => {
    render(<InviteScreen />);
    expect(mockTrack).toHaveBeenCalledWith('screen_view', { screen_name: 'invite' });
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<InviteScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
