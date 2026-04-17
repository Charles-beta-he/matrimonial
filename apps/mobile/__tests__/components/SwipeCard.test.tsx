import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        onStart: function (this: any, _fn: any) { return this; },
        onUpdate: function (this: any, _fn: any) { return this; },
        onEnd: function (this: any, _fn: any) { return this; },
        onFinalize: function (this: any, _fn: any) { return this; },
      }),
    },
    PanGestureHandler: View,
    State: {},
    Directions: {},
  };
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

const mockProfileCard = jest.fn(({ user }: any) => {
  const { View, Text } = require('react-native');
  return (
    <View testID={`profile-card-${user.id}`}>
      <Text testID={`profile-name-${user.id}`}>{user.nickname}</Text>
      <Text testID={`profile-age-${user.id}`}>{user.age}</Text>
    </View>
  );
});

jest.mock('@matrimonial/ui', () => ({
  ProfileCard: (props: any) => mockProfileCard(props),
}));

// ── Lazy import ────────────────────────────────────────────────────────────

let SwipeCard: React.ComponentType<any>;
beforeAll(() => {
  SwipeCard = require('../../components/SwipeCard').SwipeCard;
});

// ── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (id = 'u1') => ({
  id,
  nickname: `User_${id}`,
  age: 26,
  city: 'Shanghai',
  birthday: '1998-06-15',
  photos: [{ url: `https://example.com/${id}.jpg` }],
  tags: [],
  prompts: [],
  verificationLevel: 'L1',
  isOnline: true,
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SwipeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ProfileCard with user data', () => {
    const user = makeUser('u1');
    const { getByTestId } = render(
      <SwipeCard user={user} />,
    );
    expect(getByTestId('profile-card-u1')).toBeTruthy();
  });

  it('passes user nickname to ProfileCard', () => {
    const user = makeUser('u2');
    const { getByTestId } = render(<SwipeCard user={user} />);
    expect(getByTestId('profile-name-u2').props.children).toBe('User_u2');
  });

  it('passes user age to ProfileCard', () => {
    const user = makeUser('u3');
    const { getByTestId } = render(<SwipeCard user={user} />);
    expect(getByTestId('profile-age-u3').props.children).toBe(26);
  });

  it('renders LIKE overlay text', () => {
    const { getByText } = render(<SwipeCard user={makeUser()} />);
    expect(getByText('LIKE')).toBeTruthy();
  });

  it('renders SKIP overlay text', () => {
    const { getByText } = render(<SwipeCard user={makeUser()} />);
    expect(getByText('SKIP')).toBeTruthy();
  });

  it('renders recommend reason pill when provided', () => {
    const { getByText } = render(
      <SwipeCard user={makeUser()} recommendReason="兴趣相投" />,
    );
    expect(getByText('兴趣相投')).toBeTruthy();
  });

  it('does not render recommend reason pill when not provided', () => {
    const { queryByText } = render(<SwipeCard user={makeUser()} />);
    expect(queryByText('兴趣相投')).toBeNull();
  });

  it('renders in next-card mode without LIKE/SKIP overlays', () => {
    const { queryByText } = render(
      <SwipeCard user={makeUser()} isNext />,
    );
    // isNext mode renders just ProfileCard without overlays
    expect(queryByText('LIKE')).toBeNull();
    expect(queryByText('SKIP')).toBeNull();
  });

  it('renders ProfileCard in next-card mode', () => {
    const user = makeUser('u4');
    const { getByTestId } = render(<SwipeCard user={user} isNext />);
    expect(getByTestId('profile-card-u4')).toBeTruthy();
  });

  it('calls ProfileCard with the correct user prop', () => {
    const user = makeUser('u5');
    render(<SwipeCard user={user} />);
    expect(mockProfileCard).toHaveBeenCalledWith(
      expect.objectContaining({ user }),
    );
  });

  it('renders without crashing when optional callbacks are absent', () => {
    expect(() => render(<SwipeCard user={makeUser()} />)).not.toThrow();
  });
});
