import { useState } from 'react';
import { ScrollView, Switch, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface PrivacySetting {
  key: string;
  title: string;
  description: string;
  memberOnly?: boolean;
}

const SETTINGS: PrivacySetting[] = [
  {
    key: 'blurPhotos',
    title: '照片模糊',
    description: '未匹配的用户看到模糊照片，匹配后才能看清',
  },
  {
    key: 'incognito',
    title: '隐身模式',
    description: '浏览他人资料时不留下访问记录',
    memberOnly: true,
  },
  {
    key: 'blockContacts',
    title: '屏蔽通讯录',
    description: '通讯录中的联系人将不会在推荐中出现',
  },
  {
    key: 'blurLocation',
    title: '位置模糊',
    description: '只显示大概距离范围，不显示精确位置',
  },
  {
    key: 'disableVisitors',
    title: '关闭访客记录',
    description: '你不会出现在其他人的访客列表中',
  },
];

/** Privacy settings screen */
export default function PrivacyScreen() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, boolean>>({
    blurPhotos: false,
    incognito: false,
    blockContacts: false,
    blurLocation: true,
    disableVisitors: false,
  });

  const toggleSetting = (key: string) => {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">隐私设置</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="bg-white mt-2">
          {SETTINGS.map((setting, index) => (
            <View key={setting.key}>
              <View className="flex-row items-center justify-between px-4 py-4">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center">
                    <Text className="text-base text-gray-900">{setting.title}</Text>
                    {setting.memberOnly && (
                      <View className="bg-rose-100 rounded-full px-2 py-0.5 ml-2">
                        <Text className="text-xs text-rose-500">会员</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm text-gray-400 mt-0.5">
                    {setting.description}
                  </Text>
                </View>
                <Switch
                  value={values[setting.key] ?? false}
                  onValueChange={() => toggleSetting(setting.key)}
                  trackColor={{ false: '#d1d5db', true: '#fda4af' }}
                  thumbColor={values[setting.key] ? '#f43f5e' : '#f4f4f5'}
                />
              </View>
              {index < SETTINGS.length - 1 && (
                <View className="border-b border-gray-100 ml-4" />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
