import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getAllLocalTickets } from "@/db/client";
import { formatCents } from "@/utils/money";

export default function TicketsScreen() {
  const { data: tickets, refetch, isRefetching } = useQuery({
    queryKey: ["localTickets"],
    queryFn: () => getAllLocalTickets(100),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SYNCED": return "#34C759";
      case "PENDING": return "#FF9500";
      case "FAILED": return "#FF3B30";
      default: return "#666";
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets ?? []}
        keyExtractor={(item) => item.id as string}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tickets yet</Text>
            <Text style={styles.emptySubtext}>Issue your first ticket</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketNumber}>
                {item.ticket_number as string}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.sync_status as string) },
                ]}
              >
                <Text style={styles.statusText}>{item.sync_status as string}</Text>
              </View>
            </View>

            <Text style={styles.passengerName}>
              {item.passenger_name as string}
            </Text>

            <View style={styles.ticketDetails}>
              <Text style={styles.detailText}>Seat {item.seat_number as number}</Text>
              <Text style={styles.detailText}>
                {formatCents(item.total_cents as number)} ETB
              </Text>
            </View>

            <Text style={styles.dateText}>
              {new Date(item.departure_date as string).toLocaleDateString()}
            </Text>

            {item.sync_error ? (
              <Text style={styles.errorText}>{item.sync_error as string}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  passengerName: {
    fontSize: 16,
    marginBottom: 8,
  },
  ticketDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  errorText: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 8,
  },
});
