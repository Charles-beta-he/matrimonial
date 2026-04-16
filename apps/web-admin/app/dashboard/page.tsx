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
  const genderQuery = trpc.admin.genderStats.useQuery();
  const revenueQuery = trpc.admin.revenueStats.useQuery();
  const messageQuery = trpc.admin.messageStats.useQuery();
  const analyticsQuery = trpc.admin.analyticsOverview.useQuery({ days: 7 });

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

  const genderData = genderQuery.data;
  const genderRatioNum = genderData?.ratio !== 'N/A' ? parseFloat(genderData?.ratio ?? '1') : null;
  const genderAlert = genderRatioNum !== null && (genderRatioNum > 2.0 || genderRatioNum < 0.5);

  const revenueData = revenueQuery.data;
  const messageData = messageQuery.data;
  const funnelData = analyticsQuery.data?.registrationFunnel ?? [];

  // Compute max funnel count for bar widths
  const maxFunnelCount = funnelData.length > 0 ? Math.max(...funnelData.map(s => s.count)) : 1;

  // Membership breakdown max for bar widths
  const membershipMax = revenueData?.membershipBreakdown
    ? Math.max(...revenueData.membershipBreakdown.map(m => m.count), 1)
    : 1;

  const membershipColors: Record<string, string> = {
    FREE: 'bg-gray-400',
    MONTHLY: 'bg-blue-500',
    QUARTERLY: 'bg-indigo-500',
    YEARLY: 'bg-purple-600',
  };

  const membershipLabels: Record<string, string> = {
    FREE: '免费',
    MONTHLY: '月度会员',
    QUARTERLY: '季度会员',
    YEARLY: '年度会员',
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

      {/* Gender Ratio */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">性别分布</h2>
          {genderAlert && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
              比例失衡
            </span>
          )}
        </div>
        {genderQuery.isLoading ? (
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        ) : genderQuery.error ? (
          <p className="text-sm text-red-600">加载失败：{genderQuery.error.message}</p>
        ) : genderData ? (
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">男 {genderData.male.toLocaleString()} ({genderData.malePercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-pink-500" />
                <span className="text-sm text-gray-600">女 {genderData.female.toLocaleString()} ({genderData.femalePercent}%)</span>
              </div>
              <span className="text-sm text-gray-400 ml-auto">
                男女比 {genderData.ratio}
              </span>
            </div>
            {/* Two-tone progress bar */}
            <div className="w-full h-6 rounded-full overflow-hidden flex bg-gray-100">
              {genderData.total > 0 && (
                <>
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${genderData.malePercent}%` }}
                  />
                  <div
                    className="bg-pink-500 h-full transition-all duration-500"
                    style={{ width: `${genderData.femalePercent}%` }}
                  />
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">营收概览</h2>
        {revenueQuery.isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : revenueQuery.error ? (
          <p className="text-sm text-red-600">加载失败：{revenueQuery.error.message}</p>
        ) : revenueData ? (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">累计营收</p>
                <p className="text-lg font-bold text-emerald-700">{revenueData.totalRevenue.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">近30天营收</p>
                <p className="text-lg font-bold text-emerald-700">{revenueData.monthRevenue.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">ARPU</p>
                <p className="text-lg font-bold text-blue-700">{Number(revenueData.arpu).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">ARPPU</p>
                <p className="text-lg font-bold text-indigo-700">{Number(revenueData.arppu).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">付费率</p>
                <p className="text-lg font-bold text-purple-700">{revenueData.payRate}%</p>
              </div>
            </div>

            {/* Membership breakdown bar chart */}
            <h3 className="text-sm font-medium text-gray-700 mb-3">会员分布</h3>
            <div className="space-y-2">
              {revenueData.membershipBreakdown.map((m) => (
                <div key={m.plan} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0 text-right">
                    {membershipLabels[m.plan] ?? m.plan}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-500 ${membershipColors[m.plan] ?? 'bg-gray-400'}`}
                      style={{ width: `${(m.count / membershipMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-12 flex-shrink-0">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Message Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">消息活跃度（近7天）</h2>
        {messageQuery.isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : messageQuery.error ? (
          <p className="text-sm text-red-600">加载失败：{messageQuery.error.message}</p>
        ) : messageData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-sky-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">消息总量</p>
              <p className="text-lg font-bold text-sky-700">{messageData.totalMessages7d.toLocaleString()}</p>
            </div>
            <div className="bg-sky-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">活跃会话</p>
              <p className="text-lg font-bold text-sky-700">{messageData.activeConversations7d.toLocaleString()}</p>
            </div>
            <div className="bg-sky-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">有回复会话</p>
              <p className="text-lg font-bold text-sky-700">{messageData.repliedConversations7d.toLocaleString()}</p>
            </div>
            <div className="bg-teal-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">回复率</p>
              <p className="text-lg font-bold text-teal-700">{messageData.replyRate}%</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Registration Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h2 className="text-lg font-semibold mb-4">注册漏斗（近7天）</h2>
        {analyticsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : analyticsQuery.error ? (
          <p className="text-sm text-red-600">加载失败：{analyticsQuery.error.message}</p>
        ) : funnelData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无漏斗数据</p>
        ) : (
          <div className="space-y-3">
            {funnelData.map((step, idx) => {
              const prevCount = idx > 0 ? funnelData[idx - 1].count : step.count;
              const dropOff = prevCount > 0 ? (((prevCount - step.count) / prevCount) * 100).toFixed(1) : '0';
              const barWidth = maxFunnelCount > 0 ? (step.count / maxFunnelCount) * 100 : 0;

              return (
                <div key={step.step} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 flex-shrink-0 text-right">
                    第{step.step}步
                  </span>
                  <div className="flex-1 h-7 bg-gray-100 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded bg-violet-500 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                      {step.count.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                    {idx === 0 ? '--' : `流失 ${dropOff}%`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
