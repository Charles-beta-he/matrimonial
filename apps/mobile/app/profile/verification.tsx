import { useState } from 'react';
import { useScreenTracking } from '../../hooks/useAnalytics';
import { Image, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, toast } from '@matrimonial/ui';
import { StaggeredListItem } from '../../components/StaggeredListItem';
import { ScalePressable } from '../../components/ScalePressable';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '../../hooks/useUpload';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
import { VERIFICATION_LEVEL_LABELS } from '@matrimonial/shared';
import { api } from '@matrimonial/api-client';

type Modals = null | 'L2' | 'L3' | 'L4';

/** Verification center screen */
export default function VerificationScreen() {
  useScreenTracking('verification');
  const statusQuery = api.verification.getStatus.useQuery();
  const utils = api.useUtils();

  const submitRealNameMut = api.verification.submitRealName.useMutation();
  const submitFaceMut = api.verification.submitFaceVerify.useMutation();
  const submitEduMut = api.verification.submitEduVerify.useMutation();

  const [modal, setModal] = useState<Modals>(null);
  const { uploadFile, uploading: faceUploading } = useUpload();

  // L2 modal state
  const [realName, setRealName] = useState('');
  const [idCard, setIdCard] = useState('');

  // L3 modal state
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);

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

  const handleTakeSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error('需要相机权限以进行真人认证');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]) {
      setFaceImageUri(result.assets[0].uri);
    }
  };

  const handleSubmitFace = async () => {
    if (!faceImageUri) return;
    try {
      const uploaded = await uploadFile(faceImageUri, 'verify');
      if (!uploaded) return;
      const res = await submitFaceMut.mutateAsync({ faceImageUrl: uploaded.publicUrl });
      toast.success(res.message ?? '已提交，等待审核');
      setModal(null);
      setFaceImageUri(null);
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
      const res = await submitEduMut.mutateAsync({ schoolName: school, degree, graduationYear: year });
      toast.success(res.message ?? '已提交，等待审核');
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
      iconColor: colors.blue,
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
      iconColor: colors.purple,
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
      iconColor: colors.green,
      completed: l3Done,
      enabled: l2Done,
      onAction: () => setModal('L3'),
    },
    {
      level: 'L4',
      label: VERIFICATION_LEVEL_LABELS?.L4 ?? '学历认证',
      description: '上传学位证书，平台审核',
      unlocks: '获得学历认证标识，专属匹配池',
      icon: 'school-outline',
      iconColor: colors.warning,
      completed: l4Done,
      enabled: l3Done,
      onAction: () => setModal('L4'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="认证中心" noBorder />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Progress hero */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 8,
            backgroundColor: '#ffffff',
            borderRadius: 22,
            padding: 22,
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: '#9ca3af',
                  letterSpacing: 1.6,
                  marginBottom: 6,
                }}
              >
                当前等级
              </Text>
              <Text style={{ fontSize: 30, fontWeight: '700', color: '#0b0b0f', letterSpacing: -0.5 }}>
                {status?.verificationLevel ?? 'L1'}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#fff1f2',
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#e11d48' }}>
                {completedCount}/4 项已完成
              </Text>
            </View>
          </View>
          <View
            style={{
              width: '100%',
              height: 6,
              backgroundColor: '#f1ece3',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <View
              style={{ height: '100%', backgroundColor: '#e11d48', width: `${progress * 100}%`, borderRadius: 3 }}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 22, gap: 12 }}>
          {levels.map((item, i) => (
            <StaggeredListItem key={item.level} index={i}>
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: item.completed ? '#d1fae5' : '#eef0f3',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                      backgroundColor: item.completed ? '#dcfce7' : item.iconColor + '18',
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={item.completed ? '#10b981' : item.iconColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: item.completed ? '#10b981' : '#9ca3af',
                          letterSpacing: 1.4,
                        }}
                      >
                        {item.level}
                      </Text>
                      {item.completed ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            backgroundColor: '#dcfce7',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 999,
                          }}
                        >
                          <Ionicons name="checkmark" size={11} color="#15803d" />
                          <Text style={{ color: '#15803d', fontSize: 10, fontWeight: '700' }}>已完成</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0b0b0f', marginBottom: 4 }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 4 }}>
                      {item.description}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#e11d48', fontWeight: '500' }}>
                      {item.unlocks}
                    </Text>

                    {!item.completed ? (
                      <View style={{ marginTop: 14 }}>
                        <Button
                          title={item.enabled ? '去认证' : '需先完成上一级'}
                          variant="primary"
                          size="sm"
                          disabled={!item.enabled}
                          onPress={item.onAction}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </StaggeredListItem>
          ))}
        </View>
      </ScrollView>

      {/* L2 Real-name modal */}
      <Modal visible={modal === 'L2'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">身份认证</Text>
            <Text className="text-sm text-gray-600 mb-2">真实姓名</Text>
            <TextInput
              aria-label="真实姓名"
              value={realName}
              onChangeText={setRealName}
              placeholder="请输入真实姓名"
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor={colors.gray400}
            />
            <Text className="text-sm text-gray-600 mb-2">身份证号</Text>
            <TextInput
              aria-label="身份证号"
              value={idCard}
              onChangeText={setIdCard}
              placeholder="18位身份证号"
              maxLength={18}
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor={colors.gray400}
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

      {/* L3 Face modal */}
      <Modal visible={modal === 'L3'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">真人认证</Text>
            <Text className="text-sm text-gray-500 mb-4">请拍摄一张正面清晰的自拍照，确保光线充足、面部完整</Text>
            <ScalePressable
              onPress={handleTakeSelfie}
              className="items-center justify-center bg-gray-100 rounded-2xl mb-4"
              style={{ height: 200 }}
            >
              {faceImageUri ? (
                <Image source={{ uri: faceImageUri }} className="w-full h-full rounded-2xl" resizeMode="cover" />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera-outline" size={40} color={colors.gray400} />
                  <Text className="text-sm text-gray-400 mt-2">点击拍摄自拍照</Text>
                </View>
              )}
            </ScalePressable>
            {faceImageUri && (
              <ScalePressable onPress={handleTakeSelfie} className="items-center mb-4">
                <Text className="text-sm text-rose-500">重新拍摄</Text>
              </ScalePressable>
            )}
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Button title="取消" variant="ghost" onPress={() => { setModal(null); setFaceImageUri(null); }} />
              </View>
              <View className="flex-1">
                <Button
                  title={faceUploading || submitFaceMut.isPending ? '提交中...' : '提交'}
                  variant="primary"
                  disabled={!faceImageUri || faceUploading || submitFaceMut.isPending}
                  onPress={handleSubmitFace}
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
              aria-label="学校名称"
              value={school}
              onChangeText={setSchool}
              placeholder="请输入学校名称"
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor={colors.gray400}
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
                  <ScalePressable
                    key={d}
                    onPress={() => setDegree(d)}
                    className={`rounded-full px-4 py-2 ${
                      degree === d ? 'bg-rose-500' : 'bg-gray-100'
                    }`}
                  >
                    <Text className={`text-sm ${degree === d ? 'text-white' : 'text-gray-700'}`}>
                      {labels[d]}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
            <Text className="text-sm text-gray-600 mb-2">毕业年份</Text>
            <TextInput
              aria-label="毕业年份"
              value={gradYear}
              onChangeText={setGradYear}
              placeholder="2020"
              keyboardType="number-pad"
              maxLength={4}
              className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-gray-900"
              placeholderTextColor={colors.gray400}
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
