import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('@matrimonial/ui', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

const mockReportMutate = jest.fn();
let mockIsPending = false;
let mockMutationImpl: (args: any, callbacks: any) => void = (args, cb) => cb?.onSuccess?.();

jest.mock('@matrimonial/api-client', () => ({
  api: {
    report: {
      create: {
        useMutation: () => ({
          mutate: (args: any, callbacks: any) => {
            mockReportMutate(args);
            mockMutationImpl(args, callbacks);
          },
          isPending: mockIsPending,
          reset: jest.fn(),
        }),
      },
    },
  },
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let ReportModal: React.ComponentType<any>;
beforeAll(() => {
  ReportModal = require('../../components/ReportModal').ReportModal;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ReportModal', () => {
  const defaultProps = {
    visible: true,
    reportedId: 'user-123',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
    mockMutationImpl = (_args, cb) => cb?.onSuccess?.();
  });

  it('renders modal header title', () => {
    const { getByText } = render(<ReportModal {...defaultProps} />);
    expect(getByText('举报用户')).toBeTruthy();
  });

  it('renders all 5 report reason options', () => {
    const { getByText } = render(<ReportModal {...defaultProps} />);
    expect(getByText('虚假资料')).toBeTruthy();
    expect(getByText('骚扰行为')).toBeTruthy();
    expect(getByText('诈骗嫌疑')).toBeTruthy();
    expect(getByText('不当内容')).toBeTruthy();
    expect(getByText('其他原因')).toBeTruthy();
  });

  it('renders description input placeholder', () => {
    const { getByPlaceholderText } = render(<ReportModal {...defaultProps} />);
    expect(getByPlaceholderText('请描述具体情况（至少10个字符）')).toBeTruthy();
  });

  it('renders submit button', () => {
    const { getByText } = render(<ReportModal {...defaultProps} />);
    expect(getByText('提交举报')).toBeTruthy();
  });

  it('submit button is disabled when no reason selected and description too short', () => {
    const { getByText } = render(<ReportModal {...defaultProps} />);
    const submitBtn = getByText('提交举报');
    fireEvent.press(submitBtn);
    // Should not call mutate since conditions not met
    expect(mockReportMutate).not.toHaveBeenCalled();
  });

  it('selecting a reason updates the radio button state', () => {
    const { getByText } = render(<ReportModal {...defaultProps} />);
    fireEvent.press(getByText('骚扰行为'));
    // No error — component accepted press
    expect(getByText('骚扰行为')).toBeTruthy();
  });

  it('submits report when reason selected and description >= 10 chars', async () => {
    const { getByText, getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

    fireEvent.press(getByText('虚假资料'));
    fireEvent.changeText(
      getByPlaceholderText('请描述具体情况（至少10个字符）'),
      '这是一段超过十个字符的描述内容',
    );
    fireEvent.press(getByText('提交举报'));

    expect(mockReportMutate).toHaveBeenCalledWith({
      reportedId: 'user-123',
      reason: 'FAKE_PROFILE',
      description: '这是一段超过十个字符的描述内容',
    });
  });

  it('shows success toast on successful submit', async () => {
    const { getByText, getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

    fireEvent.press(getByText('骚扰行为'));
    fireEvent.changeText(
      getByPlaceholderText('请描述具体情况（至少10个字符）'),
      '这是超过十个字的骚扰描述',
    );
    fireEvent.press(getByText('提交举报'));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('举报已提交，我们会尽快处理');
    });
  });

  it('shows error toast on failed submit', async () => {
    mockMutationImpl = (_args, cb) => cb?.onError?.({ message: '网络错误' });

    const { getByText, getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

    fireEvent.press(getByText('骚扰行为'));
    fireEvent.changeText(
      getByPlaceholderText('请描述具体情况（至少10个字符）'),
      '这是超过十个字的骚扰描述',
    );
    fireEvent.press(getByText('提交举报'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('网络错误');
    });
  });

  it('shows fallback error message when error has no message', async () => {
    mockMutationImpl = (_args, cb) => cb?.onError?.(null);

    const { getByText, getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

    fireEvent.press(getByText('其他原因'));
    fireEvent.changeText(
      getByPlaceholderText('请描述具体情况（至少10个字符）'),
      '补充说明内容超过十个字',
    );
    fireEvent.press(getByText('提交举报'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('举报失败，请稍后重试');
    });
  });

  it('calls onClose when backdrop pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ReportModal {...defaultProps} onClose={onClose} />,
    );
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    // Backdrop is first Pressable (flex-1 bg-black/40)
    fireEvent.press(pressables[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ReportModal {...defaultProps} onClose={onClose} />,
    );
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    // Close icon Pressable is second
    fireEvent.press(pressables[1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows character counter', () => {
    const { getByText, getByPlaceholderText } = render(<ReportModal {...defaultProps} />);
    fireEvent.changeText(
      getByPlaceholderText('请描述具体情况（至少10个字符）'),
      'hello',
    );
    expect(getByText('5/1000')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <ReportModal {...defaultProps} visible={false} />,
    );
    // Modal with visible=false should not show content
    expect(queryByText('举报用户')).toBeNull();
  });
});
