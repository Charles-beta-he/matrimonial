import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Badge } from './Badge';

export interface ProfileCardUser {
  nickname: string;
  age: number;
  city: string;
  photos: string[];
  verificationLevel?: 'L1' | 'L2' | 'L3' | 'L4';
  tags?: string[];
  prompts?: Array<{ question: string; answer: string }>;
  distance?: string;
  isOnline?: boolean;
}

export interface ProfileCardProps {
  user: ProfileCardUser;
}

/** User profile card for discover page */
export function ProfileCard({ user }: ProfileCardProps) {
  const {
    nickname,
    age,
    city,
    photos,
    verificationLevel,
    tags = [],
    prompts = [],
    distance,
    isOnline,
  } = user;

  const mainPhoto = photos[0];

  return (
    <View
      className="rounded-3xl overflow-hidden bg-gray-100"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {/* Photo fills the whole card */}
      {mainPhoto ? (
        <Image
          source={{ uri: mainPhoto }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="items-center justify-center"
          style={{ width: '100%', height: '100%', backgroundColor: '#e5e7eb' }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: '#f9a8b0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 40, color: '#ffffff', fontWeight: '600' }}>
              {nickname?.charAt(0) ?? '·'}
            </Text>
          </View>
        </View>
      )}

      {/* Dark gradient overlay on bottom third */}
      <View
        className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-24"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        {/* Name row */}
        <View className="flex-row items-center mb-1">
          <Text className="text-3xl font-bold text-white mr-2">
            {nickname}, {age}
          </Text>
          {isOnline && (
            <View className="w-3 h-3 bg-green-400 rounded-full ml-1" />
          )}
          {verificationLevel && (
            <View className="ml-2">
              <Badge
                label={verificationLevel}
                variant="verification"
                level={verificationLevel}
              />
            </View>
          )}
        </View>

        {/* City + distance */}
        <Text className="text-sm text-white/90 mb-3">
          {city}
          {distance ? ` · ${distance}` : ''}
        </Text>

        {/* Tags inline */}
        {tags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
            className="mb-2"
          >
            {tags.slice(0, 4).map((tag) => (
              <View
                key={tag}
                className="px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <Text className="text-xs text-white">{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* First prompt as a line inside overlay */}
        {prompts.length > 0 && prompts[0].answer && (
          <View className="mt-1">
            <Text className="text-xs text-white/70" numberOfLines={1}>
              {prompts[0].question}
            </Text>
            <Text className="text-sm text-white" numberOfLines={2}>
              {prompts[0].answer}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
