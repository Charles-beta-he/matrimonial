import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../../app/login/page';

const mockSendCode = vi.fn();
const mockVerifyCode = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Base mock — overridden per-test where needed
vi.mock('../../lib/trpc', () => ({
  trpc: {
    auth: {
      sendCode: {
        useMutation: ({ onSuccess, onError }: { onSuccess?: () => void; onError?: (err: { message: string }) => void } = {}) => ({
          mutate: (args: unknown) => {
            mockSendCode(args);
            onSuccess?.();
          },
          isPending: false,
          _onError: onError,
        }),
      },
      verifyCode: {
        useMutation: ({ onSuccess, onError }: { onSuccess?: (data: unknown) => void; onError?: (err: { message: string }) => void } = {}) => ({
          mutate: (args: unknown) => {
            mockVerifyCode(args);
          },
          isPending: false,
          _onError: onError,
        }),
      },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('renders phone input and send-code button', () => {
    render(<LoginPage />);

    expect(screen.getByPlaceholderText('请输入管理员手机号')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送验证码' })).toBeInTheDocument();
  });

  it('calls sendCode mutation when form submitted with phone number', () => {
    render(<LoginPage />);

    const phoneInput = screen.getByPlaceholderText('请输入管理员手机号');
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });

    const btn = screen.getByRole('button', { name: '发送验证码' });
    fireEvent.click(btn);

    expect(mockSendCode).toHaveBeenCalledWith({ phone: '13800138000' });
  });

  it('shows code input after sendCode succeeds (step changes to code)', () => {
    render(<LoginPage />);

    const phoneInput = screen.getByPlaceholderText('请输入管理员手机号');
    fireEvent.change(phoneInput, { target: { value: '13800138000' } });

    // clicking submit triggers onSuccess which sets step = 'code'
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));

    expect(screen.getByPlaceholderText('请输入验证码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('displays error message when set', async () => {
    // Override mock to trigger onError instead
    const { trpc } = await import('../../lib/trpc');
    (trpc.auth.sendCode.useMutation as ReturnType<typeof vi.fn>) = vi.fn(
      ({ onError }: { onError?: (err: { message: string }) => void } = {}) => ({
        mutate: (_args: unknown) => {
          onError?.({ message: '该手机号不存在' });
        },
        isPending: false,
      })
    );

    render(<LoginPage />);

    const phoneInput = screen.getByPlaceholderText('请输入管理员手机号');
    fireEvent.change(phoneInput, { target: { value: '13900000000' } });
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));

    expect(screen.getByText('该手机号不存在')).toBeInTheDocument();
  });
});
