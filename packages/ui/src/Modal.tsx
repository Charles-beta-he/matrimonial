import React from 'react';
import { Modal as RNModal, Pressable, Text, View } from 'react-native';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-t-3xl px-6 pt-6 pb-8"
          onPress={(e) => e.stopPropagation()}
        >
          {showCloseButton && (
            <Pressable
              onPress={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 items-center justify-center"
            >
              <View style={{ width: 16, height: 16, position: 'relative' }}>
                <View
                  style={{
                    position: 'absolute',
                    width: 16,
                    height: 2,
                    backgroundColor: '#9ca3af',
                    top: 7,
                    transform: [{ rotate: '45deg' }],
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    width: 16,
                    height: 2,
                    backgroundColor: '#9ca3af',
                    top: 7,
                    transform: [{ rotate: '-45deg' }],
                  }}
                />
              </View>
            </Pressable>
          )}

          {title ? (
            <Text className="text-lg font-semibold mb-4">{title}</Text>
          ) : null}

          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
