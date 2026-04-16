import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    title: '桌游之夜',
    category: '桌游',
    startTime: '2026-06-15T18:00:00Z',
    location: '北京三里屯',
    maxMale: 6,
    maxFemale: 6,
    signupCount: 4,
    status: 'UPCOMING',
    description: null,
  },
  {
    id: 'act-3',
    title: '已结束读书会',
    category: '读书会',
    startTime: '2026-03-01T10:00:00Z',
    location: '成都宽窄巷子',
    maxMale: 5,
    maxFemale: 5,
    signupCount: 10,
    status: 'COMPLETED',
    description: null,
  },
];

let mockListQuery = {
  data: mockActivities,
  isLoading: false,
  isError: false,
  error: null,
};

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

// ─── Flow Tests ───────────────────────────────────────────────────────────────

describe('ActivitiesPage — management flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListQuery = {
      data: mockActivities,
      isLoading: false,
      isError: false,
      error: null,
    };
    // Default: confirm returns true
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('create activity flow: click create → modal opens → fill form → submit → mutation called', () => {
    render(<ActivitiesPage />);

    // No dialog visible yet
    expect(screen.queryByText('创建活动', { selector: 'h2' })).not.toBeInTheDocument();

    // Click the create button
    fireEvent.click(screen.getByRole('button', { name: '创建活动' }));

    // Dialog opens — h2 "创建活动" now visible
    expect(screen.getByText('创建活动', { selector: 'h2' })).toBeInTheDocument();

    // Fill in the form fields
    const textboxes = screen.getAllByRole('textbox');
    // textbox[0] = 标题, textbox[1] = 地点, textbox[2] = 描述 (textarea)
    fireEvent.change(textboxes[0], { target: { value: '夏日海滩活动' } });
    fireEvent.change(textboxes[1], { target: { value: '深圳大梅沙' } });

    // Set datetime-local
    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-07-15T10:00' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    // Mutation called with correct data
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const args = mockCreate.mock.calls[0][0];
    expect(args.title).toBe('夏日海滩活动');
    expect(args.location).toBe('深圳大梅沙');
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('create flow: mutation called and form submitted — modal closes async after onSuccess', async () => {
    render(<ActivitiesPage />);

    fireEvent.click(screen.getByRole('button', { name: '创建活动' }));
    expect(screen.getByText('创建活动', { selector: 'h2' })).toBeInTheDocument();

    // Fill required fields
    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[0], { target: { value: '测试活动' } });
    fireEvent.change(textboxes[1], { target: { value: '测试地点' } });
    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-08-01T09:00' } });

    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    // Mutation was called
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const args = mockCreate.mock.calls[0][0];
    expect(args.title).toBe('测试活动');

    // Dialog closes after the async onSuccess resolves
    await waitFor(() => {
      expect(screen.queryByText('创建活动', { selector: 'h2' })).not.toBeInTheDocument();
    });
  });

  it('create modal cancel flow: open dialog → click cancel → dialog closes → no mutation', () => {
    render(<ActivitiesPage />);

    fireEvent.click(screen.getByRole('button', { name: '创建活动' }));
    expect(screen.getByText('创建活动', { selector: 'h2' })).toBeInTheDocument();

    // Click the cancel button inside the dialog (not the table cancel buttons)
    const dialogCancelButton = screen.getAllByRole('button', { name: '取消' }).find(
      (btn) => btn.closest('.fixed') !== null
    );
    expect(dialogCancelButton).toBeTruthy();
    fireEvent.click(dialogCancelButton!);

    // Dialog closed
    expect(screen.queryByText('创建活动', { selector: 'h2' })).not.toBeInTheDocument();
    // No mutation called
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('edit activity flow: click edit → modal opens with prefilled data → change title → save', () => {
    render(<ActivitiesPage />);

    // Open edit for the first activity (春日交友活动)
    const editButtons = screen.getAllByRole('button', { name: '编辑' });
    fireEvent.click(editButtons[0]);

    // Edit dialog opens
    expect(screen.getByText('编辑活动')).toBeInTheDocument();

    // Title field pre-populated with existing title
    const textboxes = screen.getAllByRole('textbox');
    const titleInput = textboxes[0] as HTMLInputElement;
    expect(titleInput.value).toBe('春日交友活动');

    // Change the title
    fireEvent.change(titleInput, { target: { value: '春日交友活动 (更新版)' } });
    expect(titleInput.value).toBe('春日交友活动 (更新版)');

    // Click save
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    // Update mutation called with correct id and updated title
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const args = mockUpdate.mock.calls[0][0];
    expect(args.id).toBe('act-1');
    expect(args.title).toBe('春日交友活动 (更新版)');
  });

  it('edit modal close via X button: open edit → click X → dialog closes', () => {
    render(<ActivitiesPage />);

    const editButtons = screen.getAllByRole('button', { name: '编辑' });
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('编辑活动')).toBeInTheDocument();

    // Click the X close button
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));

    // Dialog closed
    expect(screen.queryByText('编辑活动')).not.toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('cancel activity flow: click cancel → confirm dialog → mutation called with id', () => {
    render(<ActivitiesPage />);

    // Only UPCOMING activities have a cancel button — act-1 and act-2
    const cancelButtons = screen.getAllByRole('button', { name: '取消' });
    expect(cancelButtons.length).toBe(2);

    // Cancel act-1 (first cancel button)
    fireEvent.click(cancelButtons[0]);

    expect(mockCancel).toHaveBeenCalledWith({ id: 'act-1' });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('cancel aborted flow: dismiss confirm → mutation not called', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));

    render(<ActivitiesPage />);

    const cancelButtons = screen.getAllByRole('button', { name: '取消' });
    fireEvent.click(cancelButtons[0]);

    // Mutation should NOT be called when confirm is dismissed
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('completed activity no cancel button: COMPLETED status row has no cancel option', () => {
    render(<ActivitiesPage />);

    // 3 activities total: 2 UPCOMING + 1 COMPLETED
    // Cancel buttons appear only for UPCOMING (2 buttons, not 3)
    const cancelButtons = screen.getAllByRole('button', { name: '取消' });
    expect(cancelButtons.length).toBe(2);

    // Completed activity "已结束读书会" is shown but no cancel button for it
    expect(screen.getByText('已结束读书会')).toBeInTheDocument();
    expect(screen.getByText('已结束')).toBeInTheDocument();
  });

  it('form validation: submit create form without filling required fields → mutation not called', () => {
    render(<ActivitiesPage />);

    fireEvent.click(screen.getByRole('button', { name: '创建活动' }));

    // Do NOT fill in any fields — attempt to submit
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    // Mutation should not be called (required fields missing)
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
