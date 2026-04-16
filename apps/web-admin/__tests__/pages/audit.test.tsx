import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuditPage from '../../app/audit/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockApprovePhoto = vi.fn();
const mockRejectPhoto = vi.fn();
const mockApproveText = vi.fn();
const mockRejectText = vi.fn();
const mockResolveReport = vi.fn();
const mockInvalidate = vi.fn();

const mockPhotos = [
  {
    id: 'photo-1',
    url: 'https://example.com/photo1.jpg',
    user: { id: 'u1', nickname: '张三' },
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const mockReports = [
  {
    id: 'report-1',
    reason: 'HARASSMENT',
    context: 'MESSAGE',
    status: 'PENDING',
    reporter: { id: 'u1', nickname: '举报人' },
    reported: { id: 'u2', nickname: '被举报人' },
    createdAt: '2026-01-01T00:00:00Z',
  },
];

let mockPhotosQuery = { data: mockPhotos, isLoading: false, error: null };
let mockTextQuery = { data: [], isLoading: false, error: null };
let mockReportsQuery = { data: mockReports, isLoading: false, error: null };

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        pendingPhotos: { invalidate: mockInvalidate },
        pendingTextAudits: { invalidate: mockInvalidate },
        pendingReports: { invalidate: mockInvalidate },
      },
    }),
    admin: {
      pendingPhotos: { useQuery: (_: any, __: any) => mockPhotosQuery },
      pendingTextAudits: { useQuery: (_: any, __: any) => mockTextQuery },
      pendingReports: { useQuery: (_: any, __: any) => mockReportsQuery },
      approvePhoto: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockApprovePhoto(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      rejectPhoto: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockRejectPhoto(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      approveText: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockApproveText(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      rejectText: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockRejectText(args); onSuccess?.(); },
          isPending: false,
        }),
      },
      resolveReport: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockResolveReport(args); onSuccess?.(); },
          isPending: false,
        }),
      },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPhotosQuery = { data: mockPhotos, isLoading: false, error: null };
    mockTextQuery = { data: [], isLoading: false, error: null };
    mockReportsQuery = { data: mockReports, isLoading: false, error: null };
  });

  it('renders page title', () => {
    render(<AuditPage />);
    expect(screen.getByText('内容审核')).toBeInTheDocument();
  });

  it('renders three tab buttons', () => {
    render(<AuditPage />);
    expect(screen.getByRole('button', { name: '照片审核' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '文本审核' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '举报处理' })).toBeInTheDocument();
  });

  it('defaults to photos tab — shows photo count', () => {
    render(<AuditPage />);
    expect(screen.getByText(/1 张照片待审核/)).toBeInTheDocument();
  });

  it('shows empty photos state', () => {
    mockPhotosQuery = { data: [], isLoading: false, error: null };
    render(<AuditPage />);
    expect(screen.getByText('暂无待审核照片')).toBeInTheDocument();
  });

  it('shows loading state on photos tab', () => {
    mockPhotosQuery = { data: undefined as any, isLoading: true, error: null };
    render(<AuditPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows error state on photos tab', () => {
    mockPhotosQuery = { data: undefined as any, isLoading: false, error: { message: '服务异常' } as any };
    render(<AuditPage />);
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/服务异常/)).toBeInTheDocument();
  });

  it('switches to reports tab and shows report data', () => {
    render(<AuditPage />);
    fireEvent.click(screen.getByRole('button', { name: '举报处理' }));
    // Both appear as table headers AND cell values
    expect(screen.getAllByText('举报人').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('被举报人').length).toBeGreaterThanOrEqual(1);
  });

  it('shows report reason label', () => {
    render(<AuditPage />);
    fireEvent.click(screen.getByRole('button', { name: '举报处理' }));
    expect(screen.getByText('骚扰')).toBeInTheDocument(); // HARASSMENT label
  });

  it('switches to text tab and shows empty state', () => {
    render(<AuditPage />);
    fireEvent.click(screen.getByRole('button', { name: '文本审核' }));
    expect(screen.getByText('暂无待审核文本')).toBeInTheDocument();
  });

  it('calls approvePhoto mutation when approve button clicked', () => {
    render(<AuditPage />);
    fireEvent.click(screen.getByRole('button', { name: '通过' }));
    expect(mockApprovePhoto).toHaveBeenCalledWith({ photoId: 'photo-1' });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('calls rejectPhoto mutation when reject button clicked', () => {
    render(<AuditPage />);
    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
    expect(mockRejectPhoto).toHaveBeenCalledWith({ photoId: 'photo-1' });
  });
});
