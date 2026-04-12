'use client';

const MOCK_ACTIVITIES = [
  { id: 'A001', title: '周末线下交友派对', category: '线下活动', time: '2026-04-19 14:00', participants: 45, maxParticipants: 60, status: '报名中' },
  { id: 'A002', title: '七夕特别配对活动', category: '节日活动', time: '2026-08-22 19:00', participants: 0, maxParticipants: 100, status: '未开始' },
  { id: 'A003', title: '城市漫步 - 上海站', category: '线下活动', time: '2026-04-13 10:00', participants: 28, maxParticipants: 30, status: '报名中' },
  { id: 'A004', title: '线上脱口秀之夜', category: '线上活动', time: '2026-04-14 20:00', participants: 156, maxParticipants: 200, status: '报名中' },
  { id: 'A005', title: '春季踏青烧烤活动', category: '线下活动', time: '2026-04-06 09:00', participants: 40, maxParticipants: 40, status: '已结束' },
  { id: 'A006', title: '读书会交友沙龙', category: '线下活动', time: '2026-04-20 15:00', participants: 12, maxParticipants: 25, status: '报名中' },
];

export default function ActivitiesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">活动管理</h1>
        <button className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors">
          创建活动
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-500">活动名称</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">分类</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">时间</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">参与人数</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">状态</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MOCK_ACTIVITIES.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{activity.title}</td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    activity.category === '线下活动' ? 'bg-blue-50 text-blue-700' :
                    activity.category === '线上活动' ? 'bg-purple-50 text-purple-700' :
                    'bg-rose-50 text-rose-700'
                  }`}>
                    {activity.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">{activity.time}</td>
                <td className="px-6 py-3">
                  <span className="text-gray-700">{activity.participants}</span>
                  <span className="text-gray-400">/{activity.maxParticipants}</span>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    activity.status === '报名中' ? 'bg-green-50 text-green-700' :
                    activity.status === '已结束' ? 'bg-gray-100 text-gray-500' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {activity.status}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">编辑</button>
                    {activity.status !== '已结束' && (
                      <button className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">取消</button>
                    )}
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
