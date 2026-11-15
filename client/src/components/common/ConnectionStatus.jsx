import React from 'react';
import { useOffline } from '../../context/OfflineContext';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

export const ConnectionStatus = () => {
  const { isOnline, pendingSyncCount, isSyncing, syncFeedback, triggerSync } = useOffline();

  return (
    <div className="flex items-center gap-2">
      {/* Offline Alert & Pending Queue Button */}
      {!isOnline ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse-subtle">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode ({pendingSyncCount} pending)</span>
        </div>
      ) : pendingSyncCount > 0 ? (
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition"
          title="Click to synchronize offline transactions now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync ({pendingSyncCount})</span>
        </button>
      ) : (
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Online</span>
        </div>
      )}

      {/* Sync result feedback toast */}
      {syncFeedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-2 duration-200 ${
            syncFeedback.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncFeedback.message}</span>
        </div>
      )}
    </div>
  );
};
