import { ReactNode, useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ScalePressable } from './ScalePressable';
import { colors } from '../constants/colors';

interface LegalShellProps {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function LegalShell({ title, lastUpdated, intro, children, footer }: LegalShellProps) {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const y = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    y.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      {/* Sticky header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f1ece3',
          backgroundColor: '#fdfcfa',
        }}
      >
        <ScalePressable
          onPress={() => router.back()}
          hitSlop={8}
          containerStyle={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.gray700} />
        </ScalePressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: '600',
            color: '#0b0b0f',
            marginRight: 36,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={animStyle}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#e11d48',
              letterSpacing: 1.6,
              marginBottom: 10,
            }}
          >
            更新 · {lastUpdated}
          </Text>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: '#0b0b0f',
              letterSpacing: -0.5,
              lineHeight: 36,
              marginBottom: intro ? 14 : 28,
            }}
            accessibilityRole="header"
            aria-level={1}
          >
            {title}
          </Text>
          {intro ? (
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 24, marginBottom: 28 }}>
              {intro}
            </Text>
          ) : null}
        </Animated.View>

        {children}

        {footer ? (
          <View
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#eef0f3',
            }}
          >
            {footer}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LegalSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            backgroundColor: '#fff1f2',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#e11d48' }}>
            {String(index).padStart(2, '0')}
          </Text>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#0b0b0f' }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 14, color: '#374151', lineHeight: 24, marginBottom: 10 }}>
      {children}
    </Text>
  );
}
