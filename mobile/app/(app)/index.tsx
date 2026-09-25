import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "@/auth/tokens";
import { getSyncStats } from "@/db/client";
import { syncNow } from "@/sync/engine";
import type { User } from "@/types";

export default function HomeScreen() {
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser<User>(),
  });

  const { data: syncStats, refetch } = useQuery({
    queryKey: ["syncStats"],
    queryFn: getSyncStats,
  });

  async function handleSync() {
    await syncNow();
    refetch();
  }

  return (
    <ScrollView style={styles.container}>
      {/* Welcome */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.userName}>{user?.fullName ?? "User"}</Text>
        <Text style={styles.userRole}>{user?.role ?? ""}</Text>
      </View>

      {/* Quick actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(app)/issue")}
        >
          <Ionicons name="ticket" size={32} color="#007AFF" />
          <Text style={styles.actionText}>Issue Ticket</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(app)/tickets")}
        >
          <Ionicons name="list" size={32} color="#34C759" />
          <Text style={styles.actionText}>View Tickets</Text>
        </TouchableOpacity>
      </View>

      {/* Sync status */}
      <View style={styles.syncCard}>
        <View style={styles.syncHeader}>
          <Text style={styles.syncTitle}>Sync Status</Text>
          <TouchableOpacity onPress={handleSync}>
            <Ionicons name="sync" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.syncStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{syncStats?.pending ?? 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#34C759" }]}>
              {syncStats?.synced ?? 0}
            </Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#FF3B30" }]}>
              {syncStats?.failed ?? 0}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  welcomeCard: {
    backgroundColor: "#fff",
    padding: 24,
    margin: 16,
    borderRadius: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#007AFF",
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  syncCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  syncHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  syncTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  syncStats: {
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
});
