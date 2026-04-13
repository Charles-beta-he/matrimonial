import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';

/** Buddy square screen — coming soon */
export default function BuddyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">搭子广场</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={<Ionicons name="people-outline" size={56} color="#9ca3af" />}
          title="功能开发中"
          description="搭子广场即将上线"
        />
      </View>
    </SafeAreaView>
  );
}
