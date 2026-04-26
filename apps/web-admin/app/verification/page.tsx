'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';

const LEVEL_LABELS: Record<string, string> = {
  L3: 'L3 人脸认证',
  L4: 'L4 学历认证',
};

const DEGREE_LABELS: Record<string, string> = {
  HIGH_SCHOOL: '高中',
  ASSOCIATE: '大专',
  BACHELOR: '本科',
  MASTER: '硕士',
  PHD: '博士',
};

function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', { hour12: false });
}

export default function VerificationPage() {
  const utils = trpc.useUtils();
  const listQuery = trpc.verification.listPending.useQuery();

  const approveMutation = trpc.verification.approve.useMutation({
    onSuccess: () => utils.verification.listPending.invalidate(),
  });
  const rejectMutation = trpc.verification.reject.useMutation({
    onSuccess: () => {
      utils.verification.listPending.invalidate();
      setRejectDialog(null);
    },
  });

  const [rejectDialog, setRejectDialog] = useState<{ requestId: string; nickname: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function openRejectDialog(requestId: string, nickname: string) {
    setRejectReason('');
    setRejectDialog({ requestId, nickname });
  }

  function submitReject() {
    if (!rejectDialog || !rejectReason.trim()) return;
    rejectMutation.mutate({ requestId: rejectDialog.requestId, reason: rejectReason.trim() });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">实名认证审核</h1>

      {listQuery.isLoading && <p className="text-sm text-gray-400">加载中...</p>}
      {listQuery.error && (
        <p className="text-sm text-red-600">加载失败：{listQuery.error.message}</p>
      )}
      {listQuery.data && listQuery.data.length === 0 && (
        <p className="text-sm text-gray-400">暂无待审核的认证申请</p>
      )}

      {listQuery.data && listQuery.data.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-4">共 {listQuery.data.length} 条待审核</p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">用户</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">级别</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">提交时间</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">材料预览</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listQuery.data.map((req) => {
                  const payload = req.payload as Record<string, unknown>;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {req.user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={req.user.avatarUrl}
                              alt={req.user.nickname ?? ''}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-medium flex-shrink-0">
                              {(req.user.nickname ?? '?')[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{req.user.nickname}</p>
                            <p className="text-xs text-gray-400">{req.user.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          req.level === 'L3'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {LEVEL_LABELS[req.level] ?? req.level}
                        </span>
                      </td>

                      {/* Submitted at */}
                      <td className="px-6 py-4 text-gray-500">{formatDateTime(req.submittedAt)}</td>

                      {/* Payload preview */}
                      <td className="px-6 py-4">
                        {req.level === 'L3' && typeof payload.faceImageUrl === 'string' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={payload.faceImageUrl}
                            alt="face"
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                          />
                        ) : req.level === 'L4' ? (
                          <div className="text-xs text-gray-700 space-y-0.5">
                            <p><span className="text-gray-400">学校：</span>{String(payload.school ?? '—')}</p>
                            <p><span className="text-gray-400">学历：</span>{DEGREE_LABELS[String(payload.degree ?? '')] ?? String(payload.degree ?? '—')}</p>
                            <p><span className="text-gray-400">毕业年：</span>{String(payload.year ?? '—')}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveMutation.mutate({ requestId: req.id })}
                            disabled={approveMutation.isPending}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => openRejectDialog(req.id, req.user.nickname ?? req.user.id)}
                            disabled={rejectMutation.isPending}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            拒绝
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Reject dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">拒绝认证申请</h3>
            <p className="text-sm text-gray-500 mb-4">
              用户：<span className="font-medium text-gray-700">{rejectDialog.nickname}</span>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">拒绝原因</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="请填写拒绝原因，将通知用户..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
            {rejectMutation.error && (
              <p className="mt-2 text-xs text-red-600">{rejectMutation.error.message}</p>
            )}
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setRejectDialog(null)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? '提交中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
