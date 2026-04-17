import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';

const REASON_LABEL: Record<string, string> = {
  FAKE_PROFILE: '虚假资料',
  HARASSMENT: '骚扰行为',
  SCAM: '诈骗',
  INAPPROPRIATE_CONTENT: '不当内容',
  OTHER: '其他',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '审核中', color: '#f59e0b' },
  RESOLVED: { label: '已处理', color: '#22c55e' },
  DISMISSED: { label: '已驳回', color: '#6b7280' },
};

function formatDate(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d as string);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

export default function MyReportsScreen() {
  const router = useRouter();
  const { data, isLoading } = api.report.myReports.useQuery();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">我的举报</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : !data || data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={<Ionicons name="flag-outline" size={56} color="#9ca3af" />}
            title="暂无举报记录"
            description="你还没有提交过举报"
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {data.map((report: any) => {
            const statusConf = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.PENDING;
            return (
              <Card key={report.id}>
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="text-sm font-semibold text-gray-800">
                      {REASON_LABEL[report.reason] ?? report.reason}
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: statusConf.color }}>
                      {statusConf.label}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400 mb-2">
                    被举报用户：{report.reported?.nickname ?? report.reportedId}
                  </Text>
                  {report.description ? (
                    <Text className="text-sm text-gray-600" numberOfLines={2}>
                      {report.description}
                    </Text>
                  ) : null}
                  <Text className="text-xs text-gray-300 mt-2">
                    {formatDate(report.createdAt)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
