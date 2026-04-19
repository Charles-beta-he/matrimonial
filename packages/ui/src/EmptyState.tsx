import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

/** Centered empty state placeholder */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const iconScale = useSharedValue(0.4);
  const iconOpacity = useSharedValue(0);
  const contentY = useSharedValue(12);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(60, withSpring(1, { damping: 11, stiffness: 180 }));
    iconOpacity.value = withDelay(60, withTiming(1, { duration: 200 }));
    contentY.value = withDelay(180, withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }));
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 260 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: contentOpacity.value,
  }));

  return (
    <View className="items-center justify-center p-8">
      <Animated.View style={[iconStyle, { marginBottom: 16 }]}>
        {icon ?? (
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 64, height: 64, backgroundColor: '#f3f4f6' }}
          >
            <View
              style={{
                width: 28,
                height: 22,
                borderWidth: 2,
                borderColor: '#9ca3af',
                borderRadius: 4,
              }}
            />
          </View>
        )}
      </Animated.View>

      <Animated.View style={[contentStyle, { alignItems: 'center' }]}>
        <Text className="text-lg font-semibold text-gray-900 mb-2">{title}</Text>

        {description ? (
          <Text className="text-sm text-gray-500 text-center mb-6">{description}</Text>
        ) : null}

        {action ? (
          <Button title={action.label} variant="primary" onPress={action.onPress} />
        ) : null}
      </Animated.View>
    </View>
  );
}
