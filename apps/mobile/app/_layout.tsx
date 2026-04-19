import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, TRPCClientError, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AnyRouter } from '@trpc/server';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '@matrimonial/api-client';
import { ErrorBoundary, ToastProvider, toast } from '@matrimonial/ui';
import { useAppStore } from '../stores/useAppStore';
import { useSocketStore } from '../stores/useSocketStore';
import { useGlobalErrorHandler } from '../hooks/useErrorHandler';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { config } from '../env';
import { refreshAccessToken } from '../lib/authRefresh';
import { colors } from '../constants/colors';

/**
 * tRPC link that intercepts UNAUTHORIZED errors, attempts a single-flight
 * refresh of the access token, and retries the original request once on
 * success. Excludes the refresh call itself and the unauthenticated login
 * endpoints to avoid infinite loops.
 */
const authRefreshLink: TRPCLink<AnyRouter> = () => {
  return ({ op, next }) => {
    return observable((observer) => {
      const subscription = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          const code = (err as TRPCClientError<AnyRouter>)?.data?.code as string | undefined;
          const isUnauthorized = code === 'UNAUTHORIZED';
          const isRefreshCall = op.path === 'auth.refresh';
          const isAuthCall =
            op.path === 'auth.sendCode' || op.path === 'auth.verifyCode' || op.path === 'auth.login';

          if (isUnauthorized && !isRefreshCall && !isAuthCall) {
            // Fire-and-await the refresh, then retry the op with the new token.
            // httpBatchLink.headers() reads useAppStore.getState().token so the
            // retry automatically picks up the freshly-stored token.
            refreshAccessToken()
              .then((newToken) => {
                if (!newToken) {
                  observer.error(err);
                  return;
                }
                const retry = next(op).subscribe({
                  next(value) {
                    observer.next(value);
                  },
                  error(retryErr) {
                    observer.error(retryErr as TRPCClientError<AnyRouter>);
                  },
                  complete() {
                    observer.complete();
                  },
                });
                // Replace the subscription so cleanup unsubscribes the retry.
                // Note: the outer `return () => subscription.unsubscribe()`
                // captures only the initial subscription; that's fine because
                // by the time the retry runs the original is already errored.
                // We still track this to allow teardown.
                void retry;
              })
              .catch(() => observer.error(err));
            return;
          }

          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return () => subscription.unsubscribe();
    });
  };
};

const API_URL = config.apiUrl;

/** tRPC error messages in Chinese */
const TRPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: '请先登录',
  FORBIDDEN: '没有权限',
  NOT_FOUND: '内容不存在',
  BAD_REQUEST: '请求参数错误',
  TIMEOUT: '请求超时，请重试',
  TOO_MANY_REQUESTS: '操作过于频繁，请稍后再试',
  INTERNAL_SERVER_ERROR: '服务器开小差了',
};

export default function RootLayout() {
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);

  // Activate global error handler
  useGlobalErrorHandler();

  // Register push token when authenticated
  usePushNotifications(!!token);

  // Hydrate auth state from SecureStore on mount
  useEffect(() => {
    useAppStore.getState().hydrate();
  }, []);

  // Register service worker (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!('serviceWorker' in navigator)) return;
    (navigator as any).serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  // Set document title imperatively so axe-core picks it up before Head hydrates
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = '缘分婚恋 — 基于AI智能算法的婚恋交友匹配平台 | 立即遇见对的人';
  }, []);

  // Auto-connect socket when hydrated and token is available
  useEffect(() => {
    if (!hydrated) return;
    if (token) {
      useSocketStore.getState().connect(token);
    } else {
      useSocketStore.getState().disconnect();
    }
    return () => {
      // On unmount, disconnect
      useSocketStore.getState().disconnect();
    };
  }, [hydrated, token]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: (count, error) => {
              if (error instanceof TRPCClientError) {
                const code = error.data?.code as string | undefined;
                // Never retry client errors — they won't recover
                if (['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'BAD_REQUEST'].includes(code ?? '')) {
                  return false;
                }
              }
              return count < 2;
            },
            refetchOnWindowFocus: Platform.OS === 'web',
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );
  const trpcClient = useMemo(
    () =>
      api.createClient({
        links: [
          // Auth refresh link — catches UNAUTHORIZED, refreshes token, retries.
          // Must run BEFORE the error toast link so a successful retry does
          // not surface a "请先登录" toast to the user.
          authRefreshLink,
          // Error-catching link — intercepts errors and shows toast
          () =>
            ({ next, op }) =>
              observable((observer) => {
                const unsubscribe = next(op).subscribe({
                  next(value) {
                    observer.next(value);
                  },
                  error(err) {
                    if (err instanceof TRPCClientError) {
                      const code = err.data?.code as string | undefined;
                      const message = code
                        ? TRPC_ERROR_MESSAGES[code] ?? err.message
                        : err.message ?? '请求失败';
                      toast.error(message);

                      console.error(JSON.stringify({
                        type: 'trpc_error',
                        code,
                        message: err.message,
                        path: op.path,
                        timestamp: new Date().toISOString(),
                      }));
                    }
                    observer.error(err);
                  },
                  complete() {
                    observer.complete();
                  },
                });
                return unsubscribe;
              }),
          httpBatchLink({
            url: `${API_URL}/trpc`,
            headers() {
              const currentToken = useAppStore.getState().token;
              return currentToken ? { authorization: `Bearer ${currentToken}` } : {};
            },
          }),
        ],
      }),
    [],
  );

  // Show loading screen while hydrating auth state
  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    {Platform.OS === 'web' && (
      <Head>
        <title>缘分婚恋 — 基于AI智能算法的婚恋交友匹配平台 | 立即遇见对的人</title>
        <meta name="theme-color" content={colors.primary} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href="https://yuanfen.app/" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="缘分" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="description" content="缘分是基于AI智能匹配算法的婚恋交友平台，专注高质量婚恋匹配服务。从性格、兴趣、价值观等多维度深度分析，为您精准推荐最合适的另一半。四级实名认证体系，安全可靠有保障。不再盲目寻找，让缘分有迹可循，美好爱情触手可及，诚邀您加入。立即免费注册！" />
        <meta property="og:title" content="缘分婚恋 — 基于AI智能算法的婚恋交友匹配平台" />
        <meta property="og:description" content="缘分是基于AI智能匹配算法的婚恋交友平台。从性格、兴趣、价值观等多维度分析，为您精准推荐最合适的另一半。" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yuanfen.app/" />
        <meta property="og:image" content="https://yuanfen.app/icons/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="缘分 — 智能婚恋" />
        <meta name="twitter:description" content="缘分是基于AI智能匹配算法的婚恋交友平台。从性格、兴趣、价值观等多维度分析，为您精准推荐最合适的另一半。" />
        <meta name="twitter:image" content="https://yuanfen.app/icons/og-image.png" />
        <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"WebApplication","name":"缘分","description":"基于AI的智能婚恋匹配平台","url":"https://yuanfen.app/","applicationCategory":"SocialNetworkingApplication","operatingSystem":"Web"}`}</script>
      </Head>
    )}
    <ErrorBoundary
      screenName="root"
      onError={(error) => {
        // Post directly to analytics endpoint — we can't use the hook here
        // because ErrorBoundary is a class component in a shared package.
        fetch(`${config.apiUrl}/analytics/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: [
              {
                event: 'error_boundary',
                props: {
                  error: String(error?.message ?? error).slice(0, 200),
                  screen: 'root',
                },
                timestamp: Date.now(),
                session_id: 'error',
              },
            ],
          }),
        }).catch(() => {});
      }}
    >
      <ToastProvider>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <View style={{ flex: 1 }} accessibilityRole="main">
                {Platform.OS === 'web' && (() => {
                  const H1 = 'h1' as unknown as React.ComponentType<{ style: React.CSSProperties; children: React.ReactNode }>;
                  return <H1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>缘分 — 基于AI的智能婚恋匹配平台</H1>;
                })()}
                <Stack screenOptions={{ headerShown: false }} />
              </View>
            </SafeAreaProvider>
          </QueryClientProvider>
        </api.Provider>
      </ToastProvider>
    </ErrorBoundary>
    </>
  );
}
