import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Badge } from './Badge';
import { PromptCard } from './PromptCard';

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
    <View className="flex-1">
      {/* Photo area with 3:4 aspect ratio */}
      <View className="rounded-3xl overflow-hidden" style={{ aspectRatio: 3 / 4 }}>
        {mainPhoto ? (
          <Image
            source={{ uri: mainPhoto }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-200 items-center justify-center">
            <Text className="text-gray-400 text-4xl">{"👤"}</Text>
          </View>
        )}

        {/* Dark overlay for text readability (RN has no native CSS gradient —
            use expo-linear-gradient in the consumer app if a true gradient is needed) */}
        <View
          className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-20"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <View className="flex-row items-center">
            <Text className="text-2xl font-bold text-white mr-2">
              {nickname}, {age}
            </Text>
            {isOnline && (
              <View className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            )}
          </View>

          <View className="flex-row items-center mt-1">
            <Text className="text-sm text-white/80">
              {city}
              {distance ? ` · ${distance}` : ''}
            </Text>
          </View>

          {verificationLevel && (
            <View className="mt-2">
              <Badge
                label={verificationLevel}
                variant="verification"
                level={verificationLevel}
              />
            </View>
          )}
        </View>
      </View>

      {/* Tags */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {tags.map((tag) => (
            <Badge key={tag} label={tag} variant="tag" />
          ))}
        </ScrollView>
      )}

      {/* First prompt */}
      {prompts.length > 0 && (
        <View className="mt-3">
          <PromptCard
            question={prompts[0].question}
            answer={prompts[0].answer}
          />
        </View>
      )}
    </View>
  );
}
