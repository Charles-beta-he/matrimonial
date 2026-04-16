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

jest.mock('expo-clipboard', () => ({
  default: { setStringAsync: jest.fn() },
}));

const mockTrack = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

const mockCheckInMutate = jest.fn();
const mockHistoryInvalidate = jest.fn();
const mockAchievementsInvalidate = jest.fn();
const mockCreditsInvalidate = jest.fn();

let mockHistoryData: any = null;
let mockAchievementsData: any[] = [];
// mockCheckedInToday reserved for future tests

jest.mock('@matrimonial/api-client', () => ({
  api: {
    checkin: {
      history: {
        useQuery: () => ({ data: mockHistoryData }),
      },
      achievements: {
        useQuery: () => ({ data: mockAchievementsData }),
      },
      checkIn: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: () => {
            mockCheckInMutate();
            onSuccess?.({ reward: 'Super Like x1' });
          },
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      checkin: {
        history: { invalidate: mockHistoryInvalidate },
        achievements: { invalidate: mockAchievementsInvalidate },
      },
      credits: {
        balance: { invalidate: mockCreditsInvalidate },
      },
    }),
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

// ── Lazy import ────────────────────────────────────────────────────────────

let CheckinScreen: React.ComponentType;
beforeAll(() => {
  CheckinScreen = require('../../app/profile/checkin').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CheckinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryData = null;
    mockAchievementsData = [];
  });

  it('renders "签到中心" title', () => {
    const { getByText } = render(<CheckinScreen />);
    expect(getByText('签到中心')).toBeTruthy();
  });

  it('shows check-in button with 立即签到 when not checked in today', () => {
    mockHistoryData = { currentStreak: 0, checkedInToday: false, totalCheckIns: 0, history: [] };
    const { getByTestId } = render(<CheckinScreen />);
    expect(getByTestId('btn-立即签到')).toBeTruthy();
  });

  it('shows 今日已签到 button when already checked in', () => {
    mockHistoryData = { currentStreak: 3, checkedInToday: true, totalCheckIns: 10, history: [] };
    const { getByTestId } = render(<CheckinScreen />);
    expect(getByTestId('btn-今日已签到')).toBeTruthy();
  });

  it('calls checkIn mutation when 立即签到 button is pressed', () => {
    mockHistoryData = { currentStreak: 0, checkedInToday: false, totalCheckIns: 0, history: [] };
    const { getByTestId } = render(<CheckinScreen />);
    fireEvent.press(getByTestId('btn-立即签到'));
    expect(mockCheckInMutate).toHaveBeenCalled();
  });

  it('renders calendar section with current month label', () => {
    const { getByText } = render(<CheckinScreen />);
    const now = new Date();
    const month = now.getMonth() + 1;
    expect(getByText(new RegExp(`${month}月 签到记录`))).toBeTruthy();
  });

  it('renders weekday headers (日 一 二 三 四 五 六)', () => {
    const { getByText } = render(<CheckinScreen />);
    expect(getByText('日')).toBeTruthy();
    expect(getByText('一')).toBeTruthy();
    expect(getByText('六')).toBeTruthy();
  });

  it('displays current streak count', () => {
    mockHistoryData = { currentStreak: 7, checkedInToday: false, totalCheckIns: 20, history: [] };
    const { getAllByText, getByText } = render(<CheckinScreen />);
    // '7' may appear multiple times (streak + calendar day)
    expect(getAllByText('7').length).toBeGreaterThanOrEqual(1);
    expect(getByText('连续签到天数')).toBeTruthy();
  });

  it('renders achievements section heading', () => {
    const { getByText } = render(<CheckinScreen />);
    expect(getByText('成就徽章')).toBeTruthy();
  });

  it('tracks screen_view on mount', () => {
    render(<CheckinScreen />);
    expect(mockTrack).toHaveBeenCalledWith('screen_view', { screen_name: 'checkin' });
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<CheckinScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
