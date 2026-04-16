import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));

// Shared constants — provide minimal stubs
jest.mock('@matrimonial/shared', () => ({
  CIRCLE_CATEGORIES: [
    { id: 'reading', label: '读书', icon: 'book-outline' },
    { id: 'fitness', label: '健身', icon: 'barbell-outline' },
  ],
  formatPrice: (cents: number) => `¥${(cents / 100).toFixed(0)}`,
}));

// UI components
jest.mock('@matrimonial/ui', () => {
  const { View, Text } = require('react-native');
  return {
    Badge: ({ label }: { label: string }) => <Text>{label}</Text>,
    Card: ({ children }: any) => <View>{children}</View>,
    EmptyState: ({ title, description }: { title: string; description?: string }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
        {description ? <Text>{description}</Text> : null}
      </View>
    ),
  };
});

// api-client — mutable control vars
let mockCirclesIsLoading = false;
let mockCirclesData: any = undefined;
let mockCirclesError: any = null;
const mockRefetch = jest.fn();

jest.mock('@matrimonial/api-client', () => ({
  api: {
    circle: {
      list: {
        useQuery: () => ({
          data: mockCirclesData,
          isLoading: mockCirclesIsLoading,
          error: mockCirclesError,
          refetch: mockRefetch,
          isRefetching: false,
        }),
      },
    },
  },
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let CirclesScreen: React.ComponentType;
beforeAll(() => {
  CirclesScreen = require('../../app/explore/circles/index').default;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CirclesScreen (兴趣圈子)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCirclesIsLoading = false;
    mockCirclesData = undefined;
    mockCirclesError = null;
  });

  it('renders the "兴趣圈子" title', () => {
    mockCirclesData = { items: [] };
    const { getByText } = render(<CirclesScreen />);
    expect(getByText('兴趣圈子')).toBeTruthy();
  });

  it('shows ActivityIndicator while loading', () => {
    mockCirclesIsLoading = true;
    mockCirclesData = undefined;
    const { UNSAFE_getByType } = render(<CirclesScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('displays circle names after data loads', () => {
    mockCirclesData = {
      items: [
        { id: 'c1', name: '晨跑小队', description: '每天早上跑步', category: 'fitness', memberCount: 12 },
        { id: 'c2', name: '书香读书会', description: '每周共读', category: 'reading', memberCount: 8 },
      ],
    };
    const { getByText } = render(<CirclesScreen />);
    expect(getByText('晨跑小队')).toBeTruthy();
    expect(getByText('书香读书会')).toBeTruthy();
  });

  it('shows member count for each circle', () => {
    mockCirclesData = {
      items: [
        { id: 'c3', name: '旅行团', description: null, category: 'fitness', memberCount: 42 },
      ],
    };
    const { getByText } = render(<CirclesScreen />);
    expect(getByText('42 成员')).toBeTruthy();
  });

  it('shows empty state when there are no circles', () => {
    mockCirclesData = { items: [] };
    const { getByTestId, getByText } = render(<CirclesScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('暂无圈子')).toBeTruthy();
  });

  it('navigates to circle detail when a circle card is pressed', () => {
    mockCirclesData = {
      items: [
        { id: 'circle-99', name: '点击测试圈', description: '测试', category: 'reading', memberCount: 3 },
      ],
    };
    const { getByText } = render(<CirclesScreen />);
    fireEvent.press(getByText('点击测试圈'));
    expect(mockPush).toHaveBeenCalledWith('/explore/circles/circle-99');
  });

  it('shows error empty state when loading fails', () => {
    mockCirclesError = { message: '网络错误' };
    mockCirclesData = undefined;
    const { getByTestId, getByText } = render(<CirclesScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('加载失败')).toBeTruthy();
  });

  it('renders category filter tabs', () => {
    mockCirclesData = { items: [] };
    const { getByText } = render(<CirclesScreen />);
    expect(getByText('全部')).toBeTruthy();
    expect(getByText('读书')).toBeTruthy();
    expect(getByText('健身')).toBeTruthy();
  });
});
