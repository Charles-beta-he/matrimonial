import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type PromptAnswerType = 'text' | 'audio' | 'video';

export interface PromptCardProps {
  question: string;
  answer: string;
  answerType?: PromptAnswerType;
  onPress?: () => void;
}

/** Interactive prompt/answer card */
export function PromptCard({
  question,
  answer,
  answerType = 'text',
  onPress,
}: PromptCardProps) {
  const content = (
    <View className="bg-rose-50 rounded-2xl p-4">
      <Text className="text-sm text-rose-500 font-medium mb-2">{question}</Text>

      {answerType === 'audio' ? (
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-rose-500 items-center justify-center mr-3">
            <Text className="text-white text-xs">{"▶"}</Text>
          </View>
          <Text className="text-base text-gray-900 flex-1">{answer}</Text>
        </View>
      ) : answerType === 'video' ? (
        <View>
          <View className="bg-gray-200 rounded-xl h-32 items-center justify-center mb-2">
            <View className="w-12 h-12 rounded-full bg-black/40 items-center justify-center">
              <Text className="text-white text-lg">{"▶"}</Text>
            </View>
          </View>
          <Text className="text-base text-gray-900">{answer}</Text>
        </View>
      ) : (
        <Text className="text-base text-gray-900">{answer}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ opacity: 1 }}>
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.7 : 1 }}>
            {content}
          </View>
        )}
      </Pressable>
    );
  }

  return content;
}
