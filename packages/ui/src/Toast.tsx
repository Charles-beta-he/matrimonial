import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

// Global toast state
let toastListeners: Array<(msg: ToastMessage) => void> = [];

export const toast = {
  show(type: ToastType, message: string) {
    const msg: ToastMessage = { id: `t_${Date.now()}`, type, message };
    toastListeners.forEach(fn => fn(msg));
  },
  success: (msg: string) => toast.show('success', msg),
  error: (msg: string) => toast.show('error', msg),
  info: (msg: string) => toast.show('info', msg),
  warning: (msg: string) => toast.show('warning', msg),
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
};
const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listener = (msg: ToastMessage) => {
      setMessages(prev => [...prev, msg]);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      });
    };
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, [fadeAnim]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {messages.length > 0 && (
        <Animated.View
          style={{ opacity: fadeAnim, position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999 }}
        >
          {messages.map(msg => (
            <View key={msg.id} className={`${COLORS[msg.type]} rounded-xl px-4 py-3 flex-row items-center mb-2`}>
              <Text className="text-white text-lg mr-2">{ICONS[msg.type]}</Text>
              <Text className="text-white flex-1">{msg.message}</Text>
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}
