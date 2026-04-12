'use client';

import { useState } from 'react';

type TabKey = 'photos' | 'text' | 'reports';

const PENDING_PHOTOS = [
  { id: 'P001', userId: 'U10001', url: '/placeholder/photo1.jpg', uploadedAt: '2026-04-12 10:15' },
  { id: 'P002', userId: 'U10003', url: '/placeholder/photo2.jpg', uploadedAt: '2026-04-12 10:08' },
  { id: 'P003', userId: 'U10005', url: '/placeholder/photo3.jpg', uploadedAt: '2026-04-12 09:55' },
  { id: 'P004', userId: 'U10007', url: '/placeholder/photo4.jpg', uploadedAt: '2026-04-12 09:42' },
  { id: 'P005', userId: 'U10002', url: '/placeholder/photo5.jpg', uploadedAt: '2026-04-12 09:30' },
  { id: 'P006', userId: 'U10009', url: '/placeholder/photo6.jpg', uploadedAt: '2026-04-12 09:18' },
];

const REPORTS = [
  { id: 'R001', reporter: 'U10001', reported: 'U10004', reason: '发布不当内容', status: '待处理', createdAt: '2026-04-12 09:00' },
  { id: 'R002', reporter: 'U10003', reported: 'U10006', reason: '疑似诈骗', status: '待处理', createdAt: '2026-04-11 22:30' },
  { id: 'R003', reporter: 'U10005', reported: 'U10010', reason: '骚扰信息', status: '处理中', createdAt: '2026-04-11 18:15' },
  { id: 'R004', reporter: 'U10002', reported: 'U10008', reason: '虚假资料', status: '已完成', createdAt: '2026-04-11 14:00' },
  { id: 'R005', reporter: 'U10007', reported: 'U10004', reason: '发布广告', status: '待处理', createdAt: '2026-04-11 10:45' },
];

const TEXT_QUEUE = [
  { id: 'T001', userId: 'U10004', text: '加我微信号 abc123456', context: '消息', status: '待审核' },
  { id: 'T002', userId: 'U10006', text: '投资理财保证收益翻倍', context: '个人简介', status: '待审核' },
  { id: 'T003', userId: 'U10010', text: '可以借点钱给我吗急用', context: '消息', status: '待审核' },
  { id: 'T004', userId: 'U10008', text: '扫码领取红包链接', context: '消息', status: '待审核' },
];

export default function AuditPage() {
  const [tab, setTab] = useState<TabKey>('photos');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">内容审核</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          ['photos', '照片审核'],
          ['text', '文本审核'],
          ['reports', '举报处理'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Photo audit */}
      {tab === 'photos' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">共 {PENDING_PHOTOS.length} 张照片待审核</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PENDING_PHOTOS.map((photo) => (
              <div key={photo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  {photo.id} - {photo.userId}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500 mb-2">上传时间: {photo.uploadedAt}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">通过</button>
                    <button className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">拒绝</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text audit */}
      {tab === 'text' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-500">ID</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">用户</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">内容</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">场景</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TEXT_QUEUE.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs">{item.id}</td>
                  <td className="px-6 py-3">{item.userId}</td>
                  <td className="px-6 py-3 text-red-600 font-medium">{item.text}</td>
                  <td className="px-6 py-3">{item.context}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">通过</button>
                      <button className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">拒绝</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-500">ID</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">举报人</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">被举报人</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">原因</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">状态</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">时间</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {REPORTS.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs">{report.id}</td>
                  <td className="px-6 py-3">{report.reporter}</td>
                  <td className="px-6 py-3">{report.reported}</td>
                  <td className="px-6 py-3">{report.reason}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      report.status === '待处理' ? 'bg-orange-50 text-orange-700' :
                      report.status === '处理中' ? 'bg-blue-50 text-blue-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{report.createdAt}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">查看</button>
                      {report.status !== '已完成' && (
                        <button className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100">处理</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
