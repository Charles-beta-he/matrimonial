import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RegisterStep1Phone from '../../app/(auth)/register/step1-phone';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

const mockSetAuth = jest.fn();
jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({ setAuth: mockSetAuth }),
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
        useMutation: () => ({ mutate: mockSendCodeMutate, isPending: false }),
      },
      verifyCode: {
        useMutation: () => ({ mutate: mockVerifyCodeMutate, isPending: false }),
      },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterStep1Phone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and subtitle', () => {
    const { getByText } = render(<RegisterStep1Phone />);
    expect(getByText('输入手机号')).toBeTruthy();
    expect(getByText('我们将发送验证码到您的手机')).toBeTruthy();
  });

  it('renders phone and code inputs', () => {
    const { getByPlaceholderText } = render(<RegisterStep1Phone />);
    expect(getByPlaceholderText('请输入手机号')).toBeTruthy();
    expect(getByPlaceholderText('请输入验证码')).toBeTruthy();
  });

  it('renders legal agreement checkbox and links', () => {
    const { getByText } = render(<RegisterStep1Phone />);
    expect(getByText('《用户服务协议》')).toBeTruthy();
    expect(getByText('《隐私保护政策》')).toBeTruthy();
  });

  it('next button does not submit when agreement unchecked', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterStep1Phone />);
    fireEvent.changeText(getByPlaceholderText('请输入手机号'), '13800138000');
    fireEvent.changeText(getByPlaceholderText('请输入验证码'), '123456');
    // Agreement unchecked → press 下一步 → mutate not called
    fireEvent.press(getByText('下一步'));
    expect(mockVerifyCodeMutate).not.toHaveBeenCalled();
  });

  it('calls sendCode mutation when phone filled and send pressed', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterStep1Phone />);
    fireEvent.changeText(getByPlaceholderText('请输入手机号'), '13800138000');
    fireEvent.press(getByText('发送验证码'));
    expect(mockSendCodeMutate).toHaveBeenCalledWith(
      { phone: '13800138000' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('does not call sendCode when phone is empty', () => {
    const { getByText } = render(<RegisterStep1Phone />);
    fireEvent.press(getByText('发送验证码'));
    expect(mockSendCodeMutate).not.toHaveBeenCalled();
  });

  it('navigates to terms when terms link pressed', () => {
    const { getByText } = render(<RegisterStep1Phone />);
    fireEvent.press(getByText('《用户服务协议》'));
    expect(mockPush).toHaveBeenCalledWith('/legal/terms');
  });

  it('navigates to privacy when privacy link pressed', () => {
    const { getByText } = render(<RegisterStep1Phone />);
    fireEvent.press(getByText('《隐私保护政策》'));
    expect(mockPush).toHaveBeenCalledWith('/legal/privacy');
  });
});
