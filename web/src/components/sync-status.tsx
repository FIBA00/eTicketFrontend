import { useState, useEffect } from "react";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover.tsx";
import { Badge } from "../components/ui/badge.tsx";
import {
  getSyncStatus,
  syncNow,
  onSyncComplete,
  type SyncResult,
} from "../lib/sync-engine.ts";
import {
  getQueueLength,
  isOnline,
  onOnlineChange,
} from "../lib/offline-queue.ts";
import React from "react";

export default function SyncStatus() {
  const [online, setOnline] = useState(isOnline());
  const [queueLength, setQueueLength] = useState(getQueueLength());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    pending: number;
    applied: number;
    conflicts: number;
    rejected: number;
  } | null>(null);

  useEffect(() => {
    // Listen to online/offline
    const unsubOnline = onOnlineChange((status) => {
      setOnline(status);
      refreshStatus();
    });

    // Listen to sync completion
    const unsubSync = onSyncComplete((result) => {
      setLastResult(result);
      refreshStatus();
    });

    // Listen to pull events (invalidate queries)
    const handlePull = () => {
      refreshStatus();
    };
    window.addEventListener("sync:pull", handlePull);

    // Initial status
    refreshStatus();

    // Poll for queue changes
    const interval = setInterval(refreshStatus, 10000);

    return () => {
      unsubOnline();
      unsubSync();
      window.removeEventListener("sync:pull", handlePull);
      clearInterval(interval);
    };
  }, []);

  async function refreshStatus() {
    setQueueLength(getQueueLength());
    try {
      const status = await getSyncStatus();
      setServerStatus(status.serverStatus ?? null);
    } catch {
      // Server status optional
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      const result = await syncNow();
      setLastResult(result);
    } finally {
      setIsSyncing(false);
      refreshStatus();
    }
  }

  const hasIssues = queueLength > 0 || (serverStatus?.conflicts ?? 0) > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {online ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          {hasIssues && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1">
              {queueLength}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          {/* Connection status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection</span>
            <div className="flex items-center gap-1">
              {online ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Offline</span>
                </>
              )}
            </div>
          </div>

          {/* Queue status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pending Sync</span>
            <Badge variant={queueLength > 0 ? "secondary" : "outline"}>
              {queueLength} items
            </Badge>
          </div>

          {/* Server status */}
          {serverStatus && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Server Status</span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied</span>
                  <span>{serverStatus.applied}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span>{serverStatus.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conflicts</span>
                  <span
                    className={serverStatus.conflicts > 0 ? "text-red-600" : ""}
                  >
                    {serverStatus.conflicts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rejected</span>
                  <span
                    className={serverStatus.rejected > 0 ? "text-red-600" : ""}
                  >
                    {serverStatus.rejected}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Last sync result */}
          {lastResult && (
            <div className="space-y-1">
              <span className="text-sm font-medium">Last Sync</span>
              <div className="flex items-center gap-2 text-sm">
                {lastResult.errors.length === 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Synced {lastResult.synced} items</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>
                      {lastResult.synced} synced, {lastResult.failed} failed
                    </span>
                  </>
                )}
              </div>
              {lastResult.errors.length > 0 && (
                <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                  {lastResult.errors.slice(0, 3).map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sync button */}
          <Button
            onClick={handleSync}
            disabled={isSyncing || !online || queueLength === 0}
            className="w-full"
            size="sm"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
