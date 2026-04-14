'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../lib/trpc';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sendCode = trpc.auth.sendCode.useMutation({
    onSuccess: () => {
      setError(null);
      setStep('code');
    },
    onError: (err) => setError(err.message || '发送验证码失败'),
  });

  const verifyCode = trpc.auth.verifyCode.useMutation({
    onSuccess: (data) => {
      if (data.user.role !== 'ADMIN') {
        setError('无权限');
        return;
      }
      localStorage.setItem('adminToken', data.accessToken);
      document.cookie = `adminToken=${data.accessToken}; path=/; max-age=2592000`;
      router.push('/dashboard');
    },
    onError: (err) => setError(err.message || '验证失败'),
  });

  const loading = sendCode.isPending || verifyCode.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === 'phone') {
      sendCode.mutate({ phone });
    } else {
      verifyCode.mutate({ phone, code });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-rose-100">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-rose-600">Matrimonial</h1>
          <p className="text-sm text-gray-500 mt-1">运营管理后台登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={step === 'code' || loading}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none disabled:bg-gray-50"
              placeholder="请输入管理员手机号"
            />
          </div>

          {step === 'code' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                placeholder="请输入验证码"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : step === 'phone' ? '发送验证码' : '登录'}
          </button>

          {step === 'code' && (
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              disabled={loading}
              className="w-full text-sm text-gray-500 hover:text-rose-600"
            >
              返回修改手机号
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
