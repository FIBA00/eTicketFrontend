import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { syncNow, isOnline, pullReferenceData } from "@/sync/engine";
import { getSyncStats, getSyncQueue } from "@/db/client";

export default function SyncScreen() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string>("");

  const { data: stats, refetch } = useQuery({
    queryKey: ["syncStats"],
    queryFn: getSyncStats,
  });

  const { data: queue } = useQuery({
    queryKey: ["syncQueue"],
    queryFn: getSyncQueue,
  });

  const { data: online } = useQuery({
    queryKey: ["online"],
    queryFn: isOnline,
  });

  async function handleSync() {
    setIsSyncing(true);
    setLastSyncResult("");

    try {
      const result = await syncNow();
      await pullReferenceData();
      setLastSyncResult(
        `Synced: ${result.synced}, Failed: ${result.failed}, Conflicts: ${result.conflicts}`
      );
      refetch();
    } catch (err) {
      setLastSyncResult(`Error: ${err instanceof Error ? err.message : "Sync failed"}`);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Connection status */}
      <View style={[styles.card, online ? styles.cardOnline : styles.cardOffline]}>
        <Ionicons
          name={online ? "wifi" : "wifi-outline"}
          size={32}
          color={online ? "#34C759" : "#FF3B30"}
        />
        <Text style={[styles.statusText, { color: online ? "#34C759" : "#FF3B30" }]}>
          {online ? "Online" : "Offline"}
        </Text>
      </View>

      {/* Sync stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#FF9500" }]}>
              {stats?.pending ?? 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#34C759" }]}>
              {stats?.synced ?? 0}
            </Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#FF3B30" }]}>
              {stats?.failed ?? 0}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      </View>

      {/* Sync button */}
      <TouchableOpacity
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={isSyncing || !online}
      >
        <Ionicons name="sync" size={24} color="#fff" />
        <Text style={styles.syncButtonText}>
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Text>
      </TouchableOpacity>

      {lastSyncResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>{lastSyncResult}</Text>
        </View>
      ) : null}

      {/* Queue */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Queue ({queue?.length ?? 0})</Text>
        {queue?.length === 0 ? (
          <Text style={styles.emptyText}>Queue is empty</Text>
        ) : (
          queue?.slice(0, 10).map((item) => (
            <View key={item.id} style={styles.queueItem}>
              <Text style={styles.queueTable}>{item.table_name}</Text>
              <Text style={styles.queueOp}>{item.operation}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  cardOnline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  syncButton: {
    backgroundColor: "#007AFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultCard: {
    backgroundColor: "#e5e5e5",
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
  },
  queueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  queueTable: {
    fontSize: 14,
  },
  queueOp: {
    fontSize: 14,
    color: "#666",
  },
});
