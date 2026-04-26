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
        : interpolateColor(focusProgress.value, [0, 1], ['#eef0f3', '#e11d48']);
      const backgroundColor = error
        ? '#fef2f2'
        : interpolateColor(focusProgress.value, [0, 1], ['#f7f8fa', '#ffffff']);
      return { borderColor, backgroundColor };
    });

    return (
      <View className="w-full">
        {label ? <Text className="text-[13px] font-medium text-gray-600 mb-2">{label}</Text> : null}
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: multiline ? 'flex-start' : 'center',
              borderWidth: 1.5,
              borderRadius: 14,
              paddingHorizontal: 16,
              height: multiline ? undefined : 52,
              minHeight: multiline ? 96 : undefined,
              paddingTop: multiline ? 12 : undefined,
            },
            borderStyle,
          ]}
        >
          {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            className="flex-1 text-[15px] text-gray-900"
            style={Platform.OS === 'web' ? ({ outline: 'none' } as any) : undefined}
            placeholder={placeholder}
            placeholderTextColor="#b8bcc4"
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
