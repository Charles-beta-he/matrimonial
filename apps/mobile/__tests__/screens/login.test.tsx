import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../app/(auth)/login';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockSetAuth = jest.fn();
jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({ setAuth: mockSetAuth, user: null }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn(), setUserId: jest.fn() }),
}));

const mockSendCodeMutate = jest.fn();
const mockVerifyCodeMutate = jest.fn();

jest.mock('@matrimonial/api-client', () => ({
  api: {
    auth: {
      sendCode: {
        useMutation: () => ({
          mutate: mockSendCodeMutate,
          isPending: false,
        }),
      },
      verifyCode: {
        useMutation: () => ({
          mutate: mockVerifyCodeMutate,
          isPending: false,
        }),
      },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders phone and code inputs', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('请输入手机号')).toBeTruthy();
    expect(getByPlaceholderText('请输入验证码')).toBeTruthy();
  });

  it('renders send code button and login button', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('发送验证码')).toBeTruthy();
    expect(getByText('登录')).toBeTruthy();
  });

  it('calls sendCode mutation when phone filled and send pressed', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const phoneInput = getByPlaceholderText('请输入手机号');
    fireEvent.changeText(phoneInput, '13800138000');
    fireEvent.press(getByText('发送验证码'));
    expect(mockSendCodeMutate).toHaveBeenCalledWith(
      { phone: '13800138000' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('does not call sendCode when phone is empty', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('发送验证码'));
    expect(mockSendCodeMutate).not.toHaveBeenCalled();
  });

  it('calls verifyCode mutation when phone + code filled and login pressed', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('请输入手机号'), '13800138000');
    fireEvent.changeText(getByPlaceholderText('请输入验证码'), '123456');
    fireEvent.press(getByText('登录'));
    expect(mockVerifyCodeMutate).toHaveBeenCalledWith(
      { phone: '13800138000', code: '123456' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('navigates to tabs on successful login for existing user', () => {
    mockVerifyCodeMutate.mockImplementationOnce((_payload: any, { onSuccess }: any) => {
      onSuccess({
        accessToken: 'tok',
        refreshToken: 'ref',
        user: { id: 'u1', nickname: '测试', phone: '13800138000', gender: 'MALE' },
        isNewUser: false,
      });
    });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('请输入手机号'), '13800138000');
    fireEvent.changeText(getByPlaceholderText('请输入验证码'), '123456');
    fireEvent.press(getByText('登录'));
    expect(mockSetAuth).toHaveBeenCalledWith('tok', 'ref', expect.objectContaining({ id: 'u1' }));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('navigates to register for new user', () => {
    mockVerifyCodeMutate.mockImplementationOnce((_payload: any, { onSuccess }: any) => {
      onSuccess({
        accessToken: 'tok',
        refreshToken: 'ref',
        user: { id: 'u2', nickname: null, phone: '13900139000', gender: null },
        isNewUser: true,
      });
    });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('请输入手机号'), '13900139000');
    fireEvent.changeText(getByPlaceholderText('请输入验证码'), '654321');
    fireEvent.press(getByText('登录'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/register/step2-basic-info');
  });

  it('renders register link', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('立即注册')).toBeTruthy();
    fireEvent.press(getByText('立即注册'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register/step1-phone');
  });
});
