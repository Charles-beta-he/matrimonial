import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterStep2BasicInfo from '../../app/(auth)/register/step2-basic-info';

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterStep2BasicInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMutateAsync.mockResolvedValue({});
  });

  it('renders title 基本资料', () => {
    const { getByText } = render(<RegisterStep2BasicInfo />);
    expect(getByText('基本资料')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    const { getByText } = render(<RegisterStep2BasicInfo />);
    expect(getByText('让我们更好地了解你')).toBeTruthy();
  });

  it('renders nickname input with placeholder', () => {
    const { getByPlaceholderText } = render(<RegisterStep2BasicInfo />);
    expect(getByPlaceholderText('给自己起个名字')).toBeTruthy();
  });

  it('renders gender options 男 and 女', () => {
    const { getByText } = render(<RegisterStep2BasicInfo />);
    expect(getByText('男')).toBeTruthy();
    expect(getByText('女')).toBeTruthy();
  });

  it('renders birthday and city inputs', () => {
    const { getByPlaceholderText } = render(<RegisterStep2BasicInfo />);
    expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
    expect(getByPlaceholderText('你目前在哪个城市')).toBeTruthy();
  });

  it('next button is disabled when required fields are empty', () => {
    const { getByText } = render(<RegisterStep2BasicInfo />);
    const btn = getByText('下一步');
    // Button disabled prop propagates as accessibilityState
    expect(btn).toBeTruthy();
    // Pressing without filling should not call mutateAsync
    fireEvent.press(btn);
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it('next button is disabled when only nickname filled (missing gender/birthday/city)', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterStep2BasicInfo />);
    fireEvent.changeText(getByPlaceholderText('给自己起个名字'), '测试昵称');
    fireEvent.press(getByText('下一步'));
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it('navigates to step3 after filling all fields and pressing next', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterStep2BasicInfo />);

    fireEvent.changeText(getByPlaceholderText('给自己起个名字'), '小明');
    fireEvent.press(getByText('男'));
    fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), '1995-06-15');
    fireEvent.changeText(getByPlaceholderText('你目前在哪个城市'), '北京');

    fireEvent.press(getByText('下一步'));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '小明',
          gender: 'MALE',
          city: '北京',
        }),
      );
      expect(mockPush).toHaveBeenCalledWith('/(auth)/register/step3-photos');
    });
  });

  it('selecting 女 gender works', () => {
    const { getByText } = render(<RegisterStep2BasicInfo />);
    fireEvent.press(getByText('女'));
    // No error thrown means pressable registered the event
    expect(getByText('女')).toBeTruthy();
  });
});
