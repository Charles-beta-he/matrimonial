'use client';

import { useState } from 'react';

const PUSH_HISTORY = [
  { id: 'N001', title: '情人节特别活动', body: '甜蜜情人节,为你推荐心动对象', audience: '全部用户', sentAt: '2026-04-10 10:00', delivered: 12340, opened: 3456 },
  { id: 'N002', title: '新功能上线', body: '视频通话功能已上线,快来体验', audience: '活跃用户', sentAt: '2026-04-08 15:00', delivered: 8920, opened: 2100 },
  { id: 'N003', title: '周末活动提醒', body: '本周末线下交友派对即将开始', audience: '已报名用户', sentAt: '2026-04-05 18:00', delivered: 456, opened: 289 },
  { id: 'N004', title: '安全提醒', body: '请注意保护个人隐私信息', audience: '全部用户', sentAt: '2026-04-01 09:00', delivered: 15670, opened: 4230 },
  { id: 'N005', title: '匹配成功通知', body: '有人喜欢了你,快去查看', audience: '有新匹配用户', sentAt: '2026-03-30 12:00', delivered: 2340, opened: 1890 },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: '全部用户' },
  { value: 'active', label: '活跃用户 (30日内登录)' },
  { value: 'inactive', label: '沉默用户 (30日未登录)' },
  { value: 'male', label: '男性用户' },
  { value: 'female', label: '女性用户' },
  { value: 'verified', label: '已认证用户' },
  { value: 'premium', label: '付费会员' },
];

export default function PushPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [schedule, setSchedule] = useState('');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">推送管理</h1>

      {/* Create push form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">创建推送</h2>
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="推送标题..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="推送内容..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标受众</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">定时发送 (留空立即发送)</label>
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div className="pt-2">
            <button className="px-6 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors">
              {schedule ? '定时发送' : '立即发送'}
            </button>
          </div>
        </div>
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
            {PUSH_HISTORY.map((push) => (
              <tr key={push.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{push.title}</td>
                <td className="px-6 py-3 text-gray-500 max-w-xs truncate">{push.body}</td>
                <td className="px-6 py-3">{push.audience}</td>
                <td className="px-6 py-3 text-gray-500">{push.sentAt}</td>
                <td className="px-6 py-3">{push.delivered.toLocaleString()}</td>
                <td className="px-6 py-3">{push.opened.toLocaleString()}</td>
                <td className="px-6 py-3">
                  <span className="font-medium text-rose-600">
                    {((push.opened / push.delivered) * 100).toFixed(1)}%
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
