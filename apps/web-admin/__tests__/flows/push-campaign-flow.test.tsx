import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  {
    id: 'campaign-2',
    title: '女神节活动',
    body: '三八妇女节特别活动来啦！',
    audience: 'FEMALE',
    status: 'SENT',
    sentAt: '2026-03-08T08:00:00Z',
    delivered: 2200,
    opened: 880,
    createdAt: '2026-03-08T00:00:00Z',
  },
];

let mockHistoryQuery = {
  data: { items: mockCampaigns },
  isLoading: false,
  isError: false,
  error: null,
};

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      admin: { listPushCampaigns: { invalidate: mockInvalidate } },
    }),
    admin: {
      listPushCampaigns: { useQuery: () => mockHistoryQuery },
      sendPushCampaign: {
        useMutation: () => ({
          mutate: mockSendMutate,
          isPending: false,
        }),
      },
      createPushCampaign: {
        useMutation: ({ onSuccess }: any) => ({
          mutate: (args: any) => {
            mockCreateMutate(args);
            onSuccess?.({ id: 'new-campaign-99' }, args);
          },
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

// ─── Flow Tests ───────────────────────────────────────────────────────────────

describe('PushPage — campaign flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryQuery = {
      data: { items: mockCampaigns },
      isLoading: false,
      isError: false,
      error: null,
    };
  });

  it('form fill flow: type title → type body → select audience → values all update', () => {
    render(<PushPage />);

    const titleInput = screen.getByPlaceholderText('推送标题...');
    const bodyTextarea = screen.getByPlaceholderText('推送内容...');

    // Inputs start empty
    expect((titleInput as HTMLInputElement).value).toBe('');
    expect((bodyTextarea as HTMLTextAreaElement).value).toBe('');

    // Fill title
    fireEvent.change(titleInput, { target: { value: '春节活动预告' } });
    expect((titleInput as HTMLInputElement).value).toBe('春节活动预告');

    // Fill body
    fireEvent.change(bodyTextarea, { target: { value: '春节期间，平台将举办系列相亲活动！' } });
    expect((bodyTextarea as HTMLTextAreaElement).value).toBe('春节期间，平台将举办系列相亲活动！');

    // Change audience to FEMALE
    const audienceSelect = screen.getByRole('combobox');
    fireEvent.change(audienceSelect, { target: { value: 'FEMALE' } });
    expect((audienceSelect as HTMLSelectElement).value).toBe('FEMALE');
  });

  it('immediate send flow: fill form → submit → createMutation called → sendMutation called with created id', () => {
    render(<PushPage />);

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText('推送标题...'), { target: { value: '测试推送' } });
    fireEvent.change(screen.getByPlaceholderText('推送内容...'), { target: { value: '这是一条测试推送内容' } });

    // Submit (no schedule = immediate send)
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));

    // createMutation called with correct args
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '测试推送',
        body: '这是一条测试推送内容',
        audience: 'ALL',
        scheduleAt: undefined,
      }),
    );

    // sendMutation auto-triggered in onSuccess with the new campaign id
    expect(mockSendMutate).toHaveBeenCalledWith({ id: 'new-campaign-99' });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('form validation flow: submit empty form → mutation not called; fill fields → submit succeeds', () => {
    render(<PushPage />);

    // Submit with no title or body
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));
    expect(mockCreateMutate).not.toHaveBeenCalled();

    // Fill only title, still missing body
    fireEvent.change(screen.getByPlaceholderText('推送标题...'), { target: { value: '只有标题' } });
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));
    expect(mockCreateMutate).not.toHaveBeenCalled();

    // Now fill body too
    fireEvent.change(screen.getByPlaceholderText('推送内容...'), { target: { value: '现在有内容了' } });
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
  });

  it('scheduled send flow: fill form → set schedule time → button shows "定时发送" → submit', () => {
    render(<PushPage />);

    // Initially button shows "立即发送"
    expect(screen.getByRole('button', { name: '立即发送' })).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('推送标题...'), { target: { value: '定时测试' } });
    fireEvent.change(screen.getByPlaceholderText('推送内容...'), { target: { value: '定时推送内容' } });

    // Set a scheduled time
    const scheduleDateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(scheduleDateInput, { target: { value: '2026-12-31T23:00' } });

    // Button text changes to "定时发送"
    expect(screen.getByRole('button', { name: '定时发送' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '立即发送' })).not.toBeInTheDocument();

    // Submit
    fireEvent.click(screen.getByRole('button', { name: '定时发送' }));
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    const args = mockCreateMutate.mock.calls[0][0];
    expect(args.title).toBe('定时测试');
    // scheduleAt should be set (not undefined)
    expect(args.scheduleAt).toBeDefined();

    // sendMutation NOT auto-called for scheduled pushes (scheduleAt is truthy)
    expect(mockSendMutate).not.toHaveBeenCalled();
  });

  it('audience selection flow: default is ALL → change to ACTIVE → change to MALE → mutation uses final value', () => {
    render(<PushPage />);

    const audienceSelect = screen.getByRole('combobox');

    // Default value is ALL
    expect((audienceSelect as HTMLSelectElement).value).toBe('ALL');

    // Change to ACTIVE
    fireEvent.change(audienceSelect, { target: { value: 'ACTIVE' } });
    expect((audienceSelect as HTMLSelectElement).value).toBe('ACTIVE');

    // Change to MALE
    fireEvent.change(audienceSelect, { target: { value: 'MALE' } });
    expect((audienceSelect as HTMLSelectElement).value).toBe('MALE');

    // Submit with MALE selected
    fireEvent.change(screen.getByPlaceholderText('推送标题...'), { target: { value: '男性专属' } });
    fireEvent.change(screen.getByPlaceholderText('推送内容...'), { target: { value: '为男性用户推送' } });
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'MALE' }),
    );
  });

  it('form reset flow: submit successfully → form fields clear for next campaign', () => {
    render(<PushPage />);

    const titleInput = screen.getByPlaceholderText('推送标题...');
    const bodyTextarea = screen.getByPlaceholderText('推送内容...');

    // Fill and submit
    fireEvent.change(titleInput, { target: { value: '第一条推送' } });
    fireEvent.change(bodyTextarea, { target: { value: '第一条内容' } });
    fireEvent.click(screen.getByRole('button', { name: '立即发送' }));

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);

    // After onSuccess, form resets
    expect((titleInput as HTMLInputElement).value).toBe('');
    expect((bodyTextarea as HTMLTextAreaElement).value).toBe('');
  });

  it('campaign history display flow: history shown with open rate calculation', () => {
    render(<PushPage />);

    // History section header
    expect(screen.getByText('发送历史')).toBeInTheDocument();

    // Both campaigns shown
    expect(screen.getByText('新年快乐')).toBeInTheDocument();
    expect(screen.getByText('女神节活动')).toBeInTheDocument();

    // Open rate for campaign-1: 1200/4800 = 25.0%
    expect(screen.getByText('25.0%')).toBeInTheDocument();

    // Open rate for campaign-2: 880/2200 = 40.0%
    expect(screen.getByText('40.0%')).toBeInTheDocument();

    // Audience labels shown (also appear in select options, so use getAllByText)
    expect(screen.getAllByText('全部用户').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('女性用户').length).toBeGreaterThanOrEqual(1);
  });

  it('history loading state flow: loading shows spinner → data arrives → history shown', async () => {
    mockHistoryQuery = { data: undefined as any, isLoading: true, isError: false, error: null };

    const { rerender } = render(<PushPage />);

    // Loading state visible
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByText('新年快乐')).not.toBeInTheDocument();

    // Data arrives
    mockHistoryQuery = {
      data: { items: mockCampaigns },
      isLoading: false,
      isError: false,
      error: null,
    };

    rerender(<PushPage />);

    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('新年快乐')).toBeInTheDocument();
  });
});
