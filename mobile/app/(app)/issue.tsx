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
import { insertLocalTicket, reserveSeat, getReservedSeats } from "@/db/client";
import { calcFareBreakdown, formatCents } from "@/utils/money";
import type { Route, Vehicle, User } from "@/types";

export default function IssueTicketScreen() {
  // Form state
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
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

  // Reserved seats for selected vehicle/date
  const { data: reservedSeats } = useQuery({
    queryKey: ["reservedSeats", selectedVehicleId, departureDate],
    queryFn: () => getReservedSeats(selectedVehicleId, departureDate),
    enabled: !!selectedVehicleId,
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

  // Seat map
  const seatMap = useMemo(() => {
    if (!selectedVehicle) return [];
    const reserved = new Set(reservedSeats ?? []);
    return Array.from({ length: selectedVehicle.capacity }, (_, i) => ({
      seatNumber: i + 1,
      isReserved: reserved.has(i + 1),
    }));
  }, [selectedVehicle, reservedSeats]);

  async function handleIssueTicket() {
    if (!selectedRouteId || !selectedVehicleId || !selectedSeat || !passengerName) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (!user?.stationId) {
      Alert.alert("Error", "No station assigned to user");
      return;
    }

    setIsSubmitting(true);

    try {
      const clientMutationId = uuidv4();
      const ticketId = uuidv4();

      // Calculate fare
      const breakdown = calcFareBreakdown({
        fareCents: selectedRoute!.baseFareCents,
        distanceKm: selectedRoute!.distanceKm,
      });

      // Generate ticket number locally
      const ticketNumber = `ET-${new Date().getFullYear()}-${Date.now()
        .toString()
        .slice(-6)}`;

      // Save locally
      await insertLocalTicket({
        id: ticketId,
        ticketNumber,
        routeId: selectedRouteId,
        vehicleId: selectedVehicleId,
        passengerName,
        passengerPhone: passengerPhone || undefined,
        seatNumber: selectedSeat,
        departureDate,
        fareCents: breakdown.fareCents,
        serviceChargeCents: breakdown.serviceChargeCents,
        stationFeeCents: breakdown.stationFeeCents,
        vatCents: breakdown.vatCents,
        totalCents: breakdown.totalCents,
        commissionCents: breakdown.commissionCents,
        ticketerId: user.id,
        stationId: user.stationId,
        clientMutationId,
      });

      // Reserve seat locally
      await reserveSeat(selectedVehicleId, departureDate, selectedSeat, ticketId);

      // Try to sync immediately if online
      const online = await isOnline();
      if (online) {
        await syncNow();
      }

      // Show success
      Alert.alert(
        "Ticket Issued",
        `Ticket ${ticketNumber}\nSeat ${selectedSeat}\nTotal: ${formatCents(breakdown.totalCents)} ETB`,
        [
          {
            text: "Issue Another",
            onPress: () => {
              setSelectedSeat(null);
              setPassengerName("");
              setPassengerPhone("");
            },
          },
          { text: "Done", style: "default" },
        ]
      );
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to issue ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Route selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Route *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedRouteId}
            onValueChange={setSelectedRouteId}
          >
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
            onValueChange={(v) => {
              setSelectedVehicleId(v);
              setSelectedSeat(null);
            }}
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

      {/* Date */}
      <View style={styles.section}>
        <Text style={styles.label}>Departure Date *</Text>
        <TextInput
          style={styles.input}
          value={departureDate}
          onChangeText={(v) => {
            setDepartureDate(v);
            setSelectedSeat(null);
          }}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {/* Seat selection */}
      {selectedVehicle && (
        <View style={styles.section}>
          <Text style={styles.label}>Select Seat *</Text>
          <View style={styles.seatGrid}>
            {seatMap.map((seat) => (
              <TouchableOpacity
                key={seat.seatNumber}
                style={[
                  styles.seat,
                  seat.isReserved && styles.seatReserved,
                  selectedSeat === seat.seatNumber && styles.seatSelected,
                ]}
                onPress={() => !seat.isReserved && setSelectedSeat(seat.seatNumber)}
                disabled={seat.isReserved}
              >
                <Text
                  style={[
                    styles.seatText,
                    seat.isReserved && styles.seatTextReserved,
                    selectedSeat === seat.seatNumber && styles.seatTextSelected,
                  ]}
                >
                  {seat.seatNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Passenger info */}
      <View style={styles.section}>
        <Text style={styles.label}>Passenger Name *</Text>
        <TextInput
          style={styles.input}
          value={passengerName}
          onChangeText={setPassengerName}
          placeholder="Full name"
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

      {/* Fare summary */}
      {farePreview && (
        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>Fare Summary</Text>
          <View style={styles.fareRow}>
            <Text>Base Fare</Text>
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
            <Text style={styles.fareTotalText}>Total</Text>
            <Text style={styles.fareTotalText}>
              {formatCents(farePreview.totalCents)} ETB
            </Text>
          </View>
        </View>
      )}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleIssueTicket}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Issue Ticket</Text>
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
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
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
  seatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  seat: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  seatReserved: {
    backgroundColor: "#e5e5e5",
    borderColor: "#ccc",
  },
  seatSelected: {
    backgroundColor: "#007AFF",
  },
  seatText: {
    fontSize: 14,
    fontWeight: "500",
  },
  seatTextReserved: {
    color: "#999",
  },
  seatTextSelected: {
    color: "#fff",
  },
  fareCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
