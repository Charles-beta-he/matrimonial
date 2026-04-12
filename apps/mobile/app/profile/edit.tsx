import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Avatar, Button, Input, PromptCard, TagSelector } from '@matrimonial/ui';
import { ALL_TAGS, PROMPT_QUESTIONS, TAG_CATEGORIES } from '@matrimonial/shared';
import { useAppStore } from '../../stores/useAppStore';
import { useUpload } from '../../hooks/useUpload';

const EDUCATION_OPTIONS = ['高中', '大专', '本科', '硕士', '博士'];
const INCOME_OPTIONS = ['5K以下', '5-10K', '10-20K', '20-50K', '50K以上'];
const ZODIAC_OPTIONS = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
];
const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

/** Profile edit screen */
export default function ProfileEditScreen() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => (s as any).setUser);
  const { pickAndUpload, uploading } = useUpload();
  const [avatarUrl, setAvatarUrl] = useState<string>(
    (user as any)?.avatar ?? 'https://picsum.photos/seed/me/200/200',
  );

  const handleChangeAvatar = async () => {
    const result = await pickAndUpload('avatar');
    if (result) {
      setAvatarUrl(result.publicUrl);
      if (typeof setUser === 'function' && user) {
        setUser({ ...user, avatar: result.publicUrl });
      }
    }
  };

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [height, setHeight] = useState(user?.height?.toString() ?? '');
  const [education, setEducation] = useState('本科');
  const [occupation, setOccupation] = useState(user?.occupation ?? '');
  const [income, setIncome] = useState('10-20K');
  const [hometown, setHometown] = useState(user?.hometown ?? '');
  const [zodiac, setZodiac] = useState(user?.zodiac ?? '');
  const [mbti, setMbti] = useState(user?.mbti ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(user?.tags ?? []);

  const handleSave = () => {
    // TODO: call api.user.updateProfile
    Alert.alert('保存成功', '你的资料已更新');
    router.back();
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white">
        <Pressable onPress={() => router.back()}>
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">编辑资料</Text>
        <Pressable onPress={handleSave}>
          <Text className="text-rose-500 font-medium">保存</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View className="items-center py-6 bg-white">
          <Pressable onPress={handleChangeAvatar} disabled={uploading}>
            <Avatar source={{ uri: avatarUrl }} size={80} />
            <View className="absolute bottom-0 right-0 bg-rose-500 rounded-full w-7 h-7 items-center justify-center border-2 border-white">
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-xs">📷</Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* Photo grid placeholder */}
        <View className="bg-white mt-2 p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">照片</Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Pressable
                key={i}
                className="bg-gray-100 rounded-xl items-center justify-center"
                style={{ width: '31%', aspectRatio: 1 }}
                onPress={() => Alert.alert('照片', '功能开发中')}
              >
                <Text className="text-2xl text-gray-300">+</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Form fields */}
        <View className="bg-white mt-2 p-4" style={{ gap: 12 }}>
          <Input label="昵称" value={nickname} onChangeText={setNickname} maxLength={20} />
          <Input
            label="个人简介"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={200}
            placeholder="介绍一下自己..."
          />
          <Input label="身高 (cm)" value={height} onChangeText={setHeight} placeholder="170" />
          <Input label="职业" value={occupation} onChangeText={setOccupation} />
          <Input label="家乡" value={hometown} onChangeText={setHometown} />

          {/* Education picker */}
          <View>
            <Text className="text-sm text-gray-600 mb-2">学历</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
              <View className="flex-row" style={{ gap: 8 }}>
                {EDUCATION_OPTIONS.map((e) => (
                  <Pressable
                    key={e}
                    className={`rounded-full px-4 py-2 ${
                      education === e ? 'bg-rose-500' : 'bg-gray-100'
                    }`}
                    onPress={() => setEducation(e)}
                  >
                    <Text className={`text-sm ${education === e ? 'text-white' : 'text-gray-700'}`}>
                      {e}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Income picker */}
          <View>
            <Text className="text-sm text-gray-600 mb-2">收入</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row" style={{ gap: 8 }}>
                {INCOME_OPTIONS.map((i) => (
                  <Pressable
                    key={i}
                    className={`rounded-full px-4 py-2 ${
                      income === i ? 'bg-rose-500' : 'bg-gray-100'
                    }`}
                    onPress={() => setIncome(i)}
                  >
                    <Text className={`text-sm ${income === i ? 'text-white' : 'text-gray-700'}`}>
                      {i}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Zodiac */}
          <View>
            <Text className="text-sm text-gray-600 mb-2">星座</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {ZODIAC_OPTIONS.map((z) => (
                <Pressable
                  key={z}
                  className={`rounded-full px-3 py-1.5 ${
                    zodiac === z ? 'bg-rose-500' : 'bg-gray-100'
                  }`}
                  onPress={() => setZodiac(z)}
                >
                  <Text className={`text-xs ${zodiac === z ? 'text-white' : 'text-gray-700'}`}>
                    {z}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* MBTI */}
          <View>
            <Text className="text-sm text-gray-600 mb-2">MBTI</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {MBTI_OPTIONS.map((m) => (
                <Pressable
                  key={m}
                  className={`rounded-full px-3 py-1.5 ${
                    mbti === m ? 'bg-rose-500' : 'bg-gray-100'
                  }`}
                  onPress={() => setMbti(m)}
                >
                  <Text className={`text-xs ${mbti === m ? 'text-white' : 'text-gray-700'}`}>
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Prompt cards */}
        <View className="bg-white mt-2 p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">自我介绍</Text>
          {PROMPT_QUESTIONS.slice(0, 3).map((q) => (
            <View key={q.id} className="mb-3">
              <PromptCard
                question={q.text}
                answer="点击编辑你的回答..."
                onPress={() => Alert.alert(q.text, '编辑功能开发中')}
              />
            </View>
          ))}
        </View>

        {/* Tags */}
        <View className="bg-white mt-2 p-4">
          <Text className="text-base font-semibold text-gray-900 mb-1">个性标签</Text>
          <Text className="text-xs text-gray-400 mb-3">已选 {selectedTags.length}/5</Text>
          <TagSelector
            tags={ALL_TAGS as unknown as string[]}
            selectedTags={selectedTags}
            onToggle={handleToggleTag}
            max={5}
          />
        </View>

        {/* Save button */}
        <View className="p-4">
          <Button title="保存" variant="primary" size="lg" fullWidth onPress={handleSave} />
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
