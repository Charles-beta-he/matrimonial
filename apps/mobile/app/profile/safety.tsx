import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ScalePressable } from '../../components/ScalePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';

/** Safety tools screen */
export default function SafetyScreen() {
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

  // ---- Emergency contact ----
  const contactQuery = api.safety.getEmergencyContact.useQuery();
  const setContactMut = api.safety.setEmergencyContact.useMutation({
    onSuccess: () => {
      contactQuery.refetch();
      Alert.alert('已保存', '紧急联系人已设置');
    },
    onError: (err) => Alert.alert('保存失败', err.message),
  });
  const [emergencyContact, setEmergencyContact] = useState('');
  useEffect(() => {
    if (contactQuery.data?.phone) {
      setEmergencyContact(contactQuery.data.phone);
    }
  }, [contactQuery.data?.phone]);

  // ---- Date check-in ----
  const checkinsQuery = api.safety.myCheckins.useQuery();
  const createCheckinMut = api.safety.createCheckin.useMutation({
    onSuccess: () => {
      checkinsQuery.refetch();
      setShowCheckinModal(false);
      Alert.alert('报备成功', '已通知紧急联系人');
    },
    onError: (err) => Alert.alert('报备失败', err.message),
  });
  const confirmSafeMut = api.safety.confirmSafe.useMutation({
    onSuccess: () => {
      checkinsQuery.refetch();
      Alert.alert('已确认', '已标记为安全');
    },
    onError: (err) => Alert.alert('操作失败', err.message),
  });

  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    partnerName: '',
    location: '',
    scheduledAt: '',
    expectedEndAt: '',
  });

  // ---- SOS ----
  const sosMut = api.safety.triggerSOS.useMutation({
    onSuccess: () => Alert.alert('已发送', '求助信息已发送给紧急联系人'),
    onError: (err) => Alert.alert('发送失败', err.message),
  });

  const handleSOS = () => {
    Alert.alert('紧急求助', '确定发送求助信息给紧急联系人吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({});
              sosMut.mutate({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
            } else {
              sosMut.mutate(undefined);
            }
          } catch {
            sosMut.mutate(undefined);
          }
        },
      },
    ]);
  };

  const handleSubmitCheckin = () => {
    const { partnerName, location, scheduledAt, expectedEndAt } = checkinForm;
    if (!partnerName || !location || !scheduledAt || !expectedEndAt) {
      Alert.alert('请填写完整', '所有字段均为必填');
      return;
    }
    // Parse "YYYY-MM-DD HH:mm" to ISO datetime
    const toISO = (s: string) => {
      try {
        return new Date(s.replace(' ', 'T') + ':00').toISOString();
      } catch {
        return '';
      }
    };
    const isoStart = toISO(scheduledAt);
    const isoEnd = toISO(expectedEndAt);
    if (!isoStart || !isoEnd) {
      Alert.alert('时间格式错误', '请使用 YYYY-MM-DD HH:mm 格式');
      return;
    }
    createCheckinMut.mutate({
      partnerName,
      location,
      scheduledAt: isoStart,
      expectedEndAt: isoEnd,
    });
  };

  const activeCheckins = (checkinsQuery.data ?? []).filter(
    (c) => c.status === 'ACTIVE',
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View className="px-4 py-3 bg-white border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
        <ScalePressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </ScalePressable>
        <Text className="text-lg font-semibold text-gray-900">安全工具</Text>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Emergency contact */}
        <View className="bg-white mt-2 p-4">
          <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
            <Ionicons name="call" size={18} color="#3b82f6" />
            <Text className="text-base font-semibold text-gray-900">
              紧急联系人
            </Text>
          </View>
          <Text className="text-sm text-gray-500 mb-3">
            设置紧急联系人，在遇到危险时可以一键发送求助信息
          </Text>
          <Input
            label="紧急联系人手机号"
            placeholder="输入手机号"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            maxLength={11}
          />
          <View className="mt-3">
            <Button
              title="保存联系人"
              variant="primary"
              size="sm"
              loading={setContactMut.isPending}
              onPress={() =>
                setContactMut.mutate({ phone: emergencyContact })
              }
              disabled={!emergencyContact || emergencyContact.length !== 11}
            />
          </View>
        </View>

        {/* Date check-in */}
        <Card className="mx-4 mt-4 p-4">
          <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
            <Ionicons name="location" size={18} color="#f59e0b" />
            <Text className="text-base font-semibold text-gray-900">
              约会报备
            </Text>
          </View>
          <Text className="text-sm text-gray-500 mb-2">
            约会前向紧急联系人分享你的约会信息（时间、地点、对方资料），系统会自动在约会结束后询问你是否安全。
          </Text>
          <Text className="text-xs text-gray-400 mb-3">
            如果在约定时间内没有回复，系统将自动通知紧急联系人。
          </Text>
          <Button
            title="创建报备"
            variant="outline"
            size="sm"
            onPress={() => setShowCheckinModal(true)}
          />
        </Card>

        {/* Active checkins */}
        {activeCheckins.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              进行中的报备
            </Text>
            {activeCheckins.map((c) => (
              <Card key={c.id} className="p-3 mb-2">
                <Text className="text-sm font-medium text-gray-900">
                  {c.partnerName} · {c.location}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {new Date(c.scheduledAt).toLocaleString('zh-CN')} ~{' '}
                  {new Date(c.expectedEndAt).toLocaleString('zh-CN')}
                </Text>
                <View className="mt-2">
                  <Button
                    title="确认安全"
                    variant="secondary"
                    size="sm"
                    loading={confirmSafeMut.isPending}
                    onPress={() => confirmSafeMut.mutate({ checkinId: c.id })}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* SOS Button */}
        <View className="items-center mt-6 px-4">
          <Text className="text-base font-semibold text-gray-900 mb-2">
            SOS 紧急按钮
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-4">
            遇到紧急情况时按下此按钮，系统将向紧急联系人发送你的位置信息
          </Text>
          <ScalePressable
            className="w-32 h-32 rounded-full bg-red-500 items-center justify-center"
            style={
              Platform.OS === 'web'
                ? { boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }
                : {
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }
            }
            disabled={sosMut.isPending}
            onPress={handleSOS}
          >
            <Text className="text-white text-3xl font-bold">SOS</Text>
          </ScalePressable>
          {!contactQuery.data?.phone && (
            <Text className="text-xs text-red-400 mt-2">
              请先设置紧急联系人
            </Text>
          )}
        </View>

        {/* Post-date feedback */}
        <Card className="mx-4 mt-6 p-4 mb-8">
          <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
            <Ionicons name="chatbubbles" size={18} color="#10b981" />
            <Text className="text-base font-semibold text-gray-900">
              约后反馈
            </Text>
          </View>
          <Text className="text-sm text-gray-500">
            约会结束后，你可以对约会体验进行匿名反馈。如果遇到不当行为，平台会进行调查处理，保护其他用户的安全。
          </Text>
        </Card>
      </ScrollView>

      {/* Check-in creation modal */}
      <Modal
        visible={showCheckinModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckinModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                创建约会报备
              </Text>
              <ScalePressable onPress={() => setShowCheckinModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </ScalePressable>
            </View>

            <View style={{ gap: 12 }}>
              <Input
                label="对方昵称"
                placeholder="输入对方昵称或姓名"
                value={checkinForm.partnerName}
                onChangeText={(t) =>
                  setCheckinForm((f) => ({ ...f, partnerName: t }))
                }
                maxLength={50}
              />
              <Input
                label="约会地点"
                placeholder="输入约会地点"
                value={checkinForm.location}
                onChangeText={(t) =>
                  setCheckinForm((f) => ({ ...f, location: t }))
                }
                maxLength={200}
              />
              <Input
                label="约会时间"
                placeholder="YYYY-MM-DD HH:mm"
                value={checkinForm.scheduledAt}
                onChangeText={(t) =>
                  setCheckinForm((f) => ({ ...f, scheduledAt: t }))
                }
                maxLength={16}
              />
              <Input
                label="预计结束时间"
                placeholder="YYYY-MM-DD HH:mm"
                value={checkinForm.expectedEndAt}
                onChangeText={(t) =>
                  setCheckinForm((f) => ({ ...f, expectedEndAt: t }))
                }
                maxLength={16}
              />
            </View>

            <View className="mt-5">
              <Button
                title="提交报备"
                variant="primary"
                fullWidth
                loading={createCheckinMut.isPending}
                onPress={handleSubmitCheckin}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
