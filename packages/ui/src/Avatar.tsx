import React from 'react';
import { Image, Text, View, type ImageProps } from 'react-native';

export type VerificationLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface AvatarProps {
  source: ImageProps['source'];
  size?: number;
  verified?: boolean;
  verificationLevel?: VerificationLevel;
  online?: boolean;
}

const levelColor: Record<VerificationLevel, string> = {
  L1: 'bg-gray-400',
  L2: 'bg-blue-500',
  L3: 'bg-amber-500',
  L4: 'bg-purple-500',
};

export function Avatar({
  source,
  size = 48,
  verified = false,
  verificationLevel = 'L1',
  online = false,
}: AvatarProps) {
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}
      >
        <Image
          source={source}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>

      {online && (
        <View
          className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        />
      )}

      {verified && (
        <View
          className={`rounded-full items-center justify-center ${levelColor[verificationLevel]}`}
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: size * 0.35,
            height: size * 0.35,
            minWidth: 14,
            minHeight: 14,
          }}
        >
          <Text
            className="text-white font-bold"
            style={{ fontSize: Math.max(size * 0.18, 8) }}
          >
            {"✓"}
          </Text>
        </View>
      )}
    </View>
  );
}
