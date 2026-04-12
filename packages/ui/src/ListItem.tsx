import React from 'react';
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
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return <View>{content}</View>;
}
