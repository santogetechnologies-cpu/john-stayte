import { useState, useEffect, useMemo } from "react";
import {
  Flame,
  Search,
  Filter,
  Building2,
  Tag,
  Percent,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Clock,
  History,
  FileText,
  DollarSign,
  ShieldCheck,
  Truck,
  Edit3,
  RefreshCw,
  Info,
  ChevronRight,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import {
  GasPricingBand,
  BranchGasPrice,
  PricingAuditLogEntry,
} from "@/types/pricing";
import { WESTON_FORECOURT_ID } from "@/data/client-pricing-data";
import {
  BRANCH_PRICING_LOCATIONS,
  getPricingOverviewStats,
  getPricingBands,
  getPricesByBranchAndBand,
  getAllCustomerCategories,
  getSpecialCustomerPrices,
  getPricingHistoryAuditLogs,
  updateBranchGasPrice,
  togglePricingBandStatus,
  determineDeliveryEligibility,
  loadLivePricingFromDatabase,
} from "@/lib/branch-pricing-service";

type NavigationSection =
  | "overview"
  | "branch-pricing"
  | "pricing-bands"
  | "customer-categories"
  | "special-customer"
  | "vat-information"
  | "delivery-rules"
  | "pricing-history";

export function AdminGasPricingView() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<NavigationSection>("overview");

  // Operational State
  const [stats, setStats] = useState(getPricingOverviewStats());
  const [bands, setBands] = useState<GasPricingBand[]>(getPricingBands());
  const [auditLogs, setAuditLogs] = useState<PricingAuditLogEntry[]>(getPricingHistoryAuditLogs());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedActiveFilter, setSelectedActiveFilter] = useState<string>("ALL");

  // Branch Pricing Tab specific state
  const [selectedBranchLocation, setSelectedBranchLocation] = useState<string>("WESTON");
  const [westonBandFilter, setWestonBandFilter] = useState<string>("ALL");

  // Pricing Band Inspection modal
  const [inspectBand, setInspectBand] = useState<GasPricingBand | null>(null);

  // Edit Price Modal State
  const [editPriceTarget, setEditPriceTarget] = useState<BranchGasPrice | null>(null);
  const [editExcVat, setEditExcVat] = useState<string>("");
  const [editIncVat, setEditIncVat] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Toggle Band Status Modal State
  const [toggleBandTarget, setToggleBandTarget] = useState<GasPricingBand | null>(null);
  const [toggleReason, setToggleReason] = useState<string>("");
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);

  // Clarification Modal State
  const [showClarificationModal, setShowClarificationModal] = useState(false);

  // Card Navigation Handlers
  const handleOpenTotalBands = () => {
    setActiveTab("pricing-bands");
    setSelectedBranchFilter("ALL");
    setSelectedCategoryFilter("ALL");
    setSelectedActiveFilter("ALL");
    setSearchQuery("");
  };

  const handleOpenTotalEntries = () => {
    setActiveTab("branch-pricing");
    setSelectedBranchLocation("ALL");
    setWestonBandFilter("ALL");
  };

  const handleOpenWestonPrices = () => {
    setActiveTab("branch-pricing");
    setSelectedBranchLocation("WESTON");
    setWestonBandFilter("ALL");
  };

  const handleOpenEastingtonPrices = () => {
    setActiveTab("branch-pricing");
    setSelectedBranchLocation("EASTINGTON");
  };

  const handleOpenActiveBands = () => {
    setActiveTab("pricing-bands");
    setSelectedBranchFilter("ALL");
    setSelectedCategoryFilter("ALL");
    setSelectedActiveFilter("ACTIVE");
    setSearchQuery("");
  };

  const handleOpenClarification = () => {
    setShowClarificationModal(true);
  };

  const handleOpenSpecialAccounts = () => {
    setActiveTab("special-customer");
  };

  // Sync state on updates
  const refreshData = () => {
    setStats(getPricingOverviewStats());
    setBands(getPricingBands());
    setAuditLogs(getPricingHistoryAuditLogs());
  };

  useEffect(() => {
    loadLivePricingFromDatabase().then(() => refreshData());
    const handleUpdate = () => refreshData();
    window.addEventListener("gas_pricing_updated", handleUpdate);
    return () => window.removeEventListener("gas_pricing_updated", handleUpdate);
  }, []);

  // Filtered pricing bands for Band Management view
  const filteredBands = useMemo(() => {
    return bands.filter((b) => {
      if (selectedBranchFilter !== "ALL" && b.location_code !== selectedBranchFilter) {
        return false;
      }
      if (selectedCategoryFilter !== "ALL" && b.customer_category !== selectedCategoryFilter) {
        return false;
      }
      if (selectedActiveFilter === "ACTIVE" && !b.is_active) return false;
      if (selectedActiveFilter === "INACTIVE" && b.is_active) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchBand = b.band_number.toLowerCase().includes(query);
        const matchCat = b.customer_category.toLowerCase().includes(query);
        const matchLoc = b.location_name.toLowerCase().includes(query);
        if (!matchBand && !matchCat && !matchLoc) return false;
      }
      return true;
    });
  }, [bands, selectedBranchFilter, selectedCategoryFilter, selectedActiveFilter, searchQuery]);

  // Filtered Weston branch pricing entries (accessible by band or viewing all 93 entries)
  const displayedWestonPrices = useMemo(() => {
    if (westonBandFilter === "90") {
      return getPricesByBranchAndBand("band-weston-90");
    }
    if (westonBandFilter === "98") {
      return getPricesByBranchAndBand("band-weston-98");
    }
    if (westonBandFilter === "97") {
      return getPricesByBranchAndBand("band-weston-97");
    }
    if (westonBandFilter === "89") {
      return getPricesByBranchAndBand("band-weston-89");
    }
    if (westonBandFilter === "memo") {
      return bands
        .filter((b) => b.location_code === "WESTON" && b.band_type === "fixed")
        .flatMap((b) => getPricesByBranchAndBand(b.id));
    }
    // "ALL": returns all 93 Weston prices across discount tiers and memo bands
    return getPricesByBranchAndBand("band-weston-98")
      .concat(getPricesByBranchAndBand("band-weston-97"))
      .concat(getPricesByBranchAndBand("band-weston-90"))
      .concat(getPricesByBranchAndBand("band-weston-89"))
      .concat(
        bands
          .filter((b) => b.location_code === "WESTON" && b.band_type === "fixed")
          .flatMap((b) => getPricesByBranchAndBand(b.id))
      );
  }, [bands, westonBandFilter]);

  // All 64 Eastington branch pricing entries
  const displayedEastingtonPrices = useMemo(() => {
    return bands
      .filter((b) => b.location_code === "EASTINGTON")
      .flatMap((b) => getPricesByBranchAndBand(b.id));
  }, [bands]);

  // All 157 branch pricing entries (93 Weston + 64 Eastington)
  const displayedAllPrices = useMemo(() => {
    const westonAll = getPricesByBranchAndBand("band-weston-98")
      .concat(getPricesByBranchAndBand("band-weston-97"))
      .concat(getPricesByBranchAndBand("band-weston-90"))
      .concat(getPricesByBranchAndBand("band-weston-89"))
      .concat(
        bands
          .filter((b) => b.location_code === "WESTON" && b.band_type === "fixed")
          .flatMap((b) => getPricesByBranchAndBand(b.id))
      );
    const eastingtonAll = bands
      .filter((b) => b.location_code === "EASTINGTON")
      .flatMap((b) => getPricesByBranchAndBand(b.id));
    return westonAll.concat(eastingtonAll);
  }, [bands]);

  // Special Customer Prices
  const specialPrices = useMemo(() => {
    return getSpecialCustomerPrices("admin");
  }, [bands]);

  // Customer categories
  const categoriesList = useMemo(() => {
    return getAllCustomerCategories();
  }, [bands]);

  // Open Edit Price Modal
  const handleOpenEditPrice = (price: BranchGasPrice) => {
    setEditPriceTarget(price);
    setEditExcVat(price.price_exc_vat !== null ? price.price_exc_vat.toString() : "");
    setEditIncVat(price.price_inc_vat !== null ? price.price_inc_vat.toString() : "");
    setEditNotes(price.notes || "");
    setEditReason("");
  };

  // Submit Price Edit
  const handleSubmitPriceEdit = async () => {
    if (!editPriceTarget || !user) return;

    if (!editReason || editReason.trim().length < 5) {
      toast.error("Please provide a valid reason for this price modification (minimum 5 characters).");
      return;
    }

    const excNum = editExcVat.trim() === "" ? null : Number(editExcVat);
    const incNum = editIncVat.trim() === "" ? null : Number(editIncVat);

    if (excNum !== null && (isNaN(excNum) || excNum < 0)) {
      toast.error("Price excluding VAT must be a non-negative number.");
      return;
    }

    if (incNum !== null && (isNaN(incNum) || incNum < 0)) {
      toast.error("Price including VAT must be a non-negative number.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await updateBranchGasPrice(
        editPriceTarget.id,
        {
          price_exc_vat: excNum,
          price_inc_vat: incNum,
          notes: editNotes.trim() || null,
        },
        {
          id: user.id || "admin-user",
          name: user.name || "Administrator",
          email: user.email || "admin@jss.com",
          role: user.role,
        },
        editReason.trim()
      );

      if (res.success) {
        toast.success(`Price updated successfully for ${editPriceTarget.cylinder_size} ${editPriceTarget.gas_type}.`);
        setEditPriceTarget(null);
        refreshData();
      } else {
        toast.error(res.error || "Failed to update price.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while updating the price.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Toggle Band Status
  const handleSubmitToggleBand = async () => {
    if (!toggleBandTarget || !user) return;

    if (!toggleReason || toggleReason.trim().length < 5) {
      toast.error("Please provide a reason for activating/deactivating this pricing band.");
      return;
    }

    setIsSubmittingToggle(true);
    try {
      const res = await togglePricingBandStatus(
        toggleBandTarget.id,
        !toggleBandTarget.is_active,
        {
          id: user.id || "admin-user",
          name: user.name || "Administrator",
          email: user.email || "admin@jss.com",
          role: user.role,
        },
        toggleReason.trim()
      );

      if (res.success) {
        toast.success(
          `Pricing Band ${toggleBandTarget.band_number} ${
            !toggleBandTarget.is_active ? "activated" : "deactivated"
          } successfully.`
        );
        setToggleBandTarget(null);
        refreshData();
      } else {
        toast.error(res.error || "Failed to toggle pricing band status.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while changing band status.");
    } finally {
      setIsSubmittingToggle(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Confidentiality Alert & Header */}
      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-red-100 p-2 text-red-700 mt-0.5">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-red-700 uppercase">
                  Client Confidentiality Directive
                </span>
                <Badge variant="outline" className="border-red-300 text-red-800 text-[10px] font-bold">
                  NOT FOR PUBLIC DISPLAY
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-red-900/90 mt-1 font-medium">
                Authoritative pricing matrices extracted directly from Weston Memorandum (18 May 2026),
                Discount Bands (89, 90, 97, 98), and Eastington Master Workbook. Commercial discounts and
                customer overrides are shielded from public display and restricted by RBAC.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="border-red-200 bg-white hover:bg-red-50 text-red-900 shrink-0 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-sm">
              <Flame className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Gas Pricing Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1.5">
            Authoritative branch pricing matrices, customer discount tiers, statutory VAT management, and delivery waivers.
          </p>
        </div>

        {/* Pending Clarification Badge if any */}
        {stats.pendingClientClarifications > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{stats.pendingClientClarifications} Entry</strong> Pending Client Clarification
            </span>
          </div>
        )}
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex overflow-x-auto pb-2 border-b border-slate-200 gap-2 scrollbar-thin">
        {[
          { id: "overview", label: "Pricing Overview", icon: DollarSign },
          { id: "branch-pricing", label: "Branch Pricing", icon: Building2 },
          { id: "pricing-bands", label: "Pricing Bands", icon: Tag },
          { id: "customer-categories", label: "Customer Categories", icon: Filter },
          { id: "special-customer", label: "Special Customer Pricing", icon: ShieldCheck },
          { id: "vat-information", label: "VAT Information", icon: Percent },
          { id: "delivery-rules", label: "Delivery Rules", icon: Truck },
          { id: "pricing-history", label: "Pricing History", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as NavigationSection)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? "bg-red-600 text-white shadow-sm shadow-red-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: PRICING OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric Cards - Fully Clickable & Interactive */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {/* Card 1: Total Bands */}
            <button
              type="button"
              onClick={handleOpenTotalBands}
              className="group text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 flex flex-col justify-between h-full cursor-pointer"
              aria-label="View all 66 pricing bands"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Bands
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {stats.totalPricingBands}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Weston & Eastington</span>
                <span className="text-[10px] font-bold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </button>

            {/* Card 2: Total Entries */}
            <button
              type="button"
              onClick={handleOpenTotalEntries}
              className="group text-left p-4 rounded-2xl border border-red-200 bg-red-50/40 hover:bg-red-50/70 hover:border-red-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 flex flex-col justify-between h-full cursor-pointer"
              aria-label="View all 157 gas pricing entries"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                    Total Entries
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-red-400 group-hover:text-red-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-red-900 mt-1">
                  {stats.totalPricingEntries}
                </div>
              </div>
              <div className="text-[11px] text-red-600/80 mt-2 flex items-center justify-between">
                <span>100% Client Documented</span>
                <span className="text-[10px] font-bold text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </button>

            {/* Card 3: Weston Prices */}
            <button
              type="button"
              onClick={handleOpenWestonPrices}
              className="group text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 flex flex-col justify-between h-full cursor-pointer"
              aria-label="View 93 Weston gas prices"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-blue-700 transition-colors">
                    Weston Prices
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {stats.westonPricingEntries}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>39 Memo + 54 Tiers</span>
                <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </button>

            {/* Card 4: Eastington Prices */}
            <button
              type="button"
              onClick={handleOpenEastingtonPrices}
              className="group text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 flex flex-col justify-between h-full cursor-pointer"
              aria-label="View 64 Eastington gas prices"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
                    Eastington Prices
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {stats.eastingtonPricingEntries}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Active 18 May Matrix</span>
                <span className="text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </button>

            {/* Card 5: Active Bands */}
            <button
              type="button"
              onClick={handleOpenActiveBands}
              className="group text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 flex flex-col justify-between h-full cursor-pointer"
              aria-label="View 66 active pricing bands"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
                    Active Bands
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {stats.activePricingBands}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Ready for Customer Assign</span>
                <span className="text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </button>

            {/* Card 6: Clarification */}
            <button
              type="button"
              onClick={handleOpenClarification}
              className="group text-left p-4 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 flex flex-col justify-between h-full cursor-pointer"
              aria-label="View clarification details for Weston 12kg Band 12"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Clarification
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-amber-500 group-hover:text-amber-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  {stats.pendingClientClarifications}
                </div>
              </div>
              <div className="text-[11px] text-amber-800/80 mt-2 flex items-center justify-between">
                <span>Weston 12kg Band 12</span>
                <span className="text-[10px] font-bold text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity">
                  Details →
                </span>
              </div>
            </button>

            {/* Card 7: Special Accounts */}
            <button
              type="button"
              onClick={handleOpenSpecialAccounts}
              className="group text-left p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 flex flex-col justify-between h-full cursor-pointer"
              aria-label="View 9 special customer accounts"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
                    Special Accts
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-indigo-500 group-hover:text-indigo-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-indigo-700 mt-1">
                  {stats.specialCustomerPricingEntries}
                </div>
              </div>
              <div className="text-[11px] text-indigo-800/80 mt-2 flex items-center justify-between">
                <span>Shielded Overrides</span>
                <span className="text-[10px] font-bold text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </button>
          </div>

          {/* Pending Clarification Alert Box */}
          {stats.pendingClientClarifications > 0 && (
            <Card className="border-amber-300 bg-amber-50/70 shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Item Requiring Client Clarification: Weston 12KG Band 12
                </div>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-amber-900/90 space-y-2">
                <p>
                  The authoritative Weston Memorandum document (18 May 2026) specifies the following values for
                  <strong> 12KG Refills - Business Astute (Band 12)</strong>:
                </p>
                <div className="flex flex-wrap gap-4 bg-white/80 p-3 rounded-xl border border-amber-200 text-xs font-mono font-medium">
                  <div>Documented Inc VAT: <span className="font-bold text-slate-900">£38.25</span></div>
                  <div>Documented Exc VAT: <span className="font-bold text-slate-900">£33.57</span></div>
                  <div>Calculated at 5% VAT (£33.57 × 1.05): <span className="font-bold text-amber-700">£35.25</span></div>
                  <div>Eastington Band 12 12kg Price: <span className="font-bold text-emerald-700">£35.25</span></div>
                </div>
                <p className="text-amber-800 text-xs">
                  <strong>Policy Adherence:</strong> Per strict instructions, the exact printed value of £38.25 Inc VAT
                  and £33.57 Exc VAT has been preserved verbatim without assumption or silent correction, pending official client confirmation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Authoritative Document Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-red-600" />
                  Weston-Super-Mare Matrix Architecture
                </CardTitle>
                <CardDescription className="text-xs">
                  Forecourt Station ID: {WESTON_FORECOURT_ID}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                  <div className="font-bold text-slate-800">1. Gas Prices Memorandum (18 May 2026)</div>
                  <div className="text-slate-600 text-xs">
                    39 verified fixed price points across 6 refill sections: 47kg Propane, 47kg Central Heating / Mobile Home Parks,
                    19kg, 18kg, 13kg, and 12kg refills. Contains both Inc & Exc VAT figures.
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                  <div className="font-bold text-slate-800">2. Weston Percentage Discount Tiers</div>
                  <div className="text-slate-600 text-xs">
                    54 price points across 4 tiers: Band 98 (25% Disc), Band 97 (22.5% Disc), Band 90 (20% Disc), and Band 89 (17.5% Disc).
                    All 12 cylinder sizes (Butane, Propane, Automotive, Patio) are specified strictly Excluding VAT.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Eastington Matrix Architecture
                </CardTitle>
                <CardDescription className="text-xs">
                  Location Code: EASTINGTON (Station Link: Pending Confirmation)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                  <div className="font-bold text-slate-800">Master Discounted Workbook (18 May 2026)</div>
                  <div className="text-slate-600 text-xs">
                    64 verified price points spanning Bands 10 through 62, including wholesale cost prices, profit margins, and mark-up
                    percentages. Cylinders covered: 47kg, 19kg, 18kg, 13kg, 12kg, 6kg, and Patio 13kg.
                  </div>
                </div>
                <div className="p-3 bg-amber-50/50 rounded-xl space-y-1.5 border border-amber-200/60">
                  <div className="font-bold text-amber-900">Branch Separation Governance</div>
                  <div className="text-amber-800 text-xs">
                    Eastington is maintained completely separate from the four active customer forecourts (Cirencester, Gloucester, Stroud, Weston).
                    Its <code className="font-mono">branch_id</code> remains <code className="font-mono">null</code> without synthetic records.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: BRANCH PRICING */}
      {activeTab === "branch-pricing" && (
        <div className="space-y-6">
          {/* Branch Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => setSelectedBranchLocation("ALL")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedBranchLocation === "ALL"
                  ? "border-red-600 bg-red-50/60 shadow-sm ring-2 ring-red-600/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">All Locations</span>
                <Badge
                  variant="outline"
                  className="border-red-300 bg-red-50 text-red-700 text-[10px] font-bold"
                >
                  157 Prices
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                Unified view of all 157 authoritative price entries across Weston and Eastington.
              </p>
            </button>
            {BRANCH_PRICING_LOCATIONS.map((loc) => {
              const isSelected = selectedBranchLocation === loc.location_code;
              return (
                <button
                  key={loc.location_code}
                  onClick={() => setSelectedBranchLocation(loc.location_code)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-red-600 bg-red-50/60 shadow-sm ring-2 ring-red-600/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{loc.location_name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        loc.is_confirmed_forecourt
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {loc.status_label}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {loc.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* All 157 Branch Pricing Entries */}
          {selectedBranchLocation === "ALL" && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    All Branch Gas Pricing Matrices (157 Entries)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive view of all 157 verified client pricing entries across Weston-Super-Mare (93) and Eastington (64).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white font-bold text-xs">
                    157 Price Points (93 Weston + 64 Eastington)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Branch</TableHead>
                        <TableHead className="text-xs font-bold">Band</TableHead>
                        <TableHead className="text-xs font-bold">Category</TableHead>
                        <TableHead className="text-xs font-bold">Gas / Cylinder</TableHead>
                        <TableHead className="text-xs font-bold">Price Inc VAT</TableHead>
                        <TableHead className="text-xs font-bold">Price Exc VAT</TableHead>
                        <TableHead className="text-xs font-bold">Delivery Fee</TableHead>
                        <TableHead className="text-xs font-bold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedAllPrices.map((price) => {
                        const band = bands.find((b) => b.id === price.pricing_band_id);
                        return (
                          <TableRow key={price.id} className="hover:bg-slate-50/70 text-xs">
                            <TableCell className="font-semibold text-slate-900">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  price.location_name === "Weston-Super-Mare"
                                    ? "border-blue-200 bg-blue-50 text-blue-800"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                }`}
                              >
                                {price.location_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">
                              Band {band?.band_number || "—"}
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {band?.customer_category}
                              {price.is_special_customer_price && (
                                <Badge className="ml-1.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                                  Special: {price.special_customer_code}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium text-slate-900">
                              {price.gas_type} {price.cylinder_size}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-900">
                              {price.price_inc_vat !== null ? `£${price.price_inc_vat.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-900">
                              {price.price_exc_vat !== null ? `£${price.price_exc_vat.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] font-bold ${
                                  band?.delivery_fee_waived
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {band?.delivery_fee_waived ? "Waived (£0)" : "Standard Fee"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditPrice(price)}
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold cursor-pointer"
                              >
                                <Edit3 className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-xs text-slate-500 mt-3 text-right">
                  Showing all {displayedAllPrices.length} entries across Weston and Eastington.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Branch Pricing Details */}
          {selectedBranchLocation === "WESTON" && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Weston-Super-Mare Gas Pricing Matrix
                  </CardTitle>
                  <CardDescription className="text-xs">
                    93 verified client entries across memorandum refill bands and discount tiers 89, 90, 97, 98.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={westonBandFilter} onValueChange={setWestonBandFilter}>
                    <SelectTrigger className="w-[190px] h-8 text-xs font-semibold rounded-xl bg-white border-slate-200">
                      <SelectValue placeholder="Filter by Band" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Bands (93)</SelectItem>
                      <SelectItem value="90">Band 90 – 20% Disc (15)</SelectItem>
                      <SelectItem value="98">Band 98 – 25% Disc (15)</SelectItem>
                      <SelectItem value="97">Band 97 – 22.5% Disc (12)</SelectItem>
                      <SelectItem value="89">Band 89 – 17.5% Disc (12)</SelectItem>
                      <SelectItem value="memo">Memorandum Bands (39)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className="bg-red-600 text-white font-bold text-xs self-start sm:self-auto">
                    {displayedWestonPrices.length} / 93 Price Points
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Band</TableHead>
                        <TableHead className="text-xs font-bold">Category</TableHead>
                        <TableHead className="text-xs font-bold">Gas / Cylinder</TableHead>
                        <TableHead className="text-xs font-bold">Price Exc VAT</TableHead>
                        <TableHead className="text-xs font-bold">Price Inc VAT</TableHead>
                        <TableHead className="text-xs font-bold">VAT Treatment</TableHead>
                        <TableHead className="text-xs font-bold">Delivery Fee</TableHead>
                        <TableHead className="text-xs font-bold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedWestonPrices.map((price) => {
                        const band = bands.find((b) => b.id === price.pricing_band_id);
                        return (
                          <TableRow key={price.id} className="hover:bg-slate-50/70 text-xs">
                            <TableCell className="font-bold text-slate-900">
                              Band {band?.band_number || "—"}
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {band?.customer_category}
                              {price.is_special_customer_price && (
                                <Badge className="ml-1.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                                  Special: {price.special_customer_code}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium text-slate-900">
                              {price.gas_type} {price.cylinder_size}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-900">
                              {price.price_exc_vat !== null ? `£${price.price_exc_vat.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-900">
                              {price.price_inc_vat !== null ? `£${price.price_inc_vat.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-semibold border-slate-300">
                                {price.vat_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] font-bold ${
                                  band?.delivery_fee_waived
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {band?.delivery_fee_waived ? "Waived (£0)" : "Standard Fee"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditPrice(price)}
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                              >
                                <Edit3 className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-xs text-slate-500 mt-3 text-right">
                  Showing {displayedWestonPrices.length} of 93 Weston entries.
                </div>
              </CardContent>
            </Card>
          )}

          {selectedBranchLocation === "EASTINGTON" && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Eastington Gas Pricing Matrix (18 May 2026 Revision)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    64 verified client entries from active master workbook spanning Bands 10–62.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-700 text-white font-bold text-xs self-start sm:self-auto">
                  64 Price Points
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Band</TableHead>
                        <TableHead className="text-xs font-bold">Customer Category</TableHead>
                        <TableHead className="text-xs font-bold">Cylinder</TableHead>
                        <TableHead className="text-xs font-bold">Price Inc VAT</TableHead>
                        <TableHead className="text-xs font-bold">Price Exc VAT</TableHead>
                        <TableHead className="text-xs font-bold">Cost Price</TableHead>
                        <TableHead className="text-xs font-bold">Delivery Fee</TableHead>
                        <TableHead className="text-xs font-bold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedEastingtonPrices.map((price) => {
                        const band = bands.find((b) => b.id === price.pricing_band_id);
                        return (
                          <TableRow key={price.id} className="hover:bg-slate-50/70 text-xs">
                            <TableCell className="font-bold text-slate-900">
                              Band {band?.band_number || "—"}
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {band?.customer_category}
                              {price.is_special_customer_price && (
                                <Badge className="ml-1.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                                  Special: {price.special_customer_code}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium text-slate-900">
                              {price.gas_type} {price.cylinder_size}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-900">
                              {price.price_inc_vat !== null ? `£${price.price_inc_vat.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-900">
                              {price.price_exc_vat !== null ? `£${price.price_exc_vat.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="font-mono text-slate-500">
                              {price.cost_price !== null ? `£${price.cost_price.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] font-bold ${
                                  band?.delivery_fee_waived
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {band?.delivery_fee_waived ? "Waived (£0)" : "Standard Fee"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditPrice(price)}
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold cursor-pointer"
                              >
                                <Edit3 className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-xs text-slate-500 mt-3 text-right">
                  Showing all {displayedEastingtonPrices.length} Eastington entries from active master workbook (18 May 2026).
                </div>
              </CardContent>
            </Card>
          )}

          {["CIRENCESTER", "GLOUCESTER", "STROUD"].includes(selectedBranchLocation) && (
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-8 text-center space-y-3">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-full w-fit mx-auto">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedBranchLocation.charAt(0) + selectedBranchLocation.slice(1).toLowerCase()} Forecourt Pricing
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  This confirmed forecourt branch currently operates under standard retail & commercial network base rates.
                  The client has not yet published a dedicated branch tariff matrix for this location.
                </p>
                <div className="pt-2">
                  <Badge variant="outline" className="border-slate-300 text-slate-600 font-semibold text-xs">
                    Standard Base Tariff Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SECTION 3: PRICING BANDS MANAGEMENT */}
      {activeTab === "pricing-bands" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by band number, category, or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-9 rounded-xl border-slate-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs font-medium rounded-xl">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Branches</SelectItem>
                  <SelectItem value="WESTON">Weston-Super-Mare</SelectItem>
                  <SelectItem value="EASTINGTON">Eastington</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedActiveFilter} onValueChange={setSelectedActiveFilter}>
                <SelectTrigger className="w-[120px] h-9 text-xs font-medium rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || selectedBranchFilter !== "ALL" || selectedActiveFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBranchFilter("ALL");
                    setSelectedActiveFilter("ALL");
                  }}
                  className="h-9 text-xs text-slate-500 hover:text-slate-900"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Pricing Bands Table */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Pricing Bands Directory ({filteredBands.length} bands)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View band configuration, discount percentages, delivery fee rules, and operational status.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Band #</TableHead>
                      <TableHead className="text-xs font-bold">Customer Category</TableHead>
                      <TableHead className="text-xs font-bold">Branch</TableHead>
                      <TableHead className="text-xs font-bold">Type</TableHead>
                      <TableHead className="text-xs font-bold">Discount %</TableHead>
                      <TableHead className="text-xs font-bold">Delivery Fee</TableHead>
                      <TableHead className="text-xs font-bold">Effective From</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBands.map((band) => (
                      <TableRow key={band.id} className="hover:bg-slate-50/70 text-xs">
                        <TableCell className="font-black text-slate-900">
                          Band {band.band_number}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {band.customer_category}
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium">
                          {band.location_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold capitalize">
                            {band.band_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {band.discount_percentage !== null ? `${band.discount_percentage}%` : "Fixed Grid"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-bold ${
                              band.delivery_fee_waived
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {band.delivery_fee_waived ? "Waived (£0)" : "Standard Fee"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-slate-500 text-[11px]">
                          {band.effective_from ? new Date(band.effective_from).toLocaleDateString() : "Active"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-bold ${
                              band.is_active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {band.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectBand(band)}
                            className="h-7 px-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Prices ({getPricesByBranchAndBand(band.id).length})
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setToggleBandTarget(band);
                              setToggleReason("");
                            }}
                            className={`h-7 px-2 text-xs font-semibold ${
                              band.is_active
                                ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            }`}
                          >
                            {band.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 4: CUSTOMER CATEGORIES */}
      {activeTab === "customer-categories" && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Customer Categories & Band Mappings ({categoriesList.length} distinct categories)
            </CardTitle>
            <CardDescription className="text-xs">
              Categorical groupings defined across client memorandum and pricing matrices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Customer Category</TableHead>
                    <TableHead className="text-xs font-bold">Associated Branches</TableHead>
                    <TableHead className="text-xs font-bold">Band Instances</TableHead>
                    <TableHead className="text-xs font-bold">Delivery Fee Eligibility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesList.map((cat, idx) => {
                    const isUndiscounted =
                      cat.category.toLowerCase().includes("normal") &&
                      (cat.category.toLowerCase().includes("retail") ||
                        cat.category.toLowerCase().includes("business"));
                    return (
                      <TableRow key={idx} className="hover:bg-slate-50/70 text-xs">
                        <TableCell className="font-bold text-slate-900">{cat.category}</TableCell>
                        <TableCell className="text-slate-600 font-medium">
                          {cat.locations.join(", ")}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-700">
                          {cat.bandCount} band{cat.bandCount > 1 ? "s" : ""}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-bold ${
                              !isUndiscounted
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {!isUndiscounted ? "Waived (£0.00)" : "Standard Fee Applies"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 5: SPECIAL CUSTOMER PRICING */}
      {activeTab === "special-customer" && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  Special Customer-Specific Pricing Overrides ({specialPrices.length} accounts)
                </CardTitle>
                <CardDescription className="text-xs">
                  Confidential commercial agreements for specific customer accounts. Protected under strict RBAC.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-indigo-300 text-indigo-800 font-bold text-xs">
                Protected by RLS
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Customer Code</TableHead>
                    <TableHead className="text-xs font-bold">Customer Name</TableHead>
                    <TableHead className="text-xs font-bold">Branch</TableHead>
                    <TableHead className="text-xs font-bold">Assigned Band</TableHead>
                    <TableHead className="text-xs font-bold">Gas / Cylinder</TableHead>
                    <TableHead className="text-xs font-bold">Special Price (Exc VAT)</TableHead>
                    <TableHead className="text-xs font-bold">Special Price (Inc VAT)</TableHead>
                    <TableHead className="text-xs font-bold">VAT Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialPrices.map((sp) => {
                    const band = bands.find((b) => b.id === sp.pricing_band_id);
                    return (
                      <TableRow key={sp.id} className="hover:bg-slate-50/70 text-xs">
                        <TableCell className="font-mono font-black text-indigo-700">
                          {sp.special_customer_code || "—"}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {sp.special_customer_name || "Special Account"}
                        </TableCell>
                        <TableCell className="font-medium text-slate-600">
                          {sp.location_name}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          Band {band?.band_number || "—"} ({band?.customer_category})
                        </TableCell>
                        <TableCell className="font-mono font-medium text-slate-900">
                          {sp.gas_type} {sp.cylinder_size}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {sp.price_exc_vat !== null ? `£${sp.price_exc_vat.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {sp.price_inc_vat !== null ? `£${sp.price_inc_vat.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-semibold border-slate-300">
                            {sp.vat_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditPrice(sp)}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                          >
                            <Edit3 className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 6: VAT INFORMATION */}
      {activeTab === "vat-information" && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Percent className="h-5 w-5 text-red-600" />
                Statutory VAT & Tax Treatment Rules
              </CardTitle>
              <CardDescription className="text-xs">
                Accurate preservation of client VAT statuses without universal rate assumptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-300 text-slate-800 text-[10px]">
                      EXCLUDING_VAT
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Documented explicitly on Weston Discount Tiers (Bands 89, 90, 97, 98):
                    <em> "ALL THE ABOVE PRICES EXCLUDE VAT"</em>. No tax rate is assumed or pre-computed.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-300 text-slate-800 text-[10px]">
                      SPLIT_DOCUMENTED
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Both Inc VAT and Exc VAT values were explicitly authored and provided by the client
                    (e.g., Weston Memorandum and Eastington Master Sheet). Both decimal values are codified verbatim.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-300 text-slate-800 text-[10px]">
                      Domestic Fuel VAT
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    UK statutory domestic fuel VAT is 5% for domestic fuel customers. Commercial trade customers
                    are subject to standard 20% VAT. Rates are dynamically determined based on customer profile classification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 7: DELIVERY RULES */}
      {activeTab === "delivery-rules" && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-red-600" />
              Delivery Charge Rules & Fee Waiver Governance
            </CardTitle>
            <CardDescription className="text-xs">
              Client directive: "We do not charge delivery charge to discounted gas customers but we always do to business & retail customers who are undiscounted."
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-sm">Discounted Gas Customers</span>
                  <Badge className="bg-emerald-700 text-white font-bold text-[10px]">Delivery Fee: £0.00</Badge>
                </div>
                <p className="text-xs text-emerald-800/90 leading-relaxed">
                  All customers assigned to a commercial discount band (e.g., Weston Bands 89, 90, 97, 98, or Eastington
                  Bands 11–19, 21–33, 36–44, 48–56, 62) receive <strong>waived delivery charges</strong> automatically.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-sm">Undiscounted Base Customers</span>
                  <Badge className="bg-amber-700 text-white font-bold text-[10px]">Standard Delivery Fee</Badge>
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  Customers in <strong>Band 10 (Business Normal)</strong> and <strong>Band 20 (Retail Normal)</strong>,
                  as well as unassigned guest accounts, are strictly charged the standard delivery fee.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 8: PRICING HISTORY / AUDIT LOG */}
      {activeTab === "pricing-history" && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-red-600" />
              Pricing History & Change Audit Log ({auditLogs.length} events)
            </CardTitle>
            <CardDescription className="text-xs">
              Immutable audit log capturing price updates, reasons, timestamps, and authorized administrator credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Timestamp (UTC)</TableHead>
                    <TableHead className="text-xs font-bold">Branch</TableHead>
                    <TableHead className="text-xs font-bold">Band</TableHead>
                    <TableHead className="text-xs font-bold">Cylinder</TableHead>
                    <TableHead className="text-xs font-bold">Previous Exc / Inc</TableHead>
                    <TableHead className="text-xs font-bold">Updated Exc / Inc</TableHead>
                    <TableHead className="text-xs font-bold">Changed By</TableHead>
                    <TableHead className="text-xs font-bold">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/70 text-xs">
                      <TableCell className="font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.changed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">{log.location_name}</TableCell>
                      <TableCell className="font-bold text-slate-900">Band {log.band_number}</TableCell>
                      <TableCell className="font-mono text-slate-900">
                        {log.gas_type} {log.cylinder_size}
                      </TableCell>
                      <TableCell className="font-mono text-slate-500">
                        {log.previous_price_exc_vat !== null ? `£${log.previous_price_exc_vat.toFixed(2)}` : "—"} /{" "}
                        {log.previous_price_inc_vat !== null ? `£${log.previous_price_inc_vat.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-900">
                        {log.new_price_exc_vat !== null ? `£${log.new_price_exc_vat.toFixed(2)}` : "—"} /{" "}
                        {log.new_price_inc_vat !== null ? `£${log.new_price_inc_vat.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        <div className="font-semibold">{log.changed_by_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{log.changed_by_email}</div>
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-xs">{log.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: Inspect Band Prices Dialog */}
      {inspectBand && (
        <Dialog open={!!inspectBand} onOpenChange={() => setInspectBand(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Band {inspectBand.band_number}: {inspectBand.customer_category}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Location: {inspectBand.location_name} | Discount:{" "}
                {inspectBand.discount_percentage !== null ? `${inspectBand.discount_percentage}%` : "Fixed Grid"} | Delivery:{" "}
                {inspectBand.delivery_fee_waived ? "Waived (£0.00)" : "Standard Fee"}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Gas / Cylinder</TableHead>
                      <TableHead className="text-xs font-bold">Price Exc VAT</TableHead>
                      <TableHead className="text-xs font-bold">Price Inc VAT</TableHead>
                      <TableHead className="text-xs font-bold">VAT Status</TableHead>
                      <TableHead className="text-xs font-bold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPricesByBranchAndBand(inspectBand.id).map((p) => (
                      <TableRow key={p.id} className="text-xs">
                        <TableCell className="font-mono font-medium text-slate-900">
                          {p.gas_type} {p.cylinder_size}
                          {p.is_special_customer_price && (
                            <Badge className="ml-1.5 bg-indigo-100 text-indigo-800 text-[10px]">
                              {p.special_customer_code}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {p.price_exc_vat !== null ? `£${p.price_exc_vat.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {p.price_inc_vat !== null ? `£${p.price_inc_vat.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {p.vat_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setInspectBand(null);
                              handleOpenEditPrice(p);
                            }}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 font-semibold"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setInspectBand(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: Edit Price Dialog */}
      {editPriceTarget && (
        <Dialog open={!!editPriceTarget} onOpenChange={() => setEditPriceTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Edit Gas Cylinder Price
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editPriceTarget.location_name} • {editPriceTarget.cylinder_size} {editPriceTarget.gas_type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div>Current Exc VAT: <strong>{editPriceTarget.price_exc_vat !== null ? `£${editPriceTarget.price_exc_vat.toFixed(2)}` : "Unspecified"}</strong></div>
                <div>Current Inc VAT: <strong>{editPriceTarget.price_inc_vat !== null ? `£${editPriceTarget.price_inc_vat.toFixed(2)}` : "Unspecified"}</strong></div>
                <div>VAT Treatment: <strong>{editPriceTarget.vat_status}</strong></div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-exc-vat" className="text-xs font-semibold">
                  Price Excluding VAT (£)
                </Label>
                <Input
                  id="edit-exc-vat"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 81.07"
                  value={editExcVat}
                  onChange={(e) => setEditExcVat(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-inc-vat" className="text-xs font-semibold">
                  Price Including VAT (£)
                </Label>
                <Input
                  id="edit-inc-vat"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 85.50"
                  value={editIncVat}
                  onChange={(e) => setEditIncVat(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs font-semibold">
                  Internal Notes / Annotations
                </Label>
                <Input
                  id="edit-notes"
                  placeholder="Optional internal clarification"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-reason" className="text-xs font-semibold text-red-700">
                  Mandatory Audit Reason for Price Change *
                </Label>
                <Textarea
                  id="edit-reason"
                  rows={3}
                  placeholder="Explain why this price is being adjusted (e.g. client directive update, discount tier revision)"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditPriceTarget(null)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSubmitPriceEdit}
                disabled={isSubmittingEdit}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {isSubmittingEdit ? "Saving..." : "Save Price & Record Audit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 3: Toggle Band Status Dialog */}
      {toggleBandTarget && (
        <Dialog open={!!toggleBandTarget} onOpenChange={() => setToggleBandTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {toggleBandTarget.is_active ? "Deactivate" : "Activate"} Pricing Band {toggleBandTarget.band_number}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {toggleBandTarget.customer_category} ({toggleBandTarget.location_name})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-2 text-xs sm:text-sm">
              <p className="text-slate-600 text-xs">
                Are you sure you want to {toggleBandTarget.is_active ? "deactivate" : "activate"} this band?
                {toggleBandTarget.is_active && (
                  <span className="block mt-1 text-amber-700 font-medium">
                    Deactivating this band will prevent new customer applications from being assigned to it.
                  </span>
                )}
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="toggle-reason" className="text-xs font-semibold text-red-700">
                  Mandatory Reason for Status Change *
                </Label>
                <Textarea
                  id="toggle-reason"
                  rows={3}
                  placeholder="State the reason for modifying this band's operational status..."
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setToggleBandTarget(null)}
                disabled={isSubmittingToggle}
              >
                Cancel
              </Button>
              <Button
                variant={toggleBandTarget.is_active ? "destructive" : "default"}
                size="sm"
                onClick={handleSubmitToggleBand}
                disabled={isSubmittingToggle}
                className={!toggleBandTarget.is_active ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              >
                {isSubmittingToggle
                  ? "Processing..."
                  : toggleBandTarget.is_active
                  ? "Confirm Deactivation"
                  : "Confirm Activation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 4: Clarification Details Dialog */}
      {showClarificationModal && (
        <Dialog open={showClarificationModal} onOpenChange={setShowClarificationModal}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-700 font-bold text-base mb-1">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Client Clarification: Weston 12KG Band 12 Refill
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Authoritative Document Reference: Weston Gas Prices Memorandum (Dated 18th May 2026)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs sm:text-sm">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900/90 space-y-2">
                <p className="font-semibold text-amber-900">
                  Discrepancy Details (Section 6 – 12KG Refills):
                </p>
                <p className="text-xs leading-relaxed">
                  The client memorandum specifies <strong>12KG Refills – Business Astute (Band 12)</strong> with the following printed values:
                </p>
                <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                    <span className="text-slate-500 block text-[11px]">Printed Inc VAT:</span>
                    <span className="text-base font-bold text-slate-900">£38.25</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                    <span className="text-slate-500 block text-[11px]">Printed Exc VAT:</span>
                    <span className="text-base font-bold text-slate-900">£33.57</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-slate-800">Mathematical & Cross-Branch Context:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>At 5% domestic fuel VAT rate: <span className="font-mono font-bold text-slate-800">£33.57 × 1.05 = £35.25</span> (differs from £38.25).</li>
                  <li>Alternatively: <span className="font-mono font-bold text-slate-800">£38.25 / 1.05 = £36.43</span> (differs from £33.57).</li>
                  <li>Eastington Master Workbook lists Band 12 (12kg): <span className="font-mono font-bold text-emerald-700">£35.25 Inc VAT / £33.57 Exc VAT</span>.</li>
                </ul>
              </div>

              <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-900 leading-relaxed">
                <strong>Strict Preservation Policy:</strong> The application does not silently recalculate or alter these figures. The exact client values of <strong>£38.25 Inc VAT</strong> and <strong>£33.57 Exc VAT</strong> are retained verbatim with an active clarification flag.
              </div>
            </div>

            <DialogFooter className="flex sm:justify-between items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClarificationModal(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowClarificationModal(false);
                  setActiveTab("branch-pricing");
                  setSelectedBranchLocation("WESTON");
                  setWestonBandFilter("ALL");
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                View in Weston Pricing →
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
