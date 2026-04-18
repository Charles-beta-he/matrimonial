import { useEffect, useState } from 'react';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, toast } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { BUDDY_TYPES, BUDDY_TYPE_COLORS, type BuddyType } from '@matrimonial/shared';

export default function BuddyCreateScreen() {
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

  const [selectedType, setSelectedType] = useState<BuddyType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maxPeople, setMaxPeople] = useState(2);

  const createMut = api.buddy.create.useMutation({
    onSuccess: () => {
      toast.success('发布成功');
      router.back();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? '发布失败');
    },
  });

  const titleCountProgress = useSharedValue(0);
  const descCountProgress = useSharedValue(0);
  useEffect(() => {
    const p = title.length / 50;
    titleCountProgress.value = withTiming(p, { duration: 120 });
    if (title.length > 0) {
      withSequence(withTiming(1.15, { duration: 60 }), withSpring(1, { damping: 10 }));
    }
  }, [title.length]);
  useEffect(() => {
    descCountProgress.value = withTiming(description.length / 500, { duration: 120 });
  }, [description.length]);
  const titleCountStyle = useAnimatedStyle(() => ({
    color: interpolateColor(titleCountProgress.value, [0, 0.7, 1], ['#9ca3af', '#9ca3af', '#ef4444']),
  }));
  const descCountStyle = useAnimatedStyle(() => ({
    color: interpolateColor(descCountProgress.value, [0, 0.8, 1], ['#9ca3af', '#9ca3af', '#ef4444']),
  }));

  const canSubmit =
    selectedType !== null &&
    title.trim().length > 0 &&
    title.trim().length <= 50 &&
    description.trim().length >= 10 &&
    description.trim().length <= 500;

  const handleSubmit = () => {
    if (!canSubmit || !selectedType) return;
    createMut.mutate({
      type: selectedType,
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      scheduledAt: scheduledAt?.toISOString() ?? undefined,
      maxPeople: maxPeople,
    });
  };

  // Generate upcoming date options
  const getDateOptions = () => {
    const options: { label: string; date: Date }[] = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const label =
        i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : `${d.getMonth() + 1}月${d.getDate()}日`;
      options.push({ label, date: d });
    }
    return options;
  };

  const TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00',
  ];

  const handleDateSelect = (dateOption: { label: string; date: Date }) => {
    setDateText(dateOption.label);
    if (timeText) {
      const [hh, mm] = timeText.split(':').map(Number);
      const d = new Date(dateOption.date);
      d.setHours(hh, mm, 0, 0);
      setScheduledAt(d);
    } else {
      // Store partial date, time not yet chosen
      setScheduledAt(dateOption.date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setTimeText(time);
    const [hh, mm] = time.split(':').map(Number);
    const base = scheduledAt ?? new Date();
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0, 0);
    setScheduledAt(d);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <Animated.View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100" style={headerStyle}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">发布搭子帖</Text>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type selector */}
          <Text className="text-base font-semibold text-gray-900 mb-3">
            选择类型 <Text className="text-rose-500">*</Text>
          </Text>
          <View className="flex-row flex-wrap mb-6" style={{ gap: 10 }}>
            {BUDDY_TYPES.map((bt) => {
              const isActive = selectedType === bt.id;
              const color = BUDDY_TYPE_COLORS[bt.id as BuddyType];
              return (
                <Pressable
                  key={bt.id}
                  className={`rounded-xl px-4 py-3 items-center border-2 ${
                    isActive ? 'border-rose-500' : 'border-gray-100'
                  }`}
                  style={{
                    width: '30%',
                    backgroundColor: isActive ? color + '12' : '#f9fafb',
                  }}
                  onPress={() => setSelectedType(bt.id as BuddyType)}
                >
                  <Ionicons
                    name={bt.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={isActive ? color : '#9ca3af'}
                  />
                  <Text
                    className={`text-sm mt-1 ${
                      isActive ? 'font-semibold' : 'text-gray-500'
                    }`}
                    style={isActive ? { color } : undefined}
                  >
                    {bt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Title */}
          <Text className="text-base font-semibold text-gray-900 mb-2">
            标题 <Text className="text-rose-500">*</Text>
          </Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-1"
            placeholder="给你的搭子帖起个名字"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={(t) => setTitle(t.slice(0, 50))}
            maxLength={50}
          />
          <Animated.Text style={[{ fontSize: 12, marginBottom: 20, textAlign: 'right' }, titleCountStyle]}>
            {title.length}/50
          </Animated.Text>

          {/* Description */}
          <Text className="text-base font-semibold text-gray-900 mb-2">
            详细描述 <Text className="text-rose-500">*</Text>
          </Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-1"
            placeholder="描述一下你的计划，至少10个字"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={(t) => setDescription(t.slice(0, 500))}
            maxLength={500}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100 }}
          />
          <Animated.Text style={[{ fontSize: 12, marginBottom: 20, textAlign: 'right' }, descCountStyle]}>
            {description.length}/500
          </Animated.Text>

          {/* Location (optional) */}
          <Text className="text-base font-semibold text-gray-900 mb-2">
            地点 <Text className="text-xs text-gray-400 font-normal">（选填）</Text>
          </Text>
          <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 mb-5">
            <Ionicons name="location-outline" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-900"
              placeholder="活动地点"
              placeholderTextColor="#9ca3af"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Time (optional) */}
          <Text className="text-base font-semibold text-gray-900 mb-2">
            时间 <Text className="text-xs text-gray-400 font-normal">（选填）</Text>
          </Text>
          <Pressable
            className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 mb-2"
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
            <Text
              className={`flex-1 ml-2 text-base ${
                scheduledAt && timeText ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {scheduledAt && timeText
                ? `${dateText || `${scheduledAt.getMonth() + 1}月${scheduledAt.getDate()}日`} ${timeText}`
                : '选择活动时间'}
            </Text>
            {scheduledAt ? (
              <Pressable
                onPress={() => {
                  setScheduledAt(null);
                  setDateText('');
                  setTimeText('');
                  setShowDatePicker(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </Pressable>
            ) : null}
          </Pressable>
          {showDatePicker && (
            <View className="mb-3">
              <Text className="text-sm text-gray-500 mb-2">选择日期</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {getDateOptions().map((opt) => {
                  const isActive = dateText === opt.label;
                  return (
                    <Pressable
                      key={opt.label}
                      className={`rounded-full px-3 py-1.5 ${
                        isActive ? 'bg-rose-500' : 'bg-gray-100'
                      }`}
                      onPress={() => handleDateSelect(opt)}
                    >
                      <Text
                        className={`text-sm ${
                          isActive ? 'text-white font-medium' : 'text-gray-600'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text className="text-sm text-gray-500 mt-3 mb-2">选择时间</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {TIME_SLOTS.map((t) => {
                  const isActive = timeText === t;
                  return (
                    <Pressable
                      key={t}
                      className={`rounded-full px-3 py-1.5 ${
                        isActive ? 'bg-rose-500' : 'bg-gray-100'
                      }`}
                      onPress={() => handleTimeSelect(t)}
                    >
                      <Text
                        className={`text-sm ${
                          isActive ? 'text-white font-medium' : 'text-gray-600'
                        }`}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Max people */}
          <Text className="text-base font-semibold text-gray-900 mb-2">
            人数上限
          </Text>
          <View className="flex-row items-center mb-8" style={{ gap: 16 }}>
            <Pressable
              className={`w-10 h-10 rounded-full items-center justify-center ${
                maxPeople <= 2 ? 'bg-gray-100' : 'bg-rose-50'
              }`}
              onPress={() => setMaxPeople(Math.max(2, maxPeople - 1))}
              disabled={maxPeople <= 2}
            >
              <Ionicons
                name="remove"
                size={20}
                color={maxPeople <= 2 ? '#d1d5db' : '#f43f5e'}
              />
            </Pressable>
            <Text className="text-xl font-bold text-gray-900 w-8 text-center">
              {maxPeople}
            </Text>
            <Pressable
              className={`w-10 h-10 rounded-full items-center justify-center ${
                maxPeople >= 10 ? 'bg-gray-100' : 'bg-rose-50'
              }`}
              onPress={() => setMaxPeople(Math.min(10, maxPeople + 1))}
              disabled={maxPeople >= 10}
            >
              <Ionicons
                name="add"
                size={20}
                color={maxPeople >= 10 ? '#d1d5db' : '#f43f5e'}
              />
            </Pressable>
            <Text className="text-sm text-gray-400">人</Text>
          </View>

          {/* Submit */}
          <Button
            title={createMut.isPending ? '发布中...' : '发布'}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={createMut.isPending}
            onPress={handleSubmit}
          />

          {/* Validation hint */}
          {!canSubmit && (title.length > 0 || description.length > 0) ? (
            <Text className="text-xs text-gray-400 text-center mt-2">
              {!selectedType
                ? '请选择搭子类型'
                : title.trim().length === 0
                  ? '请输入标题'
                  : description.trim().length < 10
                    ? '描述至少需要10个字'
                    : ''}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
