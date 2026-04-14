'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';

const CATEGORY_OPTIONS = [
  '线下活动',
  '线上活动',
  '节日活动',
  '读书会',
  '桌游',
];

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: '即将开始',
  ONGOING: '进行中',
  COMPLETED: '已结束',
  CANCELLED: '已取消',
};

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-amber-50 text-amber-700',
  ONGOING: 'bg-green-50 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-50 text-red-700',
};

type DialogMode = { kind: 'create' } | { kind: 'edit'; id: string };

interface FormState {
  title: string;
  category: string;
  startTime: string;
  location: string;
  maxParticipants: string;
  description: string;
}

const emptyForm: FormState = {
  title: '',
  category: CATEGORY_OPTIONS[0],
  startTime: '',
  location: '',
  maxParticipants: '20',
  description: '',
};

export default function ActivitiesPage() {
  const utils = trpc.useUtils();
  const listQuery = trpc.activity.list.useQuery({});
  const createMutation = trpc.admin.createActivity.useMutation({
    onSuccess: async () => {
      await utils.activity.list.invalidate();
      closeDialog();
    },
  });
  const updateMutation = trpc.admin.updateActivity.useMutation({
    onSuccess: async () => {
      await utils.activity.list.invalidate();
      closeDialog();
    },
  });
  const cancelMutation = trpc.admin.cancelActivity.useMutation({
    onSuccess: async () => {
      await utils.activity.list.invalidate();
    },
  });

  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  function openCreate() {
    setForm(emptyForm);
    setDialog({ kind: 'create' });
  }

  function openEdit(activity: {
    id: string;
    title: string;
    category: string;
    startTime: string | Date;
    location: string;
    maxMale: number;
    maxFemale: number;
    description?: string | null;
  }) {
    const d = new Date(activity.startTime);
    // format as yyyy-MM-ddTHH:mm for datetime-local
    const pad = (n: number) => n.toString().padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setForm({
      title: activity.title,
      category: activity.category,
      startTime: local,
      location: activity.location,
      maxParticipants: String(activity.maxMale + activity.maxFemale),
      description: activity.description ?? '',
    });
    setDialog({ kind: 'edit', id: activity.id });
  }

  function closeDialog() {
    setDialog(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dialog) return;
    const maxParticipants = Number.parseInt(form.maxParticipants, 10);
    if (!form.title || !form.startTime || !form.location || Number.isNaN(maxParticipants)) {
      return;
    }
    const startTime = new Date(form.startTime);
    if (dialog.kind === 'create') {
      createMutation.mutate({
        title: form.title,
        category: form.category,
        startTime,
        location: form.location,
        description: form.description,
        maxParticipants,
      });
    } else {
      updateMutation.mutate({
        id: dialog.id,
        title: form.title,
        category: form.category,
        startTime,
        location: form.location,
        description: form.description,
      });
    }
  }

  function handleCancel(id: string) {
    if (typeof window !== 'undefined' && !window.confirm('确定取消该活动？')) return;
    cancelMutation.mutate({ id });
  }

  const activities = listQuery.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">活动管理</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
        >
          创建活动
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-500">活动名称</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">分类</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">时间</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">参与人数</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">状态</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {listQuery.isError && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-red-500">
                  加载失败：{listQuery.error.message}
                </td>
              </tr>
            )}
            {!listQuery.isLoading && !listQuery.isError && activities.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  暂无活动
                </td>
              </tr>
            )}
            {activities.map((activity) => {
              const max = activity.maxMale + activity.maxFemale;
              const statusKey = activity.status as keyof typeof STATUS_LABEL;
              return (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{activity.title}</td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {activity.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(activity.startTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-gray-700">{activity.signupCount}</span>
                    <span className="text-gray-400">/{max}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_STYLE[statusKey] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {STATUS_LABEL[statusKey] ?? activity.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(activity)}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        编辑
                      </button>
                      {activity.status !== 'COMPLETED' && activity.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancel(activity.id)}
                          disabled={cancelMutation.isPending}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {dialog.kind === 'create' ? '创建活动' : '编辑活动'}
              </h2>
              <button
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                <input
                  type="datetime-local"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大人数</label>
                <input
                  type="number"
                  required
                  min={2}
                  disabled={dialog.kind === 'edit'}
                  value={form.maxParticipants}
                  onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {dialog.kind === 'edit' && (
                  <p className="text-xs text-gray-400 mt-1">编辑时不支持修改人数</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              {(createMutation.error || updateMutation.error) && (
                <p className="text-sm text-red-600">
                  {createMutation.error?.message ?? updateMutation.error?.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {dialog.kind === 'create' ? '创建' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
