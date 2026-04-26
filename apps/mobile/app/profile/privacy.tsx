import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@matrimonial/api-client';
import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { colors } from '../../constants/colors';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useScreenTracking } from '../../hooks/useAnalytics';

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

interface PrivacySettingRowProps {
  setting: PrivacySetting;
  value: boolean;
  saving: boolean;
  loading: boolean;
  onToggle: () => void;
  showDivider: boolean;
}

function PrivacySettingRow({ setting, value, saving, loading, onToggle, showDivider }: PrivacySettingRowProps) {
  return (
    <View
      key={setting.key}
      style={[
        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
        showDivider ? { borderBottomWidth: 1, borderBottomColor: '#f4f0ea' } : undefined,
      ]}
    >
      <View style={{ flex: 1, marginRight: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>{setting.title}</Text>
          {setting.memberOnly ? (
            <View
              style={{
                backgroundColor: '#fff1f2',
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
                marginLeft: 8,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#e11d48', letterSpacing: 0.4 }}>
                会员
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, lineHeight: 16 }}>
          {setting.description}
        </Text>
      </View>
      {saving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.gray300, true: colors.primaryMuted }}
          thumbColor={value ? colors.primary : colors.white}
          disabled={loading}
        />
      )}
    </View>
  );
}

/** Privacy settings screen */
export default function PrivacyScreen() {
  useScreenTracking('privacy');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="隐私设置" noBorder />

      <ScrollView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 13,
              color: '#6b7280',
              lineHeight: 20,
              marginBottom: 18,
            }}
          >
            控制谁能看到你、看到多少。会员功能可解锁更多细节。
          </Text>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#eef0f3',
              overflow: 'hidden',
            }}
          >
            {SETTINGS.map((setting, index) => (
              <PrivacySettingRow
                key={setting.key}
                setting={setting}
                value={values[setting.key] ?? false}
                saving={savingKey === setting.key}
                loading={savingKey !== null || meQuery.isLoading}
                onToggle={() => toggleSetting(setting.key)}
                showDivider={index < SETTINGS.length - 1}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
