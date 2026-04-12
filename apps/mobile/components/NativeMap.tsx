import { Text, View } from 'react-native';

interface Props {
  latitude: number;
  longitude: number;
  title?: string;
}

export default function NativeMap({ latitude, longitude, title }: Props) {
  // TODO: Integrate react-native-maps + AMap plugin for production
  // For now, show a coordinate box
  return (
    <View className="w-full h-72 bg-gray-100 rounded-2xl items-center justify-center">
      <Text className="text-4xl mb-2">📍</Text>
      <Text className="text-base font-semibold text-gray-900">{title ?? '地图位置'}</Text>
      <Text className="text-xs text-gray-500 mt-1">
        {latitude.toFixed(4)}, {longitude.toFixed(4)}
      </Text>
    </View>
  );
}
