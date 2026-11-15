import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPendingSyncQueue, clearSyncedOperations } from '../offline/indexedDB';
import api from '../services/api';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getPendingSyncQueue();
      setPendingSyncCount(queue.length);
    } catch {
      setPendingSyncCount(0);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    try {
      const queue = await getPendingSyncQueue();
      if (queue.length === 0) return;

      setIsSyncing(true);
      const res = await api.post('/sync/batch', { operations: queue });

      if (res.data?.success) {
        const { processed, conflicts, failed, results } = res.data.data;
        // Find successful op IDs to remove from client queue
        const completedIds = results
          .filter((r) => r.status === 'PROCESSED')
          .map((r) => r.operationId);

        await clearSyncedOperations(completedIds);
        await refreshPendingCount();

        setSyncFeedback({
          type: conflicts > 0 || failed > 0 ? 'warning' : 'success',
          message: `Sync: ${processed} synced, ${conflicts} conflicts, ${failed} failed.`,
        });

        setTimeout(() => setSyncFeedback(null), 6000);
      }
    } catch (err) {
      console.warn('[Sync Error]', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, refreshPendingCount]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingSyncCount,
        isSyncing,
        syncFeedback,
        refreshPendingCount,
        triggerSync,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) throw new Error('useOffline must be used within OfflineProvider');
  return context;
};
