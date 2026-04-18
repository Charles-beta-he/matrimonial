import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withSequence, Easing } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Input, PromptCard, TagSelector, toast } from '@matrimonial/ui';
import { ALL_TAGS, PROMPT_QUESTIONS } from '@matrimonial/shared';
import { api } from '@matrimonial/api-client';
import { useAppStore } from '../../stores/useAppStore';
import { useUpload } from '../../hooks/useUpload';
import { PressScale } from '../../components/PressScale';
import { ScalePressable } from '../../components/ScalePressable';

const EDUCATION_LABEL_TO_ENUM: Record<string, 'HIGH_SCHOOL' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'PHD'> = {
  '高中': 'HIGH_SCHOOL',
  '大专': 'ASSOCIATE',
  '本科': 'BACHELOR',
  '硕士': 'MASTER',
  '博士': 'PHD',
};
const EDUCATION_ENUM_TO_LABEL: Record<string, string> = {
  HIGH_SCHOOL: '高中',
  ASSOCIATE: '大专',
  BACHELOR: '本科',
  MASTER: '硕士',
  PHD: '博士',
};

const EDUCATION_OPTIONS = ['高中', '大专', '本科', '硕士', '博士'];
const INCOME_OPTIONS = ['5K以下', '5-10K', '10-20K', '20-50K', '50K以上'];
const INCOME_LABEL_TO_ENUM: Record<string, 'BELOW_5K' | 'K5_10' | 'K10_20' | 'K20_50' | 'ABOVE_50K'> = {
  '5K以下': 'BELOW_5K',
  '5-10K': 'K5_10',
  '10-20K': 'K10_20',
  '20-50K': 'K20_50',
  '50K以上': 'ABOVE_50K',
};
const INCOME_ENUM_TO_LABEL: Record<string, string> = {
  BELOW_5K: '5K以下',
  K5_10: '5-10K',
  K10_20: '10-20K',
  K20_50: '20-50K',
  ABOVE_50K: '50K以上',
};
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

  // Entrance animations
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-16);
  const avatarScale = useSharedValue(0.85);
  const avatarOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(24);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 300, easing: e });
    headerY.value = withTiming(0, { duration: 300, easing: e });
    avatarScale.value = withDelay(80, withSpring(1, { damping: 14, stiffness: 180 }));
    avatarOpacity.value = withDelay(80, withTiming(1, { duration: 250 }));
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 350, easing: e }));
    contentY.value = withDelay(180, withTiming(0, { duration: 350, easing: e }));
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));
  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [{ scale: avatarScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const saveScale = useSharedValue(1);
  const saveStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));

  const storeUser = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => (s as any).setUser);
  const { pickAndUpload, uploading } = useUpload();
  const meQuery = api.user.me.useQuery();
  const utils = api.useUtils();
  const updateMut = api.user.updateProfile.useMutation();
  const updatePromptsMut = api.user.updatePrompts.useMutation();
  const evaluatePromptMut = api.ai.evaluatePrompt.useMutation();
  const user: any = meQuery.data ?? storeUser;

  // Prompt editing state
  const [editingPromptIdx, setEditingPromptIdx] = useState<number | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [promptEval, setPromptEval] = useState<{ score: number; suggestion?: string } | null>(null);
  const evalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>(
    (user as any)?.photos?.[0]?.url ??
      (user as any)?.avatar ??
      'https://picsum.photos/seed/me/200/200',
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

  const [nickname, setNickname] = useState<string>((user?.nickname as string | undefined) ?? '');
  const [bio, setBio] = useState<string>((user?.bio as string | undefined) ?? '');
  const [height, setHeight] = useState<string>(
    user?.height != null ? String(user.height) : '',
  );
  const [education, setEducation] = useState<string>(
    user?.education ? (EDUCATION_ENUM_TO_LABEL[user.education] ?? '本科') : '本科',
  );
  const [occupation, setOccupation] = useState<string>((user?.occupation as string | undefined) ?? '');
  const [income, setIncome] = useState<string>(
    user?.incomeRange ? (INCOME_ENUM_TO_LABEL[user.incomeRange] ?? '10-20K') : '10-20K',
  );
  const [hometown, setHometown] = useState<string>((user?.hometown as string | undefined) ?? '');
  const [zodiac, setZodiac] = useState<string>((user?.zodiac as string | undefined) ?? '');
  const [mbti, setMbti] = useState<string>((user?.mbti as string | undefined) ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    Array.isArray(user?.tags)
      ? user.tags.map((t: any) => (typeof t === 'string' ? t : t?.tag)).filter(Boolean)
      : [],
  );

  // Prompts state: array of { questionId, answerText }
  const [prompts, setPrompts] = useState<{ questionId: string; answerText: string }[]>(
    Array.isArray(user?.prompts)
      ? user.prompts.map((p: any) => ({ questionId: p.questionId, answerText: p.answerText ?? '' }))
      : PROMPT_QUESTIONS.slice(0, 3).map((q) => ({ questionId: q.id, answerText: '' })),
  );

  // Hydrate fields once user data arrives
  useEffect(() => {
    if (!meQuery.data) return;
    const u: any = meQuery.data;
    setNickname((prev) => prev || u.nickname || '');
    setBio((prev) => prev || u.bio || '');
    setHeight((prev) => prev || (u.height ? String(u.height) : ''));
    if (u.education) {
      setEducation(EDUCATION_ENUM_TO_LABEL[u.education] ?? '本科');
    }
    setOccupation((prev) => prev || u.occupation || '');
    if (u.incomeRange) {
      setIncome(INCOME_ENUM_TO_LABEL[u.incomeRange] ?? '10-20K');
    }
    setHometown((prev) => prev || u.hometown || '');
    setZodiac((prev) => prev || u.zodiac || '');
    setMbti((prev) => prev || u.mbti || '');
    if (Array.isArray(u.tags) && u.tags.length > 0) {
      setSelectedTags(
        u.tags.map((t: any) => (typeof t === 'string' ? t : t?.tag)).filter(Boolean),
      );
    }
    if (Array.isArray(u.prompts) && u.prompts.length > 0) {
      setPrompts(u.prompts.map((p: any) => ({ questionId: p.questionId, answerText: p.answerText ?? '' })));
    }
    if (u.photos?.[0]?.url) setAvatarUrl(u.photos[0].url);
  }, [meQuery.data]);

  // Debounced prompt quality evaluation
  useEffect(() => {
    setPromptEval(null);
    if (editingPromptIdx === null || promptDraft.length < 20) return;
    if (evalDebounceRef.current) clearTimeout(evalDebounceRef.current);
    evalDebounceRef.current = setTimeout(() => {
      const questionText =
        PROMPT_QUESTIONS.find((q) => q.id === prompts[editingPromptIdx]?.questionId)?.text ?? '';
      if (!questionText) return;
      evaluatePromptMut.mutate(
        { question: questionText, answer: promptDraft },
        { onSuccess: (data) => setPromptEval(data) },
      );
    }, 2000);
    return () => {
      if (evalDebounceRef.current) clearTimeout(evalDebounceRef.current);
    };
  }, [promptDraft, editingPromptIdx]);

  const handleSave = async () => {
    saveScale.value = withSequence(
      withSpring(0.96, { damping: 10, stiffness: 400 }),
      withSpring(1.04, { damping: 8, stiffness: 280 }),
      withSpring(1.0, { damping: 12, stiffness: 240 }),
    );
    const payload: Record<string, any> = {};
    if (nickname && nickname.length >= 2) payload.nickname = nickname;
    if (bio !== undefined) payload.bio = bio;
    if (height) {
      const h = parseInt(height, 10);
      if (!Number.isNaN(h)) payload.height = h;
    }
    if (occupation) payload.occupation = occupation;
    if (hometown) payload.hometown = hometown;
    if (zodiac) payload.zodiac = zodiac;
    if (mbti) payload.mbti = mbti;
    if (education && EDUCATION_LABEL_TO_ENUM[education]) {
      payload.education = EDUCATION_LABEL_TO_ENUM[education];
    }
    if (income && INCOME_LABEL_TO_ENUM[income]) {
      payload.incomeRange = INCOME_LABEL_TO_ENUM[income];
    }
    if (selectedTags.length >= 3 && selectedTags.length <= 5) {
      payload.tags = selectedTags;
    }

    try {
      await updateMut.mutateAsync(payload as any);
      toast.success('资料已更新');
      await utils.user.me.invalidate();
      router.back();
    } catch (err: any) {
      toast.error(err?.message ?? '保存失败');
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View className="px-4 py-3 bg-white" style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerStyle]}>
        <ScalePressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </ScalePressable>
        <Text className="text-lg font-semibold text-gray-900">编辑资料</Text>
        <PressScale onPress={handleSave}>
          {updateMut.isPending ? (
            <ActivityIndicator size="small" color="#f43f5e" />
          ) : (
            <Text className="text-rose-500 font-medium">保存</Text>
          )}
        </PressScale>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <Animated.View className="items-center py-6 bg-white" style={avatarStyle}>
          <ScalePressable onPress={handleChangeAvatar} disabled={uploading}>
            <Avatar source={{ uri: avatarUrl }} size={80} />
            <View className="absolute bottom-0 right-0 bg-rose-500 rounded-full w-7 h-7 items-center justify-center border-2 border-white">
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#ffffff" />
              )}
            </View>
          </ScalePressable>
        </Animated.View>

        <Animated.View style={contentStyle}>
        {/* Photo grid placeholder */}
        <View className="bg-white mt-2 p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">照片</Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ScalePressable
                key={i}
                className="bg-gray-100 rounded-xl items-center justify-center"
                style={{ width: '31%', aspectRatio: 1 }}
                onPress={() => Alert.alert('照片', '功能开发中')}
              >
                <Text className="text-2xl text-gray-300">+</Text>
              </ScalePressable>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 44 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
              <View className="flex-row" style={{ gap: 8 }}>
                {EDUCATION_OPTIONS.map((e) => (
                  <ScalePressable
                    key={e}
                    className={`rounded-full px-4 py-2 ${
                      education === e ? 'bg-rose-500' : 'bg-gray-100'
                    }`}
                    onPress={() => setEducation(e)}
                  >
                    <Text className={`text-sm ${education === e ? 'text-white' : 'text-gray-700'}`}>
                      {e}
                    </Text>
                  </ScalePressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Income picker */}
          <View>
            <Text className="text-sm text-gray-600 mb-2">收入</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 44 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
              <View className="flex-row" style={{ gap: 8 }}>
                {INCOME_OPTIONS.map((i) => (
                  <ScalePressable
                    key={i}
                    className={`rounded-full px-4 py-2 ${
                      income === i ? 'bg-rose-500' : 'bg-gray-100'
                    }`}
                    onPress={() => setIncome(i)}
                  >
                    <Text className={`text-sm ${income === i ? 'text-white' : 'text-gray-700'}`}>
                      {i}
                    </Text>
                  </ScalePressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Zodiac */}
          <View>
            <Text className="text-sm text-gray-600 mb-2">星座</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {ZODIAC_OPTIONS.map((z) => (
                <ScalePressable
                  key={z}
                  className={`rounded-full px-3 py-1.5 ${
                    zodiac === z ? 'bg-rose-500' : 'bg-gray-100'
                  }`}
                  onPress={() => setZodiac(z)}
                >
                  <Text className={`text-xs ${zodiac === z ? 'text-white' : 'text-gray-700'}`}>
                    {z}
                  </Text>
                </ScalePressable>
              ))}
            </View>
          </View>

          {/* MBTI */}
          <View>
            <Text className="text-sm text-gray-600 mb-2">MBTI</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {MBTI_OPTIONS.map((m) => (
                <ScalePressable
                  key={m}
                  className={`rounded-full px-3 py-1.5 ${
                    mbti === m ? 'bg-rose-500' : 'bg-gray-100'
                  }`}
                  onPress={() => setMbti(m)}
                >
                  <Text className={`text-xs ${mbti === m ? 'text-white' : 'text-gray-700'}`}>
                    {m}
                  </Text>
                </ScalePressable>
              ))}
            </View>
          </View>
        </View>

        {/* Prompt cards */}
        <View className="bg-white mt-2 p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">自我介绍</Text>
          {prompts.slice(0, 3).map((p, idx) => {
            const question = PROMPT_QUESTIONS.find((q) => q.id === p.questionId);
            const questionText = question?.text ?? p.questionId;
            return (
              <View key={p.questionId} className="mb-3">
                <PromptCard
                  question={questionText}
                  answer={p.answerText || '点击编辑你的回答...'}
                  onPress={() => {
                    setEditingPromptIdx(idx);
                    setPromptDraft(p.answerText);
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* Prompt edit modal */}
        <Modal
          visible={editingPromptIdx !== null}
          transparent
          animationType="slide"
          onRequestClose={() => { setEditingPromptIdx(null); setPromptEval(null); }}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-2xl p-6">
              {editingPromptIdx !== null && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    {PROMPT_QUESTIONS.find((q) => q.id === prompts[editingPromptIdx]?.questionId)?.text ?? ''}
                  </Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl p-3 text-sm text-gray-800 min-h-[80px]"
                    value={promptDraft}
                    onChangeText={setPromptDraft}
                    placeholder="写下你的回答..."
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  {/* AI quality feedback */}
                  {evaluatePromptMut.isPending && (
                    <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
                      <ActivityIndicator size="small" color="#f43f5e" />
                      <Text className="text-xs text-gray-400">AI 评估中...</Text>
                    </View>
                  )}
                  {promptEval && !evaluatePromptMut.isPending && (
                    <View
                      className="mt-2 rounded-xl px-3 py-2"
                      style={{ backgroundColor: promptEval.score >= 7 ? '#f0fdf4' : promptEval.score >= 4 ? '#fffbeb' : '#fff1f2' }}
                    >
                      <View className="flex-row items-center" style={{ gap: 6 }}>
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: promptEval.score >= 7 ? '#16a34a' : promptEval.score >= 4 ? '#d97706' : '#e11d48' }}
                        >
                          吸引力评分 {promptEval.score}/10
                        </Text>
                      </View>
                      {promptEval.suggestion ? (
                        <Text className="text-xs text-gray-500 mt-0.5">{promptEval.suggestion}</Text>
                      ) : null}
                    </View>
                  )}
                  <View className="flex-row mt-4" style={{ gap: 12 }}>
                    <ScalePressable
                      className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
                      onPress={() => { setEditingPromptIdx(null); setPromptEval(null); }}
                    >
                      <Text className="text-sm text-gray-600">取消</Text>
                    </ScalePressable>
                    <PressScale
                      style={{ flex: 1 }}
                      onPress={async () => {
                        const updated = prompts.map((p, i) =>
                          i === editingPromptIdx ? { ...p, answerText: promptDraft } : p,
                        );
                        try {
                          await updatePromptsMut.mutateAsync(
                            updated.map((p, i) => ({
                              questionId: p.questionId,
                              answerText: p.answerText,
                              order: i,
                            })),
                          );
                          setPrompts(updated);
                          toast.success('回答已保存');
                        } catch (err: any) {
                          toast.error(err?.message ?? '保存失败');
                        }
                        setEditingPromptIdx(null);
                        setPromptEval(null);
                      }}
                    >
                      <View className="py-3 rounded-xl bg-rose-500 items-center">
                        {updatePromptsMut.isPending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text className="text-sm text-white font-medium">保存</Text>
                        )}
                      </View>
                    </PressScale>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

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
        <Animated.View className="p-4" style={saveStyle}>
          <Button
            title={updateMut.isPending ? '保存中...' : '保存'}
            variant="primary"
            size="lg"
            fullWidth
            disabled={updateMut.isPending}
            onPress={handleSave}
          />
        </Animated.View>

        <View className="h-8" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
