import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Button, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../hooks/useAnalytics';

const CONFETTI_COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#c084fc', '#fde68a', '#fb7185', '#34d399'];
const CONFETTI_COUNT = 12;

function jitter(seed: number) { return ((seed * 9301 + 49297) % 233280) / 233280; }

const CONFETTI = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
  const angle = (i / CONFETTI_COUNT) * 360 + jitter(i * 5) * 30 - 15;
  const dist = 70 + jitter(i * 7) * 80;
  const rad = (angle * Math.PI) / 180;
  return {
    dx: Math.cos(rad) * dist,
    dy: Math.sin(rad) * dist - 20,
    size: 7 + jitter(i * 3) * 6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: i * 25,
  };
});

function ConfettiParticle({ dx, dy, size, color, delay, burst }: typeof CONFETTI[number] & { burst: number }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sc = useSharedValue(0);
  const op = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (burst === 0) return;
    tx.value = 0; ty.value = 0; sc.value = 0; op.value = 0; rot.value = 0;
    const cfg = { duration: 700, easing: Easing.out(Easing.cubic) };
    tx.value = withDelay(delay, withTiming(dx, cfg));
    ty.value = withDelay(delay, withTiming(dy, cfg));
    rot.value = withDelay(delay, withTiming(jitter(delay) * 360 - 180, cfg));
    sc.value = withDelay(delay, withSequence(withTiming(1.2, { duration: 80 }), withTiming(0, cfg)));
    op.value = withDelay(delay, withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 600 })));
  }, [burst]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        width: size,
        height: size * 0.6,
        borderRadius: 2,
        backgroundColor: color,
      }, style]}
    />
  );
}

function AchievementBadge({ ach, index }: { ach: any; index: number }) {
  const sc = useSharedValue(0.6);
  const op = useSharedValue(0);
  const glowSc = useSharedValue(1);
  const glowOp = useSharedValue(0);

  useEffect(() => {
    const delay = index * 60;
    op.value = withDelay(delay, withTiming(1, { duration: 220 }));
    sc.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 220 }));
    if (ach.unlocked) {
      glowOp.value = withDelay(delay + 300, withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
      ));
      glowSc.value = withDelay(delay + 300, withTiming(2.2, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }
  }, [ach.unlocked, index]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ scale: sc.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOp.value,
    transform: [{ scale: glowSc.value }],
  }));

  return (
    <Animated.View
      style={[{
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: ach.unlocked ? '#fffbeb' : '#f9fafb',
        width: '28%',
        overflow: 'visible',
      }, badgeStyle]}
    >
      {ach.unlocked && (
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#f59e0b',
          }, glowStyle]}
        />
      )}
      <Text style={{ fontSize: 24 }}>{ach.unlocked ? ach.icon : '🔒'}</Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          textAlign: 'center',
          color: ach.unlocked ? '#111827' : '#9ca3af',
        }}
        numberOfLines={1}
      >
        {ach.name}
      </Text>
      <Text
        style={{ fontSize: 10, marginTop: 2, textAlign: 'center', color: ach.unlocked ? '#6b7280' : '#d1d5db' }}
        numberOfLines={2}
      >
        {ach.description}
      </Text>
    </Animated.View>
  );
}

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
  const [confettiBurst, setConfettiBurst] = useState(0);
  const streakScale = useSharedValue(1);
  const streakScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: streakScale.value }] }));

  const historyQuery = api.checkin.history.useQuery();
  const achievementsQuery = api.checkin.achievements.useQuery();
  const checkInMut = api.checkin.checkIn.useMutation({
    onSuccess: (data) => {
      toast.success(data.reward);
      setConfettiBurst((k) => k + 1);
      streakScale.value = withSequence(
        withSpring(1.5, { damping: 6, stiffness: 280 }),
        withSpring(0.9, { damping: 8, stiffness: 220 }),
        withSpring(1.0, { damping: 12, stiffness: 200 }),
      );
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
      <Animated.View className="bg-white px-4 py-3 border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
        <ScalePressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </ScalePressable>
        <Text className="text-lg font-bold text-gray-900">签到中心</Text>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Streak & Check-in card */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <View className="items-center" style={{ overflow: 'visible' }}>
            {/* Confetti origin point */}
            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              {CONFETTI.map((p, i) => (
                <ConfettiParticle key={i} {...p} burst={confettiBurst} />
              ))}
              <Animated.Text className="text-4xl font-bold text-rose-500" style={streakScaleStyle}>
                {history?.currentStreak ?? 0}
              </Animated.Text>
            </View>
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
            {achievements.map((ach: any, i: number) => (
              <AchievementBadge key={ach.type} ach={ach} index={i} />
            ))}
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
