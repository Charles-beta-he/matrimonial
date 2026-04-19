import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { colors } from '../../constants/colors';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useScreenTracking } from '../../hooks/useAnalytics';

const REASON_LABEL: Record<string, string> = {
  FAKE_PROFILE: '虚假资料',
  HARASSMENT: '骚扰行为',
  SCAM: '诈骗',
  INAPPROPRIATE_CONTENT: '不当内容',
  OTHER: '其他',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '审核中', color: colors.warning },
  RESOLVED: { label: '已处理', color: colors.success },
  DISMISSED: { label: '已驳回', color: colors.gray500 },
};

function formatDate(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d as string);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function ReportCard({ report }: { report: any }) {
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
          <Text className="text-sm text-gray-600" numberOfLines={2}>{report.description}</Text>
        ) : null}
        <Text className="text-xs text-gray-300 mt-2">{formatDate(report.createdAt)}</Text>
      </View>
    </Card>
  );
}

export default function MyReportsScreen() {
  useScreenTracking('my_reports');
  const { data, isLoading } = api.report.myReports.useQuery();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScreenHeader title="我的举报" />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data || data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={<Ionicons name="flag-outline" size={56} color={colors.gray400} />}
            title="暂无举报记录"
            description="你还没有提交过举报"
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {data.map((report: any) => <ReportCard key={report.id} report={report} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
