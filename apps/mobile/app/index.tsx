import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Platform, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../stores/useAppStore';
import { SplashScreen } from '../components/SplashScreen';

async function getOnboardingFlag(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem('hasSeenOnboarding');
  return SecureStore.getItemAsync('hasSeenOnboarding');
}

export default function Index() {
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    getOnboardingFlag().then((value: string | null) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  // Show cinematic splash first; it calls onComplete when its animation finishes.
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // After splash: wait for store hydration + onboarding flag before redirecting.
  if (!hydrated || hasSeenOnboarding === null) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a0f' }} />;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
