import React from 'react';
import { Text, View } from 'react-native';

export type BadgeVariant = 'verification' | 'membership' | 'tag' | 'status';
export type BadgeLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  level?: BadgeLevel;
  color?: string;
}

const levelClasses: Record<BadgeLevel, string> = {
  L1: 'bg-gray-100 text-gray-700',
  L2: 'bg-blue-100 text-blue-700',
  L3: 'bg-amber-100 text-amber-700',
  L4: 'bg-purple-100 text-purple-700',
};

export function Badge({ label, variant = 'tag', level = 'L1', color }: BadgeProps) {
  if (variant === 'verification') {
    return (
      <View className={`rounded-full px-2 py-0.5 ${levelClasses[level]}`}>
        <Text className={`text-xs font-medium ${level === 'L1' ? 'text-gray-700' : ''}`}>
          {label}
        </Text>
      </View>
    );
  }

  if (variant === 'membership') {
    return (
      <View className="bg-rose-500 rounded-full px-3 py-1">
        <Text className="text-white text-xs font-semibold">{label}</Text>
      </View>
    );
  }

  if (variant === 'status') {
    return (
      <View className="flex-row items-center">
        <Text
          className="mr-1"
          style={color ? { color } : undefined}
        >
          {"●"}
        </Text>
        <Text className="text-sm text-gray-700">{label}</Text>
      </View>
    );
  }

  // tag (default)
  return (
    <View
      className="bg-gray-100 rounded-full px-3 py-1"
      style={color ? { backgroundColor: color } : undefined}
    >
      <Text className="text-gray-700 text-sm">{label}</Text>
    </View>
  );
}
