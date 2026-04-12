import * as React from 'react';
import { View } from 'react-native';

interface Props {
  latitude: number;
  longitude: number;
  title?: string;
}

export default function WebMap({ latitude, longitude, title }: Props) {
  // Use Amap (高德) static image API for simplicity in H5
  const amapKey = process.env.EXPO_PUBLIC_AMAP_KEY ?? '';
  const src = amapKey
    ? `https://restapi.amap.com/v3/staticmap?location=${longitude},${latitude}&zoom=15&size=400*300&markers=mid,,A:${longitude},${latitude}&key=${amapKey}`
    : `https://via.placeholder.com/400x300?text=${encodeURIComponent(title ?? 'Map')}`;

  return (
    <View style={{ width: '100%', height: 300 }}>
      {/* img tag is supported by react-native-web at runtime even though
          @types/react-native doesn't declare it as an intrinsic JSX element */}
      {(() => {
        const Img = 'img' as unknown as React.ComponentType<{ src: string; alt: string; style: React.CSSProperties }>;
        return <Img src={src} alt={title ?? 'map'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
      })()}
    </View>
  );
}
