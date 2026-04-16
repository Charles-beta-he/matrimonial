import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

let PrivacyPolicy: React.ComponentType;
beforeAll(() => {
  PrivacyPolicy = require('../../app/legal/privacy').default;
});

describe('PrivacyPolicy', () => {
  it('renders title', () => {
    const { getByText } = render(<PrivacyPolicy />);
    expect(getByText('隐私保护政策')).toBeTruthy();
  });

  it('renders section headings', () => {
    const { getByText } = render(<PrivacyPolicy />);
    expect(getByText(/信息收集范围/)).toBeTruthy();
  });

  it('renders update date', () => {
    const { getByText } = render(<PrivacyPolicy />);
    expect(getByText(/更新日期/)).toBeTruthy();
  });
});
