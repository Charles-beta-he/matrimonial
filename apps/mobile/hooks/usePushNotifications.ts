import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '@matrimonial/api-client';

/**
 * Registers device for push notifications and stores the token server-side.
 * Must be called after the user is authenticated.
 */
export function usePushNotifications(enabled: boolean) {
  const registerMut = api.user.registerPushToken.useMutation();

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      try {
        // Lazy-import to avoid crashes when expo-notifications isn't linked
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — installed at runtime via package.json, types available after npm install
        const Notifications = await import('expo-notifications');
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted' || cancelled) return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (!cancelled && tokenData.data) {
          registerMut.mutate({ token: tokenData.data });
        }
      } catch {
        // Silently skip — push is non-critical; native module may not be linked in dev
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);
}
