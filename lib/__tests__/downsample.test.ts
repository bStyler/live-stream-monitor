import { describe, it, expect } from 'vitest';
import { downsample, type DataPoint } from '../downsample';

describe('downsample', () => {
  function generateMockData(count: number): DataPoint[] {
    return Array.from({ length: count }, (_, i) => ({
      timestamp: new Date(2026, 0, 1, 0, i).toISOString(),
      viewers: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
      views: Math.floor(Math.random() * 100000),
    }));
  }

  it('should preserve first and last points', () => {
    const data = generateMockData(1000);
    const result = downsample(data, 100);

    expect(result[0]).toEqual(data[0]);
    expect(result[result.length - 1]).toEqual(data[data.length - 1]);
  });

  it('should return exact target size', () => {
    const data = generateMockData(5000);
    const result = downsample(data, 2000);

    expect(result.length).toBe(2000);
  });

  it('should handle edge case: data.length < targetSize (no downsampling needed)', () => {
    const data = generateMockData(50);
    const result = downsample(data, 100);

    expect(result).toEqual(data); // Should return original data
    expect(result.length).toBe(50);
  });

  it('should handle edge case: data.length === targetSize', () => {
    const data = generateMockData(100);
    const result = downsample(data, 100);

    expect(result).toEqual(data);
  });

  it('should complete in <100ms for 43,200 points', () => {
    const data = generateMockData(43200);

    const start = performance.now();
    downsample(data, 2000);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle null values gracefully without throwing', () => {
    const data: DataPoint[] = [
      { timestamp: '2026-01-01T00:00:00Z', viewers: 100, likes: 10, views: 1000 },
      { timestamp: '2026-01-01T00:01:00Z', viewers: null as any, likes: 15, views: 1100 },
      { timestamp: '2026-01-01T00:02:00Z', viewers: 200, likes: 20, views: 1200 },
    ];

    expect(() => downsample(data, 2)).not.toThrow();
  });

  it('should preserve peak values (local maxima)', () => {
    // Create data with a clear spike in the middle
    const data: DataPoint[] = [
      ...generateMockData(500).map(d => ({ ...d, viewers: 1000 })),
      { timestamp: new Date(2026, 0, 1, 8, 30).toISOString(), viewers: 10000, likes: 100, views: 10000 }, // Peak
      ...generateMockData(500).map(d => ({ ...d, viewers: 1000 })),
    ];

    const result = downsample(data, 100);

    // The peak value should be preserved
    const maxViewers = Math.max(...result.map(d => d.viewers));
    expect(maxViewers).toBe(10000);
  });

  it('should work with real-world 30-day scenario (43,200 points → 2,000)', () => {
    const data = generateMockData(43200); // 30 days × 1440 minutes
    const result = downsample(data, 2000);

    expect(result.length).toBe(2000);
    expect(result[0]).toEqual(data[0]);
    expect(result[result.length - 1]).toEqual(data[data.length - 1]);
  });
});
