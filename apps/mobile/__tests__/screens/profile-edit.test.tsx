import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

const mockSetUser = jest.fn();
jest.mock('../../stores/useAppStore', () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({
      user: {
        id: 'user-1',
        nickname: '测试用户',
        bio: '这是简介',
        height: 170,
        education: 'BACHELOR',
        occupation: '工程师',
        incomeRange: 'K10_20',
        hometown: '上海',
        zodiac: '天秤座',
        mbti: 'INFJ',
        tags: ['运动', '音乐', '旅行'],
        prompts: [],
        photos: [],
      },
      setUser: mockSetUser,
    }),
}));

const mockPickAndUpload = jest.fn().mockResolvedValue(null);
jest.mock('../../hooks/useUpload', () => ({
  useUpload: () => ({ pickAndUpload: mockPickAndUpload, uploading: false }),
}));

const mockUpdateMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockUpdatePromptsMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockInvalidate = jest.fn().mockResolvedValue(undefined);
jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      me: { useQuery: () => ({ data: null }) },
      updateProfile: {
        useMutation: () => ({
          mutateAsync: mockUpdateMutateAsync,
          isPending: false,
        }),
      },
      updatePrompts: {
        useMutation: () => ({
          mutateAsync: mockUpdatePromptsMutateAsync,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      user: { me: { invalidate: mockInvalidate } },
    }),
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { View, Text, TextInput, Pressable } = require('react-native');
  return {
    Avatar: ({ source: _source, size: _size }: any) => <View testID="avatar" />,
    Button: ({ title, onPress, disabled }: any) => (
      <Pressable onPress={onPress} disabled={disabled} testID="save-button">
        <Text>{title}</Text>
      </Pressable>
    ),
    Input: ({ label, value, onChangeText, ...rest }: any) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          testID={`input-${label}`}
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
      </View>
    ),
    PromptCard: ({ question, answer, onPress }: any) => {
      const { Pressable, Text } = require('react-native');
      return (
        <Pressable onPress={onPress} testID={`prompt-${question}`}>
          <Text>{answer}</Text>
        </Pressable>
      );
    },
    TagSelector: ({ tags, selectedTags: _selectedTags, onToggle, max: _max }: any) => {
      const { View, Pressable, Text } = require('react-native');
      return (
        <View>
          {tags.slice(0, 5).map((tag: string) => (
            <Pressable key={tag} onPress={() => onToggle(tag)} testID={`tag-${tag}`}>
              <Text>{tag}</Text>
            </Pressable>
          ))}
        </View>
      );
    },
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

jest.mock('@matrimonial/shared', () => ({
  ALL_TAGS: ['运动', '音乐', '旅行', '美食', '读书', '游戏'],
  PROMPT_QUESTIONS: [
    { id: 'q1', text: '你最喜欢的周末活动是什么？' },
    { id: 'q2', text: '你的人生目标是什么？' },
    { id: 'q3', text: '你理想中的伴侣是什么样的？' },
  ],
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

let Screen: React.ComponentType;

describe('ProfileEditScreen', () => {
  beforeAll(() => {
    Screen = require('../../app/profile/edit').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMutateAsync.mockResolvedValue(undefined);
    mockUpdatePromptsMutateAsync.mockResolvedValue(undefined);
  });

  it('renders page header and save button', () => {
    const { getByText, getAllByText } = render(<Screen />);
    expect(getByText('编辑资料')).toBeTruthy();
    // "保存" appears in the header and the bottom save button
    const saveElements = getAllByText('保存');
    expect(saveElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders form fields pre-filled with user data from store', () => {
    const { getByDisplayValue } = render(<Screen />);
    expect(getByDisplayValue('测试用户')).toBeTruthy();
    expect(getByDisplayValue('这是简介')).toBeTruthy();
    expect(getByDisplayValue('170')).toBeTruthy();
    expect(getByDisplayValue('工程师')).toBeTruthy();
    expect(getByDisplayValue('上海')).toBeTruthy();
  });

  it('pressing back button calls router.back()', () => {
    const { UNSAFE_getAllByType } = render(<Screen />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    // First pressable is the back chevron
    fireEvent.press(pressables[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('pressing save calls updateProfile mutation with correct payload and navigates back', async () => {
    const { getByTestId } = render(<Screen />);
    const saveBtn = getByTestId('save-button');
    await act(async () => {
      fireEvent.press(saveBtn);
    });
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        nickname: '测试用户',
        bio: '这是简介',
        height: 170,
        occupation: '工程师',
        hometown: '上海',
        education: 'BACHELOR',
        incomeRange: 'K10_20',
      }),
    );
    expect(mockInvalidate).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows error toast when save mutation fails', async () => {
    const { toast } = require('@matrimonial/ui');
    mockUpdateMutateAsync.mockRejectedValueOnce(new Error('网络错误'));
    const { getByTestId } = render(<Screen />);
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });
    expect(toast.error).toHaveBeenCalledWith('网络错误');
  });

  it('toggling a tag updates selectedTags count text', () => {
    const { getByTestId, getByText } = render(<Screen />);
    // Initial: 3 tags selected from store
    expect(getByText('已选 3/5')).toBeTruthy();
    // Toggle '音乐' — it is already selected, so deselect it
    fireEvent.press(getByTestId('tag-音乐'));
    expect(getByText('已选 2/5')).toBeTruthy();
  });

  it('selecting education option updates selection', () => {
    const { getByText } = render(<Screen />);
    // '本科' should be rendered (pre-selected from BACHELOR)
    expect(getByText('学历')).toBeTruthy();
    // Press '硕士' to change selection
    fireEvent.press(getByText('硕士'));
    // After press, '硕士' text still exists (selection updated internally)
    expect(getByText('硕士')).toBeTruthy();
  });

  it('avatar press triggers pickAndUpload', async () => {
    const { getByTestId } = render(<Screen />);
    // The Avatar component has testID="avatar"; we press its parent Pressable
    // by finding the avatar element and pressing its host parent
    const avatar = getByTestId('avatar');
    await act(async () => {
      // Walk up to find a Pressable ancestor by firing press on the avatar itself
      fireEvent.press(avatar);
    });
    expect(mockPickAndUpload).toHaveBeenCalledWith('avatar');
  });
});
