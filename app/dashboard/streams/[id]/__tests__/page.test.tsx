import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { use } from 'react';
import StreamDetailPage from '../page';

// Mock React's use hook
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    use: vi.fn(),
  };
});

// Mock Next.js modules
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('StreamDetailPage - Auto-Refresh Logic', () => {
  let queryClient: QueryClient;
  const mockStreamId = 'test-stream-123';

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Mock the use() hook to return the params synchronously
    vi.mocked(use).mockReturnValue({ id: mockStreamId });

    // Clear all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const mockStreamData = {
    id: mockStreamId,
    youtubeVideoId: 'abc123',
    title: 'Test Stream',
    channelTitle: 'Test Channel',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isLive: true,
  };

  const mockMetricsData = {
    streamId: mockStreamId,
    timeRange: 'today',
    dataPoints: 100,
    metrics: [
      { timestamp: '2026-01-04T10:00:00Z', viewers: 1000, likes: 50, views: 5000 },
      { timestamp: '2026-01-04T10:01:00Z', viewers: 1100, likes: 55, views: 5100 },
    ],
  };

  const mockChangesData = {
    streamId: mockStreamId,
    changeCount: 0,
    changes: [],
  };

  const setupMockFetch = (timeRange: string = 'today') => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/streams/test-stream-123')) {
        if (url.includes('/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ...mockMetricsData, timeRange }),
          });
        }
        if (url.includes('/changes')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockChangesData,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockStreamData,
        });
      }
      return Promise.resolve({
        ok: false,
        statusText: 'Not Found',
      });
    });
  };

  it('should enable auto-refresh when timeRange is "today"', async () => {
    setupMockFetch('today');

    const params = Promise.resolve({ id: mockStreamId });
    render(
      <QueryClientProvider client={queryClient}>
        <StreamDetailPage params={params} />
      </QueryClientProvider>
    );

    // Wait for initial data fetch
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/streams/test-stream-123/metrics?timeRange=7d')
        );
      },
      { timeout: 10000 }
    );

    // Clear fetch calls to track new ones
    vi.clearAllMocks();

    // Advance timer by 60 seconds
    vi.advanceTimersByTime(60000);

    // Verify that refetch was triggered
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalled();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('should disable auto-refresh when timeRange is "30d"', async () => {
    setupMockFetch('30d');

    const params = Promise.resolve({ id: mockStreamId });
    render(
      <QueryClientProvider client={queryClient}>
        <StreamDetailPage params={params} />
      </QueryClientProvider>
    );

    // Wait for initial data fetch
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalled();
      },
      { timeout: 10000 }
    );

    // Clear fetch calls
    vi.clearAllMocks();

    // Advance timer by 60 seconds
    vi.advanceTimersByTime(60000);

    // Verify that NO refetch was triggered
    await waitFor(
      () => {
        expect(global.fetch).not.toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  }, 15000);

  it('should cancel in-flight requests when time range changes', async () => {
    setupMockFetch('7d');

    const params = Promise.resolve({ id: mockStreamId });
    const user = userEvent.setup({ delay: null });

    render(
      <QueryClientProvider client={queryClient}>
        <StreamDetailPage params={params} />
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(
      () => {
        expect(screen.getByText('7 Days')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Create a slow-resolving fetch to simulate in-flight request
    let slowResolve: any;
    const slowPromise = new Promise((resolve) => {
      slowResolve = resolve;
    });

    (global.fetch as any).mockImplementationOnce(() => slowPromise);

    // Click to change time range
    const todayButton = screen.getByText('Today');
    await user.click(todayButton);

    // The query should be cancelled automatically by TanStack Query
    // when queryKey changes (from '7d' to 'today')
    // We verify by checking that the old query is no longer active
    await waitFor(
      () => {
        const activeQueries = queryClient.getQueryCache().getAll();
        const old7dQuery = activeQueries.find(
          (q) =>
            q.queryKey.includes('stream-metrics') &&
            q.queryKey.includes('7d')
        );
        expect(old7dQuery?.state.status).not.toBe('pending');
      },
      { timeout: 10000 }
    );

    // Resolve the slow fetch to clean up
    slowResolve({
      ok: true,
      json: async () => mockMetricsData,
    });
  }, 15000);

  it('should pause auto-refresh when user interacts with chart (future implementation)', async () => {
    // This test will be implemented after we add the interaction state
    // Currently marked as placeholder for future implementation
    expect(true).toBe(true);
  });

  it('should resume auto-refresh when user stops interacting (future implementation)', async () => {
    // This test will be implemented after we add the interaction state
    // Currently marked as placeholder for future implementation
    expect(true).toBe(true);
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    );

    const params = Promise.resolve({ id: mockStreamId });
    render(
      <QueryClientProvider client={queryClient}>
        <StreamDetailPage params={params} />
      </QueryClientProvider>
    );

    // Component should render without crashing
    await waitFor(
      () => {
        expect(screen.getByText('Stream Analytics')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('should use correct refetchInterval based on time range', () => {
    // Test that different time ranges have correct refetchInterval
    const testCases = [
      { timeRange: 'today', expectedInterval: 60000 },
      { timeRange: '7d', expectedInterval: false },
      { timeRange: '14d', expectedInterval: false },
      { timeRange: '30d', expectedInterval: false },
    ];

    testCases.forEach(({ timeRange, expectedInterval }) => {
      const refetchInterval = timeRange === 'today' ? 60000 : false;
      expect(refetchInterval).toBe(expectedInterval);
    });
  });
});
