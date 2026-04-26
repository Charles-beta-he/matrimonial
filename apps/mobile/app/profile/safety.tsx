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
import { ScalePressable } from '../../components/ScalePressable';
import { colors } from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, Card, Input } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useScreenTracking } from '../../hooks/useAnalytics';

/** Safety tools screen */
export default function SafetyScreen() {
  useScreenTracking('safety');
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

  const sectionCard = {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef0f3',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="安全工具" noBorder />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Emergency contact */}
        <View style={[sectionCard, { marginTop: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#e6efff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="call" size={14} color="#1d4ed8" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0b0b0f' }}>紧急联系人</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 14, marginTop: 4 }}>
            设置后即可一键发送求助信息
          </Text>
          <Input
            aria-label="紧急联系人手机号"
            label="手机号"
            placeholder="输入 11 位手机号"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            maxLength={11}
          />
          <View style={{ marginTop: 14 }}>
            <Button
              title="保存联系人"
              variant="primary"
              size="sm"
              loading={setContactMut.isPending}
              onPress={() => setContactMut.mutate({ phone: emergencyContact })}
              disabled={!emergencyContact || emergencyContact.length !== 11}
            />
          </View>
        </View>

        {/* Date check-in */}
        <View style={sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#fff8e0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="location" size={14} color="#b45309" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0b0b0f' }}>约会报备</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4, marginBottom: 4 }}>
            约会前同步行程，结束后系统自动询问安全
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', lineHeight: 16, marginBottom: 14 }}>
            若约定时间内未回复，系统将通知紧急联系人。
          </Text>
          <Button
            title="创建报备"
            variant="outline"
            size="sm"
            onPress={() => setShowCheckinModal(true)}
          />
        </View>

        {/* Active checkins */}
        {activeCheckins.length > 0 && (
          <View style={{ marginHorizontal: 24, marginTop: 16 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: '#9ca3af',
                letterSpacing: 1.6,
                marginBottom: 10,
              }}
            >
              进行中的报备
            </Text>
            {activeCheckins.map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#eef0f3',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>
                  {c.partnerName} · {c.location}
                </Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {new Date(c.scheduledAt).toLocaleString('zh-CN')} ~{' '}
                  {new Date(c.expectedEndAt).toLocaleString('zh-CN')}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Button
                    title="确认安全"
                    variant="secondary"
                    size="sm"
                    loading={confirmSafeMut.isPending}
                    onPress={() => confirmSafeMut.mutate({ checkinId: c.id })}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SOS Button */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 22,
            backgroundColor: '#0b0b0f',
            borderRadius: 22,
            paddingVertical: 28,
            paddingHorizontal: 22,
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -50,
              left: '50%',
              marginLeft: -90,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: 'rgba(220,38,38,0.18)',
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#fb7185',
              letterSpacing: 1.6,
              marginBottom: 8,
            }}
          >
            紧急 · SOS
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 8 }}>
            一键求助
          </Text>
          <Text style={{ fontSize: 12, color: '#a1a1aa', textAlign: 'center', marginBottom: 24, maxWidth: 240 }}>
            按下后立即向紧急联系人发送位置信息
          </Text>
          <ScalePressable
            style={{
              width: 132,
              height: 132,
              borderRadius: 66,
              backgroundColor: '#dc2626',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 8,
              borderColor: 'rgba(220,38,38,0.18)',
              ...(Platform.OS === 'web'
                ? ({ boxShadow: '0 8px 28px rgba(220,38,38,0.45)' } as any)
                : {
                    shadowColor: '#dc2626',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.5,
                    shadowRadius: 14,
                    elevation: 8,
                  }),
            }}
            disabled={sosMut.isPending}
            onPress={handleSOS}
          >
            <Text style={{ color: '#ffffff', fontSize: 30, fontWeight: '700', letterSpacing: 1 }}>SOS</Text>
          </ScalePressable>
          {!contactQuery.data?.phone ? (
            <Text style={{ fontSize: 11, color: '#fb7185', marginTop: 14, fontWeight: '500' }}>
              请先设置紧急联系人
            </Text>
          ) : null}
        </View>

        {/* Post-date feedback */}
        <View style={sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#e6f6f3',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chatbubbles" size={14} color="#0d9488" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0b0b0f' }}>约后反馈</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 }}>
            匿名反馈约会体验，平台会调查不当行为
          </Text>
        </View>
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
                <Ionicons name="close" size={24} color={colors.gray500} />
              </ScalePressable>
            </View>

            <View style={{ gap: 12 }}>
              <Input
                aria-label="对方昵称"
                label="对方昵称"
                placeholder="输入对方昵称或姓名"
                value={checkinForm.partnerName}
                onChangeText={(t) =>
                  setCheckinForm((f) => ({ ...f, partnerName: t }))
                }
                maxLength={50}
              />
              <Input
                aria-label="约会地点"
                label="约会地点"
                placeholder="输入约会地点"
                value={checkinForm.location}
                onChangeText={(t) =>
                  setCheckinForm((f) => ({ ...f, location: t }))
                }
                maxLength={200}
              />
              <Input
                aria-label="约会时间"
                label="约会时间"
                placeholder="YYYY-MM-DD HH:mm"
                value={checkinForm.scheduledAt}
                onChangeText={(t) =>
                  setCheckinForm((f) => ({ ...f, scheduledAt: t }))
                }
                maxLength={16}
              />
              <Input
                aria-label="预计结束时间"
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
