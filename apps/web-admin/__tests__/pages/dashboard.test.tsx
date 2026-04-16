import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../../app/dashboard/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockStats = {
  totalUsers: 1234,
  todaySignups: 56,
  activeUsersWeek: 789,
  totalMatches: 321,
  pendingReports: 5,
  pendingPhotos: 3,
};

let mockStatsQuery = { data: mockStats, isLoading: false, error: null };
let mockActivityQuery = { data: [], isLoading: false, error: null };
let mockGenderQuery = {
  data: { ratio: '1.2', male: 600, female: 500, malePercent: 54.5, femalePercent: 45.5, total: 1100 },
  isLoading: false,
  error: null,
};
let mockRevenueQuery = {
  data: {
    totalRevenue: 88888,
    monthRevenue: 5000,
    arpu: 72,
    arppu: 288,
    payRate: 25,
    membershipBreakdown: [
      { plan: 'FREE', count: 800 },
      { plan: 'MONTHLY', count: 300 },
    ],
  },
  isLoading: false,
  error: null,
};
let mockMessageQuery = {
  data: { totalMessages7d: 5000, activeConversations7d: 300, repliedConversations7d: 250, replyRate: 83 },
  isLoading: false,
  error: null,
};
let mockAnalyticsQuery = {
  data: { registrationFunnel: [{ step: '注册', count: 500 }, { step: '完成', count: 300 }] },
  isLoading: false,
};

vi.mock('../../lib/trpc', () => ({
  trpc: {
    admin: {
      stats: { useQuery: () => mockStatsQuery },
      recentActivity: { useQuery: () => mockActivityQuery },
      genderStats: { useQuery: () => mockGenderQuery },
      revenueStats: { useQuery: () => mockRevenueQuery },
      messageStats: { useQuery: () => mockMessageQuery },
      analyticsOverview: { useQuery: () => mockAnalyticsQuery },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatsQuery = { data: mockStats, isLoading: false, error: null };
    mockActivityQuery = { data: [], isLoading: false, error: null };
    mockGenderQuery = {
      data: { ratio: '1.2', male: 600, female: 500, malePercent: 54.5, femalePercent: 45.5, total: 1100 },
      isLoading: false,
      error: null,
    };
    mockRevenueQuery = {
      data: {
        totalRevenue: 88888,
        monthRevenue: 5000,
        arpu: 72,
        arppu: 288,
        payRate: 25,
        membershipBreakdown: [{ plan: 'FREE', count: 800 }, { plan: 'MONTHLY', count: 300 }],
      },
      isLoading: false,
      error: null,
    };
    mockMessageQuery = {
      data: { totalMessages7d: 5000, activeConversations7d: 300, repliedConversations7d: 250, replyRate: 83 },
      isLoading: false,
      error: null,
    };
    mockAnalyticsQuery = {
      data: { registrationFunnel: [{ step: '注册', count: 500 }, { step: '完成', count: 300 }] },
      isLoading: false,
    };
  });

  it('renders page title', () => {
    render(<DashboardPage />);
    expect(screen.getByText('数据仪表盘')).toBeInTheDocument();
  });

  it('renders stat card labels', () => {
    render(<DashboardPage />);
    expect(screen.getByText('总用户数')).toBeInTheDocument();
    expect(screen.getByText('今日注册')).toBeInTheDocument();
    expect(screen.getByText('活跃用户')).toBeInTheDocument();
    expect(screen.getByText('累计匹配')).toBeInTheDocument();
    expect(screen.getByText('待审核举报')).toBeInTheDocument();
    expect(screen.getByText('待审核照片')).toBeInTheDocument();
  });

  it('renders stat values from data', () => {
    render(<DashboardPage />);
    // toLocaleString('zh-CN') formats numbers — check smaller values that won't get commas
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows skeleton loaders when stats loading', () => {
    mockStatsQuery = { data: undefined as any, isLoading: true, error: null };
    render(<DashboardPage />);
    // Skeleton divs have animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when stats fail', () => {
    mockStatsQuery = { data: undefined as any, isLoading: false, error: { message: '网络错误' } as any };
    render(<DashboardPage />);
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/网络错误/)).toBeInTheDocument();
  });

  it('renders gender ratio section', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/性别/i)).toBeInTheDocument();
  });
});
