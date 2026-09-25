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
  useStations,
  useCreateStation,
  useUpdateStation,
  useDeleteStation,
  type Station,
} from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";

const REGIONS = [
  "Addis Ababa",
  "Oromia",
  "Amhara",
  "Tigray",
  "SNNPR",
  "Sidama",
  "Somali",
  "Afar",
  "Benishangul-Gumuz",
  "Gambela",
  "Harari",
  "Dire Dawa",
];

interface StationFormData {
  name: string;
  code: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
}

const emptyForm: StationFormData = {
  name: "",
  code: "",
  city: "",
  region: "",
  latitude: "",
  longitude: "",
};

export default function StationsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("SYSTEM_ADMIN");

  const { data: stations, isLoading } = useStations();
  const createStation = useCreateStation();
  const updateStation = useUpdateStation();
  const deleteStation = useDeleteStation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);
  const [form, setForm] = useState<StationFormData>(emptyForm);
  const [error, setError] = useState("");

  function openCreate() {
    setEditingStation(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(station: Station) {
    setEditingStation(station);
    setForm({
      name: station.name,
      code: station.code,
      city: station.city,
      region: station.region,
      latitude: station.latitude?.toString() ?? "",
      longitude: station.longitude?.toString() ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const data = {
      name: form.name,
      code: form.code.toUpperCase(),
      city: form.city,
      region: form.region,
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
    };

    try {
      if (editingStation) {
        await updateStation.mutateAsync({ id: editingStation.id, ...data });
      } else {
        await createStation.mutateAsync(data);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  }

  async function handleDelete() {
    if (!deletingStation) return;
    try {
      await deleteStation.mutateAsync(deletingStation.id);
      setDeletingStation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns = [
    {
      key: "code",
      header: "Code",
      render: (s: Station) => (
        <span className="font-mono text-sm font-medium">{s.code}</span>
      ),
    },
    { key: "name", header: "Name", render: (s: Station) => s.name },
    { key: "city", header: "City", render: (s: Station) => s.city },
    { key: "region", header: "Region", render: (s: Station) => s.region },
    {
      key: "status",
      header: "Status",
      render: (s: Station) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            s.isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {s.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "",
            render: (s: Station) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingStation(s)}
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
          <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
          <p className="text-muted-foreground">
            Manage bus terminals and stations
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Station
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={stations ?? []}
        isLoading={isLoading}
        emptyMessage="No stations found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStation ? "Edit Station" : "Add Station"}
            </DialogTitle>
            <DialogDescription>
              {editingStation
                ? "Update station information"
                : "Register a new bus station or terminal"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Station Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Adama Terminal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. ADA"
                  maxLength={10}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Adama"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region *</Label>
                <Select
                  value={form.region}
                  onValueChange={(v) => setForm({ ...form, region: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                  placeholder="8.55"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                  placeholder="39.27"
                />
              </div>
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
                disabled={createStation.isPending || updateStation.isPending}
              >
                {createStation.isPending || updateStation.isPending
                  ? "Saving..."
                  : editingStation
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingStation}
        onOpenChange={(open) => !open && setDeletingStation(null)}
        title="Delete Station"
        description={`Are you sure you want to delete "${deletingStation?.name}"? This will deactivate the station.`}
        onConfirm={handleDelete}
        isLoading={deleteStation.isPending}
      />
    </div>
  );
}
