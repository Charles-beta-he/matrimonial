import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScalePressable } from './ScalePressable';
import { colors } from '../constants/colors';

interface ScreenHeaderProps {
  title: string;
  /** If omitted, defaults to router.back() */
  onBack?: () => void;
  /** Node rendered on the right side */
  right?: React.ReactNode;
  /** Center the title with a back button on left */
  centered?: boolean;
  /** Remove bottom border */
  noBorder?: boolean;
}

export function ScreenHeader({ title, onBack, right, centered = false, noBorder = false }: ScreenHeaderProps) {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-14);

  useEffect(() => {
    const cfg = { duration: 320, easing: Easing.out(Easing.cubic) };
    opacity.value = withTiming(1, cfg);
    translateY.value = withTiming(0, cfg);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleBack = onBack ?? (() => router.back());

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.white,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: noBorder ? 0 : 1,
          borderBottomColor: colors.gray100,
        },
        animStyle,
      ]}
    >
      <ScalePressable onPress={handleBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.gray700} />
      </ScalePressable>

      {centered ? (
        <Text
          style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.gray900, marginHorizontal: 8 }}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        <Text
          style={{ flex: 1, fontSize: 20, fontWeight: '700', color: colors.gray900, marginLeft: 12 }}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      {right ? (
        <View>{right}</View>
      ) : centered ? (
        <View style={{ width: 24 }} />
      ) : null}
    </Animated.View>
  );
}
