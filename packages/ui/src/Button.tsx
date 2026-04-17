import React, { useCallback } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ActivityIndicator, Pressable, Text, type GestureResponderEvent } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
}

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  primary: { container: 'bg-rose-500 rounded-full', text: 'text-white' },
  secondary: { container: 'bg-gray-100 rounded-full', text: 'text-gray-900' },
  outline: { container: 'border border-rose-500 rounded-full', text: 'text-rose-500' },
  ghost: { container: '', text: 'text-rose-500' },
  danger: { container: 'bg-red-500 rounded-full', text: 'text-white' },
};

const sizeClasses: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'h-8 px-3', text: 'text-sm' },
  md: { container: 'h-10 px-5', text: 'text-base' },
  lg: { container: 'h-12 px-6', text: 'text-lg' },
};

const loaderColor: Record<ButtonVariant, string> = {
  primary: '#ffffff',
  secondary: '#111827',
  outline: '#f43f5e',
  ghost: '#f43f5e',
  danger: '#ffffff',
};

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    { title, variant = 'primary', size = 'md', loading = false, disabled = false, fullWidth = false, onPress },
    ref,
  ) => {
    const v = variantClasses[variant];
    const s = sizeClasses[size];
    const isDisabled = disabled || loading;

    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.94, { damping: 15, stiffness: 300 });
    }, [scale]);
    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 250 });
    }, [scale]);

    return (
      <Animated.View style={[animStyle, fullWidth ? { width: '100%' } : undefined]}>
        <Pressable
          ref={ref}
          accessibilityRole="button"
          disabled={isDisabled}
          onPress={onPress}
          onPressIn={isDisabled ? undefined : handlePressIn}
          onPressOut={isDisabled ? undefined : handlePressOut}
          className={`flex-row items-center justify-center ${v.container} ${s.container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={loaderColor[variant]} />
          ) : (
            <Text className={`font-semibold ${v.text} ${s.text}`}>{title}</Text>
          )}
        </Pressable>
      </Animated.View>
    );
  },
);

Button.displayName = 'Button';
