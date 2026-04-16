import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MatchmakersPage from '../../app/matchmakers/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMatchmakers = [
  {
    id: 'mm-1',
    user: { nickname: '红娘小王' },
    activeClients: 12,
    totalMatches: 45,
    successRate: 0.76,
    rating: 4.8,
    isOnline: true,
  },
  {
    id: 'mm-2',
    user: { nickname: '红娘小李' },
    activeClients: 8,
    totalMatches: 30,
    successRate: 0.6,
    rating: 4.2,
    isOnline: false,
  },
];

let mockStatsQuery = {
  data: { activeCount: 5, monthlyMatches: 120, avgSuccessRate: 0.68, avgRating: 4.5 },
  isLoading: false,
};
let mockListQuery = {
  data: { items: mockMatchmakers },
  isLoading: false,
  isError: false,
  error: null,
};

vi.mock('../../lib/trpc', () => ({
  trpc: {
    admin: {
      matchmakerStats: { useQuery: () => mockStatsQuery },
      matchmakers: { useQuery: () => mockListQuery },
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MatchmakersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatsQuery = {
      data: { activeCount: 5, monthlyMatches: 120, avgSuccessRate: 0.68, avgRating: 4.5 },
      isLoading: false,
    };
    mockListQuery = {
      data: { items: mockMatchmakers },
      isLoading: false,
      isError: false,
      error: null,
    };
  });

  it('renders page title', () => {
    render(<MatchmakersPage />);
    expect(screen.getByText('红娘管理')).toBeInTheDocument();
  });

  it('renders metric card labels', () => {
    render(<MatchmakersPage />);
    expect(screen.getByText('活跃红娘数')).toBeInTheDocument();
    expect(screen.getByText('本月新增配对')).toBeInTheDocument();
    expect(screen.getByText('平均成功率')).toBeInTheDocument();
    expect(screen.getByText('平均评分')).toBeInTheDocument();
  });

  it('shows metric values when data loaded', () => {
    render(<MatchmakersPage />);
    expect(screen.getByText('5')).toBeInTheDocument(); // activeCount
    expect(screen.getByText('120')).toBeInTheDocument(); // monthlyMatches
    expect(screen.getByText('68.0%')).toBeInTheDocument(); // avgSuccessRate
    expect(screen.getByText('4.5')).toBeInTheDocument(); // avgRating
  });

  it('shows loading dots in metrics when stats loading', () => {
    mockStatsQuery = { data: undefined as any, isLoading: true };
    render(<MatchmakersPage />);
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('renders table headers', () => {
    render(<MatchmakersPage />);
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('活跃客户')).toBeInTheDocument();
    expect(screen.getByText('累计配对')).toBeInTheDocument();
    expect(screen.getByText('成功率')).toBeInTheDocument();
    expect(screen.getByText('评分')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
  });

  it('renders matchmaker rows', () => {
    render(<MatchmakersPage />);
    expect(screen.getByText('红娘小王')).toBeInTheDocument();
    expect(screen.getByText('红娘小李')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('shows online/offline status', () => {
    render(<MatchmakersPage />);
    expect(screen.getByText('在线')).toBeInTheDocument();
    expect(screen.getByText('离线')).toBeInTheDocument();
  });

  it('shows loading state in table', () => {
    mockListQuery = { data: undefined as any, isLoading: true, isError: false, error: null };
    render(<MatchmakersPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state when no matchmakers', () => {
    mockListQuery = { data: { items: [] }, isLoading: false, isError: false, error: null };
    render(<MatchmakersPage />);
    expect(screen.getByText('暂无红娘')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockListQuery = { data: undefined as any, isLoading: false, isError: true, error: { message: '请求失败' } as any };
    render(<MatchmakersPage />);
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/请求失败/)).toBeInTheDocument();
  });
});
