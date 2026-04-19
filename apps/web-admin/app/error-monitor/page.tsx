'use client';

import { useState } from 'react';
import { trpc } from '../../lib/trpc';

function formatTime(d: Date | string) {
  const dt = d instanceof Date ? d : new Date(d as string);
  return dt.toLocaleString('zh-CN', { hour12: false });
}

export default function ErrorMonitorPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: errors, isLoading } = trpc.admin.errorEvents.useQuery({ limit: 50 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">错误监控</h1>
          <p className="text-sm text-gray-500 mt-1">最近50条客户端错误，含操作路径回放</p>
        </div>
        <div className="text-sm text-gray-500">
          共 <span className="font-semibold text-gray-900">{errors?.length ?? 0}</span> 条
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      )}

      {!isLoading && errors?.length === 0 && (
        <div className="text-center py-16 text-gray-400">暂无错误记录</div>
      )}

      <div className="space-y-3">
        {errors?.map((err) => (
          <div key={err.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
            >
              <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${err.fatal ? 'bg-red-500' : 'bg-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${err.fatal ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {err.fatal ? '致命错误' : err.errorType}
                  </span>
                  {err.userId && (
                    <span className="text-xs text-gray-400">用户: {err.userId.slice(0, 8)}...</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">{formatTime(err.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 mt-1 font-mono truncate">{err.message}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expandedId === err.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedId === err.id && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    操作回放 — 崩溃前最后 {err.breadcrumbs.length} 步
                  </h3>
                  {err.breadcrumbs.length === 0 ? (
                    <p className="text-sm text-gray-400">无操作记录</p>
                  ) : (
                    <ol className="space-y-1.5">
                      {err.breadcrumbs.map((bc: any, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-mono text-gray-700">{bc.action}</span>
                          {bc.screen && <span className="text-gray-400">@{bc.screen}</span>}
                          <span className="text-gray-300 text-xs ml-auto">
                            {bc.ts ? new Date(bc.ts).toLocaleTimeString('zh-CN', { hour12: false }) : ''}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {err.message && (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">错误信息</h3>
                    <pre className="text-xs font-mono bg-gray-50 rounded-lg p-3 overflow-auto max-h-40 text-gray-700 whitespace-pre-wrap break-all">
                      {err.message}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
