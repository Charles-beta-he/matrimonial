import React from 'react';
import { Platform, Pressable, View } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  shadow?: boolean;
}

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  android: {
    elevation: 2,
  },
  // RN-web 18+ prefers boxShadow over shadow* props
  web: {
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  default: {},
});

export function Card({ children, className = '', onPress, shadow = true }: CardProps) {
  const baseClass = `bg-white rounded-2xl overflow-hidden ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={baseClass}
        style={shadow ? shadowStyle : undefined}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClass} style={shadow ? shadowStyle : undefined}>
      {children}
    </View>
  );
}
