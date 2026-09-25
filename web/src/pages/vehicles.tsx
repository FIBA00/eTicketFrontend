import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useStations,
  useUsers,
  type Vehicle,
} from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";

const VEHICLE_TYPES = ["BUS", "MINIBUS", "COASTER"] as const;

interface VehicleFormData {
  plateNumber: string;
  type: string;
  capacity: string;
  agentId: string;
  stationId: string;
}

const emptyForm: VehicleFormData = {
  plateNumber: "",
  type: "BUS",
  capacity: "",
  agentId: "",
  stationId: "",
};

export default function VehiclesPage() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("SYSTEM_ADMIN", "AGENT");

  const { data: vehicles, isLoading } = useVehicles();
  const { data: stations } = useStations();
  const { data: users } = useUsers();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  // Filter agents for dropdown
  const agents = users?.filter((u) => u.role === "AGENT" && u.isActive) ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormData>(emptyForm);
  const [error, setError] = useState("");

  function openCreate() {
    setEditingVehicle(null);
    setForm({
      ...emptyForm,
      agentId: hasRole("AGENT") ? (user?.id ?? "") : "",
      stationId: user?.stationId ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setForm({
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      capacity: vehicle.capacity.toString(),
      agentId: vehicle.agentId,
      stationId: vehicle.stationId,
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const data = {
      plateNumber: form.plateNumber.toUpperCase(),
      type: form.type,
      capacity: parseInt(form.capacity, 10),
      agentId: form.agentId,
      stationId: form.stationId,
    };

    try {
      if (editingVehicle) {
        await updateVehicle.mutateAsync({ id: editingVehicle.id, ...data });
      } else {
        await createVehicle.mutateAsync(data);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  }

  async function handleDelete() {
    if (!deletingVehicle) return;
    try {
      await deleteVehicle.mutateAsync(deletingVehicle.id);
      setDeletingVehicle(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns = [
    {
      key: "plate",
      header: "Plate",
      render: (v: Vehicle) => (
        <span className="font-mono text-sm font-medium">{v.plateNumber}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (v: Vehicle) => (
        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
          {v.type}
        </span>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (v: Vehicle) => `${v.capacity} seats`,
    },
    {
      key: "agent",
      header: "Agent",
      render: (v: Vehicle) => v.agent?.fullName ?? "—",
    },
    {
      key: "station",
      header: "Station",
      render: (v: Vehicle) => v.station?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (v: Vehicle) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            v.isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {v.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "",
            render: (v: Vehicle) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingVehicle(v)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">
            Manage registered buses and vehicles
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={vehicles ?? []}
        isLoading={isLoading}
        emptyMessage="No vehicles found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? "Update vehicle information"
                : "Register a new vehicle"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate">Plate Number *</Label>
                <Input
                  id="plate"
                  value={form.plateNumber}
                  onChange={(e) =>
                    setForm({ ...form, plateNumber: e.target.value })
                  }
                  placeholder="e.g. ET-12345"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Vehicle Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="4"
                  max="80"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                  placeholder="50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station">Station *</Label>
                <Select
                  value={form.stationId}
                  onValueChange={(v) => setForm({ ...form, stationId: v })}
                  disabled={!!user?.stationId && !hasRole("SYSTEM_ADMIN")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations
                      ?.filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent">Agent *</Label>
              <Select
                value={form.agentId}
                onValueChange={(v) => setForm({ ...form, agentId: v })}
                disabled={hasRole("AGENT")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.fullName} (@{a.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createVehicle.isPending || updateVehicle.isPending}
              >
                {createVehicle.isPending || updateVehicle.isPending
                  ? "Saving..."
                  : editingVehicle
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingVehicle}
        onOpenChange={(open) => !open && setDeletingVehicle(null)}
        title="Delete Vehicle"
        description={`Are you sure you want to delete "${deletingVehicle?.plateNumber}"? This will deactivate the vehicle.`}
        onConfirm={handleDelete}
        isLoading={deleteVehicle.isPending}
      />
    </div>
  );
}
