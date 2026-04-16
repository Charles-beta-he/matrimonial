import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterStep5Tags from '../../app/(auth)/register/step5-tags';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: jest.fn(), setUserId: jest.fn() }),
}));

const mockUpdateMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@matrimonial/api-client', () => ({
  api: {
    user: {
      updateProfile: {
        useMutation: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
      },
    },
    useUtils: () => ({
      user: {
        me: { invalidate: jest.fn().mockResolvedValue(undefined) },
      },
    }),
  },
}));

// TAG_CATEGORIES comes from @matrimonial/shared which is in the monorepo.
// The jest transformIgnorePatterns already includes @matrimonial/ so it will be
// transformed — no need to mock it.

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterStep5Tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMutateAsync.mockResolvedValue({});
  });

  it('renders title 选择你的标签', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    expect(getByText('选择你的标签')).toBeTruthy();
  });

  it('renders subtitle with selection hint', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    expect(getByText('选择3-5个最能代表你的标签')).toBeTruthy();
  });

  it('renders 完成注册 button', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    expect(getByText('完成注册')).toBeTruthy();
  });

  it('renders tag categories labels', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    expect(getByText('兴趣爱好')).toBeTruthy();
    expect(getByText('生活方式')).toBeTruthy();
    expect(getByText('性格特点')).toBeTruthy();
  });

  it('renders individual tags from TAG_CATEGORIES', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    expect(getByText('读书')).toBeTruthy();
    expect(getByText('旅行')).toBeTruthy();
    expect(getByText('早睡早起')).toBeTruthy();
  });

  it('shows 已选 0/5 initially', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    expect(getByText('已选 0/5')).toBeTruthy();
  });

  it('complete button is disabled with fewer than 3 tags selected', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    fireEvent.press(getByText('完成注册'));
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it('selecting a tag updates selected count display', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    fireEvent.press(getByText('读书'));
    expect(getByText('已选 1/5')).toBeTruthy();
  });

  it('selecting then deselecting a tag toggles it off', () => {
    const { getByText } = render(<RegisterStep5Tags />);
    fireEvent.press(getByText('旅行'));
    expect(getByText('已选 1/5')).toBeTruthy();
    fireEvent.press(getByText('旅行'));
    expect(getByText('已选 0/5')).toBeTruthy();
  });

  it('completes registration after selecting 3+ tags and pressing button', async () => {
    const { getByText } = render(<RegisterStep5Tags />);

    fireEvent.press(getByText('读书'));
    fireEvent.press(getByText('旅行'));
    fireEvent.press(getByText('美食'));

    fireEvent.press(getByText('完成注册'));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['读书', '旅行', '美食']),
        }),
      );
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/register/complete');
    });
  });
});
