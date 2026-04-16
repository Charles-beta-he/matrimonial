import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from '../../app/users/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBanMutate = vi.fn();
const mockUnbanMutate = vi.fn();
const mockInvalidate = vi.fn();

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
    status: 'BANNED',
    createdAt: '2026-01-02T00:00:00Z',
  },
];

let mockListQuery = {
  data: { users: mockUsers, total: 2, totalPages: 1 },
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
      banUser: { useMutation: ({ onSuccess }: any) => ({ mutate: (args: any) => { mockBanMutate(args); onSuccess?.(); } }) },
      unbanUser: { useMutation: ({ onSuccess }: any) => ({ mutate: (args: any) => { mockUnbanMutate(args); onSuccess?.(); } }) },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListQuery = {
      data: { users: mockUsers, total: 2, totalPages: 1 },
      isLoading: false,
      error: null,
    };
  });

  it('renders page title', () => {
    render(<UsersPage />);
    expect(screen.getByText('用户管理')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<UsersPage />);
    expect(screen.getByPlaceholderText('搜索昵称或手机号...')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<UsersPage />);
    expect(screen.getByText('昵称')).toBeInTheDocument();
    expect(screen.getByText('性别')).toBeInTheDocument();
    expect(screen.getByText('城市')).toBeInTheDocument();
    expect(screen.getByText('认证等级')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
  });

  it('renders user rows', () => {
    render(<UsersPage />);
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('北京')).toBeInTheDocument();
    expect(screen.getByText('上海')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockListQuery = { data: undefined as any, isLoading: true, error: null };
    render(<UsersPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockListQuery = { data: undefined as any, isLoading: false, error: { message: '服务异常' } as any };
    render(<UsersPage />);
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/服务异常/)).toBeInTheDocument();
  });

  it('shows empty state when no users', () => {
    mockListQuery = { data: { users: [], total: 0, totalPages: 0 }, isLoading: false, error: null };
    render(<UsersPage />);
    expect(screen.getByText('暂无用户')).toBeInTheDocument();
  });

  it('shows unban button for banned user', () => {
    render(<UsersPage />);
    // user-2 is banned → shows 解封 button
    expect(screen.getByRole('button', { name: '解封' })).toBeInTheDocument();
  });

  it('shows ban button for active user', () => {
    render(<UsersPage />);
    // user-1 is active → shows 封禁 button
    expect(screen.getByRole('button', { name: '封禁' })).toBeInTheDocument();
  });

  it('calls unban mutation when unban button clicked', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: '解封' }));
    expect(mockUnbanMutate).toHaveBeenCalledWith({ userId: 'user-2' });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('updates search input value', () => {
    render(<UsersPage />);
    const input = screen.getByPlaceholderText('搜索昵称或手机号...');
    fireEvent.change(input, { target: { value: '张三' } });
    expect((input as HTMLInputElement).value).toBe('张三');
  });
});
