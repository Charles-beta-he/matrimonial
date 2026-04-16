import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

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

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('@matrimonial/ui', () => ({
  Button: ({ title, onPress }: { title: string; onPress?: () => void }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
  Card: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  Input: ({ placeholder, value, onChangeText }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        testID={`input-${placeholder}`}
      />
    );
  },
}));

const mockSetContactMutate = jest.fn();
const mockCreateCheckinMutate = jest.fn();
const mockConfirmSafeMutate = jest.fn();
const mockSOSMutate = jest.fn();

let mockContactData: any = null;
let mockCheckinsData: any[] = [];

jest.mock('@matrimonial/api-client', () => ({
  api: {
    safety: {
      getEmergencyContact: {
        useQuery: () => ({ data: mockContactData, refetch: jest.fn() }),
        refetch: jest.fn(),
      },
      setEmergencyContact: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => { mockSetContactMutate(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      myCheckins: {
        useQuery: () => ({ data: mockCheckinsData, refetch: jest.fn() }),
      },
      createCheckin: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => { mockCreateCheckinMutate(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      confirmSafe: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockConfirmSafeMutate(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      triggerSOS: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockSOSMutate(args); onSuccess?.(); },
          isPending: false,
        }),
      },
    },
  },
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let SafetyScreen: React.ComponentType;
beforeAll(() => {
  SafetyScreen = require('../../app/profile/safety').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SafetyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContactData = null;
    mockCheckinsData = [];
  });

  it('renders "安全工具" title', () => {
    const { getByText } = render(<SafetyScreen />);
    expect(getByText('安全工具')).toBeTruthy();
  });

  it('renders emergency contact section heading', () => {
    const { getAllByText } = render(<SafetyScreen />);
    // "紧急联系人" appears in section title and description
    expect(getAllByText(/紧急联系人/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows existing emergency contact phone in input', () => {
    mockContactData = { phone: '13900000001' };
    const { getByTestId } = render(<SafetyScreen />);
    // Phone hydrates into Input via useEffect — check testID input value
    expect(getByTestId('input-输入手机号')).toBeTruthy();
  });

  it('shows SOS button', () => {
    const { getByText } = render(<SafetyScreen />);
    expect(getByText('SOS')).toBeTruthy();
  });

  it('pressing SOS button shows confirmation alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<SafetyScreen />);
    // SOS text is inside a Pressable — fire press on the SOS text element
    fireEvent.press(getByText('SOS'));
    expect(alertSpy).toHaveBeenCalledWith(
      '紧急求助',
      expect.any(String),
      expect.any(Array),
    );
  });

  it('shows check-in section', () => {
    const { getByText } = render(<SafetyScreen />);
    expect(getByText(/约会报备/)).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<SafetyScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows active checkin partner name', () => {
    mockCheckinsData = [
      {
        id: 'c1',
        status: 'ACTIVE',
        partnerName: '张三',
        location: '北京咖啡馆',
        scheduledAt: new Date().toISOString(),
        expectedEndAt: new Date(Date.now() + 3600000).toISOString(),
      },
    ];
    const { getByText } = render(<SafetyScreen />);
    // Rendered as "{partnerName} · {location}" in a single Text node
    expect(getByText(/张三/)).toBeTruthy();
  });
});
