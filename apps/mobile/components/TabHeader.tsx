import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface TabHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function TabHeader({ eyebrow, title, subtitle, right }: TabHeaderProps) {
  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 18,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        {eyebrow ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#e11d48',
              letterSpacing: 1.6,
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: '#0b0b0f',
            letterSpacing: -0.4,
            lineHeight: 32,
          }}
          accessibilityRole="header"
          aria-level={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 18 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
