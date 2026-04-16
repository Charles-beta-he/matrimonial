import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

let TermsOfService: React.ComponentType;
beforeAll(() => {
  TermsOfService = require('../../app/legal/terms').default;
});

describe('TermsOfService', () => {
  it('renders title', () => {
    const { getByText } = render(<TermsOfService />);
    expect(getByText('用户服务协议')).toBeTruthy();
  });

  it('renders service section', () => {
    const { getByText } = render(<TermsOfService />);
    expect(getByText(/服务说明/)).toBeTruthy();
  });

  it('renders update date', () => {
    const { getByText } = render(<TermsOfService />);
    expect(getByText(/更新日期/)).toBeTruthy();
  });
});
