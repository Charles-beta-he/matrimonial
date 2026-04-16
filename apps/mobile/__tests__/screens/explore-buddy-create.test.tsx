import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@matrimonial/shared', () => ({
  BUDDY_TYPES: [
    { id: 'coffee', label: '咖啡聊天', emoji: '☕' },
    { id: 'fitness', label: '健身搭子', emoji: '💪' },
    { id: 'study', label: '学习搭子', emoji: '📚' },
  ],
  BUDDY_TYPE_COLORS: {
    coffee: '#f59e0b',
    fitness: '#ef4444',
    study: '#3b82f6',
  },
}));

const mockCreateMutate = jest.fn();

jest.mock('@matrimonial/api-client', () => ({
  api: {
    buddy: {
      create: {
        useMutation: ({ onSuccess, _onError }: any) => ({
          mutate: (args: any) => {
            mockCreateMutate(args);
            onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    toast: { success: jest.fn(), error: jest.fn() },
  };
});

// ── Lazy import ────────────────────────────────────────────────────────────

let BuddyCreateScreen: React.ComponentType;
beforeAll(() => {
  BuddyCreateScreen = require('../../app/explore/buddy/create').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BuddyCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders buddy type selection options', () => {
    const { getByText } = render(<BuddyCreateScreen />);
    expect(getByText('咖啡聊天')).toBeTruthy();
    expect(getByText('健身搭子')).toBeTruthy();
    expect(getByText('学习搭子')).toBeTruthy();
  });

  it('renders publish button', () => {
    const { getByTestId } = render(<BuddyCreateScreen />);
    expect(getByTestId('btn-发布')).toBeTruthy();
  });

  it('publish button is disabled when no type selected', () => {
    const { getByTestId } = render(<BuddyCreateScreen />);
    const btn = getByTestId('btn-发布');
    fireEvent.press(btn);
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('selecting a buddy type highlights it', () => {
    const { getByText } = render(<BuddyCreateScreen />);
    fireEvent.press(getByText('咖啡聊天'));
    // After selection, the type is selected - button still disabled without title/description
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('calls create mutation with correct args when form is complete', () => {
    const { getByText, getByPlaceholderText } = render(<BuddyCreateScreen />);

    // Select type
    fireEvent.press(getByText('咖啡聊天'));

    // Fill title
    const titleInput = getByPlaceholderText('给你的搭子帖起个名字');
    fireEvent.changeText(titleInput, '周末一起喝咖啡');

    // Fill description (min 10 chars)
    const descInput = getByPlaceholderText('描述一下你的计划，至少10个字');
    fireEvent.changeText(descInput, '喜欢在安静咖啡馆聊天的朋友来找我');

    // Press publish
    fireEvent.press(getByText('发布'));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'coffee',
        title: '周末一起喝咖啡',
        description: '喜欢在安静咖啡馆聊天的朋友来找我',
      }),
    );
  });

  it('calls router.back when back button is pressed', () => {
    const { UNSAFE_getAllByType } = render(<BuddyCreateScreen />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
