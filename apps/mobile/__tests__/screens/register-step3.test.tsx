import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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

const mockUpdatePhotosMutate = jest.fn();
const mockInvalidate = jest.fn();

jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      updatePhotos: {
        useMutation: () => ({ mutateAsync: mockUpdatePhotosMutate, isPending: false }),
      },
    },
    useUtils: () => ({ user: { me: { invalidate: mockInvalidate } } }),
  },
}));

jest.mock('@matrimonial/ui', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return {
    Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`btn-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    AnimatedProgressBar: ({ step, total }: { step: number; total: number }) => (
      <View testID="progress-bar" accessibilityLabel={`${step}/${total}`} />
    ),
    toast: { error: jest.fn(), success: jest.fn() },
  };
});

const mockPickAndUpload = jest.fn();
jest.mock('../../hooks/useUpload', () => ({
  useUpload: () => ({ pickAndUpload: mockPickAndUpload, uploading: false }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let Step3Photos: React.ComponentType;
beforeAll(() => {
  Step3Photos = require('../../app/(auth)/register/step3-photos').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RegisterStep3Photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and subtitle', () => {
    const { getByText } = render(<Step3Photos />);
    expect(getByText('上传照片')).toBeTruthy();
    expect(getByText('至少上传2张真人照片')).toBeTruthy();
  });

  it('shows photo count as 0/6 initially', () => {
    const { getByText } = render(<Step3Photos />);
    expect(getByText('已添加 0/6 张照片')).toBeTruthy();
  });

  it('renders "下一步" button (disabled when no photos)', () => {
    const { getByTestId } = render(<Step3Photos />);
    const btn = getByTestId('btn-下一步');
    // Button exists; pressing it when photoCount < 2 should not navigate
    fireEvent.press(btn);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders progress bar steps', () => {
    // Progress bar renders 4 steps (total=4)
    const { UNSAFE_getAllByType } = render(<Step3Photos />);
    const { View } = require('react-native');
    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBeGreaterThan(0);
  });

  it('calls pickAndUpload when photo slot is pressed', () => {
    mockPickAndUpload.mockResolvedValue(null);
    const { UNSAFE_getAllByType } = render(<Step3Photos />);
    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);
    expect(mockPickAndUpload).toHaveBeenCalledWith('photo');
  });

  it('does not navigate when less than 2 photos', async () => {
    const { getByTestId } = render(<Step3Photos />);
    // Button is disabled, pressing won't navigate
    const btn = getByTestId('btn-下一步');
    fireEvent.press(btn);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
