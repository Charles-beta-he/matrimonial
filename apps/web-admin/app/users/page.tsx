'use client';

import { useState } from 'react';

interface User {
  id: string;
  nickname: string;
  gender: string;
  city: string;
  verificationLevel: number;
  registeredAt: string;
  status: string;
}

const MOCK_USERS: User[] = [
  { id: 'U10001', nickname: '晴天小熊', gender: '女', city: '北京', verificationLevel: 3, registeredAt: '2026-03-15', status: '正常' },
  { id: 'U10002', nickname: '阳光大叔', gender: '男', city: '上海', verificationLevel: 2, registeredAt: '2026-03-14', status: '正常' },
  { id: 'U10003', nickname: '月光仙子', gender: '女', city: '广州', verificationLevel: 1, registeredAt: '2026-03-13', status: '正常' },
  { id: 'U10004', nickname: '星辰大海', gender: '男', city: '深圳', verificationLevel: 3, registeredAt: '2026-03-12', status: '已封禁' },
  { id: 'U10005', nickname: '甜蜜花园', gender: '女', city: '杭州', verificationLevel: 2, registeredAt: '2026-03-11', status: '正常' },
  { id: 'U10006', nickname: '远方旅人', gender: '男', city: '成都', verificationLevel: 0, registeredAt: '2026-03-10', status: '正常' },
  { id: 'U10007', nickname: '温柔以待', gender: '女', city: '南京', verificationLevel: 1, registeredAt: '2026-03-09', status: '正常' },
  { id: 'U10008', nickname: '追风少年', gender: '男', city: '武汉', verificationLevel: 2, registeredAt: '2026-03-08', status: '正常' },
  { id: 'U10009', nickname: '樱花落尽', gender: '女', city: '西安', verificationLevel: 3, registeredAt: '2026-03-07', status: '正常' },
  { id: 'U10010', nickname: '独行侠客', gender: '男', city: '重庆', verificationLevel: 0, registeredAt: '2026-03-06', status: '已封禁' },
];

const VERIFICATION_LABELS = ['未认证', '基础认证', '实名认证', '视频认证'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = MOCK_USERS.filter(
    (u) =>
      u.nickname.includes(search) ||
      u.id.includes(search) ||
      u.city.includes(search)
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索用户 ID、昵称或城市..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-500">ID</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">昵称</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">性别</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">城市</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">认证等级</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">注册时间</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-xs">{user.id}</td>
                <td className="px-6 py-3">{user.nickname}</td>
                <td className="px-6 py-3">{user.gender}</td>
                <td className="px-6 py-3">{user.city}</td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    user.verificationLevel >= 2 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {VERIFICATION_LABELS[user.verificationLevel]}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">{user.registeredAt}</td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">查看</button>
                    <button className={`text-xs px-2 py-1 rounded ${
                      user.status === '已封禁'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}>
                      {user.status === '已封禁' ? '解封' : '封禁'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">共 {filtered.length} 条记录</p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded text-sm ${
                  p === page
                    ? 'bg-rose-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
