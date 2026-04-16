import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PushPage from '../../app/push/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateMutate = vi.fn();
const mockSendMutate = vi.fn();
const mockInvalidate = vi.fn();

const mockCampaigns = [
  {
    id: 'campaign-1',
    title: '新年快乐',
    body: '祝大家新年快乐！',
    audience: 'ALL',
    status: 'SENT',
    sentAt: '2026-01-01T00:00:00Z',
    delivered: 4800,
    opened: 1200,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

let mockHistoryQuery = { data: { items: mockCampaigns }, isLoading: false };

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      admin: { listPushCampaigns: { invalidate: mockInvalidate } },
    }),
    admin: {
      listPushCampaigns: { useQuery: () => mockHistoryQuery },
      sendPushCampaign: {
        useMutation: () => ({ mutate: mockSendMutate, isPending: false }),
      },
      createPushCampaign: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => {
            mockCreateMutate(args);
            onSuccess?.({ id: 'new-campaign-1' }, args);
          },
          isPending: false,
        }),
      },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PushPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryQuery = { data: { items: mockCampaigns }, isLoading: false };
  });

  it('renders page title', () => {
    render(<PushPage />);
    expect(screen.getByText('推送管理')).toBeInTheDocument();
  });

  it('renders create push section', () => {
    render(<PushPage />);
    expect(screen.getByText('创建推送')).toBeInTheDocument();
  });

  it('renders title and body inputs', () => {
    render(<PushPage />);
    expect(screen.getByPlaceholderText('推送标题...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('推送内容...')).toBeInTheDocument();
  });

  it('renders audience select with options', () => {
    render(<PushPage />);
    // '全部用户' appears in select AND campaign row — use getAllByText
    expect(screen.getAllByText('全部用户').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('活跃用户 (7日内活跃)')).toBeInTheDocument();
    expect(screen.getByText('付费会员')).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<PushPage />);
    expect(screen.getByRole('button', { name: '立即发送' })).toBeInTheDocument();
  });

  it('does not submit when title or body empty', () => {
    render(<PushPage />);
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('calls createMutation when form submitted with title and body', () => {
    render(<PushPage />);
    fireEvent.change(screen.getByPlaceholderText('推送标题...'), { target: { value: '测试标题' } });
    fireEvent.change(screen.getByPlaceholderText('推送内容...'), { target: { value: '测试内容' } });
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: '测试标题', body: '测试内容', audience: 'ALL' }),
    );
  });

  it('immediately sends when no scheduleAt', () => {
    render(<PushPage />);
    fireEvent.change(screen.getByPlaceholderText('推送标题...'), { target: { value: '测试' } });
    fireEvent.change(screen.getByPlaceholderText('推送内容...'), { target: { value: '内容' } });
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));
    // onSuccess calls sendMutation with the created campaign id
    expect(mockSendMutate).toHaveBeenCalledWith({ id: 'new-campaign-1' });
  });

  it('renders campaign history table', () => {
    render(<PushPage />);
    expect(screen.getByText('发送历史')).toBeInTheDocument();
    expect(screen.getByText('新年快乐')).toBeInTheDocument();
    expect(screen.getAllByText('全部用户').length).toBeGreaterThanOrEqual(1);
  });

  it('shows loading state in history', () => {
    mockHistoryQuery = { data: undefined as any, isLoading: true };
    render(<PushPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty history state', () => {
    mockHistoryQuery = { data: { items: [] }, isLoading: false };
    render(<PushPage />);
    expect(screen.getByText('暂无记录')).toBeInTheDocument();
  });
});
