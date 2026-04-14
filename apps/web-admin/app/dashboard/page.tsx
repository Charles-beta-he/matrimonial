'use client';

import { trpc } from '../../lib/trpc';

type StatCard = {
  label: string;
  value: number | undefined;
  color: string;
};

export default function DashboardPage() {
  const statsQuery = trpc.admin.stats.useQuery();
  const activityQuery = trpc.admin.recentActivity.useQuery({ limit: 20 });

  const cards: StatCard[] = [
    { label: '总用户数', value: statsQuery.data?.totalUsers, color: 'bg-blue-50 text-blue-700' },
    { label: '今日注册', value: statsQuery.data?.todaySignups, color: 'bg-green-50 text-green-700' },
    { label: '活跃用户', value: statsQuery.data?.activeUsersWeek, color: 'bg-purple-50 text-purple-700' },
    { label: '累计匹配', value: statsQuery.data?.totalMatches, color: 'bg-rose-50 text-rose-700' },
    { label: '待审核举报', value: statsQuery.data?.pendingReports, color: 'bg-orange-50 text-orange-700' },
    { label: '待审核照片', value: statsQuery.data?.pendingPhotos, color: 'bg-amber-50 text-amber-700' },
  ];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">数据仪表盘</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statsQuery.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 w-16 bg-gray-200 rounded mb-3" />
                <div className="h-7 w-24 bg-gray-200 rounded" />
              </div>
            ))
          : statsQuery.error
          ? (
            <div className="col-span-full bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              加载失败：{statsQuery.error.message}
            </div>
          )
          : cards.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {stat.value !== undefined ? stat.value.toLocaleString('zh-CN') : '-'}
                </p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${stat.color}`}>
                  实时
                </span>
              </div>
            ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">最近动态</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {activityQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-3 flex items-start gap-4 animate-pulse">
                <div className="h-3 w-12 bg-gray-200 rounded flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
              </div>
            ))
          ) : activityQuery.error ? (
            <div className="px-6 py-4 text-sm text-red-600">加载失败：{activityQuery.error.message}</div>
          ) : !activityQuery.data || activityQuery.data.length === 0 ? (
            <div className="px-6 py-6 text-sm text-gray-400 text-center">暂无动态</div>
          ) : (
            activityQuery.data.map((item, idx) => (
              <div key={idx} className="px-6 py-3 flex items-start gap-4">
                <span className="text-xs text-gray-400 mt-0.5 w-12 flex-shrink-0">{formatTime(item.time)}</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
