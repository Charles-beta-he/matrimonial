import { ReactNode, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ScalePressable } from './ScalePressable';
import { colors } from '../constants/colors';

interface RegisterShellProps {
  step: number;
  total?: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  scrollable?: boolean;
  onBack?: () => void;
  hideBack?: boolean;
}

export function RegisterShell({
  step,
  total = 5,
  title,
  subtitle,
  children,
  scrollable = true,
  onBack,
  hideBack = false,
}: RegisterShellProps) {
  const router = useRouter();
  const headOpacity = useSharedValue(0);
  const headY = useSharedValue(-12);
  const bodyOpacity = useSharedValue(0);
  const bodyY = useSharedValue(20);

  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headOpacity.value = withTiming(1, { duration: 320, easing: e });
    headY.value = withTiming(0, { duration: 320, easing: e });
    bodyOpacity.value = withDelay(140, withTiming(1, { duration: 340, easing: e }));
    bodyY.value = withDelay(140, withTiming(0, { duration: 340, easing: e }));
  }, []);

  const headStyle = useAnimatedStyle(() => ({
    opacity: headOpacity.value,
    transform: [{ translateY: headY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
    transform: [{ translateY: bodyY.value }],
  }));

  const handleBack = onBack ?? (() => router.back());

  const stepLabel = `${String(step).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  const Body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, marginBottom: 12 }}>
        {!hideBack ? (
          <ScalePressable
            onPress={handleBack}
            hitSlop={8}
            containerStyle={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.gray100,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.gray700} />
          </ScalePressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Step segments */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i < step ? '#e11d48' : '#f1ece3',
            }}
          />
        ))}
      </View>

      {/* Heading */}
      <Animated.View style={headStyle}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#e11d48',
            letterSpacing: 1.4,
            marginBottom: 12,
          }}
        >
          {stepLabel}
        </Text>
        <Text
          style={{
            fontSize: 30,
            fontWeight: '700',
            color: '#0b0b0f',
            letterSpacing: -0.5,
            lineHeight: 36,
            marginBottom: subtitle ? 10 : 28,
          }}
          accessibilityRole="header"
          aria-level={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 15, color: '#6b7280', lineHeight: 22, marginBottom: 28 }}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>

      {/* Body */}
      <Animated.View style={bodyStyle}>{children}</Animated.View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scrollable ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {Body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }}>{Body}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
