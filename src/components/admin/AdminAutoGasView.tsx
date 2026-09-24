import { useState, useEffect } from "react";
import {
  Fuel,
  MapPin,
  Phone,
  Clock,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Navigation,
  Sparkles,
  Save,
  RefreshCw,
  Building2,
  ShieldCheck,
  ImageIcon,
  Eye,
} from "lucide-react";
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
import { toast } from "sonner";
import {
  type AutoGasStation,
  type EastingtonFacilityHighlight,
  fetchAdminAutoGasStations,
  saveAutoGasStation,
  fetchEastingtonHighlight,
  saveEastingtonHighlight,
  subscribeToAutoGasChanges,
  INITIAL_AUTO_GAS_STATIONS,
  DEFAULT_EASTINGTON_HIGHLIGHT,
} from "@/lib/auto-gas-service";

export function AdminAutoGasView() {
  const [stations, setStations] = useState<AutoGasStation[]>(INITIAL_AUTO_GAS_STATIONS);
  const [highlight, setHighlight] = useState<EastingtonFacilityHighlight>(DEFAULT_EASTINGTON_HIGHLIGHT);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editStation, setEditStation] = useState<AutoGasStation | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingHighlight, setSavingHighlight] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stationsData, highlightData] = await Promise.all([
        fetchAdminAutoGasStations(),
        fetchEastingtonHighlight(),
      ]);
      setStations(stationsData);
      setHighlight(highlightData);
    } catch (err: any) {
      toast.error("Failed to load Auto Gas data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToAutoGasChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleOpenEdit = (station: AutoGasStation) => {
    setEditStation({ ...station });
    setModalOpen(true);
  };

  const handleSaveStation = async () => {
    if (!editStation) return;
    if (!editStation.name.trim()) {
      toast.error("Station name is required.");
      return;
    }
    if (!editStation.address.trim() || !editStation.postcode.trim()) {
      toast.error("Address and postcode are required.");
      return;
    }
    if (!editStation.telephone.trim()) {
      toast.error("Telephone number is required.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveAutoGasStation(editStation, stations);
      if (!result.success) {
        throw new Error(result.error || "Failed to save station.");
      }

      toast.success(`${editStation.name} updated in Supabase database!`);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save Auto Gas station.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHighlight = async () => {
    setSavingHighlight(true);
    try {
      const result = await saveEastingtonHighlight(highlight);
      if (!result.success) {
        throw new Error(result.error || "Failed to save Eastington highlight.");
      }
      toast.success("Eastington Gas Facility Highlight updated in Supabase!");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save Eastington highlight.");
    } finally {
      setSavingHighlight(false);
    }
  };

  const filteredStations = stations.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.town || "").toLowerCase().includes(q) ||
      (s.county || "").toLowerCase().includes(q) ||
      s.postcode.toLowerCase().includes(q) ||
      s.station_number.toLowerCase().includes(q)
    );
  });

  const activeCount = stations.filter((s) => s.is_active).length;

  return (
    <div className="space-y-8">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
              Auto Gas Locations
            </h1>
            <Badge variant="outline" className="bg-red-50 text-primary border-red-200 font-bold text-xs">
              4 Stations
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage live Auto Gas refuelling stations and facility highlights stored in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="rounded-full text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            Total Auto Gas Stations
          </span>
          <div className="text-2xl font-black text-slate-900 font-display">{stations.length}</div>
          <p className="text-[11px] text-slate-500">Persistent database records</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            Active Online
          </span>
          <div className="text-2xl font-black text-emerald-600 font-display">{activeCount} of {stations.length}</div>
          <p className="text-[11px] text-emerald-600 font-medium">Visible on public /auto-gas page</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            Coverage
          </span>
          <div className="text-lg font-black text-slate-900 font-display">Gloucestershire &amp; Somerset</div>
          <p className="text-[11px] text-slate-500">Eastington, Gloucester, Stroud, Weston-Super-Mare</p>
        </div>
      </div>

      {/* 4 STATIONS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-900 font-display">
            Filling Station Records (4)
          </h2>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Auto Gas stations by name, town, or postcode…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl border-slate-200 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Stations List Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredStations.map((station) => {
            const mapLink =
              station.maps_url ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${station.name}, ${station.address}, ${station.postcode}`,
              )}`;

            return (
              <div
                key={station.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-4">
                  {/* Header: Number, Badge, and Status Switch */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider font-display">
                        {station.station_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-bold ${
                          station.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {station.is_active ? "● Active" : "Inactive"}
                      </Badge>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-primary border border-red-100 text-xs font-bold">
                      <Fuel className="h-3 w-3" />
                      {station.badge || "Auto Gas Available"}
                    </span>
                  </div>

                  {/* Station Name */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display group-hover:text-primary transition-colors">
                      {station.name}
                    </h3>
                  </div>

                  {/* Key Details Grid */}
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block">{station.address}</span>
                        <span className="text-slate-500">
                          {[station.town, station.county, station.postcode].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-bold text-slate-900">{station.telephone}</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-600">{station.opening_hours || "Standard Forecourt Hours"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-full border-slate-200 text-slate-600 hover:text-slate-900 text-xs h-8 gap-1.5"
                  >
                    <a href={mapLink} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-3.5 w-3.5 text-primary" />
                      <span>View on Map</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  </Button>

                  <Button
                    onClick={() => handleOpenEdit(station)}
                    className="rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs h-8 px-4 gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Station</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EASTINGTON GAS FACILITY HIGHLIGHT SECTION */}
      <div className="pt-6 border-t border-slate-200">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-primary font-display block">
                INFORMATIONAL SECTION MANAGEMENT
              </span>
              <h2 className="text-xl font-black text-slate-900 font-display mt-0.5">
                Eastington Gas Facility Highlight
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage the visual feature section displayed below the 4 stations on the public Auto Gas page.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-700">Display Section</Label>
                <Switch
                  checked={highlight.is_active}
                  onCheckedChange={(checked) => setHighlight({ ...highlight, is_active: checked })}
                />
              </div>
              <Button
                onClick={handleSaveHighlight}
                disabled={savingHighlight}
                className="rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs px-5 h-9 gap-2 shadow-xs cursor-pointer"
              >
                {savingHighlight ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save Facility Highlight</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Image Preview */}
            <div className="lg:col-span-4 space-y-2">
              <Label className="text-xs font-bold text-slate-700 block">Facility Image Preview</Label>
              <div className="h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                <img
                  src={highlight.image_url || "/eastington_gas_tank.jpg"}
                  alt="Eastington Gas Tank Facility"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <p className="text-[11px] text-slate-400">Client-provided Eastington LPG storage tank asset</p>
            </div>

            {/* Editable Content Fields */}
            <div className="lg:col-span-8 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Eyebrow Label</Label>
                  <Input
                    value={highlight.eyebrow}
                    onChange={(e) => setHighlight({ ...highlight, eyebrow: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="EASTINGTON GAS FACILITY"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Main Title</Label>
                  <Input
                    value={highlight.title}
                    onChange={(e) => setHighlight({ ...highlight, title: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="Our Gas Tank in Eastington"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Highlight Text / Description</Label>
                <Input
                  value={highlight.description}
                  onChange={(e) => setHighlight({ ...highlight, description: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  placeholder="This is the gas tank in Eastington."
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Supporting Line (Optional)</Label>
                <Input
                  value={highlight.supportingText || ""}
                  onChange={(e) => setHighlight({ ...highlight, supportingText: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  placeholder="A dedicated visual highlight of our Eastington gas facility."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Station Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-display text-slate-900 flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              Edit Auto Gas Station
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update station details. All changes save directly to the Supabase database and sync with the public website.
            </DialogDescription>
          </DialogHeader>

          {editStation && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Station Number</Label>
                  <Input
                    value={editStation.station_number}
                    onChange={(e) => setEditStation({ ...editStation, station_number: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="e.g. LOCATION 01"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Service Tag</Label>
                  <Input
                    value={editStation.service || ""}
                    onChange={(e) => setEditStation({ ...editStation, service: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="Auto Gas"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Station Name</Label>
                <Input
                  value={editStation.name}
                  onChange={(e) => setEditStation({ ...editStation, name: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  placeholder="John Stayte Services – Eastington"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Street Address</Label>
                <Input
                  value={editStation.address}
                  onChange={(e) => setEditStation({ ...editStation, address: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  placeholder="John Stayte Services – Head Office, Eastington"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Town / City</Label>
                  <Input
                    value={editStation.town || ""}
                    onChange={(e) => setEditStation({ ...editStation, town: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="Stonehouse"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">County</Label>
                  <Input
                    value={editStation.county || ""}
                    onChange={(e) => setEditStation({ ...editStation, county: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="Gloucestershire"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Postcode</Label>
                  <Input
                    value={editStation.postcode}
                    onChange={(e) => setEditStation({ ...editStation, postcode: e.target.value.toUpperCase() })}
                    className="mt-1 h-9 rounded-xl text-xs uppercase"
                    placeholder="GL10 3AH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Telephone</Label>
                  <Input
                    value={editStation.telephone}
                    onChange={(e) => setEditStation({ ...editStation, telephone: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="01453 822859"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Badge Label</Label>
                  <Input
                    value={editStation.badge || ""}
                    onChange={(e) => setEditStation({ ...editStation, badge: e.target.value })}
                    className="mt-1 h-9 rounded-xl text-xs"
                    placeholder="Auto Gas Available"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Opening Hours</Label>
                <Input
                  value={editStation.opening_hours || ""}
                  onChange={(e) => setEditStation({ ...editStation, opening_hours: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  placeholder="Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <Label className="text-xs font-bold text-slate-900">Active Status</Label>
                  <p className="text-[11px] text-slate-500">
                    When active, this station is shown on the public Auto Gas page.
                  </p>
                </div>
                <Switch
                  checked={editStation.is_active}
                  onCheckedChange={(checked) => setEditStation({ ...editStation, is_active: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStation}
              disabled={saving}
              className="rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs px-6 gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving to Database…</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
