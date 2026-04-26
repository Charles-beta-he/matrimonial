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
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 32 }}>
      <Animated.View
        style={[
          iconStyle,
          {
            marginBottom: 24,
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: '#fff1f2',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        {icon ?? (
          <View
            style={{
              width: 28,
              height: 22,
              borderWidth: 2,
              borderColor: '#fb7185',
              borderRadius: 4,
            }}
          />
        )}
      </Animated.View>

      <Animated.View style={[contentStyle, { alignItems: 'center', maxWidth: 280 }]}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#0b0b0f',
            marginBottom: 8,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>

        {description ? (
          <Text
            style={{
              fontSize: 13,
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            {description}
          </Text>
        ) : null}

        {action ? (
          <Button title={action.label} variant="primary" onPress={action.onPress} />
        ) : null}
      </Animated.View>
    </View>
  );
}
