'use client';

const MOCK_MATCHMAKERS = [
  { id: 'M001', name: '王红娘', activeClients: 24, totalMatches: 156, successRate: 0.32, rating: 4.8, status: '在线' },
  { id: 'M002', name: '李月老', activeClients: 18, totalMatches: 98, successRate: 0.28, rating: 4.6, status: '在线' },
  { id: 'M003', name: '张媒人', activeClients: 31, totalMatches: 210, successRate: 0.35, rating: 4.9, status: '离线' },
  { id: 'M004', name: '陈红线', activeClients: 15, totalMatches: 67, successRate: 0.22, rating: 4.3, status: '在线' },
  { id: 'M005', name: '刘牵缘', activeClients: 22, totalMatches: 134, successRate: 0.30, rating: 4.7, status: '离线' },
  { id: 'M006', name: '赵鹊桥', activeClients: 28, totalMatches: 189, successRate: 0.33, rating: 4.8, status: '在线' },
];

const PERFORMANCE_METRICS = [
  { label: '活跃红娘数', value: '42' },
  { label: '本月新增配对', value: '567' },
  { label: '平均成功率', value: '29.8%' },
  { label: '平均评分', value: '4.6' },
];

export default function MatchmakersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">红娘管理</h1>

      {/* Performance overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {PERFORMANCE_METRICS.map((metric) => (
          <div key={metric.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{metric.label}</p>
            <p className="text-xl font-bold mt-1">{metric.value}</p>
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
            {MOCK_MATCHMAKERS.map((mm) => (
              <tr key={mm.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-xs">{mm.id}</td>
                <td className="px-6 py-3 font-medium">{mm.name}</td>
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
                    <span className="text-xs text-gray-600">{(mm.successRate * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="text-amber-500 font-medium">{mm.rating}</span>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                    mm.status === '在线' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-xs">{mm.status}</span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">详情</button>
                    <button className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100">编辑</button>
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
