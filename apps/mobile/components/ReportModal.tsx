import { useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ScalePressable } from './ScalePressable';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { colors } from '../constants/colors';

const REPORT_REASONS = [
  { value: 'FAKE_PROFILE', label: '虚假资料' },
  { value: 'HARASSMENT', label: '骚扰行为' },
  { value: 'SCAM', label: '诈骗嫌疑' },
  { value: 'INAPPROPRIATE_CONTENT', label: '不当内容' },
  { value: 'OTHER', label: '其他原因' },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]['value'];

interface ReportModalProps {
  visible: boolean;
  reportedId: string;
  onClose: () => void;
}

export function ReportModal({ visible, reportedId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const reportMutation = api.report.create.useMutation();

  const canSubmit =
    reason !== null && description.length >= 10 && !reportMutation.isPending;

  const handleSubmit = () => {
    if (!reason || description.length < 10) return;

    reportMutation.mutate(
      {
        reportedId,
        reason,
        description,
      },
      {
        onSuccess: () => {
          toast.success('举报已提交，我们会尽快处理');
          handleClose();
        },
        onError: (err) => {
          toast.error(err?.message ?? '举报失败，请稍后重试');
        },
      },
    );
  };

  const handleClose = () => {
    setReason(null);
    setDescription('');
    reportMutation.reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScalePressable className="flex-1 bg-black/40" onPress={handleClose} />
        <View className="bg-white rounded-t-2xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">举报用户</Text>
            <ScalePressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </ScalePressable>
          </View>

          <ScrollView className="px-4" keyboardShouldPersistTaps="handled">
            {/* Step 1: Select reason */}
            <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
              选择举报原因
            </Text>
            {REPORT_REASONS.map((item) => (
              <ScalePressable
                key={item.value}
                className="flex-row items-center py-3"
                onPress={() => setReason(item.value)}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                    reason === item.value
                      ? 'border-rose-500'
                      : 'border-gray-300'
                  }`}
                >
                  {reason === item.value && (
                    <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  )}
                </View>
                <Text className="text-base text-gray-900">{item.label}</Text>
              </ScalePressable>
            ))}

            {/* Step 2: Description */}
            <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
              详细描述
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 min-h-[100px]"
              placeholder="请描述具体情况（至少10个字符）"
              placeholderTextColor={colors.gray400}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              value={description}
              onChangeText={setDescription}
            />
            <Text className="text-xs text-gray-400 mt-1 text-right">
              {description.length}/1000
            </Text>

            {/* Step 3: Evidence placeholder */}
            <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
              上传证据（可选，最多5张）
            </Text>
            <ScalePressable className="bg-gray-50 rounded-xl px-4 py-6 items-center justify-center border border-dashed border-gray-300 mb-4">
              <Ionicons name="cloud-upload-outline" size={28} color={colors.gray400} />
              <Text className="text-sm text-gray-400 mt-1">点击上传图片</Text>
            </ScalePressable>

            {/* Submit */}
            <ScalePressable
              className={`rounded-full py-3 items-center mb-8 ${
                canSubmit ? 'bg-rose-500' : 'bg-gray-200'
              }`}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {reportMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  className={`text-base font-semibold ${
                    canSubmit ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  提交举报
                </Text>
              )}
            </ScalePressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
