import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface TagSelectorProps {
  tags: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
  max?: number;
}

/** Tag picker with max selection limit */
export function TagSelector({
  tags,
  selectedTags,
  onToggle,
  max = 5,
}: TagSelectorProps) {
  const maxReached = selectedTags.length >= max;

  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        const isDisabled = maxReached && !isSelected;

        return (
          <Pressable
            key={tag}
            onPress={() => {
              if (!isDisabled) onToggle(tag);
            }}
            disabled={isDisabled}
            className={`rounded-full px-4 py-2 ${
              isSelected ? 'bg-rose-500' : 'bg-gray-100'
            } ${isDisabled ? 'opacity-40' : ''}`}
          >
            <Text
              className={`text-sm ${isSelected ? 'text-white' : 'text-gray-700'}`}
            >
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
