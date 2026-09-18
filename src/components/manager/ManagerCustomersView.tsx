import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Users, Search, UserPlus, Eye, ShoppingBag, RotateCcw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ManagerCustomersView() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  // Selection & Drawers
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Add Customer Modal
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Load live customer profiles & orders from Supabase
  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const [{ data: dbCusts }, { data: dbOrders }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "customer")
          .order("created_at", { ascending: false }),
        supabase.from("orders").select("*"),
      ]);

      setCustomers(dbCusts || []);
      setOrders(dbOrders || []);
    } catch (err: any) {
      toast.error("Failed to load customer database: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, []);

  // Compute Summary Metrics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => (c.status || "Active") === "Active").length;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newCustomers = customers.filter((c) => new Date(c.created_at || 0) >= thirtyDaysAgo).length;

  const customerEmailsWithOpenOrders = new Set(
    orders
      .filter((o) => o.status === "Pending" || o.status === "Approved")
      .map((o) => o.customer_email),
  );
  const customersWithOpenOrdersCount = customers.filter((c) =>
    customerEmailsWithOpenOrders.has(c.email),
  ).length;

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    let result = customers.filter((c) => {
      const nameMatch = (c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = (c.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || emailMatch;

      const status = c.status || "Active";
      const matchesStatus =
        statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });

    if (sortOrder === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === "name") {
      result.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    }

    return result;
  }, [customers, searchQuery, statusFilter, sortOrder]);

  // Handle Add Customer Form Submit
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      return toast.error("Please provide valid email and password.");
    }
    setCreating(true);

    try {
      // Create real Auth user with customer role metadata
      const { data, error } = await supabase.auth.signUp({
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

      toast.success("Customer account created successfully!");
      setAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await loadCustomerData();
    } catch (err: any) {
      toast.error("Failed to create customer: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Get customer orders
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter((o) => o.customer_email === selectedCustomer.email);
  }, [selectedCustomer, orders]);

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/manager" className="hover:text-red-600 transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Customers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Customers ({totalCustomers})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage customer relationships, orders and operational activity.
          </p>
        </div>

        <Button
          onClick={() => setAddModal(true)}
          className="rounded-full font-black text-xs gap-1.5 shadow-md shadow-red-600/25 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white cursor-pointer h-9.5 shrink-0 self-start sm:self-center"
        >
          <UserPlus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Customers
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalCustomers}</p>
        </div>

        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Active Accounts
          </p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{activeCustomers}</p>
        </div>

        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            New (Last 30 Days)
          </p>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">{newCustomers}</p>
        </div>

        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Open Orders Queue
          </p>
          <p className="text-2xl sm:text-3xl font-black text-purple-600 tracking-tight">{customersWithOpenOrdersCount}</p>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div className="surface-card p-4 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name or email..."
            className="pl-9.5 h-9 rounded-full bg-white/90 border-slate-200/80 text-xs font-medium text-slate-900 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 rounded-full bg-white/90 border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 text-xs font-medium">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[130px] h-9 rounded-full bg-white/90 border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 text-xs font-medium">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all") && (
            <Button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              variant="ghost"
              size="sm"
              className="rounded-full text-xs font-bold gap-1 text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* 4. CUSTOMER DATA TABLE */}
      <div className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="font-black text-sm text-slate-900">No customers yet</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Customer accounts will appear here when they register or are added by admin.
            </p>
            <Button
              onClick={() => setAddModal(true)}
              size="sm"
              className="rounded-full font-black text-xs gap-1.5 mt-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/20"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add Customer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-slate-100">
                <TableRow>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Customer</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Email</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Joined Date</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-bold text-xs">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/80 shadow-2xs">
                          <AvatarFallback className="bg-red-50 text-red-700 font-black text-xs">
                            {(c.full_name || "C").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-slate-900">
                            {c.full_name || "Customer"}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {c.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">{c.email}</TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-black text-[10px] shadow-2xs">
                        {c.status || "Active"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedCustomer(c)}
                        className="rounded-full text-xs font-bold gap-1 text-red-600 hover:text-red-700 hover:bg-red-50/50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 5. CUSTOMER DETAIL SHEET */}
      <Sheet open={Boolean(selectedCustomer)} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 bg-white/95 backdrop-blur-2xl border-l border-white/80 overflow-y-auto text-slate-900">
          {selectedCustomer && (
            <div className="space-y-6 text-xs">
              <SheetHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/80 shadow-2xs">
                    <AvatarFallback className="bg-red-50 text-red-700 font-black text-sm">
                      {(selectedCustomer.full_name || "C").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="font-black text-xl text-slate-900">
                      {selectedCustomer.full_name || "Customer Details"}
                    </SheetTitle>
                    <p className="text-xs text-slate-500 font-medium">{selectedCustomer.email}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="p-4 rounded-2xl border border-white/80 bg-white/80 shadow-2xs space-y-2">
                <p className="font-bold text-slate-900">Contact Information</p>
                <p className="text-slate-600">Email: {selectedCustomer.email}</p>
                <p className="text-slate-600">
                  Phone: {selectedCustomer.phone || "Not specified"}
                </p>
                <p className="text-slate-500 font-medium">
                  Registered: {new Date(selectedCustomer.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">
                  Order History ({selectedCustomerOrders.length})
                </h4>
                {selectedCustomerOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium">
                    No orders placed by this customer yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomerOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3.5 rounded-2xl border border-white/80 bg-white shadow-2xs flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-black text-slate-900">
                            Order #{o.order_number || o.id.slice(0, 8)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(o.created_at).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">{gbp(Number(o.total))}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px] mt-0.5">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 6. ADD CUSTOMER MODAL */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white/95 backdrop-blur-2xl border border-white/80 text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl text-slate-900">Add Customer Account</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCustomer} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-bold text-slate-800">Full Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full Name"
                className="mt-1 rounded-xl text-xs font-semibold bg-white border-slate-200/80 shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-800">Email Address</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="customer@example.com"
                className="mt-1 rounded-xl text-xs font-semibold bg-white border-slate-200/80 shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-800">Initial Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 rounded-xl text-xs font-semibold bg-white border-slate-200/80 shadow-2xs"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddModal(false)}
                className="rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-full font-black text-xs gap-1.5 shadow-md shadow-red-600/20 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                {creating ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
