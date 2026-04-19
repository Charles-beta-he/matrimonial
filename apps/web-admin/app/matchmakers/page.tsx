'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';

type MatchmakerItem = {
  id: string;
  userId: string;
  activeClients: number;
  totalMatches: number;
  successRate: number;
  rating: number;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; nickname: string; city: string } | null;
};

export default function MatchmakersPage() {
  const statsQuery = trpc.admin.matchmakerStats.useQuery();
  const listQuery = trpc.admin.matchmakers.useQuery({ page: 1, pageSize: 20 });
  const utils = trpc.useUtils();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<MatchmakerItem | null>(null);
  const [editOnline, setEditOnline] = useState(false);
  const [editClients, setEditClients] = useState(0);

  const detailQuery = trpc.admin.matchmakerDetail.useQuery(detailId!, {
    enabled: !!detailId,
  });

  const updateMut = trpc.admin.updateMatchmaker.useMutation({
    onSuccess: () => {
      utils.admin.matchmakers.invalidate();
      utils.admin.matchmakerStats.invalidate();
      setEditTarget(null);
    },
  });

  const handleOpenEdit = (mm: MatchmakerItem) => {
    setEditTarget(mm);
    setEditOnline(mm.isOnline);
    setEditClients(mm.activeClients);
  };

  const handleSaveEdit = () => {
    if (!editTarget) return;
    updateMut.mutate({
      id: editTarget.id,
      isOnline: editOnline,
      activeClients: editClients,
    });
  };

  const metrics = [
    {
      label: '活跃红娘数',
      value: statsQuery.data ? String(statsQuery.data.activeCount) : '—',
    },
    {
      label: '本月新增配对',
      value: statsQuery.data ? String(statsQuery.data.monthlyMatches) : '—',
    },
    {
      label: '平均成功率',
      value: statsQuery.data
        ? `${(statsQuery.data.avgSuccessRate * 100).toFixed(1)}%`
        : '—',
    },
    {
      label: '平均评分',
      value: statsQuery.data ? statsQuery.data.avgRating.toFixed(1) : '—',
    },
  ];

  const matchmakers = listQuery.data?.items ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">红娘管理</h1>

      {/* Performance overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <p className="text-sm text-gray-500">{metric.label}</p>
            <p className="text-xl font-bold mt-1">
              {statsQuery.isLoading ? '...' : metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Matchmaker list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-500">ID</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">姓名</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">活跃客户</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">累计配对</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">成功率</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">评分</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">状态</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listQuery.isLoading && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            )}
            {listQuery.isError && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-red-500">
                  加载失败：{listQuery.error.message}
                </td>
              </tr>
            )}
            {!listQuery.isLoading && !listQuery.isError && matchmakers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  暂无红娘
                </td>
              </tr>
            )}
            {matchmakers.map((mm) => (
              <tr key={mm.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-xs">{mm.id.slice(0, 8)}</td>
                <td className="px-6 py-3 font-medium">
                  {mm.user?.nickname ?? '—'}
                </td>
                <td className="px-6 py-3">{mm.activeClients}</td>
                <td className="px-6 py-3">{mm.totalMatches}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${mm.successRate * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {(mm.successRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="text-amber-500 font-medium">
                    {mm.rating.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                      mm.isOnline ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-xs">{mm.isOnline ? '在线' : '离线'}</span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailId(mm.id)}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      详情
                    </button>
                    <button
                      onClick={() => handleOpenEdit(mm)}
                      className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      编辑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {detailId && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setDetailId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">红娘详情</h2>
              <button
                onClick={() => setDetailId(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            {detailQuery.isLoading && (
              <p className="text-gray-400 text-sm">加载中...</p>
            )}
            {detailQuery.data && (() => {
              const d = detailQuery.data;
              return (
                <div className="space-y-3 text-sm">
                  <Row label="ID" value={d.id} mono />
                  <Row label="姓名" value={d.user?.nickname ?? '—'} />
                  <Row label="城市" value={d.user?.city ?? '—'} />
                  <Row label="手机" value={(d.user as any)?.phone ?? '—'} />
                  <Row label="活跃客户" value={String(d.activeClients)} />
                  <Row label="累计配对" value={String(d.totalMatches)} />
                  <Row label="成功率" value={`${(d.successRate * 100).toFixed(1)}%`} />
                  <Row label="评分" value={d.rating.toFixed(1)} />
                  <Row label="状态" value={d.isOnline ? '在线' : '离线'} />
                  <Row
                    label="注册时间"
                    value={new Date((d.user as any)?.createdAt).toLocaleDateString('zh-CN')}
                  />
                  <Row
                    label="更新时间"
                    value={new Date(d.updatedAt).toLocaleDateString('zh-CN')}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">编辑红娘</h2>
              <button
                onClick={() => setEditTarget(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{editTarget.user?.nickname}</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">在线状态</span>
                <button
                  onClick={() => setEditOnline((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editOnline ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editOnline ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  活跃客户数
                </label>
                <input
                  type="number"
                  min={0}
                  value={editClients}
                  onChange={(e) => setEditClients(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMut.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
              >
                {updateMut.isPending ? '保存中...' : '保存'}
              </button>
            </div>
            {updateMut.isError && (
              <p className="text-xs text-red-500 mt-2">{updateMut.error.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
