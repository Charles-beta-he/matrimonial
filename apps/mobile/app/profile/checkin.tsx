import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Button, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../hooks/useAnalytics';

function CheckinDot({ isChecked, isToday, day, index }: {
  isChecked: boolean;
  isToday: boolean;
  day: number;
  index: number;
}) {
  const scale = useSharedValue(isChecked ? 0 : 1);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (isChecked) {
      scale.value = withDelay(index * 18, withSpring(1, { damping: 12, stiffness: 220 }));
    }
  }, [isChecked, index, scale]);

  return (
    <View style={{ width: '14.28%', aspectRatio: 1 }} className="items-center justify-center">
      <Animated.View
        style={[dotStyle, {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isChecked ? '#f43f5e' : isToday ? 'transparent' : 'transparent',
          borderWidth: isToday && !isChecked ? 1 : 0,
          borderColor: '#fda4af',
        }]}
      >
        <Text
          className={`text-sm ${
            isChecked ? 'text-white font-bold' : isToday ? 'text-rose-500 font-medium' : 'text-gray-700'
          }`}
        >
          {day}
        </Text>
      </Animated.View>
    </View>
  );
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** Build calendar days for a given month */
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

/** Check-in and Achievements page */
export default function CheckinScreen() {
  const router = useRouter();
  const { track } = useAnalytics();
  const utils = api.useUtils();

  const historyQuery = api.checkin.history.useQuery();
  const achievementsQuery = api.checkin.achievements.useQuery();
  const checkInMut = api.checkin.checkIn.useMutation({
    onSuccess: (data) => {
      toast.success(data.reward);
      utils.checkin.history.invalidate();
      utils.checkin.achievements.invalidate();
      utils.credits.balance.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

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

  useEffect(() => {
    track('screen_view', { screen_name: 'checkin' });
  }, [track]);

  const history = historyQuery.data;
  const achievements = achievementsQuery.data ?? [];

  // Calendar data for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  // Set of checked-in day numbers this month
  const checkedDays = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const set = new Set<number>();
    history?.history?.forEach((c: any) => {
      if (c.date.startsWith(prefix)) {
        set.add(parseInt(c.date.slice(8), 10));
      }
    });
    return set;
  }, [history, year, month]);

  const todayDate = now.getDate();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View className="flex-row items-center bg-white px-4 py-3 border-b border-gray-100" style={headerStyle}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">签到中心</Text>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Streak & Check-in card */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <View className="items-center">
            <Text className="text-4xl font-bold text-rose-500">
              {history?.currentStreak ?? 0}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">连续签到天数</Text>
          </View>

          {/* Reward tiers */}
          <View className="flex-row justify-around mt-4 mb-4">
            {[
              { day: 1, label: '1天', reward: '1个超级喜欢' },
              { day: 3, label: '3天', reward: '2个超级喜欢' },
              { day: 7, label: '7天', reward: '3个超级喜欢' },
            ].map((tier) => {
              const reached = (history?.currentStreak ?? 0) >= tier.day;
              return (
                <View key={tier.day} className="items-center">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center ${reached ? 'bg-rose-500' : 'bg-gray-100'}`}
                  >
                    <Ionicons
                      name={reached ? 'checkmark' : 'gift-outline'}
                      size={20}
                      color={reached ? '#fff' : '#9ca3af'}
                    />
                  </View>
                  <Text className={`text-xs mt-1 ${reached ? 'text-rose-500 font-medium' : 'text-gray-400'}`}>
                    {tier.label}
                  </Text>
                  <Text className="text-[10px] text-gray-400">{tier.reward}</Text>
                </View>
              );
            })}
          </View>

          <Button
            title={history?.checkedInToday ? '今日已签到' : '立即签到'}
            onPress={() => checkInMut.mutate()}
            disabled={history?.checkedInToday || checkInMut.isPending}
            variant={history?.checkedInToday ? 'secondary' : 'primary'}
          />
        </View>

        {/* Calendar */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-5">
          <Text className="text-base font-bold text-gray-900 mb-3">
            {year}年{month + 1}月 签到记录
          </Text>

          {/* Weekday headers */}
          <View className="flex-row">
            {WEEKDAYS.map((d) => (
              <View key={d} className="flex-1 items-center py-1">
                <Text className="text-xs text-gray-400">{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
              }
              const isChecked = checkedDays.has(day);
              const isToday = day === todayDate;
              return (
                <CheckinDot
                  key={day}
                  day={day}
                  index={i}
                  isChecked={isChecked}
                  isToday={isToday}
                />
              );
            })}
          </View>

          <View className="flex-row items-center mt-3" style={{ gap: 12 }}>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <View className="w-3 h-3 rounded-full bg-rose-500" />
              <Text className="text-xs text-gray-500">已签到</Text>
            </View>
            <Text className="text-xs text-gray-400">
              本月签到 {checkedDays.size} 天 / 累计 {history?.totalCheckIns ?? 0} 天
            </Text>
          </View>
        </View>

        {/* Achievements */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-5 mb-6">
          <Text className="text-base font-bold text-gray-900 mb-3">成就徽章</Text>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {achievements.map((ach: any) => (
              <View
                key={ach.type}
                className={`items-center p-3 rounded-xl ${ach.unlocked ? 'bg-amber-50' : 'bg-gray-50'}`}
                style={{ width: '28%' }}
              >
                <Text className="text-2xl">{ach.unlocked ? ach.icon : '🔒'}</Text>
                <Text
                  className={`text-xs font-medium mt-1 text-center ${ach.unlocked ? 'text-gray-900' : 'text-gray-400'}`}
                  numberOfLines={1}
                >
                  {ach.name}
                </Text>
                <Text
                  className={`text-[10px] mt-0.5 text-center ${ach.unlocked ? 'text-gray-500' : 'text-gray-300'}`}
                  numberOfLines={2}
                >
                  {ach.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
