import lttb from '@seanvelasco/lttb';

export interface DataPoint {
  timestamp: string;
  viewers: number | null;
  likes: number;
  views: number;
}

/**
 * Downsample time-series data using LTTB (Largest Triangle Three Buckets) algorithm
 * @param data - Raw data points (e.g., 43,200 points for 30 days)
 * @param targetSize - Target number of points (default: 2000)
 * @returns Downsampled data preserving visual fidelity
 *
 * @example
 * const raw = fetchMetrics(); // 43,200 points
 * const downsampled = downsample(raw, 2000); // 2,000 points
 */
export function downsample(
  data: DataPoint[],
  targetSize: number = 2000
): DataPoint[] {
  // No downsampling needed if data is already small enough
  if (data.length <= targetSize) {
    return data;
  }

  try {
    // Transform to LTTB format: [x, y] pairs
    // Use index for x-axis (time is implicit via array order)
    // Use viewers count for y-axis (primary metric for visual analysis)
    const lttbInput: [number, number][] = data.map((point, index) => [
      index, // x-axis: position in time series
      point.viewers ?? 0, // y-axis: viewer count (handle nulls)
    ]);

    // Run LTTB algorithm - returns array of [x, y] pairs
    const downsampledPoints = lttb(lttbInput, targetSize);

    // Convert to array if it's not already (handle library variations)
    const pointsArray = Array.isArray(downsampledPoints)
      ? downsampledPoints
      : Array.from(downsampledPoints as Iterable<[number, number]>);

    // Map back to original DataPoint format using the x-axis (index) values
    return pointsArray.map(([index]) => data[Math.floor(index)]);
  } catch (error) {
    console.error('Downsampling failed, falling back to decimation:', error);

    // Fallback: Simple decimation (every Nth point)
    // Always preserve first and last points
    const result: DataPoint[] = [data[0]]; // Start with first point

    const step = Math.floor((data.length - 2) / (targetSize - 2)); // -2 to account for first/last
    for (let i = step; i < data.length - 1; i += step) {
      result.push(data[i]);
      if (result.length >= targetSize - 1) break; // -1 to leave room for last point
    }

    result.push(data[data.length - 1]); // End with last point
    return result;
  }
}
