import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

// Global toast state
let toastListeners: Array<(msg: ToastMessage) => void> = [];
let toastCounter = 0;

export const toast = {
  show(typeOrOptions: ToastType | { type: ToastType; text1: string }, messageArg?: string) {
    let type: ToastType;
    let message: string;
    if (typeof typeOrOptions === 'object') {
      type = typeOrOptions.type;
      message = typeOrOptions.text1;
    } else {
      type = typeOrOptions;
      message = messageArg ?? '';
    }
    const msg: ToastMessage = { id: `t_${++toastCounter}`, type, message };
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
const DOT_COLORS: Record<ToastType, string> = {
  success: '#bbf7d0',
  error: '#fecaca',
  info: '#bfdbfe',
  warning: '#fde68a',
};

const HOLD_MS = 2500;

function ToastItem({ msg, onDone }: { msg: ToastMessage; onDone: (id: string) => void }) {
  const translateY = useSharedValue(-48);
  const opacity = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    // Slide down + spring bounce
    translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });

    // After hold, slide up + fade out
    translateY.value = withDelay(
      HOLD_MS,
      withSequence(withTiming(-48, { duration: 220, easing: Easing.in(Easing.cubic) })),
    );
    opacity.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }),
    );

    const timer = setTimeout(() => onDone(msg.id), HOLD_MS + 240);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[{ marginBottom: 8 }, animStyle]}>
      <View className={`${COLORS[msg.type]} rounded-xl px-4 py-3 flex-row items-center`}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: DOT_COLORS[msg.type],
            marginRight: 10,
          }}
        />
        <Text className="text-white flex-1">{msg.message}</Text>
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (msg: ToastMessage) => {
      setMessages(prev => [...prev, msg]);
    };
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, []);

  const handleDone = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View
        style={{ position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999 }}
        pointerEvents="none"
      >
        {messages.map(msg => (
          <ToastItem key={msg.id} msg={msg} onDone={handleDone} />
        ))}
      </View>
    </View>
  );
}
