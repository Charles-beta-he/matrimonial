import { useEffect, useState } from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';

interface Props {
  roomName: string;
  token: string;
  wsUrl: string;
  userName: string;
  onEnd: () => void;
}

/** Video call UI. Uses LiveKit SDK when available, falls back to placeholder. */
export function VideoCall({ roomName, token, wsUrl, userName, onEnd }: Props) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [connected, setConnected] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Simulate connecting
    const connectTimer = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [connected]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // TODO: Integrate @livekit/react-native SDK for actual video rendering.
  // Requires expo prebuild. For now, show a placeholder with call controls.
  void roomName;
  void token;
  void wsUrl;

  return (
    <View className="flex-1 bg-black">
      {/* Remote video area */}
      <View className="flex-1 items-center justify-center">
        {!connected ? (
          <>
            <ActivityIndicator size="large" color="#f43f5e" />
            <Text className="text-white mt-4 text-base">连接中...</Text>
          </>
        ) : (
          <>
            <View className="w-32 h-32 bg-gray-700 rounded-full items-center justify-center mb-4">
              <Text className="text-6xl">👤</Text>
            </View>
            <Text className="text-white text-xl font-semibold">{userName}</Text>
            <Text className="text-gray-400 text-sm mt-1">{formatDuration(duration)}</Text>
          </>
        )}
      </View>

      {/* Self preview (picture-in-picture) */}
      {connected && (
        <View className="absolute top-12 right-4 w-24 h-32 bg-gray-800 rounded-xl overflow-hidden items-center justify-center border-2 border-white">
          <Text className="text-3xl">👤</Text>
          {videoOff && (
            <View className="absolute inset-0 bg-black/70 items-center justify-center">
              <Text className="text-white text-xs">摄像头已关闭</Text>
            </View>
          )}
        </View>
      )}

      {/* Controls */}
      <View className="flex-row items-center justify-around pb-12 pt-6 bg-black/30">
        <Pressable
          onPress={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full items-center justify-center ${muted ? 'bg-white' : 'bg-white/20'}`}
        >
          <Text className="text-2xl">{muted ? '🔇' : '🔊'}</Text>
        </Pressable>

        <Pressable
          onPress={onEnd}
          className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
        >
          <Text className="text-3xl">📞</Text>
        </Pressable>

        <Pressable
          onPress={() => setVideoOff(!videoOff)}
          className={`w-14 h-14 rounded-full items-center justify-center ${videoOff ? 'bg-white' : 'bg-white/20'}`}
        >
          <Text className="text-2xl">{videoOff ? '📷' : '🎥'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
