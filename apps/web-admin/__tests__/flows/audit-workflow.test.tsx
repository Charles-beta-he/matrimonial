import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  {
    id: 'photo-2',
    url: 'https://example.com/photo2.jpg',
    user: { id: 'u2', nickname: '李四' },
    createdAt: '2026-01-02T00:00:00Z',
  },
];

const mockTextItems = [
  {
    id: 'text-audit-1',
    text: '不当内容示例',
    context: 'BIO',
    user: { id: 'u3', nickname: '王五' },
    createdAt: '2026-01-03T00:00:00Z',
  },
];

const mockReports = [
  {
    id: 'report-1',
    reason: 'HARASSMENT',
    context: 'MESSAGE',
    status: 'PENDING',
    reporter: { id: 'u1', nickname: '举报人甲' },
    reported: { id: 'u2', nickname: '被举报人乙' },
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'report-2',
    reason: 'SCAM',
    context: 'BIO',
    status: 'PENDING',
    reporter: { id: 'u3', nickname: '举报人丙' },
    reported: { id: 'u4', nickname: '被举报人丁' },
    createdAt: '2026-01-02T00:00:00Z',
  },
];

let mockPhotosQuery = { data: mockPhotos, isLoading: false, error: null };
let mockTextQuery = { data: mockTextItems, isLoading: false, error: null };
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

// ─── Flow Tests ───────────────────────────────────────────────────────────────

describe('AuditPage — workflow flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPhotosQuery = { data: mockPhotos, isLoading: false, error: null };
    mockTextQuery = { data: mockTextItems, isLoading: false, error: null };
    mockReportsQuery = { data: mockReports, isLoading: false, error: null };
  });

  it('tab navigation flow: photos → text → reports → back to photos', () => {
    render(<AuditPage />);

    // Default tab is photos — shows photo count
    expect(screen.getByText(/2 张照片待审核/)).toBeInTheDocument();

    // Switch to text tab — shows text audit item
    fireEvent.click(screen.getByRole('button', { name: '文本审核' }));
    expect(screen.getByText('不当内容示例')).toBeInTheDocument();
    // Photos content is gone
    expect(screen.queryByText(/张照片待审核/)).not.toBeInTheDocument();

    // Switch to reports tab — shows report data
    fireEvent.click(screen.getByRole('button', { name: '举报处理' }));
    expect(screen.getByText('骚扰')).toBeInTheDocument(); // HARASSMENT label
    expect(screen.getByText('诈骗')).toBeInTheDocument(); // SCAM label
    // Text tab content is gone
    expect(screen.queryByText('不当内容示例')).not.toBeInTheDocument();

    // Switch back to photos — photos reappear
    fireEvent.click(screen.getByRole('button', { name: '照片审核' }));
    expect(screen.getByText(/2 张照片待审核/)).toBeInTheDocument();
    expect(screen.queryByText('骚扰')).not.toBeInTheDocument();
  });

  it('photo approve flow: see pending count → click approve → mutation called with correct id', () => {
    render(<AuditPage />);

    // Verify we can see both photos
    expect(screen.getByText(/2 张照片待审核/)).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();

    // Click approve on the first photo (first 通过 button)
    const approveButtons = screen.getAllByRole('button', { name: '通过' });
    expect(approveButtons.length).toBe(2);
    fireEvent.click(approveButtons[0]);

    // Mutation called with correct photo id
    expect(mockApprovePhoto).toHaveBeenCalledWith({ photoId: 'photo-1' });
    // Invalidate called once
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    // Reject the second photo
    const rejectButtons = screen.getAllByRole('button', { name: '拒绝' });
    fireEvent.click(rejectButtons[1]);
    expect(mockRejectPhoto).toHaveBeenCalledWith({ photoId: 'photo-2' });
  });

  it('text audit flow: switch to text tab → approve one → reject another', () => {
    render(<AuditPage />);

    // Start on photos tab
    expect(screen.getByText(/2 张照片待审核/)).toBeInTheDocument();

    // Switch to text tab
    fireEvent.click(screen.getByRole('button', { name: '文本审核' }));

    // Text tab content visible
    expect(screen.getByText('不当内容示例')).toBeInTheDocument();
    expect(screen.getByText('王五')).toBeInTheDocument();
    // Context label for BIO
    expect(screen.getByText('简介')).toBeInTheDocument();

    // Click approve on text item
    const approveBtn = screen.getByRole('button', { name: '通过' });
    fireEvent.click(approveBtn);
    expect(mockApproveText).toHaveBeenCalledWith({ id: 'text-audit-1' });
    expect(mockInvalidate).toHaveBeenCalled();

    // No photo mutations were called
    expect(mockApprovePhoto).not.toHaveBeenCalled();
  });

  it('report resolution flow: switch to reports → resolve first → dismiss second', () => {
    render(<AuditPage />);

    // Navigate to reports tab
    fireEvent.click(screen.getByRole('button', { name: '举报处理' }));

    // Both reports shown
    expect(screen.getByText('举报人甲')).toBeInTheDocument();
    expect(screen.getByText('被举报人乙')).toBeInTheDocument();
    expect(screen.getByText('举报人丙')).toBeInTheDocument();

    // Resolve first report (first 通过 button)
    const resolveButtons = screen.getAllByRole('button', { name: '通过' });
    fireEvent.click(resolveButtons[0]);
    expect(mockResolveReport).toHaveBeenCalledWith({ reportId: 'report-1', action: 'RESOLVED' });

    // Dismiss second report (second 驳回 button)
    const dismissButtons = screen.getAllByRole('button', { name: '驳回' });
    fireEvent.click(dismissButtons[1]);
    expect(mockResolveReport).toHaveBeenCalledWith({ reportId: 'report-2', action: 'DISMISSED' });

    // resolveReport called twice total
    expect(mockResolveReport).toHaveBeenCalledTimes(2);
  });

  it('photos tab empty state flow: shows no-photo message, switch away and back still shows empty state', () => {
    mockPhotosQuery = { data: [], isLoading: false, error: null };

    render(<AuditPage />);

    // Empty state shown initially
    expect(screen.getByText('暂无待审核照片')).toBeInTheDocument();

    // Switch to reports tab
    fireEvent.click(screen.getByRole('button', { name: '举报处理' }));
    expect(screen.queryByText('暂无待审核照片')).not.toBeInTheDocument();

    // Switch back to photos — empty state persists
    fireEvent.click(screen.getByRole('button', { name: '照片审核' }));
    expect(screen.getByText('暂无待审核照片')).toBeInTheDocument();
  });

  it('error recovery flow: photos tab shows error, switch to reports shows data', () => {
    mockPhotosQuery = {
      data: undefined as any,
      isLoading: false,
      error: { message: '网络连接失败' } as any,
    };

    render(<AuditPage />);

    // Error shown on photos tab
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/网络连接失败/)).toBeInTheDocument();

    // Switch to reports tab — reports load correctly despite photos error
    fireEvent.click(screen.getByRole('button', { name: '举报处理' }));
    expect(screen.queryByText(/加载失败/)).not.toBeInTheDocument();
    expect(screen.getByText('举报人甲')).toBeInTheDocument();
    expect(screen.getByText('骚扰')).toBeInTheDocument();
  });

  it('text tab reject flow: switch to text → reject item → mutation called → invalidate fired', () => {
    render(<AuditPage />);

    // Switch to text tab
    fireEvent.click(screen.getByRole('button', { name: '文本审核' }));
    expect(screen.getByText('不当内容示例')).toBeInTheDocument();

    // Reject text item
    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
    expect(mockRejectText).toHaveBeenCalledWith({ id: 'text-audit-1' });
    expect(mockInvalidate).toHaveBeenCalled();
    expect(mockApproveText).not.toHaveBeenCalled();
  });
});
