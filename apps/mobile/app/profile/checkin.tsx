import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
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
import { ScreenHeader } from '../../components/ScreenHeader';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../hooks/useAnalytics';

const CONFETTI_COLORS = [colors.primary, colors.warning, colors.success, colors.blue, colors.purpleLight, colors.warningText, colors.primaryLight, colors.green];
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
        backgroundColor: ach.unlocked ? colors.warningBg : colors.gray50,
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
            backgroundColor: colors.warning,
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
          color: ach.unlocked ? colors.gray900 : colors.gray400,
        }}
        numberOfLines={1}
      >
        {ach.name}
      </Text>
      <Text
        style={{ fontSize: 10, marginTop: 2, textAlign: 'center', color: ach.unlocked ? colors.gray500 : colors.gray300 }}
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
          backgroundColor: isChecked ? colors.primary : 'transparent',
          borderWidth: isToday && !isChecked ? 1 : 0,
          borderColor: colors.primaryMuted,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="签到中心" noBorder />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Streak hero — dark gradient */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 8,
            backgroundColor: '#0b0b0f',
            borderRadius: 24,
            padding: 22,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              right: -50,
              top: -50,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(228, 29, 72, 0.18)',
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#fbbf24',
              letterSpacing: 1.6,
              marginBottom: 8,
            }}
          >
            连续签到 · STREAK
          </Text>
          <View style={{ position: 'relative', alignItems: 'flex-start', justifyContent: 'flex-start', marginBottom: 4 }}>
            {CONFETTI.map((p, i) => (
              <ConfettiParticle key={i} {...p} burst={confettiBurst} />
            ))}
            <Animated.Text
              style={[
                streakScaleStyle,
                { fontSize: 56, fontWeight: '700', color: '#ffffff', letterSpacing: -1, lineHeight: 64 },
              ]}
            >
              {history?.currentStreak ?? 0}
              <Text style={{ fontSize: 18, fontWeight: '500', color: '#a1a1aa' }}> 天</Text>
            </Animated.Text>
          </View>

          {/* Reward tiers */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 18 }}>
            {[
              { day: 1, label: '1 天', reward: '+1 超级喜欢' },
              { day: 3, label: '3 天', reward: '+2 超级喜欢' },
              { day: 7, label: '7 天', reward: '+3 超级喜欢' },
            ].map((tier) => {
              const reached = (history?.currentStreak ?? 0) >= tier.day;
              return (
                <View key={tier.day} style={{ alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: reached ? '#e11d48' : 'rgba(255,255,255,0.08)',
                      borderWidth: reached ? 0 : 1,
                      borderColor: 'rgba(255,255,255,0.14)',
                    }}
                  >
                    <Ionicons
                      name={reached ? 'checkmark' : 'gift-outline'}
                      size={17}
                      color={reached ? '#ffffff' : '#a1a1aa'}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      marginTop: 6,
                      fontWeight: '700',
                      color: reached ? '#fbbf24' : '#a1a1aa',
                    }}
                  >
                    {tier.label}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{tier.reward}</Text>
                </View>
              );
            })}
          </View>

          <Button
            title={history?.checkedInToday ? '今日已签到' : '立即签到'}
            onPress={() => checkInMut.mutate()}
            disabled={history?.checkedInToday || checkInMut.isPending}
            variant={history?.checkedInToday ? 'secondary' : 'primary'}
            fullWidth
          />
        </View>

        {/* Calendar */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1.6,
              marginBottom: 12,
            }}
          >
            {year} · {String(month + 1).padStart(2, '0')}
          </Text>

          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((d) => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
              }
              const isChecked = checkedDays.has(day);
              const isToday = day === todayDate;
              return (
                <CheckinDot key={day} day={day} index={i} isChecked={isChecked} isToday={isToday} />
              );
            })}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 14,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: '#f4f0ea',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#e11d48' }} />
              <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>已签到</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>
              本月 {checkedDays.size} 天 · 累计 {history?.totalCheckIns ?? 0} 天
            </Text>
          </View>
        </View>

        {/* Achievements */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1.6,
              marginBottom: 14,
            }}
          >
            成就徽章
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {achievements.map((ach: any, i: number) => (
              <AchievementBadge key={ach.type} ach={ach} index={i} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
