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
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isSelected ? '#e11d48' : '#eef0f3',
              backgroundColor: isSelected ? '#e11d48' : '#ffffff',
              opacity: isDisabled ? 0.4 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: isSelected ? '#ffffff' : '#4b5563',
              }}
            >
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
