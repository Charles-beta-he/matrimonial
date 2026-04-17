import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, toast } from '@matrimonial/ui';
import { StaggeredListItem } from '../../components/StaggeredListItem';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
import { VERIFICATION_LEVEL_LABELS } from '@matrimonial/shared';
import { api } from '@matrimonial/api-client';

type Modals = null | 'L2' | 'L3' | 'L4';

/** Verification center screen */
export default function VerificationScreen() {
  const router = useRouter();
  const statusQuery = api.verification.getStatus.useQuery();
  const utils = api.useUtils();

  const submitRealNameMut = api.verification.submitRealName.useMutation();
  const submitFaceMut = api.verification.submitFaceVerify.useMutation();
  const submitEduMut = api.verification.submitEduVerify.useMutation();

  const [modal, setModal] = useState<Modals>(null);

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

  // L2 modal state
  const [realName, setRealName] = useState('');
  const [idCard, setIdCard] = useState('');

  // L4 modal state
  const [school, setSchool] = useState('');
  const [degree, setDegree] = useState<'HIGH_SCHOOL' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'PHD'>('BACHELOR');
  const [gradYear, setGradYear] = useState(String(new Date().getFullYear()));

  const status = statusQuery.data;
  const l1Done = true; // phone always verified after registration
  const l2Done = !!status?.realNameVerified;
  const l3Done = !!status?.faceVerified;
  const l4Done = !!status?.eduVerified;

  const completedCount = [l1Done, l2Done, l3Done, l4Done].filter(Boolean).length;
  const progress = completedCount / 4;

  const handleSubmitRealName = async () => {
    try {
      await submitRealNameMut.mutateAsync({ realName, idCardNumber: idCard });
      toast.success('身份认证已提交');
      setModal(null);
      setRealName('');
      setIdCard('');
      await utils.verification.getStatus.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? '提交失败');
    }
  };

  const handleSubmitFace = async () => {
    try {
      await submitFaceMut.mutateAsync({ faceImageUrl: 'https://example.com/selfie.jpg' });
      toast.success('真人认证已提交');
      await utils.verification.getStatus.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? '提交失败');
    }
  };

  const handleSubmitEdu = async () => {
    const year = parseInt(gradYear, 10);
    if (Number.isNaN(year)) {
      toast.error('请输入有效的毕业年份');
      return;
    }
    try {
      await submitEduMut.mutateAsync({ schoolName: school, degree, graduationYear: year });
      toast.success('学历认证已提交');
      setModal(null);
      setSchool('');
      await utils.verification.getStatus.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? '提交失败');
    }
  };

  const levels: Array<{
    level: string;
    label: string;
    description: string;
    unlocks: string;
    icon: IoniconName;
    iconColor: string;
    completed: boolean;
    enabled: boolean;
    onAction: () => void;
  }> = [
    {
      level: 'L1',
      label: VERIFICATION_LEVEL_LABELS?.L1 ?? '手机认证',
      description: '绑定手机号码，验证真实身份',
      unlocks: '解锁基础匹配功能',
      icon: 'phone-portrait-outline',
      iconColor: '#3b82f6',
      completed: l1Done,
      enabled: true,
      onAction: () => {},
    },
    {
      level: 'L2',
      label: VERIFICATION_LEVEL_LABELS?.L2 ?? '身份认证',
      description: '上传身份证件，平台审核',
      unlocks: '解锁查看匹配对象的详细资料',
      icon: 'card-outline',
      iconColor: '#8b5cf6',
      completed: l2Done,
      enabled: l1Done,
      onAction: () => setModal('L2'),
    },
    {
      level: 'L3',
      label: VERIFICATION_LEVEL_LABELS?.L3 ?? '真人认证',
      description: '进行活体检测，确认真人',
      unlocks: '获得真人认证标识，匹配优先级提升',
      icon: 'person-circle-outline',
      iconColor: '#10b981',
      completed: l3Done,
      enabled: l2Done,
      onAction: handleSubmitFace,
    },
    {
      level: 'L4',
      label: VERIFICATION_LEVEL_LABELS?.L4 ?? '学历认证',
      description: '上传学位证书，平台审核',
      unlocks: '获得学历认证标识，专属匹配池',
      icon: 'school-outline',
      iconColor: '#f59e0b',
      completed: l4Done,
      enabled: l3Done,
      onAction: () => setModal('L4'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View className="flex-row items-center px-4 py-3 bg-white" style={headerStyle}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">认证中心</Text>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-white px-4 py-6 items-center">
          <Text className="text-sm text-gray-500 mb-2">
            当前认证等级: {status?.verificationLevel ?? 'L1'}
          </Text>
          <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <Text className="text-xs text-gray-400 mt-2">
            {completedCount}/4 项已完成
          </Text>
        </View>

        <View className="px-4 mt-4" style={{ gap: 12 }}>
          {levels.map((item, i) => (
            <StaggeredListItem key={item.level} index={i}>
            <Card className="p-4">
              <View className="flex-row items-start">
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                  style={{ backgroundColor: (item.completed ? '#10b981' : item.iconColor) + '15' }}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={item.completed ? '#10b981' : item.iconColor}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1" style={{ gap: 6 }}>
                    <Text className="text-base font-semibold text-gray-900">
                      {item.level}: {item.label}
                    </Text>
                    {item.completed && (
                      <View className="flex-row items-center" style={{ gap: 2 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                        <Text className="text-green-500 text-xs">已完成</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm text-gray-500 mb-1">{item.description}</Text>
                  <Text className="text-xs text-rose-500">{item.unlocks}</Text>

                  {!item.completed && (
                    <View className="mt-3">
                      <Button
                        title={item.enabled ? '去认证' : '需先完成上一级'}
                        variant="primary"
                        size="sm"
                        disabled={!item.enabled}
                        onPress={item.onAction}
                      />
                    </View>
                  )}
                </View>
              </View>
            </Card>
            </StaggeredListItem>
          ))}
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* L2 Real-name modal */}
      <Modal visible={modal === 'L2'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">身份认证</Text>
            <Text className="text-sm text-gray-600 mb-2">真实姓名</Text>
            <TextInput
              value={realName}
              onChangeText={setRealName}
              placeholder="请输入真实姓名"
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor="#9ca3af"
            />
            <Text className="text-sm text-gray-600 mb-2">身份证号</Text>
            <TextInput
              value={idCard}
              onChangeText={setIdCard}
              placeholder="18位身份证号"
              maxLength={18}
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor="#9ca3af"
            />
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Button title="取消" variant="ghost" onPress={() => setModal(null)} />
              </View>
              <View className="flex-1">
                <Button
                  title={submitRealNameMut.isPending ? '提交中...' : '提交'}
                  variant="primary"
                  disabled={submitRealNameMut.isPending || !realName || !idCard}
                  onPress={handleSubmitRealName}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* L4 Edu modal */}
      <Modal visible={modal === 'L4'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">学历认证</Text>
            <Text className="text-sm text-gray-600 mb-2">学校名称</Text>
            <TextInput
              value={school}
              onChangeText={setSchool}
              placeholder="请输入学校名称"
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor="#9ca3af"
            />
            <Text className="text-sm text-gray-600 mb-2">学历</Text>
            <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
              {(['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD'] as const).map((d) => {
                const labels: Record<string, string> = {
                  HIGH_SCHOOL: '高中',
                  ASSOCIATE: '大专',
                  BACHELOR: '本科',
                  MASTER: '硕士',
                  PHD: '博士',
                };
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDegree(d)}
                    className={`rounded-full px-4 py-2 ${
                      degree === d ? 'bg-rose-500' : 'bg-gray-100'
                    }`}
                  >
                    <Text className={`text-sm ${degree === d ? 'text-white' : 'text-gray-700'}`}>
                      {labels[d]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-sm text-gray-600 mb-2">毕业年份</Text>
            <TextInput
              value={gradYear}
              onChangeText={setGradYear}
              placeholder="2020"
              keyboardType="number-pad"
              maxLength={4}
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor="#9ca3af"
            />
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Button title="取消" variant="ghost" onPress={() => setModal(null)} />
              </View>
              <View className="flex-1">
                <Button
                  title={submitEduMut.isPending ? '提交中...' : '提交'}
                  variant="primary"
                  disabled={submitEduMut.isPending || !school}
                  onPress={handleSubmitEdu}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
