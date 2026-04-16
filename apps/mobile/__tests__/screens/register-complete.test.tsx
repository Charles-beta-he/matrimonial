import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RegisterComplete from '../../app/(auth)/register/complete';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn(), setUserId: jest.fn() }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterComplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders success heading 注册成功！', () => {
    const { getByText } = render(<RegisterComplete />);
    expect(getByText('注册成功！')).toBeTruthy();
  });

  it('renders welcome subtitle text', () => {
    const { getByText } = render(<RegisterComplete />);
    expect(getByText(/欢迎加入缘分/)).toBeTruthy();
  });

  it('renders 开始探索 button', () => {
    const { getByText } = render(<RegisterComplete />);
    expect(getByText('开始探索')).toBeTruthy();
  });

  it('pressing 开始探索 calls router.replace with /(tabs)', () => {
    const { getByText } = render(<RegisterComplete />);
    fireEvent.press(getByText('开始探索'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('does not navigate on initial render without button press', () => {
    render(<RegisterComplete />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
