'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: '全部用户' },
  { value: 'ACTIVE', label: '活跃用户 (7日内活跃)' },
  { value: 'INACTIVE', label: '沉默用户 (30日未活跃)' },
  { value: 'MALE', label: '男性用户' },
  { value: 'FEMALE', label: '女性用户' },
  { value: 'VERIFIED', label: '已认证用户' },
  { value: 'PREMIUM', label: '付费会员' },
] as const;

type AudienceValue = (typeof AUDIENCE_OPTIONS)[number]['value'];

const AUDIENCE_LABEL: Record<string, string> = Object.fromEntries(
  AUDIENCE_OPTIONS.map((o) => [o.value, o.label]),
);

export default function PushPage() {
  const utils = trpc.useUtils();
  const historyQuery = trpc.admin.listPushCampaigns.useQuery({
    page: 1,
    pageSize: 20,
  });

  const sendMutation = trpc.admin.sendPushCampaign.useMutation({
    onSuccess: async () => {
      await utils.admin.listPushCampaigns.invalidate();
    },
  });

  const createMutation = trpc.admin.createPushCampaign.useMutation({
    onSuccess: async (created, variables) => {
      if (!variables.scheduleAt) {
        // immediate send
        sendMutation.mutate({ id: created.id });
      }
      setTitle('');
      setBody('');
      setAudience('ALL');
      setSchedule('');
      await utils.admin.listPushCampaigns.invalidate();
    },
  });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AudienceValue>('ALL');
  const [schedule, setSchedule] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !body) return;
    createMutation.mutate({
      title,
      body,
      audience,
      scheduleAt: schedule ? new Date(schedule) : undefined,
    });
  }

  const campaigns = historyQuery.data?.items ?? [];
  const submitting = createMutation.isPending || sendMutation.isPending;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">推送管理</h1>

      {/* Create push form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">创建推送</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="推送标题..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容
            </label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="推送内容..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目标受众
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AudienceValue)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              定时发送 (留空立即发送)
            </label>
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          {(createMutation.error || sendMutation.error) && (
            <p className="text-sm text-red-600">
              {createMutation.error?.message ?? sendMutation.error?.message}
            </p>
          )}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {submitting ? '处理中...' : schedule ? '定时发送' : '立即发送'}
            </button>
          </div>
        </form>
      </div>

      {/* Push history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">发送历史</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-500">标题</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">内容</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">受众</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">发送时间</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">送达</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">打开</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">打开率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {historyQuery.isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {historyQuery.isError && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-red-500">
                  加载失败：{historyQuery.error.message}
                </td>
              </tr>
            )}
            {!historyQuery.isLoading &&
              !historyQuery.isError &&
              campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    暂无记录
                  </td>
                </tr>
              )}
            {campaigns.map((push) => (
              <tr key={push.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{push.title}</td>
                <td className="px-6 py-3 text-gray-500 max-w-xs truncate">
                  {push.body}
                </td>
                <td className="px-6 py-3">
                  {AUDIENCE_LABEL[push.audience] ?? push.audience}
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {push.sentAt
                    ? new Date(push.sentAt).toLocaleString()
                    : '未发送'}
                </td>
                <td className="px-6 py-3">{push.delivered.toLocaleString()}</td>
                <td className="px-6 py-3">{push.opened.toLocaleString()}</td>
                <td className="px-6 py-3">
                  <span className="font-medium text-rose-600">
                    {push.delivered > 0
                      ? `${((push.opened / push.delivered) * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
