import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useQuery } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { getOfflineData, syncNow, isOnline } from "@/sync/engine";
import { getUser } from "@/auth/tokens";
import { insertLocalTicket, insertLocalBatch, addToSyncQueue } from "@/db/client";
import { calcFareBreakdown, formatCents } from "@/utils/money";
import type { Route, Vehicle, User } from "@/types";

export default function IssueTicketScreen() {
  const [issueMode, setIssueMode] = useState<"single" | "batch">("single");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [driverName, setDriverName] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load cached data
  const { data: routes } = useQuery({
    queryKey: ["routes"],
    queryFn: () => getOfflineData<Route>("cached_routes"),
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => getOfflineData<Vehicle>("cached_vehicles"),
  });

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser<User>(),
  });

  // Derived data
  const selectedRoute = routes?.find((r) => r.id === selectedRouteId);
  const selectedVehicle = vehicles?.find((v) => v.id === selectedVehicleId);

  const farePreview = useMemo(() => {
    if (!selectedRoute) return null;
    return calcFareBreakdown({
      fareCents: selectedRoute.baseFareCents,
      distanceKm: selectedRoute.distanceKm,
    });
  }, [selectedRoute]);

  const totalBatchCents = useMemo(() => {
    if (!farePreview) return 0;
    const qty = parseInt(batchQuantity, 10) || 0;
    return farePreview.totalCents * qty;
  }, [farePreview, batchQuantity]);

  async function handleIssue() {
    if (!selectedRouteId || !selectedVehicleId) {
      Alert.alert("Error", "Please select route and vehicle");
      return;
    }

    if (!user?.stationId) {
      Alert.alert("Error", "No station assigned to ticketer");
      return;
    }

    setIsSubmitting(true);

    try {
      if (issueMode === "single") {
        const clientMutationId = uuidv4();
        const ticketId = uuidv4();
        const name = passengerName.trim() || "Walk-in";
        const ticketNumber = `ET-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        await insertLocalTicket({
          id: ticketId,
          ticketNumber,
          routeId: selectedRouteId,
          vehicleId: selectedVehicleId,
          driverName: driverName.trim() || undefined,
          passengerName: name,
          passengerPhone: passengerPhone.trim() || undefined,
          departureDate,
          fareCents: farePreview!.fareCents,
          serviceChargeCents: farePreview!.serviceChargeCents,
          stationFeeCents: farePreview!.stationFeeCents,
          vatCents: farePreview!.vatCents,
          totalCents: farePreview!.totalCents,
          commissionCents: farePreview!.commissionCents,
          ticketerId: user.id,
          stationId: user.stationId,
          clientMutationId,
        });

        await addToSyncQueue({
          id: clientMutationId,
          table: "tickets",
          operation: "CREATE",
          payload: {
            id: ticketId,
            routeId: selectedRouteId,
            vehicleId: selectedVehicleId,
            passengerName: name,
            passengerPhone: passengerPhone.trim() || undefined,
            driverName: driverName.trim() || undefined,
            departureDate,
            clientMutationId,
          },
        });

        Alert.alert(
          "Ticket Issued",
          `Ticket ${ticketNumber}\nTotal: ${formatCents(farePreview!.totalCents)} ETB`,
          [
            {
              text: "Issue Another",
              onPress: () => {
                setPassengerName("");
                setPassengerPhone("");
              },
            },
            { text: "Done" },
          ]
        );
      } else {
        // Batch issuance
        const qty = parseInt(batchQuantity, 10);
        if (isNaN(qty) || qty <= 0) {
          Alert.alert("Error", "Please enter a valid quantity");
          return;
        }

        const batchId = uuidv4();
        const tickets = [];
        const year = new Date().getFullYear();

        for (let i = 1; i <= qty; i++) {
          const tId = uuidv4();
          const mutId = uuidv4();
          const tNum = `ET-${year}-${Date.now().toString().slice(-4)}-${i.toString().padStart(2, "0")}`;
          tickets.push({
            id: tId,
            ticketNumber: tNum,
            routeId: selectedRouteId,
            vehicleId: selectedVehicleId,
            driverName: driverName.trim() || "Driver",
            passengerName: `Passenger ${i}`,
            batchSequence: i,
            departureDate,
            fareCents: farePreview!.fareCents,
            serviceChargeCents: farePreview!.serviceChargeCents,
            stationFeeCents: farePreview!.stationFeeCents,
            vatCents: farePreview!.vatCents,
            totalCents: farePreview!.totalCents,
            commissionCents: farePreview!.commissionCents,
            ticketerId: user.id,
            stationId: user.stationId,
            clientMutationId: mutId,
          });
        }

        await insertLocalBatch({ batchId, tickets });

        // Queue batch mutation
        const batchMutationId = uuidv4();
        await addToSyncQueue({
          id: batchMutationId,
          table: "tickets/batch",
          operation: "CREATE",
          payload: {
            batchId,
            routeId: selectedRouteId,
            vehicleId: selectedVehicleId,
            driverName: driverName.trim() || "Driver",
            quantity: qty,
            departureDate,
            clientMutationId: batchMutationId,
          },
        });

        Alert.alert(
          "Batch Issued",
          `Issued ${qty} tickets\nBatch Total: ${formatCents(totalBatchCents)} ETB`
        );
      }

      // Sync if online
      if (await isOnline()) {
        void syncNow();
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to issue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Mode selection */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeTab, issueMode === "single" && styles.modeTabActive]}
          onPress={() => setIssueMode("single")}
        >
          <Text
            style={[styles.modeTabText, issueMode === "single" && styles.modeTabTextActive]}
          >
            Single Ticket
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, issueMode === "batch" && styles.modeTabActive]}
          onPress={() => setIssueMode("batch")}
        >
          <Text
            style={[styles.modeTabText, issueMode === "batch" && styles.modeTabTextActive]}
          >
            Batch Issuance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Route selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Route *</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={selectedRouteId} onValueChange={setSelectedRouteId}>
            <Picker.Item label="Select route" value="" />
            {routes?.map((route) => (
              <Picker.Item
                key={route.id}
                label={`${route.originStation?.name ?? "?"} → ${route.destinationStation?.name ?? "?"}`}
                value={route.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Vehicle selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Vehicle *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedVehicleId}
            onValueChange={setSelectedVehicleId}
          >
            <Picker.Item label="Select vehicle" value="" />
            {vehicles?.map((v) => (
              <Picker.Item
                key={v.id}
                label={`${v.plateNumber} (${v.capacity} seats)`}
                value={v.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Driver name */}
      <View style={styles.section}>
        <Text style={styles.label}>Driver Name</Text>
        <TextInput
          style={styles.input}
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Driver full name"
        />
      </View>

      {/* Departure date */}
      <View style={styles.section}>
        <Text style={styles.label}>Departure Date *</Text>
        <TextInput
          style={styles.input}
          value={departureDate}
          onChangeText={setDepartureDate}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {issueMode === "single" ? (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Passenger Name</Text>
            <TextInput
              style={styles.input}
              value={passengerName}
              onChangeText={setPassengerName}
              placeholder="Full name (defaults to Walk-in)"
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={passengerPhone}
              onChangeText={setPassengerPhone}
              placeholder="+251..."
              keyboardType="phone-pad"
            />
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.label}>Ticket Quantity *</Text>
          <TextInput
            style={styles.input}
            value={batchQuantity}
            onChangeText={setBatchQuantity}
            placeholder="Number of tickets"
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Fare summary */}
      {farePreview && (
        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>
            {issueMode === "batch" ? "Batch Summary" : "Fare Summary"}
          </Text>
          <View style={styles.fareRow}>
            <Text>Tariff (Per Seat)</Text>
            <Text>{formatCents(farePreview.fareCents)} ETB</Text>
          </View>
          <View style={styles.fareRow}>
            <Text>Service Charge</Text>
            <Text>{formatCents(farePreview.serviceChargeCents)} ETB</Text>
          </View>
          <View style={styles.fareRow}>
            <Text>VAT (15%)</Text>
            <Text>{formatCents(farePreview.vatCents)} ETB</Text>
          </View>
          <View style={styles.fareRow}>
            <Text>Station Fee</Text>
            <Text>{formatCents(farePreview.stationFeeCents)} ETB</Text>
          </View>
          <View style={[styles.fareRow, styles.fareTotal]}>
            <Text style={styles.fareTotalText}>
              {issueMode === "batch"
                ? `Total (${batchQuantity || 0} tickets)`
                : "Total"}
            </Text>
            <Text style={styles.fareTotalText}>
              {formatCents(
                issueMode === "batch" ? totalBatchCents : farePreview.totalCents
              )}{" "}
              ETB
            </Text>
          </View>
        </View>
      )}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleIssue}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {issueMode === "batch" ? `Issue Batch (${batchQuantity})` : "Issue Ticket"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  modeContainer: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: "#007AFF",
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  modeTabTextActive: {
    color: "#fff",
  },
  section: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  fareCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  fareTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  fareTotal: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
    paddingTop: 8,
  },
  fareTotalText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
