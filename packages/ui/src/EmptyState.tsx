import React from 'react';
import { Text, View } from 'react-native';
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
  return (
    <View className="items-center justify-center p-8">
      {icon ? (
        <View className="mb-4">{icon}</View>
      ) : (
        <View
          className="mb-4 items-center justify-center rounded-full"
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

      <Text className="text-lg font-semibold text-gray-900 mb-2">{title}</Text>

      {description ? (
        <Text className="text-sm text-gray-500 text-center mb-6">{description}</Text>
      ) : null}

      {action ? (
        <Button title={action.label} variant="primary" onPress={action.onPress} />
      ) : null}
    </View>
  );
}
