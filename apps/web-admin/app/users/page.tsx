'use client';

import { useEffect, useState } from 'react';
import { trpc } from '../../lib/trpc';

const VERIFICATION_LABELS: Record<string, string> = {
  L1: '未认证',
  L2: '基础认证',
  L3: '实名认证',
  L4: '视频认证',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const utils = trpc.useUtils();
  const listQuery = trpc.admin.users.useQuery({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
  });

  const banMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => utils.admin.users.invalidate(),
  });
  const unbanMutation = trpc.admin.unbanUser.useMutation({
    onSuccess: () => utils.admin.users.invalidate(),
  });

  const handleBan = (userId: string) => {
    const reason = window.prompt('封禁原因');
    if (!reason) return;
    banMutation.mutate({ userId, reason });
  };

  const handleUnban = (userId: string) => {
    unbanMutation.mutate({ userId });
  };

  const data = listQuery.data;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索昵称或手机号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
              <th className="text-left px-6 py-3 font-medium text-gray-500">状态</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">注册时间</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listQuery.isLoading && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400 text-sm">加载中...</td>
              </tr>
            )}
            {listQuery.error && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-red-600 text-sm">
                  加载失败：{listQuery.error.message}
                </td>
              </tr>
            )}
            {!listQuery.isLoading && !listQuery.error && data && data.users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400 text-sm">暂无用户</td>
              </tr>
            )}
            {data?.users.map((user) => {
              const isBanned = user.status === 'BANNED';
              const vLevel = user.verificationLevel as string;
              const highlighted = ['L3', 'L4'].includes(vLevel);
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs">{user.id.slice(-8)}</td>
                  <td className="px-6 py-3">{user.nickname}</td>
                  <td className="px-6 py-3">{user.gender === 'FEMALE' ? '女' : user.gender === 'MALE' ? '男' : '-'}</td>
                  <td className="px-6 py-3">{user.city ?? '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      highlighted ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {VERIFICATION_LABELS[vLevel] ?? vLevel}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      isBanned ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {isBanned ? '已封禁' : '正常'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button disabled className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-400 cursor-not-allowed">查看</button>
                      {isBanned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          disabled={unbanMutation.isPending}
                          className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          解封
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(user.id)}
                          disabled={banMutation.isPending}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          封禁
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">共 {data.total} 条记录</p>
          <div className="flex gap-1">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
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
