import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
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
  useRoutes,
  useCreateRoute,
  useUpdateRoute,
  useDeleteRoute,
  useStations,
  type Route,
} from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { formatCents } from "@/lib/money-utils";

interface RouteFormData {
  originStationId: string;
  destinationStationId: string;
  distanceKm: string;
  baseFareCents: string;
  estimatedMinutes: string;
}

const emptyForm: RouteFormData = {
  originStationId: "",
  destinationStationId: "",
  distanceKm: "",
  baseFareCents: "",
  estimatedMinutes: "",
};

export default function RoutesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("SYSTEM_ADMIN");

  const { data: routes, isLoading } = useRoutes();
  const { data: stations } = useStations();
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<Route | null>(null);
  const [form, setForm] = useState<RouteFormData>(emptyForm);
  const [error, setError] = useState("");

  function openCreate() {
    setEditingRoute(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(route: Route) {
    setEditingRoute(route);
    setForm({
      originStationId: route.originStationId,
      destinationStationId: route.destinationStationId,
      distanceKm: route.distanceKm.toString(),
      baseFareCents: (route.baseFareCents / 100).toString(),
      estimatedMinutes: route.estimatedMinutes?.toString() ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.originStationId === form.destinationStationId) {
      setError("Origin and destination cannot be the same");
      return;
    }

    const data = {
      originStationId: form.originStationId,
      destinationStationId: form.destinationStationId,
      distanceKm: parseFloat(form.distanceKm),
      baseFareCents: Math.round(parseFloat(form.baseFareCents) * 100),
      estimatedMinutes: form.estimatedMinutes
        ? parseInt(form.estimatedMinutes, 10)
        : undefined,
    };

    try {
      if (editingRoute) {
        await updateRoute.mutateAsync({ id: editingRoute.id, ...data });
      } else {
        await createRoute.mutateAsync(data);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  }

  async function handleDelete() {
    if (!deletingRoute) return;
    try {
      await deleteRoute.mutateAsync(deletingRoute.id);
      setDeletingRoute(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns = [
    {
      key: "route",
      header: "Route",
      render: (r: Route) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {r.originStation?.name ?? r.originStationId}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {r.destinationStation?.name ?? r.destinationStationId}
          </span>
        </div>
      ),
    },
    {
      key: "distance",
      header: "Distance",
      render: (r: Route) => `${r.distanceKm} km`,
    },
    {
      key: "fare",
      header: "Base Fare",
      render: (r: Route) => (
        <span className="font-mono">{formatCents(r.baseFareCents)} ETB</span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (r: Route) =>
        r.estimatedMinutes ? `${r.estimatedMinutes} min` : "—",
    },
    {
      key: "status",
      header: "Status",
      render: (r: Route) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            r.isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "",
            render: (r: Route) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingRoute(r)}
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
          <h1 className="text-2xl font-bold tracking-tight">Routes</h1>
          <p className="text-muted-foreground">Manage bus routes and fares</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Route
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={routes ?? []}
        isLoading={isLoading}
        emptyMessage="No routes found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? "Edit Route" : "Add Route"}
            </DialogTitle>
            <DialogDescription>
              {editingRoute
                ? "Update route information"
                : "Define a new bus route with fare"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin Station *</Label>
                <Select
                  value={form.originStationId}
                  onValueChange={(v) =>
                    setForm({ ...form, originStationId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin" />
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
              <div className="space-y-2">
                <Label>Destination Station *</Label>
                <Select
                  value={form.destinationStationId}
                  onValueChange={(v) =>
                    setForm({ ...form, destinationStationId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distance">Distance (km) *</Label>
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.distanceKm}
                  onChange={(e) =>
                    setForm({ ...form, distanceKm: e.target.value })
                  }
                  placeholder="90"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fare">Base Fare (ETB) *</Label>
                <Input
                  id="fare"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.baseFareCents}
                  onChange={(e) =>
                    setForm({ ...form, baseFareCents: e.target.value })
                  }
                  placeholder="200.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={form.estimatedMinutes}
                  onChange={(e) =>
                    setForm({ ...form, estimatedMinutes: e.target.value })
                  }
                  placeholder="90"
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
                disabled={createRoute.isPending || updateRoute.isPending}
              >
                {createRoute.isPending || updateRoute.isPending
                  ? "Saving..."
                  : editingRoute
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingRoute}
        onOpenChange={(open) => !open && setDeletingRoute(null)}
        title="Delete Route"
        description={`Are you sure you want to delete this route? This will deactivate it.`}
        onConfirm={handleDelete}
        isLoading={deleteRoute.isPending}
      />
    </div>
  );
}
