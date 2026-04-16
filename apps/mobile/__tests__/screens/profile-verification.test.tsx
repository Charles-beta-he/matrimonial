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

jest.mock('@matrimonial/shared', () => ({
  VERIFICATION_LEVEL_LABELS: {
    L1: '手机认证',
    L2: '身份认证',
    L3: '真人认证',
    L4: '学历认证',
  },
}));

const mockSubmitRealNameMutateAsync = jest.fn();
const mockSubmitFaceMutateAsync = jest.fn();
const mockSubmitEduMutateAsync = jest.fn();
const mockStatusInvalidate = jest.fn();

let mockStatusData: any = null;

jest.mock('@matrimonial/api-client', () => ({
  api: {
    verification: {
      getStatus: {
        useQuery: () => ({ data: mockStatusData }),
      },
      submitRealName: {
        useMutation: () => ({
          mutateAsync: mockSubmitRealNameMutateAsync,
          isPending: false,
        }),
      },
      submitFaceVerify: {
        useMutation: () => ({
          mutateAsync: mockSubmitFaceMutateAsync,
          isPending: false,
        }),
      },
      submitEduVerify: {
        useMutation: () => ({
          mutateAsync: mockSubmitEduMutateAsync,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      verification: {
        getStatus: { invalidate: mockStatusInvalidate },
      },
    }),
  },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('@matrimonial/ui', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return {
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={!!disabled} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children, className: _className }: any) => <View>{children}</View>,
    toast: {
      success: mockToastSuccess,
      error: mockToastError,
    },
  };
});

// ── Lazy import ────────────────────────────────────────────────────────────

let VerificationScreen: React.ComponentType;
beforeAll(() => {
  VerificationScreen = require('../../app/profile/verification').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('VerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatusData = null;
    mockSubmitRealNameMutateAsync.mockResolvedValue({});
    mockSubmitFaceMutateAsync.mockResolvedValue({});
    mockSubmitEduMutateAsync.mockResolvedValue({});
  });

  it('renders "认证中心" title', () => {
    const { getByText } = render(<VerificationScreen />);
    expect(getByText('认证中心')).toBeTruthy();
  });

  it('shows L1 手机认证 as completed (always done)', () => {
    const { getByText } = render(<VerificationScreen />);
    expect(getByText(/L1: 手机认证/)).toBeTruthy();
    expect(getByText('已完成')).toBeTruthy();
  });

  it('shows current verification level from API', () => {
    mockStatusData = { verificationLevel: 'L2', realNameVerified: true, faceVerified: false, eduVerified: false };
    const { getByText } = render(<VerificationScreen />);
    expect(getByText(/当前认证等级: L2/)).toBeTruthy();
  });

  it('shows default L1 level when no status data', () => {
    const { getByText } = render(<VerificationScreen />);
    expect(getByText(/当前认证等级: L1/)).toBeTruthy();
  });

  it('shows 去认证 button for L2 when L1 is done and L2 is not done', () => {
    mockStatusData = { verificationLevel: 'L1', realNameVerified: false, faceVerified: false, eduVerified: false };
    const { getAllByTestId } = render(<VerificationScreen />);
    // Multiple "去认证" buttons may render for L2, L3
    const buttons = getAllByTestId('btn-去认证');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('opens L2 modal when pressing L2 去认证 button', () => {
    mockStatusData = { verificationLevel: 'L1', realNameVerified: false, faceVerified: false, eduVerified: false };
    const { getAllByTestId, getByText } = render(<VerificationScreen />);
    const goButtons = getAllByTestId('btn-去认证');
    fireEvent.press(goButtons[0]);
    // Modal heading should appear
    expect(getByText('身份认证')).toBeTruthy();
  });

  it('shows L2 modal with real name and id card inputs', () => {
    mockStatusData = { verificationLevel: 'L1', realNameVerified: false, faceVerified: false, eduVerified: false };
    const { getAllByTestId, getByPlaceholderText } = render(<VerificationScreen />);
    const goButtons = getAllByTestId('btn-去认证');
    fireEvent.press(goButtons[0]);
    expect(getByPlaceholderText('请输入真实姓名')).toBeTruthy();
    expect(getByPlaceholderText('18位身份证号')).toBeTruthy();
  });

  it('closes L2 modal when cancel button is pressed', () => {
    mockStatusData = { verificationLevel: 'L1', realNameVerified: false, faceVerified: false, eduVerified: false };
    const { getAllByTestId, queryByPlaceholderText } = render(<VerificationScreen />);
    fireEvent.press(getAllByTestId('btn-去认证')[0]);
    // Modal is open, cancel it
    fireEvent.press(getAllByTestId('btn-取消')[0]);
    expect(queryByPlaceholderText('请输入真实姓名')).toBeFalsy();
  });

  it('calls submitRealName mutation with form values', async () => {
    mockStatusData = { verificationLevel: 'L1', realNameVerified: false, faceVerified: false, eduVerified: false };
    const { getAllByTestId, getByPlaceholderText } = render(<VerificationScreen />);
    fireEvent.press(getAllByTestId('btn-去认证')[0]);
    fireEvent.changeText(getByPlaceholderText('请输入真实姓名'), '张三');
    fireEvent.changeText(getByPlaceholderText('18位身份证号'), '110101199001011234');
    fireEvent.press(getAllByTestId('btn-提交')[0]);
    expect(mockSubmitRealNameMutateAsync).toHaveBeenCalledWith({
      realName: '张三',
      idCardNumber: '110101199001011234',
    });
  });

  it('shows progress text indicating completed steps', () => {
    mockStatusData = { verificationLevel: 'L1', realNameVerified: false, faceVerified: false, eduVerified: false };
    const { getByText } = render(<VerificationScreen />);
    expect(getByText('1/4 项已完成')).toBeTruthy();
  });

  it('shows 2/4 when L2 is completed', () => {
    mockStatusData = { verificationLevel: 'L2', realNameVerified: true, faceVerified: false, eduVerified: false };
    const { getByText } = render(<VerificationScreen />);
    expect(getByText('2/4 项已完成')).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_getAllByType } = render(<VerificationScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
