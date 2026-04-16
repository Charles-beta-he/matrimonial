import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivitiesPage from '../../app/activities/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockCancel = vi.fn();
const mockInvalidate = vi.fn();

const mockActivities = [
  {
    id: 'act-1',
    title: '春日交友活动',
    category: '线下活动',
    startTime: '2026-05-01T14:00:00Z',
    location: '上海陆家嘴',
    maxMale: 10,
    maxFemale: 10,
    signupCount: 8,
    status: 'UPCOMING',
    description: '一起来认识新朋友吧',
  },
  {
    id: 'act-2',
    title: '读书会',
    category: '读书会',
    startTime: '2026-04-20T10:00:00Z',
    location: '北京三里屯',
    maxMale: 5,
    maxFemale: 5,
    signupCount: 10,
    status: 'COMPLETED',
    description: null,
  },
];

let mockListQuery = { data: mockActivities, isLoading: false, isError: false, error: null };

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      activity: { list: { invalidate: mockInvalidate } },
    }),
    activity: {
      list: { useQuery: () => mockListQuery },
    },
    admin: {
      createActivity: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockCreate(args); onSuccess?.(); },
          isPending: false,
          error: null,
        }),
      },
      updateActivity: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockUpdate(args); onSuccess?.(); },
          isPending: false,
          error: null,
        }),
      },
      cancelActivity: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => { mockCancel(args); onSuccess?.(); },
          isPending: false,
        }),
      },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ActivitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListQuery = { data: mockActivities, isLoading: false, isError: false, error: null };
  });

  it('renders page title', () => {
    render(<ActivitiesPage />);
    expect(screen.getByText('活动管理')).toBeInTheDocument();
  });

  it('renders create button', () => {
    render(<ActivitiesPage />);
    expect(screen.getByRole('button', { name: '创建活动' })).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<ActivitiesPage />);
    expect(screen.getByText('活动名称')).toBeInTheDocument();
    expect(screen.getByText('分类')).toBeInTheDocument();
    expect(screen.getByText('时间')).toBeInTheDocument();
    expect(screen.getByText('参与人数')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
  });

  it('renders activity rows', () => {
    render(<ActivitiesPage />);
    expect(screen.getByText('春日交友活动')).toBeInTheDocument();
    // "读书会" appears as title AND category badge
    expect(screen.getAllByText('读书会').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('即将开始')).toBeInTheDocument();
    expect(screen.getByText('已结束')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockListQuery = { data: undefined as any, isLoading: true, isError: false, error: null };
    render(<ActivitiesPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockListQuery = { data: undefined as any, isLoading: false, isError: true, error: { message: '连接失败' } as any };
    render(<ActivitiesPage />);
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/连接失败/)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockListQuery = { data: [], isLoading: false, isError: false, error: null };
    render(<ActivitiesPage />);
    expect(screen.getByText('暂无活动')).toBeInTheDocument();
  });

  it('opens create dialog when create button clicked', () => {
    render(<ActivitiesPage />);
    fireEvent.click(screen.getByRole('button', { name: '创建活动' }));
    // button + dialog h2 both say "创建活动"
    expect(screen.getAllByText('创建活动').length).toBeGreaterThanOrEqual(2);
    // Dialog form has a text input for title (first textbox)
    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThan(0);
  });

  it('shows cancel button for upcoming activity only', () => {
    render(<ActivitiesPage />);
    // act-1 is UPCOMING → shows 取消; act-2 is COMPLETED → no 取消
    // "取消" also appears in dialog close if open — but dialog is closed here
    const cancelBtns = screen.getAllByRole('button', { name: '取消' });
    expect(cancelBtns).toHaveLength(1);
  });

  it('shows edit button for all activities', () => {
    render(<ActivitiesPage />);
    expect(screen.getAllByRole('button', { name: '编辑' })).toHaveLength(2);
  });

  it('opens edit dialog when edit clicked', () => {
    render(<ActivitiesPage />);
    fireEvent.click(screen.getAllByRole('button', { name: '编辑' })[0]);
    expect(screen.getByText('编辑活动')).toBeInTheDocument();
    // Title pre-populated — first textbox in the dialog
    const titleInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    expect(titleInput.value).toBe('春日交友活动');
  });

  it('submits create form with correct data', () => {
    render(<ActivitiesPage />);
    fireEvent.click(screen.getByRole('button', { name: '创建活动' }));

    // textbox[0] = 标题, textbox[1] = 地点
    const [titleInput, locationInput] = screen.getAllByRole('textbox');
    fireEvent.change(titleInput, { target: { value: '测试活动' } });
    fireEvent.change(locationInput, { target: { value: '深圳南山' } });

    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    if (dateInputs.length > 0) {
      fireEvent.change(dateInputs[0], { target: { value: '2026-06-01T10:00' } });
    }

    // Submit button text is "创建" in create mode
    fireEvent.click(screen.getByRole('button', { name: '创建' }));
    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.title).toBe('测试活动');
    expect(callArgs.location).toBe('深圳南山');
  });
});
