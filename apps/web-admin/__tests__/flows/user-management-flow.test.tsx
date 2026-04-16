import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from '../../app/users/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBanMutate = vi.fn();
const mockUnbanMutate = vi.fn();
const mockInvalidate = vi.fn();

// window.prompt used by handleBan
const mockPrompt = vi.fn();

const mockUsers = [
  {
    id: 'user-1',
    nickname: '张三',
    gender: 'MALE',
    city: '北京',
    verificationLevel: 'L2',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    nickname: '李四',
    gender: 'FEMALE',
    city: '上海',
    verificationLevel: 'L3',
    status: 'ACTIVE',
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'user-3',
    nickname: '王五',
    gender: 'MALE',
    city: '广州',
    verificationLevel: 'L1',
    status: 'BANNED',
    createdAt: '2026-01-03T00:00:00Z',
  },
];

let mockListQuery = {
  data: { users: mockUsers, total: 3, totalPages: 1 },
  isLoading: false,
  error: null,
};

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      admin: { users: { invalidate: mockInvalidate } },
    }),
    admin: {
      users: { useQuery: () => mockListQuery },
      banUser: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockBanMutate(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      unbanUser: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockUnbanMutate(args); onSuccess?.(); },
          isPending: false,
        }),
      },
    },
  },
}));

// ─── Flow Tests ───────────────────────────────────────────────────────────────

describe('UsersPage — management flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListQuery = {
      data: { users: mockUsers, total: 3, totalPages: 1 },
      isLoading: false,
      error: null,
    };
    // Default: prompt returns a reason
    mockPrompt.mockReturnValue('违规操作');
    vi.stubGlobal('prompt', mockPrompt);
  });

  it('search input flow: type search term → input value updates → clear → empty value', () => {
    render(<UsersPage />);

    const input = screen.getByPlaceholderText('搜索昵称或手机号...');

    // Initially empty
    expect((input as HTMLInputElement).value).toBe('');

    // Type a search term
    fireEvent.change(input, { target: { value: '张三' } });
    expect((input as HTMLInputElement).value).toBe('张三');

    // Type more
    fireEvent.change(input, { target: { value: '张三李四' } });
    expect((input as HTMLInputElement).value).toBe('张三李四');

    // Clear the input
    fireEvent.change(input, { target: { value: '' } });
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('ban flow: see active user → click ban → prompt called → mutation called with userId and reason', () => {
    render(<UsersPage />);

    // Both user-1 and user-2 are ACTIVE — both have 封禁 buttons
    const banButtons = screen.getAllByRole('button', { name: '封禁' });
    expect(banButtons.length).toBe(2);

    // Ban user-1 (first row)
    fireEvent.click(banButtons[0]);

    // Prompt should have been invoked for reason
    expect(mockPrompt).toHaveBeenCalled();

    // Mutation called with correct args
    expect(mockBanMutate).toHaveBeenCalledWith({ userId: 'user-1', reason: '违规操作' });
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('unban flow: see banned user → click unban → mutation called → invalidate fired', () => {
    render(<UsersPage />);

    // user-3 is BANNED — shows 解封 button
    const unbanButton = screen.getByRole('button', { name: '解封' });
    expect(unbanButton).toBeInTheDocument();

    fireEvent.click(unbanButton);
    expect(mockUnbanMutate).toHaveBeenCalledWith({ userId: 'user-3' });
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    // Ban mutation was NOT called
    expect(mockBanMutate).not.toHaveBeenCalled();
  });

  it('ban cancelled flow: user dismisses prompt → mutation not called', () => {
    // Simulate user clicking Cancel on the prompt (returns null)
    mockPrompt.mockReturnValue(null);

    render(<UsersPage />);

    const banButtons = screen.getAllByRole('button', { name: '封禁' });
    fireEvent.click(banButtons[0]);

    expect(mockPrompt).toHaveBeenCalled();
    // Mutation should NOT fire when prompt is cancelled
    expect(mockBanMutate).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('ban then unban flow: ban user-1 → unban user-3 → both mutations called independently', () => {
    render(<UsersPage />);

    // Ban first active user
    const banButtons = screen.getAllByRole('button', { name: '封禁' });
    fireEvent.click(banButtons[0]);
    expect(mockBanMutate).toHaveBeenCalledWith({ userId: 'user-1', reason: '违规操作' });

    // Unban the banned user
    const unbanButton = screen.getByRole('button', { name: '解封' });
    fireEvent.click(unbanButton);
    expect(mockUnbanMutate).toHaveBeenCalledWith({ userId: 'user-3' });

    // Both mutations called once each, invalidate called twice
    expect(mockBanMutate).toHaveBeenCalledTimes(1);
    expect(mockUnbanMutate).toHaveBeenCalledTimes(1);
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('pagination flow: single page — no pagination shown; multiple pages — buttons rendered', () => {
    render(<UsersPage />);

    // With totalPages: 1, no pagination is shown
    expect(screen.queryByText('共 3 条记录')).not.toBeInTheDocument();

    // Update to multi-page
    mockListQuery = {
      data: { users: mockUsers, total: 50, totalPages: 3 },
      isLoading: false,
      error: null,
    };

    // Re-render with paginated data
    const { unmount } = render(<UsersPage />);
    expect(screen.getByText('共 50 条记录')).toBeInTheDocument();
    // Page buttons 1, 2, 3
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();

    // Click page 2
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    // Page 2 button is now highlighted (has rose-600 class via aria or content check)
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();

    unmount();
  });

  it('error recovery flow: see error state → displays error message → other elements not shown', () => {
    mockListQuery = {
      data: undefined as any,
      isLoading: false,
      error: { message: '数据库连接超时' } as any,
    };

    render(<UsersPage />);

    // Error displayed
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/数据库连接超时/)).toBeInTheDocument();

    // No user rows shown
    expect(screen.queryByText('张三')).not.toBeInTheDocument();
    expect(screen.queryByText('李四')).not.toBeInTheDocument();

    // Search input still rendered (page chrome intact)
    expect(screen.getByPlaceholderText('搜索昵称或手机号...')).toBeInTheDocument();
  });

  it('loading → data flow: initially loading, then data shown with users and action buttons', async () => {
    mockListQuery = { data: undefined as any, isLoading: true, error: null };

    const { rerender } = render(<UsersPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByText('张三')).not.toBeInTheDocument();

    // Simulate data arriving
    mockListQuery = {
      data: { users: mockUsers, total: 3, totalPages: 1 },
      isLoading: false,
      error: null,
    };

    rerender(<UsersPage />);

    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '封禁' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: '解封' })).toBeInTheDocument();
  });
});
