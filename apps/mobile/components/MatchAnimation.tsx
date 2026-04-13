import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@matrimonial/ui';
import { Button } from '@matrimonial/ui';
import { useIcebreakers } from '@matrimonial/api-client';

interface MatchAnimationProps {
  myPhoto: string;
  theirPhoto: string;
  theirName: string;
  matchedUserId?: string;
  onSendMessage: (prefill?: string) => void;
  onContinue: () => void;
}

export function MatchAnimation({
  myPhoto,
  theirPhoto,
  theirName,
  matchedUserId,
  onSendMessage,
  onContinue,
}: MatchAnimationProps) {
  const leftX = useSharedValue(-150);
  const rightX = useSharedValue(150);
  const textScale = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  const { data: icebreakersData, isLoading: icebreakersLoading } = useIcebreakers(
    matchedUserId ?? '',
    !!matchedUserId,
  );
  const suggestions = icebreakersData?.suggestions ?? [];

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
    leftX.value = withSpring(-40, { damping: 12 });
    rightX.value = withSpring(40, { damping: 12 });
    textScale.value = withDelay(400, withSpring(1, { damping: 10 }));
  }, []);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textScale.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      className="absolute inset-0 items-center justify-center z-50"
      style={[{ backgroundColor: 'rgba(0,0,0,0.8)' }, bgStyle]}
    >
      {/* Avatars */}
      <View className="flex-row items-center mb-8">
        <Animated.View style={leftStyle}>
          <Avatar source={{ uri: myPhoto }} size={100} />
        </Animated.View>
        <Animated.View style={rightStyle}>
          <Avatar source={{ uri: theirPhoto }} size={100} />
        </Animated.View>
      </View>

      {/* Match text */}
      <Animated.View style={textStyle} className="items-center mb-8">
        <Text className="text-white text-3xl font-bold mb-2">It's a Match!</Text>
        <Text className="text-white/80 text-base">
          你和 {theirName} 互相喜欢了对方
        </Text>
      </Animated.View>

      {/* AI Icebreaker suggestions */}
      {matchedUserId && (
        <View className="w-full px-8 mb-6">
          <View className="flex-row items-center justify-center mb-3" style={{ gap: 6 }}>
            <Ionicons name="sparkles" size={14} color="#fde68a" />
            <Text className="text-white/90 text-sm font-semibold">AI 破冰建议</Text>
          </View>
          {icebreakersLoading ? (
            <Text className="text-white/60 text-xs text-center">正在生成建议…</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => onSendMessage(s)}
                  className="bg-white/15 border border-white/25 rounded-full px-4 py-2"
                >
                  <Text className="text-white text-sm text-center">{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action buttons */}
      <View className="w-full px-8" style={{ gap: 12 }}>
        <Button
          title="发消息"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => onSendMessage()}
        />
        <Button title="继续浏览" variant="outline" size="lg" fullWidth onPress={onContinue} />
      </View>
    </Animated.View>
  );
}
