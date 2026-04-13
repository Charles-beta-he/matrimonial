import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to analytics/monitoring
    console.error(`[ErrorBoundary${this.props.screenName ? `:${this.props.screenName}` : ''}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View className="flex-1 items-center justify-center p-8 bg-white">
          <View
            className="items-center justify-center rounded-full mb-4"
            style={{ width: 64, height: 64, backgroundColor: '#fee2e2' }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderWidth: 3,
                borderColor: '#ef4444',
                borderRadius: 14,
              }}
            />
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-2">出了点问题</Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            {this.state.error?.message ?? '页面加载失败，请重试'}
          </Text>
          <Pressable
            className="bg-rose-500 rounded-full px-6 py-3"
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text className="text-white font-medium">重试</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
