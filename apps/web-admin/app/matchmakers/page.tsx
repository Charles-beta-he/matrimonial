'use client';

import { trpc } from '../../lib/trpc';

export default function MatchmakersPage() {
  const statsQuery = trpc.admin.matchmakerStats.useQuery();
  const listQuery = trpc.admin.matchmakers.useQuery({ page: 1, pageSize: 20 });

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
                      disabled
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 opacity-50 cursor-not-allowed"
                    >
                      详情
                    </button>
                    <button
                      disabled
                      className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 opacity-50 cursor-not-allowed"
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
    </div>
  );
}
