import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

const mockAvatar = jest.fn(({ testID }: any) => {
  const { View } = require('react-native');
  return <View testID={testID ?? 'avatar'} />;
});
const mockButton = jest.fn(({ title, onPress }: any) => {
  const { TouchableOpacity, Text } = require('react-native');
  return (
    <TouchableOpacity onPress={onPress} testID={`btn-${title}`}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('@matrimonial/ui', () => ({
  Avatar: (props: any) => mockAvatar(props),
  Button: (props: any) => mockButton(props),
}));

let mockIcebreakersData: any = null;
let mockIcebreakersLoading = false;

jest.mock('@matrimonial/api-client', () => ({
  useIcebreakers: (_id: string, _enabled: boolean) => ({
    data: mockIcebreakersData,
    isLoading: mockIcebreakersLoading,
  }),
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let MatchAnimation: React.ComponentType<any>;
beforeAll(() => {
  MatchAnimation = require('../../components/MatchAnimation').MatchAnimation;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MatchAnimation', () => {
  const defaultProps = {
    myPhoto: 'https://example.com/me.jpg',
    theirPhoto: 'https://example.com/them.jpg',
    theirName: '小明',
    onSendMessage: jest.fn(),
    onContinue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIcebreakersData = null;
    mockIcebreakersLoading = false;
  });

  it('renders "It\'s a Match!" text', () => {
    const { getByText } = render(<MatchAnimation {...defaultProps} />);
    expect(getByText("It's a Match!")).toBeTruthy();
  });

  it('renders matched user name in subtitle', () => {
    const { getByText } = render(<MatchAnimation {...defaultProps} />);
    expect(getByText(/小明/)).toBeTruthy();
  });

  it('renders 发消息 button', () => {
    const { getByText } = render(<MatchAnimation {...defaultProps} />);
    expect(getByText('发消息')).toBeTruthy();
  });

  it('renders 继续浏览 button', () => {
    const { getByText } = render(<MatchAnimation {...defaultProps} />);
    expect(getByText('继续浏览')).toBeTruthy();
  });

  it('calls onSendMessage with no arg when 发消息 button pressed', () => {
    const onSendMessage = jest.fn();
    const { getByTestId } = render(
      <MatchAnimation {...defaultProps} onSendMessage={onSendMessage} />,
    );
    fireEvent.press(getByTestId('btn-发消息'));
    expect(onSendMessage).toHaveBeenCalledWith();
  });

  it('calls onContinue when 继续浏览 button pressed', () => {
    const onContinue = jest.fn();
    const { getByTestId } = render(
      <MatchAnimation {...defaultProps} onContinue={onContinue} />,
    );
    fireEvent.press(getByTestId('btn-继续浏览'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('does not render AI icebreaker section when matchedUserId is not provided', () => {
    const { queryByText } = render(<MatchAnimation {...defaultProps} />);
    expect(queryByText('AI 破冰建议')).toBeNull();
  });

  it('renders AI icebreaker section when matchedUserId is provided', () => {
    const { getByText } = render(
      <MatchAnimation {...defaultProps} matchedUserId="uid-456" />,
    );
    expect(getByText('AI 破冰建议')).toBeTruthy();
  });

  it('shows loading text while icebreakers are loading', () => {
    mockIcebreakersLoading = true;
    const { getByText } = render(
      <MatchAnimation {...defaultProps} matchedUserId="uid-456" />,
    );
    expect(getByText('正在生成建议…')).toBeTruthy();
  });

  it('renders icebreaker suggestions as pressable items', () => {
    mockIcebreakersLoading = false;
    mockIcebreakersData = { suggestions: ['你好，很高兴认识你！', '你喜欢旅行吗？'] };
    const { getByText } = render(
      <MatchAnimation {...defaultProps} matchedUserId="uid-456" />,
    );
    expect(getByText('你好，很高兴认识你！')).toBeTruthy();
    expect(getByText('你喜欢旅行吗？')).toBeTruthy();
  });

  it('calls onSendMessage with icebreaker text when suggestion pressed', () => {
    mockIcebreakersLoading = false;
    mockIcebreakersData = { suggestions: ['你好，很高兴认识你！'] };
    const onSendMessage = jest.fn();
    const { getByText } = render(
      <MatchAnimation {...defaultProps} matchedUserId="uid-456" onSendMessage={onSendMessage} />,
    );
    fireEvent.press(getByText('你好，很高兴认识你！'));
    expect(onSendMessage).toHaveBeenCalledWith('你好，很高兴认识你！');
  });

  it('renders empty suggestion list when api returns empty array', () => {
    mockIcebreakersLoading = false;
    mockIcebreakersData = { suggestions: [] };
    const { getByText, queryByText } = render(
      <MatchAnimation {...defaultProps} matchedUserId="uid-456" />,
    );
    // Section heading still present
    expect(getByText('AI 破冰建议')).toBeTruthy();
    // No suggestion texts
    expect(queryByText('你好，很高兴认识你！')).toBeNull();
  });
});
