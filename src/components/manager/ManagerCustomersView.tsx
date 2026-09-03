import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Search,
  UserPlus,
  Eye,
  ShoppingBag,
  RotateCcw,
  Calendar,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const newCustomers = customers.filter(
    (c) => new Date(c.created_at || 0) >= thirtyDaysAgo,
  ).length;

  const customerEmailsWithOpenOrders = new Set(
    orders.filter((o) => o.status === "Pending" || o.status === "Approved").map((o) => o.customer_email),
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
      const matchesStatus = statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Customers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Customers ({totalCustomers})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage customer relationships, orders and operational activity.
          </p>
        </div>

        <Button
          onClick={() => setAddModal(true)}
          className="rounded-full font-bold text-xs gap-1.5 shadow-md shrink-0 self-start sm:self-center"
        >
          <UserPlus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Total Customers
          </p>
          <p className="text-2xl font-black text-foreground">{totalCustomers}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Active Accounts
          </p>
          <p className="text-2xl font-black text-emerald-600">{activeCustomers}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            New (Last 30 Days)
          </p>
          <p className="text-2xl font-black text-blue-600">{newCustomers}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Open Orders Queue
          </p>
          <p className="text-2xl font-black text-purple-600">{customersWithOpenOrdersCount}</p>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name or email..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 rounded-full border-slate-200 text-xs font-semibold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl text-xs font-medium">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[130px] h-9 rounded-full border-slate-200 text-xs font-semibold">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl text-xs font-medium">
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
              className="rounded-full text-xs font-bold gap-1 text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* 4. CUSTOMER DATA TABLE */}
      <div className="surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No customers yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Customer accounts will appear here when they register or are added by admin.
            </p>
            <Button onClick={() => setAddModal(true)} size="sm" className="rounded-full font-bold text-xs gap-1.5 mt-2">
              <UserPlus className="h-3.5 w-3.5" /> Add Customer
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Customer</TableHead>
                <TableHead className="font-bold text-xs">Email</TableHead>
                <TableHead className="font-bold text-xs">Joined Date</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-bold text-xs">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-200">
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                          {(c.full_name || "C").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-extrabold text-foreground">{c.full_name || "Customer"}</p>
                        <p className="text-[11px] text-muted-foreground font-normal">{c.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">{c.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {new Date(c.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                      {c.status || "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCustomer(c)}
                      className="rounded-full text-xs font-bold gap-1 text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5" /> Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 5. CUSTOMER DETAIL SHEET */}
      <Sheet open={Boolean(selectedCustomer)} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 bg-white overflow-y-auto">
          {selectedCustomer && (
            <div className="space-y-6 text-xs">
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border">
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                      {(selectedCustomer.full_name || "C").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="font-black text-lg">
                      {selectedCustomer.full_name || "Customer Details"}
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="p-4 rounded-2xl border bg-slate-50/50 space-y-2">
                <p className="font-bold text-foreground">Contact Information</p>
                <p className="text-muted-foreground">Email: {selectedCustomer.email}</p>
                <p className="text-muted-foreground">Phone: {selectedCustomer.phone || "Not specified"}</p>
                <p className="text-muted-foreground">
                  Registered: {new Date(selectedCustomer.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-foreground">Order History ({selectedCustomerOrders.length})</h4>
                {selectedCustomerOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No orders placed by this customer yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomerOrders.map((o) => (
                      <div key={o.id} className="p-3 rounded-2xl border bg-white flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-foreground">Order #{o.order_number || o.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-GB")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-foreground">{gbp(Number(o.total))}</p>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {o.status}
                          </Badge>
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
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Add Customer Account</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCustomer} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Full Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full Name"
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
                onClick={() => setAddModal(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-full font-bold text-xs gap-1.5 shadow-md"
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
