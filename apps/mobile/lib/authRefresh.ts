import { useAppStore } from '../stores/useAppStore';
import { config } from '../env';

// Single-flight refresh to prevent concurrent refresh calls.
// Multiple in-flight requests that all hit 401 will share one refresh attempt.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Uses single-flight pattern to dedupe concurrent calls.
 * Returns the new access token on success, or null on failure.
 *
 * On failure (network error, invalid refresh token, server error) the auth
 * state is cleared so the app falls back to the login flow.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken, setAuth, user, clearAuth } = useAppStore.getState();
    if (!refreshToken || !user) {
      clearAuth();
      return null;
    }

    try {
      // Call the tRPC refresh endpoint directly via fetch to avoid a circular
      // dependency with the tRPC client (which itself uses this function).
      const response = await fetch(`${config.apiUrl}/trpc/auth.refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuth();
        return null;
      }

      const data = await response.json();
      // tRPC response shape: { result: { data: { accessToken, refreshToken } } }
      const result = data?.result?.data;
      if (!result?.accessToken || !result?.refreshToken) {
        clearAuth();
        return null;
      }

      setAuth(result.accessToken, result.refreshToken, user);
      return result.accessToken as string;
    } catch (err) {
      console.error('[auth] refresh failed', err);
      clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
