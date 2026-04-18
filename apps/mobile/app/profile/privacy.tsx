import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, View, Pressable } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';

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
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-14);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));
  const meQuery = api.user.me.useQuery();
  const utils = api.useUtils();
  const updatePrivacy = api.user.updatePrivacy.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate();
    },
  });

  // Local state mirrors server values; initialised from `me` query
  const [values, setValues] = useState<Record<string, boolean>>({
    blurPhotos: false,
    incognito: false,
    blockContacts: false,
    blurLocation: true,
    disableVisitors: false,
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Sync local state when server data loads
  useEffect(() => {
    if (meQuery.data) {
      const u = meQuery.data as Record<string, unknown>;
      setValues({
        blurPhotos: (u.privacyBlurPhotos as boolean) ?? false,
        incognito: (u.privacyIncognito as boolean) ?? false,
        blockContacts: (u.privacyBlockContacts as boolean) ?? false,
        blurLocation: (u.privacyBlurLocation as boolean) ?? true,
        disableVisitors: (u.privacyDisableVisitors as boolean) ?? false,
      });
    }
  }, [meQuery.data]);

  /** Hash phone numbers from contacts and upload them */
  const uploadBlockedContacts = useCallback(async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要通讯录权限才能屏蔽联系人');
        return null;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      const phones: string[] = [];
      for (const contact of data) {
        if (contact.phoneNumbers) {
          for (const pn of contact.phoneNumbers) {
            if (pn.number) {
              // Normalise: strip non-digit chars
              const normalised = pn.number.replace(/\D/g, '');
              if (normalised.length >= 7) phones.push(normalised);
            }
          }
        }
      }
      // Dedupe
      const unique = [...new Set(phones)];
      // SHA256 hash each phone
      const hashes: string[] = [];
      for (const phone of unique) {
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          phone,
        );
        hashes.push(hash);
      }
      return hashes;
    } catch {
      Alert.alert('错误', '读取通讯录失败');
      return null;
    }
  }, []);

  const toggleSetting = useCallback(
    async (key: string) => {
      const newValue = !values[key];

      // Membership gate for incognito
      if (key === 'incognito' && newValue) {
        const membership = (meQuery.data as Record<string, unknown>)?.membership as string | null;
        if (!membership || membership === 'FREE') {
          Alert.alert('会员专享', '隐身模式为会员专属功能，请先升级会员');
          return;
        }
      }

      setSavingKey(key);

      try {
        const mutation: Record<string, unknown> = { [key]: newValue };

        // When enabling blockContacts, read and hash contact phone numbers
        if (key === 'blockContacts' && newValue) {
          const hashes = await uploadBlockedContacts();
          if (hashes === null) {
            setSavingKey(null);
            return; // Permission denied or error
          }
          mutation.blockedPhoneHashes = hashes;
        }
        // When disabling blockContacts, clear the hashes
        if (key === 'blockContacts' && !newValue) {
          mutation.blockedPhoneHashes = [];
        }

        await updatePrivacy.mutateAsync(mutation as any);
        setValues((prev) => ({ ...prev, [key]: newValue }));
      } catch {
        Alert.alert('保存失败', '隐私设置保存失败，请稍后重试');
      } finally {
        setSavingKey(null);
      }
    },
    [values, meQuery.data, updatePrivacy, uploadBlockedContacts],
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100" style={headerStyle}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">隐私设置</Text>
      </Animated.View>

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
                {savingKey === setting.key ? (
                  <ActivityIndicator size="small" color="#f43f5e" />
                ) : (
                  <Switch
                    value={values[setting.key] ?? false}
                    onValueChange={() => toggleSetting(setting.key)}
                    trackColor={{ false: '#d1d5db', true: '#fda4af' }}
                    thumbColor={values[setting.key] ? '#f43f5e' : '#f4f4f5'}
                    disabled={savingKey !== null || meQuery.isLoading}
                  />
                )}
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
