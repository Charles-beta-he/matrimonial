'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';

type TabKey = 'photos' | 'text' | 'reports';

const REASON_LABELS: Record<string, string> = {
  FAKE_PROFILE: '虚假资料',
  HARASSMENT: '骚扰',
  SCAM: '诈骗',
  INAPPROPRIATE_CONTENT: '不当内容',
  OTHER: '其他',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  REVIEWING: '处理中',
  RESOLVED: '已处理',
  DISMISSED: '已驳回',
};

const CONTEXT_LABELS: Record<string, string> = {
  MESSAGE: '消息',
  BIO: '简介',
  NICKNAME: '昵称',
};

function formatDateTime(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

export default function AuditPage() {
  const [tab, setTab] = useState<TabKey>('photos');
  const utils = trpc.useUtils();

  const photosQuery = trpc.admin.pendingPhotos.useQuery(undefined, {
    enabled: tab === 'photos',
  });
  const textQuery = trpc.admin.pendingTextAudits.useQuery(undefined, {
    enabled: tab === 'text',
  });
  const reportsQuery = trpc.admin.pendingReports.useQuery(undefined, {
    enabled: tab === 'reports',
  });

  const approvePhoto = trpc.admin.approvePhoto.useMutation({
    onSuccess: () => utils.admin.pendingPhotos.invalidate(),
  });
  const rejectPhoto = trpc.admin.rejectPhoto.useMutation({
    onSuccess: () => utils.admin.pendingPhotos.invalidate(),
  });
  const approveText = trpc.admin.approveText.useMutation({
    onSuccess: () => utils.admin.pendingTextAudits.invalidate(),
  });
  const rejectText = trpc.admin.rejectText.useMutation({
    onSuccess: () => utils.admin.pendingTextAudits.invalidate(),
  });
  const resolveReport = trpc.admin.resolveReport.useMutation({
    onSuccess: () => utils.admin.pendingReports.invalidate(),
  });

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
          {photosQuery.isLoading && <p className="text-sm text-gray-400">加载中...</p>}
          {photosQuery.error && <p className="text-sm text-red-600">加载失败：{photosQuery.error.message}</p>}
          {photosQuery.data && photosQuery.data.length === 0 && (
            <p className="text-sm text-gray-400">暂无待审核照片</p>
          )}
          {photosQuery.data && photosQuery.data.length > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-4">共 {photosQuery.data.length} 张照片待审核</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photosQuery.data.map((photo) => (
                  <div key={photo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.id} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-700 font-medium truncate">{photo.user.nickname}</p>
                      <p className="text-xs text-gray-500 mb-2">上传时间: {formatDateTime(photo.createdAt)}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approvePhoto.mutate({ photoId: photo.id })}
                          disabled={approvePhoto.isPending}
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => rejectPhoto.mutate({ photoId: photo.id })}
                          disabled={rejectPhoto.isPending}
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
                <th className="text-left px-6 py-3 font-medium text-gray-500">时间</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {textQuery.isLoading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">加载中...</td></tr>
              )}
              {textQuery.error && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-red-600">加载失败：{textQuery.error.message}</td></tr>
              )}
              {textQuery.data && textQuery.data.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">暂无待审核文本</td></tr>
              )}
              {textQuery.data?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs">{item.id.slice(-6)}</td>
                  <td className="px-6 py-3">{item.user.nickname}</td>
                  <td className="px-6 py-3 text-red-600 font-medium">{item.text}</td>
                  <td className="px-6 py-3">{CONTEXT_LABELS[item.context] ?? item.context}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDateTime(item.createdAt)}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveText.mutate({ id: item.id })}
                        disabled={approveText.isPending}
                        className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => rejectText.mutate({ id: item.id })}
                        disabled={rejectText.isPending}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        拒绝
                      </button>
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
              {reportsQuery.isLoading && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">加载中...</td></tr>
              )}
              {reportsQuery.error && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-red-600">加载失败：{reportsQuery.error.message}</td></tr>
              )}
              {reportsQuery.data && reportsQuery.data.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">暂无待处理举报</td></tr>
              )}
              {reportsQuery.data?.map((report) => {
                const statusStr = report.status as string;
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs">{report.id.slice(-6)}</td>
                    <td className="px-6 py-3">{report.reporter.nickname}</td>
                    <td className="px-6 py-3">{report.reported.nickname}</td>
                    <td className="px-6 py-3">{REASON_LABELS[report.reason as string] ?? report.reason}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        statusStr === 'PENDING' ? 'bg-orange-50 text-orange-700' :
                        statusStr === 'REVIEWING' ? 'bg-blue-50 text-blue-700' :
                        'bg-green-50 text-green-700'
                      }`}>
                        {STATUS_LABELS[statusStr] ?? statusStr}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDateTime(report.createdAt)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveReport.mutate({ reportId: report.id, action: 'RESOLVED' })}
                          disabled={resolveReport.isPending}
                          className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => resolveReport.mutate({ reportId: report.id, action: 'DISMISSED' })}
                          disabled={resolveReport.isPending}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          驳回
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
