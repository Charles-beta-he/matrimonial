const STATS = [
  { label: '总用户数', value: '128,456', change: '+2.3%', color: 'bg-blue-50 text-blue-700' },
  { label: '今日注册', value: '342', change: '+12.5%', color: 'bg-green-50 text-green-700' },
  { label: '活跃用户', value: '45,230', change: '+5.1%', color: 'bg-purple-50 text-purple-700' },
  { label: '今日匹配', value: '1,892', change: '+8.7%', color: 'bg-rose-50 text-rose-700' },
  { label: '待审核举报', value: '23', change: '-15.0%', color: 'bg-orange-50 text-orange-700' },
  { label: '待审核照片', value: '156', change: '+3.2%', color: 'bg-amber-50 text-amber-700' },
];

const RECENT_ACTIVITY = [
  { time: '14:32', action: '新用户注册', detail: '用户 #128456 完成手机号注册' },
  { time: '14:28', action: '举报处理', detail: '管理员已处理用户 #98321 的举报' },
  { time: '14:15', action: '照片审核', detail: '批量通过 12 张用户照片' },
  { time: '14:02', action: '活动创建', detail: '"周末线下交友派对" 活动已发布' },
  { time: '13:45', action: '红娘认证', detail: '红娘 #567 通过资质审核' },
  { time: '13:30', action: '推送发送', detail: '"情人节特别活动" 推送已送达 12,340 用户' },
  { time: '13:12', action: '用户封禁', detail: '用户 #45678 因违规被封禁 7 天' },
  { time: '12:58', action: '匹配成功', detail: '今日新增 45 对互相喜欢的匹配' },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">数据仪表盘</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${stat.color}`}>
              {stat.change}
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
          {RECENT_ACTIVITY.map((item, idx) => (
            <div key={idx} className="px-6 py-3 flex items-start gap-4">
              <span className="text-xs text-gray-400 mt-0.5 w-12 flex-shrink-0">{item.time}</span>
              <div>
                <p className="text-sm font-medium text-gray-700">{item.action}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
