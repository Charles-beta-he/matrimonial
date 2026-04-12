import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../stores/useAppStore';

async function getOnboardingFlag(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem('hasSeenOnboarding');
  return SecureStore.getItemAsync('hasSeenOnboarding');
}

export default function Index() {
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingFlag().then((value: string | null) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  if (!hydrated || hasSeenOnboarding === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
