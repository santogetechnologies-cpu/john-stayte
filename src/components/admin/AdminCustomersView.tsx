import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Search,
  Mail,
  Phone,
  Eye,
  User,
  Plus,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { getEphemeralAuthClient } from "@/lib/ephemeral-auth";
import { deleteCustomerAccount } from "@/lib/customer-service";

export function AdminCustomersView() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Customer Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // View Customer Modal State
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);

  // Delete Customer State & Modal
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      toast.error("Failed to load customers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    return (
      (c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return toast.error("Please fill in email and password.");
    setCreating(true);

    try {
      const ephemeralClient = getEphemeralAuthClient();
      const { error } = await ephemeralClient.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: {
            full_name: newName.trim(),
            role: "customer",
          },
        },
      });

      if (error) throw error;
      toast.success("Customer account created!");
      setModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await loadCustomers();
    } catch (err: any) {
      toast.error("Failed to create customer: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete?.id) return;
    setDeleting(true);

    try {
      const res = await deleteCustomerAccount(customerToDelete.id);
      toast.success(res.message || "Customer account deleted successfully.");
      setCustomerToDelete(null);
      await loadCustomers();
    } catch (err: any) {
      toast.error(err.message || "Unable to delete customer. No changes were made.");
    } finally {
      setDeleting(false);
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
            <span className="text-foreground">Customers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Customer Directory ({customers.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage registered customer accounts, view profiles, and perform account maintenance.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="rounded-full font-bold text-xs gap-1.5 shadow-md shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Customer Account
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, email, or phone..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading customer directory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No customer accounts found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Customer accounts created via sign-up or admin will display here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Customer</TableHead>
                <TableHead className="font-bold text-xs">Email</TableHead>
                <TableHead className="font-bold text-xs">Phone</TableHead>
                <TableHead className="font-bold text-xs">Joined Date</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-bold text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                        {(c.full_name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-foreground">
                          {c.full_name || "Unnamed Customer"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono font-normal">
                          {c.id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">{c.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {c.phone || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]"
                    >
                      {c.status || "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-slate-100"
                        >
                          <MoreVertical className="h-4 w-4 text-slate-600" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-lg border-slate-200">
                        <DropdownMenuItem
                          onClick={() => setViewingCustomer(c)}
                          className="cursor-pointer text-xs font-semibold rounded-xl py-2 flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                          <span>View Customer</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                          onClick={() => setCustomerToDelete(c)}
                          className="cursor-pointer text-xs font-bold text-red-600 focus:text-red-700 focus:bg-red-50 rounded-xl py-2 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                          <span>Delete Customer</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* VIEW CUSTOMER DETAILS MODAL */}
      <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Customer Profile
            </DialogTitle>
          </DialogHeader>
          {viewingCustomer && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0">
                  {(viewingCustomer.full_name || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    {viewingCustomer.full_name || "Unnamed Customer"}
                  </h3>
                  <p className="text-xs text-muted-foreground">{viewingCustomer.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Phone</span>
                  <p className="font-bold text-slate-900">{viewingCustomer.phone || "Not provided"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Joined Date</span>
                  <p className="font-bold text-slate-900">
                    {viewingCustomer.created_at
                      ? new Date(viewingCustomer.created_at).toLocaleDateString("en-GB")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Customer ID</span>
                <p className="font-mono text-xs text-slate-800 break-all">{viewingCustomer.id}</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewingCustomer(null)}
                  className="rounded-full text-xs font-bold px-5"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const c = viewingCustomer;
                    setViewingCustomer(null);
                    setCustomerToDelete(c);
                  }}
                  className="rounded-full text-xs font-bold px-5 gap-1.5 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Account
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog
        open={!!customerToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setCustomerToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="h-11 w-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mb-1">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="font-black text-xl text-slate-900">
              Delete Customer?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this customer account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {customerToDelete && (
            <div className="space-y-4 py-2 text-xs">
              {/* Customer summary card */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2 text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-sm text-slate-900">
                      {customerToDelete.full_name || "Unnamed Customer"}
                    </p>
                    <p className="text-xs text-slate-600 font-semibold">{customerToDelete.email}</p>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                    Role: Customer
                  </Badge>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span>ID: <code className="font-mono text-[10px] text-slate-700">{customerToDelete.id.slice(0, 12)}…</code></span>
                  <span>Joined: {customerToDelete.created_at ? new Date(customerToDelete.created_at).toLocaleDateString("en-GB") : "—"}</span>
                </div>
              </div>

              {/* Data retention notice */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Data Safety Notice:</strong> The customer&apos;s authentication account and profile will be permanently deleted. Historical orders and invoices will be safely retained for financial &amp; tax compliance.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerToDelete(null)}
              disabled={deleting}
              className="rounded-full text-xs font-bold px-5 h-10 border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="rounded-full text-xs font-bold px-6 h-10 bg-red-600 hover:bg-red-700 text-white shadow-sm gap-2 cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Customer</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE CUSTOMER MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Add Customer Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Full Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Robert Vance"
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
                placeholder="customer@example.com"
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
                {creating ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
