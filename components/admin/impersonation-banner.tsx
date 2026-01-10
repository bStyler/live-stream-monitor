/**
 * Impersonation Banner - Shows when admin is impersonating a user
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ImpersonationData {
  logId: string;
  adminId: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  startedAt: string;
}

export function ImpersonationBanner() {
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkImpersonationStatus();
  }, []);

  const checkImpersonationStatus = async () => {
    try {
      const response = await fetch('/api/admin/impersonate/status');
      const data = await response.json();

      if (data.active) {
        setImpersonation(data.impersonation);
      } else {
        setImpersonation(null);
      }
    } catch (error) {
      console.error('Failed to check impersonation status:', error);
    }
  };

  const handleStopImpersonation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/impersonate/stop', {
        method: 'POST',
      });

      if (response.ok) {
        setImpersonation(null);
        // Reload page to reset user context
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to stop impersonation');
      }
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
      alert('Failed to stop impersonation');
    } finally {
      setLoading(false);
    }
  };

  if (!impersonation) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-3 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <strong className="font-semibold">Impersonation Mode:</strong>{' '}
            Viewing as{' '}
            <strong className="font-semibold">{impersonation.targetUserName}</strong>{' '}
            ({impersonation.targetUserEmail})
          </div>
        </div>
        <button
          onClick={handleStopImpersonation}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 bg-amber-950 text-amber-50 rounded-md hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          <X className="h-4 w-4" />
          {loading ? 'Stopping...' : 'Stop Impersonation'}
        </button>
      </div>
    </div>
  );
}
