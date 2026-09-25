import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getUser, clearTokens } from "@/auth/tokens";
import { logout } from "@/api/client";
import type { User } from "@/types";

export default function SettingsScreen() {
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser<User>(),
  });

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          await clearTokens();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      {/* User info */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.fullName ?? "User"}</Text>
        <Text style={styles.userRole}>@{user?.username ?? ""}</Text>
        <Text style={styles.userStation}>{user?.role ?? ""}</Text>
      </View>

      {/* App info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>1</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={[styles.actionText, { color: "#FF3B30" }]}>Logout</Text>
        </TouchableOpacity>
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
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
  },
  userRole: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  userStation: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
  },
  infoLabel: {
    color: "#666",
  },
  infoValue: {
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
