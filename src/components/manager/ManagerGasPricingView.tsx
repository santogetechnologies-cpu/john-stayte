import { useState, useMemo, useEffect } from "react";
import {
  Flame,
  Search,
  Filter,
  Building2,
  Tag,
  Percent,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  Truck,
  Lock,
  Eye,
  Info,
} from "lucide-react";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { GasPricingBand, BranchGasPrice } from "@/types/pricing";
import {
  BRANCH_PRICING_LOCATIONS,
  getPricingOverviewStats,
  getPricingBands,
  getPricesByBranchAndBand,
  getAllCustomerCategories,
  getSpecialCustomerPrices,
  loadLivePricingFromDatabase,
} from "@/lib/branch-pricing-service";

type ManagerTab =
  | "overview"
  | "branch-pricing"
  | "pricing-bands"
  | "customer-categories"
  | "special-customer"
  | "vat-information"
  | "delivery-rules";

export function ManagerGasPricingView() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<ManagerTab>("overview");

  // Read-only operational data
  const [stats, setStats] = useState(getPricingOverviewStats());
  const [bands, setBands] = useState(getPricingBands());
  const [categoriesList, setCategoriesList] = useState(getAllCustomerCategories());

  useEffect(() => {
    loadLivePricingFromDatabase().then(() => {
      setStats(getPricingOverviewStats());
      setBands(getPricingBands());
      setCategoriesList(getAllCustomerCategories());
    });
    const handleUpdate = () => {
      setStats(getPricingOverviewStats());
      setBands(getPricingBands());
      setCategoriesList(getAllCustomerCategories());
    };
    window.addEventListener("gas_pricing_updated", handleUpdate);
    return () => window.removeEventListener("gas_pricing_updated", handleUpdate);
  }, []);

  // Manager branch constraint: default to assigned branch if set
  const initialBranch = useMemo(() => {
    if (user?.assignedBranch) {
      const match = BRANCH_PRICING_LOCATIONS.find((b) =>
        b.location_name.toLowerCase().includes(user.assignedBranch!.toLowerCase())
      );
      if (match) return match.location_code;
    }
    return "WESTON";
  }, [user]);

  const [selectedBranchLocation, setSelectedBranchLocation] = useState<string>(initialBranch);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [inspectBand, setInspectBand] = useState<GasPricingBand | null>(null);

  // Filtered pricing bands
  const filteredBands = useMemo(() => {
    return bands.filter((b) => {
      if (selectedBranchFilter !== "ALL" && b.location_code !== selectedBranchFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchBand = b.band_number.toLowerCase().includes(query);
        const matchCat = b.customer_category.toLowerCase().includes(query);
        const matchLoc = b.location_name.toLowerCase().includes(query);
        if (!matchBand && !matchCat && !matchLoc) return false;
      }
      return true;
    });
  }, [bands, selectedBranchFilter, searchQuery]);

  // Special customer prices (visible to managers)
  const specialPrices = useMemo(() => {
    return getSpecialCustomerPrices("manager");
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Role & Governance Notice */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-200 p-2 text-slate-700 mt-0.5">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Manager Directory Access
                </span>
                <Badge variant="outline" className="border-slate-300 text-slate-700 text-[10px] font-bold">
                  READ-ONLY DIRECTORY
                </Badge>
                {user?.assignedBranch && (
                  <Badge className="bg-slate-200 text-slate-800 text-[10px] font-bold">
                    Assigned Branch: {user.assignedBranch}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                Authoritative pricing matrices and customer discount schedules. Note: All pricing modifications,
                band activations, and special contract adjustments require System Administrator privileges.
              </p>
            </div>
          </div>
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
              Branch Gas Pricing Directory
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1.5">
            Consult authoritative branch tariffs, customer discount tiers, VAT specifications, and delivery waiver rules.
          </p>
        </div>

        {stats.pendingClientClarifications > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{stats.pendingClientClarifications} Entry</strong> Pending Clarification
            </span>
          </div>
        )}
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex overflow-x-auto pb-2 border-b border-slate-200 gap-2 scrollbar-thin">
        {[
          { id: "overview", label: "Directory Overview", icon: DollarSign },
          { id: "branch-pricing", label: "Branch Pricing", icon: Building2 },
          { id: "pricing-bands", label: "Pricing Bands", icon: Tag },
          { id: "customer-categories", label: "Customer Categories", icon: Filter },
          { id: "special-customer", label: "Special Customer Pricing", icon: ShieldCheck },
          { id: "vat-information", label: "VAT Information", icon: Percent },
          { id: "delivery-rules", label: "Delivery Rules", icon: Truck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ManagerTab)}
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

      {/* SECTION 1: DIRECTORY OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card className="shadow-xs border-slate-200">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Bands
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalPricingBands}</div>
                <div className="text-[11px] text-slate-400 mt-1">Weston & Eastington</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-slate-200 bg-red-50/30">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Total Entries
                </div>
                <div className="text-2xl font-black text-red-900 mt-1">{stats.totalPricingEntries}</div>
                <div className="text-[11px] text-red-600/80 mt-1">100% Client Documented</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-slate-200">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Weston Prices
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">{stats.westonPricingEntries}</div>
                <div className="text-[11px] text-slate-400 mt-1">39 Memo + 54 Tiers</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-slate-200">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Eastington Prices
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">{stats.eastingtonPricingEntries}</div>
                <div className="text-[11px] text-slate-400 mt-1">Active 18 May Matrix</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-slate-200">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Bands
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{stats.activePricingBands}</div>
                <div className="text-[11px] text-slate-400 mt-1">Available for Orders</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-indigo-200 bg-indigo-50/40">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
                  Special Accts
                </div>
                <div className="text-2xl font-black text-indigo-700 mt-1">
                  {stats.specialCustomerPricingEntries}
                </div>
                <div className="text-[11px] text-indigo-800/80 mt-1">Authorized Rates</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-red-600" />
                  Weston Matrix Reference
                </CardTitle>
                <CardDescription className="text-xs">
                  Active Custom Tariff Matrix (93 Price Points)
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-slate-600 space-y-2">
                <p>
                  Covers memorandum refill bands (Bands 10–56) and commercial percentage discount tiers:
                  <strong> Band 89 (17.5%)</strong>, <strong>Band 90 (20%)</strong>, <strong>Band 97 (22.5%)</strong>,
                  and <strong>Band 98 (25%)</strong>.
                </p>
                <p className="text-slate-500 text-xs">
                  All discount tier cylinder prices are specified excluding VAT.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Eastington Matrix Reference
                </CardTitle>
                <CardDescription className="text-xs">
                  Active Master Workbook (64 Price Points)
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-slate-600 space-y-2">
                <p>
                  Comprehensive matrix spanning customer categories from Retail Normal (Band 20) and Business Normal (Band 10)
                  through to wholesale and mobile home parks (Bands 11–62).
                </p>
                <p className="text-slate-500 text-xs">
                  Delivery charges are waived for all bands except undiscounted Bands 10 and 20.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: BRANCH PRICING */}
      {activeTab === "branch-pricing" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {BRANCH_PRICING_LOCATIONS.map((loc) => {
              const isSelected = selectedBranchLocation === loc.location_code;
              return (
                <button
                  key={loc.location_code}
                  onClick={() => setSelectedBranchLocation(loc.location_code)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
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
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{loc.description}</p>
                </button>
              );
            })}
          </div>

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
                <Badge className="bg-red-600 text-white font-bold text-xs self-start sm:self-auto">
                  93 Price Points
                </Badge>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPricesByBranchAndBand("band-weston-98")
                        .concat(getPricesByBranchAndBand("band-weston-97"))
                        .concat(getPricesByBranchAndBand("band-weston-90"))
                        .concat(getPricesByBranchAndBand("band-weston-89"))
                        .concat(
                          bands
                            .filter((b) => b.location_code === "WESTON" && b.band_type === "fixed")
                            .flatMap((b) => getPricesByBranchAndBand(b.id))
                        )
                        .slice(0, 30)
                        .map((price) => {
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
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
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
                        <TableHead className="text-xs font-bold">Delivery Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bands
                        .filter((b) => b.location_code === "EASTINGTON")
                        .flatMap((b) => getPricesByBranchAndBand(b.id))
                        .slice(0, 30)
                        .map((price) => {
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
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
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

      {/* SECTION 3: PRICING BANDS DIRECTORY */}
      {activeTab === "pricing-bands" && (
        <div className="space-y-6">
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
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Pricing Bands Directory ({filteredBands.length} bands)
              </CardTitle>
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
                      <TableHead className="text-xs font-bold text-right">Prices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBands.map((band) => (
                      <TableRow key={band.id} className="hover:bg-slate-50/70 text-xs">
                        <TableCell className="font-black text-slate-900">Band {band.band_number}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{band.customer_category}</TableCell>
                        <TableCell className="text-slate-600 font-medium">{band.location_name}</TableCell>
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectBand(band)}
                            className="h-7 px-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                          >
                            View ({getPricesByBranchAndBand(band.id).length})
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
              Customer Categories Directory ({categoriesList.length} categories)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold">Branches</TableHead>
                    <TableHead className="text-xs font-bold">Band Count</TableHead>
                    <TableHead className="text-xs font-bold">Delivery Fee</TableHead>
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
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Special Customer Pricing Overrides ({specialPrices.length} accounts)
            </CardTitle>
            <CardDescription className="text-xs">
              Special agreed commercial rates for designated trade accounts.
            </CardDescription>
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
                    <TableHead className="text-xs font-bold">Cylinder</TableHead>
                    <TableHead className="text-xs font-bold">Special Price (Exc VAT)</TableHead>
                    <TableHead className="text-xs font-bold">Special Price (Inc VAT)</TableHead>
                    <TableHead className="text-xs font-bold">VAT Status</TableHead>
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
                        <TableCell className="font-medium text-slate-600">{sp.location_name}</TableCell>
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
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Percent className="h-5 w-5 text-red-600" />
              Statutory VAT & Tax Treatment Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <Badge variant="outline" className="border-slate-300 text-slate-800 text-[10px]">
                  EXCLUDING_VAT
                </Badge>
                <p className="text-xs text-slate-600">
                  Weston Discount Tiers (Bands 89, 90, 97, 98) specify prices strictly excluding VAT.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <Badge variant="outline" className="border-slate-300 text-slate-800 text-[10px]">
                  SPLIT_DOCUMENTED
                </Badge>
                <p className="text-xs text-slate-600">
                  Both Inc VAT and Exc VAT values are explicitly provided in the client's master sheets.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <Badge variant="outline" className="border-slate-300 text-slate-800 text-[10px]">
                  Domestic Fuel VAT (5%)
                </Badge>
                <p className="text-xs text-slate-600">
                  5% statutory fuel VAT rate applies to domestic residential customers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 7: DELIVERY RULES */}
      {activeTab === "delivery-rules" && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-red-600" />
              Delivery Rules & Fee Waivers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-sm">Discounted Gas Customers</span>
                  <Badge className="bg-emerald-700 text-white font-bold text-[10px]">Fee Waived (£0)</Badge>
                </div>
                <p className="text-xs text-emerald-800/90">
                  All commercial discount accounts receive free delivery automatically.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-sm">Undiscounted Base Customers</span>
                  <Badge className="bg-amber-700 text-white font-bold text-[10px]">Standard Fee Applies</Badge>
                </div>
                <p className="text-xs text-amber-800/90">
                  Retail Normal (Band 20) and Business Normal (Band 10) customers are charged the standard delivery fee.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspect Band Dialog */}
      {inspectBand && (
        <Dialog open={!!inspectBand} onOpenChange={() => setInspectBand(null)}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Band {inspectBand.band_number}: {inspectBand.customer_category}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Location: {inspectBand.location_name} | Delivery:{" "}
                {inspectBand.delivery_fee_waived ? "Waived (£0)" : "Standard Fee"}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 rounded-xl border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Gas / Cylinder</TableHead>
                    <TableHead className="text-xs font-bold">Price Exc VAT</TableHead>
                    <TableHead className="text-xs font-bold">Price Inc VAT</TableHead>
                    <TableHead className="text-xs font-bold">VAT Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPricesByBranchAndBand(inspectBand.id).map((p) => (
                    <TableRow key={p.id} className="text-xs">
                      <TableCell className="font-mono font-medium text-slate-900">
                        {p.gas_type} {p.cylinder_size}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setInspectBand(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

