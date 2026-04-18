import React, { useCallback, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      error,
      secureTextEntry,
      multiline = false,
      maxLength,
      leftIcon,
      rightIcon,
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const focusProgress = useSharedValue(0);

    const handleFocus = useCallback(() => {
      setFocused(true);
      focusProgress.value = withTiming(1, { duration: 180 });
    }, [focusProgress]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      focusProgress.value = withTiming(0, { duration: 180 });
    }, [focusProgress]);

    const borderStyle = useAnimatedStyle(() => {
      const borderColor = error
        ? '#ef4444'
        : interpolateColor(focusProgress.value, [0, 1], ['#e5e7eb', '#f43f5e']);
      return { borderColor };
    });

    return (
      <View className="w-full">
        {label ? <Text className="text-sm text-gray-600 mb-1">{label}</Text> : null}
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: multiline ? 'flex-start' : 'center',
              backgroundColor: '#f9fafb',
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              height: multiline ? undefined : 48,
              minHeight: multiline ? 96 : undefined,
              paddingTop: multiline ? 12 : undefined,
            },
            borderStyle,
          ]}
        >
          {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            className="flex-1 text-base text-gray-900"
            style={Platform.OS === 'web' ? ({ outline: 'none' } as any) : undefined}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            maxLength={maxLength}
            textAlignVertical={multiline ? 'top' : 'center'}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-label={label ?? placeholder}
          />
          {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
        </Animated.View>
        {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
