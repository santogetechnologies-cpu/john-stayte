import { useState, useEffect, useMemo } from "react";
import {
  CalendarClock,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Ban,
  Trash2,
  Edit2,
  Users,
  RefreshCw,
  Loader2,
  Eye,
  Sliders,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Check,
  Phone,
  Mail,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gbp } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  getAllDeliverySlots,
  createDeliverySlot,
  updateDeliverySlot,
  deleteDeliverySlot,
  getSlotClosures,
  addSlotClosure,
  deleteSlotClosure,
  getDeliverySlotsAvailability,
  getSlotConfirmedBookings,
  type DeliverySlotRecord,
  type DeliverySlotClosureRecord,
  type SlotAvailabilityResult,
  type ConfirmedBookingRecord,
} from "@/lib/delivery-slot-service";

const DAYS_OF_WEEK = [
  { index: 1, label: "Mon", full: "Monday" },
  { index: 2, label: "Tue", full: "Tuesday" },
  { index: 3, label: "Wed", full: "Wednesday" },
  { index: 4, label: "Thu", full: "Thursday" },
  { index: 5, label: "Fri", full: "Friday" },
  { index: 6, label: "Sat", full: "Saturday" },
  { index: 0, label: "Sun", full: "Sunday" },
];

export function AdminDeliverySlotsView() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<DeliverySlotRecord[]>([]);
  const [closures, setClosures] = useState<DeliverySlotClosureRecord[]>([]);

  // Capacity & Date Inspection State
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [inspectDate, setInspectDate] = useState<string>(todayStr);
  const [dateAvailability, setDateAvailability] = useState<SlotAvailabilityResult[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Modals state
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DeliverySlotRecord | null>(null);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [bookingsModalOpen, setBookingsModalOpen] = useState(false);
  const [inspectingSlot, setInspectingSlot] = useState<DeliverySlotRecord | null>(null);
  const [slotBookings, setSlotBookings] = useState<ConfirmedBookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Form State for Create/Edit Slot
  const [formName, setFormName] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("12:00");
  const [formCapacity, setFormCapacity] = useState(12);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOperatingDays, setFormOperatingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [formSlotType, setFormSlotType] = useState<"delivery" | "pickup" | "both">("both");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [submittingSlot, setSubmittingSlot] = useState(false);

  // Form State for Date Closure
  const [closureDate, setClosureDate] = useState(todayStr);
  const [closureSlotId, setClosureSlotId] = useState<string>("all");
  const [closureReason, setClosureReason] = useState("Bank Holiday / Depot Closed");
  const [submittingClosure, setSubmittingClosure] = useState(false);

  // Load Initial Data
  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [slotsData, closuresData] = await Promise.all([
        getAllDeliverySlots(),
        getSlotClosures(),
      ]);

      setSlots(slotsData);
      setClosures(closuresData);
    } catch (err: any) {
      console.error("Failed to load delivery slots data:", err);
      toast.error(err.message || "Failed to load delivery slots configuration.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch availability when inspectDate or slots change
  useEffect(() => {
    async function fetchAvailability() {
      if (!inspectDate) return;
      try {
        setLoadingAvailability(true);
        const avail = await getDeliverySlotsAvailability(inspectDate, "both");
        setDateAvailability(avail);
      } catch (err) {
        console.warn("Could not calculate slot availability for date:", err);
      } finally {
        setLoadingAvailability(false);
      }
    }
    fetchAvailability();
  }, [inspectDate, slots]);

  // Handle open create modal
  const handleOpenCreateModal = () => {
    setEditingSlot(null);
    setFormName("");
    setFormStartTime("08:00");
    setFormEndTime("12:00");
    setFormCapacity(12);
    setFormIsActive(true);
    setFormOperatingDays([1, 2, 3, 4, 5, 6]);
    setFormSlotType("both");
    setFormSortOrder(slots.length + 1);
    setSlotModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (slot: DeliverySlotRecord) => {
    setEditingSlot(slot);
    setFormName(slot.slot_name);
    setFormStartTime(slot.start_time);
    setFormEndTime(slot.end_time);
    setFormCapacity(slot.capacity);
    setFormIsActive(slot.is_active);
    setFormOperatingDays(slot.operating_days || [1, 2, 3, 4, 5, 6]);
    setFormSlotType(slot.slot_type);
    setFormSortOrder(slot.sort_order || 0);
    setSlotModalOpen(true);
  };

  // Toggle Day of Week Selection
  const toggleOperatingDay = (dayIndex: number) => {
    setFormOperatingDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort(),
    );
  };

  // Save Slot (Create or Update)
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a name for the delivery time slot.");
      return;
    }
    if (!formStartTime || !formEndTime) {
      toast.error("Please specify both start and end times.");
      return;
    }
    if (formCapacity < 0) {
      toast.error("Capacity must be at least 0.");
      return;
    }
    if (formOperatingDays.length === 0) {
      toast.error("Please select at least one operating day.");
      return;
    }

    try {
      setSubmittingSlot(true);
      if (editingSlot) {
        await updateDeliverySlot(editingSlot.id, {
          slot_name: formName.trim(),
          start_time: formStartTime,
          end_time: formEndTime,
          capacity: formCapacity,
          is_active: formIsActive,
          operating_days: formOperatingDays,
          slot_type: formSlotType,
          sort_order: formSortOrder,
        });
        toast.success(`Delivery slot "${formName}" updated successfully.`);
      } else {
        await createDeliverySlot({
          slot_name: formName.trim(),
          start_time: formStartTime,
          end_time: formEndTime,
          capacity: formCapacity,
          is_active: formIsActive,
          operating_days: formOperatingDays,
          slot_type: formSlotType,
          sort_order: formSortOrder,
        });
        toast.success(`Delivery slot "${formName}" created successfully.`);
      }

      setSlotModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to save delivery slot.");
    } finally {
      setSubmittingSlot(false);
    }
  };

  // Quick Toggle Slot Status
  const handleToggleSlotStatus = async (slot: DeliverySlotRecord) => {
    const nextStatus = !slot.is_active;
    try {
      await updateDeliverySlot(slot.id, { is_active: nextStatus });
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, is_active: nextStatus } : s)));
      toast.success(
        `Slot "${slot.slot_name}" ${nextStatus ? "enabled" : "disabled"}. Customer availability updated.`,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update slot status.");
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (slot: DeliverySlotRecord) => {
    if (
      !confirm(
        `Are you sure you want to delete the delivery slot "${slot.slot_name}"? Existing orders will retain their historic timestamp.`,
      )
    ) {
      return;
    }

    try {
      await deleteDeliverySlot(slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
      toast.success(`Delivery slot "${slot.slot_name}" deleted.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slot.");
    }
  };

  // Save Closure
  const handleSaveClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureDate) {
      toast.error("Please pick a closure date.");
      return;
    }
    if (!closureReason.trim()) {
      toast.error("Please enter a reason for the date closure.");
      return;
    }

    try {
      setSubmittingClosure(true);
      await addSlotClosure({
        slot_id: closureSlotId === "all" ? null : closureSlotId,
        closure_date: closureDate,
        reason: closureReason.trim(),
      });

      toast.success(
        `Date closure scheduled for ${closureDate} (${closureSlotId === "all" ? "All Slots" : "Specific Slot"}).`,
      );
      setClosureModalOpen(false);
      setClosureReason("Bank Holiday / Depot Closed");
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to add date closure.");
    } finally {
      setSubmittingClosure(false);
    }
  };

  // Delete Closure
  const handleDeleteClosure = async (closure: DeliverySlotClosureRecord) => {
    try {
      await deleteSlotClosure(closure.id);
      setClosures((prev) => prev.filter((c) => c.id !== closure.id));
      toast.success(`Date closure for ${closure.closure_date} removed. Slot reopened.`);
      // Refresh date availability
      const avail = await getDeliverySlotsAvailability(inspectDate, "both");
      setDateAvailability(avail);
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen date closure.");
    }
  };

  // Inspect Bookings for a Slot
  const handleInspectBookings = async (slot: DeliverySlotRecord) => {
    setInspectingSlot(slot);
    setBookingsModalOpen(true);
    setLoadingBookings(true);
    try {
      const bookings = await getSlotConfirmedBookings(slot.id, inspectDate);
      setSlotBookings(bookings);
    } catch (err: any) {
      toast.error(err.message || "Failed to load confirmed bookings for this slot.");
      setSlotBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Metrics
  const activeSlotsCount = slots.filter((s) => s.is_active).length;
  const totalDailyCapacity = slots
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + s.capacity, 0);
  const totalBookedForDate = dateAvailability.reduce((sum, s) => sum + s.booked_count, 0);
  const totalRemainingForDate = dateAvailability.reduce((sum, s) => sum + s.remaining_capacity, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <CalendarClock className="h-4 w-4" />
            <span>OPERATIONS / DISPATCH</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-display">
            Delivery Slot Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure delivery time windows, enforce maximum vehicle capacities, manage depot
            working days, and set holiday date closures in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="rounded-xl h-9 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setClosureModalOpen(true)}
            className="rounded-xl h-9 text-xs font-bold gap-1.5 border-amber-200 bg-amber-50/60 text-amber-900 hover:bg-amber-100"
          >
            <Ban className="h-3.5 w-3.5 text-amber-600" />
            <span>Add Date Closure</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="rounded-xl h-9 text-xs font-black gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Time Slot</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Slots
              </p>
              <p className="text-2xl font-black text-slate-900 font-display mt-0.5">
                {activeSlotsCount}{" "}
                <span className="text-xs font-normal text-slate-400">/ {slots.length} total</span>
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Max Daily Capacity
              </p>
              <p className="text-2xl font-black text-slate-900 font-display mt-0.5">
                {totalDailyCapacity}{" "}
                <span className="text-xs font-normal text-slate-400">deliveries</span>
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sliders className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Booked ({inspectDate})
              </p>
              <p className="text-2xl font-black text-amber-950 font-display mt-0.5">
                {totalBookedForDate}{" "}
                <span className="text-xs font-bold text-emerald-600">
                  ({totalRemainingForDate} open)
                </span>
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Scheduled Closures
              </p>
              <p className="text-2xl font-black text-slate-900 font-display mt-0.5">
                {closures.length} <span className="text-xs font-normal text-slate-400">dates</span>
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <Ban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Tabs */}
      <Tabs defaultValue="slots" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
          <TabsList className="bg-white/80 border border-slate-200/60 p-1 rounded-xl">
            <TabsTrigger
              value="slots"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Time Slots Configuration
            </TabsTrigger>
            <TabsTrigger
              value="closures"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Date Closures & Holidays ({closures.length})
            </TabsTrigger>
          </TabsList>

          {/* Real-time date inspector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Inspect Capacity For:
            </span>
            <Input
              type="date"
              value={inspectDate}
              onChange={(e) => setInspectDate(e.target.value)}
              className="h-8 w-38 text-xs font-bold rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        {/* TAB 1: SLOTS CONFIGURATION */}
        <TabsContent value="slots" className="space-y-4">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black text-slate-900 font-display">
                    Configured Delivery Time Slots
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Changes here immediately control the available slots shown to customers during
                    checkout and gas ordering.
                  </CardDescription>
                </div>
                {loadingAvailability && (
                  <Badge variant="outline" className="text-[10px] gap-1 animate-pulse text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> Calculating capacity...
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs">Loading delivery slot matrix...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <CalendarClock className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No delivery slots configured</p>
                  <p className="text-xs max-w-sm mx-auto text-slate-500">
                    Click "Create Time Slot" above to define your morning, afternoon, or evening
                    dispatch windows.
                  </p>
                  <Button size="sm" onClick={handleOpenCreateModal} className="rounded-xl text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create Initial Slot
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 text-slate-600 font-bold text-[11px]">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Slot Name & Timing</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Max Capacity</TableHead>
                      <TableHead>Operating Days</TableHead>
                      <TableHead>Bookings ({inspectDate})</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot, index) => {
                      // Match real-time date availability for this slot
                      const avail = dateAvailability.find((a) => a.id === slot.id);
                      const isClosedOnDate = avail?.is_closed;
                      const isNonOperatingOnDate = avail && !avail.is_operating_day;
                      const bookedCount = avail?.booked_count || 0;
                      const remainingCount = avail?.remaining_capacity ?? slot.capacity;
                      const isFull = avail
                        ? !avail.is_available && !isClosedOnDate && !isNonOperatingOnDate
                        : false;

                      return (
                        <TableRow key={slot.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-mono text-xs text-slate-400">
                            {slot.sort_order || index + 1}
                          </TableCell>

                          <TableCell>
                            <div>
                              <p className="font-extrabold text-xs text-slate-900">
                                {slot.slot_name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-0.5">
                                <Clock className="h-3 w-3 text-primary" />
                                <span>
                                  {slot.start_time} – {slot.end_time}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold uppercase",
                                slot.slot_type === "delivery"
                                  ? "border-sky-200 bg-sky-50 text-sky-800"
                                  : slot.slot_type === "pickup"
                                    ? "border-purple-200 bg-purple-50 text-purple-800"
                                    : "border-slate-200 bg-slate-50 text-slate-700",
                              )}
                            >
                              {slot.slot_type}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-slate-900">
                                {slot.capacity}
                              </span>
                              <span className="text-[10px] text-slate-500">deliveries/day</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1">
                              {DAYS_OF_WEEK.map((d) => {
                                const isOper = slot.operating_days?.includes(d.index);
                                return (
                                  <span
                                    key={d.index}
                                    title={d.full}
                                    className={cn(
                                      "text-[9px] font-black h-5 w-5 rounded-md flex items-center justify-center transition-colors",
                                      isOper
                                        ? "bg-slate-800 text-white"
                                        : "bg-slate-100 text-slate-300",
                                    )}
                                  >
                                    {d.label[0]}
                                  </span>
                                );
                              })}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              {isClosedOnDate ? (
                                <Badge
                                  variant="outline"
                                  className="border-red-200 bg-red-50 text-red-700 text-[10px] font-extrabold gap-1"
                                >
                                  <Ban className="h-3 w-3" />
                                  <span>Closed: {avail?.closure_reason || "Date Closed"}</span>
                                </Badge>
                              ) : isNonOperatingOnDate ? (
                                <Badge
                                  variant="outline"
                                  className="border-slate-200 bg-slate-100 text-slate-500 text-[10px] font-bold"
                                >
                                  Non-working Day
                                </Badge>
                              ) : isFull ? (
                                <Badge className="bg-red-600 text-white text-[10px] font-black">
                                  Fully Booked ({bookedCount}/{slot.capacity})
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-xs text-emerald-700">
                                    {remainingCount} open
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    ({bookedCount} booked)
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={slot.is_active}
                                onCheckedChange={() => handleToggleSlotStatus(slot)}
                              />
                              <span
                                className={cn(
                                  "text-[11px] font-bold",
                                  slot.is_active ? "text-emerald-700" : "text-slate-400",
                                )}
                              >
                                {slot.is_active ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleInspectBookings(slot)}
                                title="Inspect confirmed customer bookings"
                                className="h-8 px-2 text-xs font-bold text-slate-700 hover:text-primary hover:bg-primary/5"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span>Bookings</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditModal(slot)}
                                title="Edit slot settings"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSlot(slot)}
                                title="Delete slot"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DATE CLOSURES & HOLIDAYS */}
        <TabsContent value="closures" className="space-y-4">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-900 font-display">
                  Scheduled Date Closures & Overrides
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Block deliveries on specific bank holidays, bad-weather days, or depot closures
                  without altering permanent slot configurations.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => setClosureModalOpen(true)}
                className="rounded-xl h-8 text-xs font-black gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Date Closure</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {closures.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/80" />
                  <p className="text-sm font-bold text-slate-700">No date closures scheduled</p>
                  <p className="text-xs text-slate-500">
                    All slots are currently operating according to their standard weekly schedule.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 text-slate-600 font-bold text-[11px]">
                      <TableHead>Closure Date</TableHead>
                      <TableHead>Target Slot</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closures.map((closure) => (
                      <TableRow key={closure.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <span className="font-extrabold text-xs text-slate-900">
                              {closure.closure_date}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold",
                              closure.slot_id
                                ? "border-slate-200 bg-slate-50 text-slate-800"
                                : "border-amber-200 bg-amber-50 text-amber-900 font-black",
                            )}
                          >
                            {closure.slot_name || "All Slots (Depot Wide)"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-semibold text-slate-700">
                            {closure.reason}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-slate-400">
                          {new Date(closure.created_at).toLocaleDateString("en-GB")}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClosure(closure)}
                            className="h-8 px-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            <span>Reopen Date</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: CREATE OR EDIT SLOT */}
      <Dialog open={slotModalOpen} onOpenChange={setSlotModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 font-display">
              {editingSlot ? "Edit Delivery Slot" : "Create New Delivery Slot"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set the delivery window name, time range, max deliveries per shift, and operating
              days.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSlot} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Slot Display Name *</Label>
              <Input
                placeholder="e.g. Morning Window (08:00 - 12:00)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Start Time (24h) *</Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  required
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">End Time (24h) *</Label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  required
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Max Capacity (Orders) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                  required
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Service Type</Label>
                <Select value={formSlotType} onValueChange={(val: any) => setFormSlotType(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (Delivery & Pickup)</SelectItem>
                    <SelectItem value="delivery">Delivery Only</SelectItem>
                    <SelectItem value="pickup">Depot Pickup Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Operating Days Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Active Delivery Days *</Label>
              <div className="grid grid-cols-7 gap-1 pt-1">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = formOperatingDays.includes(d.index);
                  return (
                    <button
                      type="button"
                      key={d.index}
                      onClick={() => toggleOperatingDay(d.index)}
                      className={cn(
                        "h-8 rounded-xl text-xs font-black transition-all border flex flex-col items-center justify-center cursor-pointer",
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">
                Customers can only select this slot on the highlighted days of the week.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-700">Enable Slot Immediately</Label>
                <p className="text-[10px] text-slate-400">Make this slot available to shoppers</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSlotModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingSlot}
                className="rounded-xl text-xs font-black bg-primary text-white"
              >
                {submittingSlot ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : editingSlot ? (
                  "Update Slot"
                ) : (
                  "Create Slot"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD DATE CLOSURE */}
      <Dialog open={closureModalOpen} onOpenChange={setClosureModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
              <Ban className="h-5 w-5 text-amber-600" />
              <span>Schedule Date Closure</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Prevent bookings for bank holidays, maintenance days, or closed shifts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClosure} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Date to Close *</Label>
              <Input
                type="date"
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Scope of Closure</Label>
              <Select value={closureSlotId} onValueChange={setClosureSlotId}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entire Day (All Slots Closed)</SelectItem>
                  {slots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.slot_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Closure Reason / Notice *</Label>
              <Input
                placeholder="e.g. Bank Holiday / Depot Staff Training"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                required
                className="h-9 text-xs rounded-xl"
              />
              <p className="text-[10px] text-slate-400">
                This notice will be shown to customers when this slot or date is viewed.
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClosureModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingClosure}
                className="rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submittingClosure ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  "Confirm Date Closure"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: INSPECT CONFIRMED BOOKINGS */}
      <Dialog open={bookingsModalOpen} onOpenChange={setBookingsModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 font-display">
                  Confirmed Bookings
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {inspectingSlot?.slot_name} • Date: <strong>{inspectDate}</strong>
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-xs font-extrabold bg-slate-50">
                {slotBookings.length} / {inspectingSlot?.capacity || 0} slots used
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {loadingBookings ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-xs">Fetching confirmed customer orders...</p>
              </div>
            ) : slotBookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-500" />
                <p className="text-xs font-bold text-slate-700">
                  No orders booked for this slot on {inspectDate}
                </p>
                <p className="text-[11px] text-slate-400">
                  Full capacity ({inspectingSlot?.capacity} deliveries) is available for customers.
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {slotBookings.map((b) => (
                  <div
                    key={b.order_id}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 font-mono">
                          #{b.order_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-bold",
                            b.payment_status === "Paid"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200",
                          )}
                        >
                          {b.payment_status}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-bold text-slate-600">
                          {b.order_status}
                        </Badge>
                      </div>

                      <p className="font-bold text-slate-800">{b.customer_name}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        {b.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {b.customer_phone}
                          </span>
                        )}
                        {b.delivery_address && (
                          <span className="flex items-center gap-1 truncate max-w-xs">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {b.delivery_address}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-slate-900 font-display">
                        {gbp(b.total)}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(b.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingsModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
