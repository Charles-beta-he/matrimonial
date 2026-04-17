import React, { useCallback } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Pressable, Text, View } from 'react-native';

export interface ListItemProps {
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
}

/** Generic list row for conversations, settings, etc. */
export function ListItem({
  left,
  title,
  subtitle,
  right,
  onPress,
  showDivider = true,
}: ListItemProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 14, stiffness: 280 });
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 240 });
  }, [scale]);

  const content = (
    <>
      <View className="flex-row items-center px-4 py-3">
        {left ? <View className="mr-3">{left}</View> : null}

        <View className="flex-1">
          <Text className="text-base text-gray-900">{title}</Text>
          {subtitle ? (
            <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>
          ) : null}
        </View>

        {right ? <View className="ml-2">{right}</View> : null}
      </View>

      {showDivider && <View className="border-b border-gray-100 ml-16" />}
    </>
  );

  if (onPress) {
    return (
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return <View>{content}</View>;
}
