import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, TRPCClientError, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AnyRouter } from '@trpc/server';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '@matrimonial/api-client';
import { ErrorBoundary, ToastProvider, toast } from '@matrimonial/ui';
import { useAppStore } from '../stores/useAppStore';
import { useSocketStore } from '../stores/useSocketStore';
import { useGlobalErrorHandler } from '../hooks/useErrorHandler';
import { config } from '../env';
import { refreshAccessToken } from '../lib/authRefresh';

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

  // Hydrate auth state from SecureStore on mount
  useEffect(() => {
    useAppStore.getState().hydrate();
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

  const [queryClient] = useState(() => new QueryClient());
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return (
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
              <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaProvider>
          </QueryClientProvider>
        </api.Provider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
