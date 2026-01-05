'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, AlertCircle } from 'lucide-react';

interface DataFreshnessBadgeProps {
  lastUpdated: Date | null;
  isRefetching?: boolean;
}

export function DataFreshnessBadge({ lastUpdated, isRefetching }: DataFreshnessBadgeProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 5 seconds to refresh the "time ago" display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!lastUpdated) {
    return null;
  }

  const secondsSinceUpdate = Math.floor((currentTime.getTime() - lastUpdated.getTime()) / 1000);
  const isStale = secondsSinceUpdate > 90;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
        isStale
          ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30'
          : 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30'
      }`}
    >
      {isStale ? (
        <AlertCircle className="h-3 w-3 animate-pulse" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span>
        {isRefetching ? (
          'Updating...'
        ) : (
          <>
            Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            {isStale && <span className="ml-1">(stale)</span>}
          </>
        )}
      </span>
    </div>
  );
}
