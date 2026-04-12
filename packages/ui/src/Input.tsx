import React, { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

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

    const borderClass = error
      ? 'border-red-500'
      : focused
        ? 'border-rose-500'
        : 'border-gray-200';

    return (
      <View className="w-full">
        {label ? <Text className="text-sm text-gray-600 mb-1">{label}</Text> : null}
        <View
          className={`flex-row items-center bg-gray-50 border rounded-xl px-4 ${borderClass} ${multiline ? 'h-24 items-start pt-3' : 'h-12'}`}
        >
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            className="flex-1 text-base text-gray-900"
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            maxLength={maxLength}
            textAlignVertical={multiline ? 'top' : 'center'}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </View>
        {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
