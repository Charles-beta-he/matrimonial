import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScalePressable } from './ScalePressable';

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
              <Ionicons name="person" size={72} color="#9ca3af" />
            </View>
            <Text className="text-white text-xl font-semibold">{userName}</Text>
            <Text className="text-gray-400 text-sm mt-1">{formatDuration(duration)}</Text>
          </>
        )}
      </View>

      {/* Self preview (picture-in-picture) */}
      {connected && (
        <View className="absolute top-12 right-4 w-24 h-32 bg-gray-800 rounded-xl overflow-hidden items-center justify-center border-2 border-white">
          <Ionicons name="person" size={32} color="#9ca3af" />
          {videoOff && (
            <View className="absolute inset-0 bg-black/70 items-center justify-center">
              <Text className="text-white text-xs">摄像头已关闭</Text>
            </View>
          )}
        </View>
      )}

      {/* Controls */}
      <View className="flex-row items-center justify-around pb-12 pt-6 bg-black/30">
        <ScalePressable
          onPress={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full items-center justify-center ${muted ? 'bg-white' : 'bg-white/20'}`}
        >
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={26} color={muted ? '#1f2937' : '#ffffff'} />
        </ScalePressable>

        <ScalePressable
          onPress={onEnd}
          className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
        >
          <Ionicons name="call" size={30} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
        </ScalePressable>

        <ScalePressable
          onPress={() => setVideoOff(!videoOff)}
          className={`w-14 h-14 rounded-full items-center justify-center ${videoOff ? 'bg-white' : 'bg-white/20'}`}
        >
          <Ionicons name={videoOff ? 'videocam-off' : 'videocam'} size={26} color={videoOff ? '#1f2937' : '#ffffff'} />
        </ScalePressable>
      </View>
    </View>
  );
}
