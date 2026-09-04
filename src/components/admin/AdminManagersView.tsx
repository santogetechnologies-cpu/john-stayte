import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { UserCheck, Plus, Mail, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { getEphemeralAuthClient } from "@/lib/ephemeral-auth";

export function AdminManagersView() {
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const loadManagers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "manager")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setManagers(data || []);
    } catch (err: any) {
      toast.error("Failed to load managers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagers();
  }, []);

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return toast.error("Please fill in email and password.");
    setCreating(true);

    try {
      // Create Auth user with manager role metadata
      const ephemeralClient = getEphemeralAuthClient();
      const { data, error } = await ephemeralClient.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: {
            full_name: newName.trim(),
            role: "manager",
          },
        },
      });

      if (error) throw error;

      // Update public.profiles role to manager if user exists
      if (data.user) {
        await supabase.from("profiles").update({ role: "manager" }).eq("id", data.user.id);
      }

      toast.success("Manager account created!");
      setModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await loadManagers();
    } catch (err: any) {
      toast.error("Failed to create manager: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Managers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Depot Managers & Staff ({managers.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage regional manager accounts and depot assignments in Supabase.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="rounded-full font-bold text-xs gap-1.5 shadow-md shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Manager Account
        </Button>
      </div>

      {/* TABLE */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading manager directory from Supabase...
          </div>
        ) : managers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No manager accounts found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Manager accounts created via admin will display here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Manager</TableHead>
                <TableHead className="font-bold text-xs">Email</TableHead>
                <TableHead className="font-bold text-xs">Role</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((m) => (
                <TableRow key={m.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-bold text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xs">
                        {(m.full_name || "M").charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-foreground">{m.full_name || "Manager"}</p>
                        <p className="text-[11px] text-muted-foreground font-normal">
                          {m.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-[10px]"
                    >
                      Depot Manager
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]"
                    >
                      {m.status || "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* CREATE MANAGER MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Add Manager Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateManager} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Full Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Dave Miller"
                className="mt-1 rounded-xl text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Email Address</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="manager@example.com"
                className="mt-1 rounded-xl text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Initial Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 rounded-xl text-xs font-semibold"
                required
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="rounded-full font-bold text-xs">
                {creating ? "Creating..." : "Create Manager"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
