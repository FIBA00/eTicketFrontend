import { useState } from "react";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
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
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useStations,
  type User,
} from "@/hooks/use-api";

const ROLES = [
  { value: "SYSTEM_ADMIN", label: "System Admin" },
  { value: "AGENT", label: "Agent" },
  { value: "TICKETER", label: "Ticketer" },
  { value: "STATION_CONTROLLER", label: "Station Controller" },
] as const;

interface UserFormData {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  role: string;
  stationId: string;
}

const emptyForm: UserFormData = {
  username: "",
  password: "",
  fullName: "",
  phone: "",
  role: "TICKETER",
  stationId: "",
};

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const { data: stations } = useStations();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [error, setError] = useState("");

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      fullName: user.fullName,
      phone: user.phone ?? "",
      role: user.role,
      stationId: user.stationId ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const data: Record<string, unknown> = {
      username: form.username,
      fullName: form.fullName,
      phone: form.phone || undefined,
      role: form.role,
      stationId: form.stationId || undefined,
    };

    // Only include password if provided (for edit) or required (for create)
    if (form.password) {
      data.password = form.password;
    } else if (!editingUser) {
      setError("Password is required");
      return;
    }

    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, ...data });
      } else {
        await createUser.mutateAsync(data as {
          username: string;
          password: string;
          fullName: string;
          phone?: string;
          role: string;
          stationId?: string;
        });
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      setDeletingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const roleLabels: Record<string, string> = {
    SYSTEM_ADMIN: "System Admin",
    AGENT: "Agent",
    TICKETER: "Ticketer",
    STATION_CONTROLLER: "Station Controller",
  };

  const columns = [
    { key: "username", header: "Username", render: (u: User) => (
      <span className="font-mono text-sm">@{u.username}</span>
    )},
    { key: "name", header: "Name", render: (u: User) => (
      <span className="font-medium">{u.fullName}</span>
    )},
    { key: "role", header: "Role", render: (u: User) => (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
        u.role === "SYSTEM_ADMIN" ? "bg-purple-100 text-purple-700" :
        u.role === "AGENT" ? "bg-blue-100 text-blue-700" :
        u.role === "TICKETER" ? "bg-green-100 text-green-700" :
        "bg-orange-100 text-orange-700"
      }`}>
        {roleLabels[u.role] ?? u.role}
      </span>
    )},
    { key: "phone", header: "Phone", render: (u: User) => u.phone ?? "—" },
    { key: "station", header: "Station", render: (u: User) => {
      const station = stations?.find((s) => s.id === u.stationId);
      return station?.name ?? "—";
    }},
    { key: "status", header: "Status", render: (u: User) => (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
        u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}>
        {u.isActive ? "Active" : "Inactive"}
      </span>
    )},
    { key: "actions", header: "", render: (u: User) => (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeletingUser(u)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage system users and their roles
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users ?? []}
        isLoading={isLoading}
        emptyMessage="No users found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information"
                : "Create a new system user"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. ticketer2"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Abebe Kebede"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser ? "(leave blank to keep current)" : "*"}
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? "••••••••" : "Min 6 characters"}
                    className="pl-10"
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+251..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Station</Label>
                <Select
                  value={form.stationId}
                  onValueChange={(v) => setForm({ ...form, stationId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations?.filter((s) => s.isActive).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                {createUser.isPending || updateUser.isPending
                  ? "Saving..."
                  : editingUser ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete User"
        description={`Are you sure you want to delete "${deletingUser?.fullName}"? This will deactivate the account.`}
        onConfirm={handleDelete}
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}
