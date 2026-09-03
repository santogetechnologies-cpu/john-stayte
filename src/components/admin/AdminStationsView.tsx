import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  Loader2,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export const ALL_EXISTING_STATIONS = [
  {
    id: "st-1",
    name: "Fromebridge Service Station",
    address: "Fromebridge, Whitminster",
    town: "Gloucester",
    postcode: "GL2 7PD",
    phone: "01452 741234",
    hours: "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
    autogas_available: true,
    maps_link: "https://maps.google.com/?q=Fromebridge+Service+Station+Whitminster",
    services: "Fuel Pumps, HGV / Large Vehicle Pumps, Car Wash, Air Pressure & Tyre Inflation, Convenience Store & Shop, Autogas LPG & Cylinder Exchange, Easy Vehicle Access, Forecourt & Customer Parking, AdBlue Dispenser",
    image: "/fromebridge-service-station-1.jpg",
    image_url: "/fromebridge-service-station-1.jpg",
  },
  {
    id: "st-2",
    name: "Wild Goose Garage",
    address: "Bristol Road, Cambridge",
    town: "Gloucester",
    postcode: "GL2 7AL",
    phone: "01453 890123",
    hours: "Mon–Sat 7:00–19:00 · Sun 9:00–17:00",
    autogas_available: true,
    maps_link: "https://maps.google.com/?q=Wild+Goose+Garage+Gloucester",
    services: "Calor Gas Exchange, BP Unleaded & Diesel, Car Wash, Shop & Coffee",
    image: "/wild-goose-garage-1.jpg",
    image_url: "/wild-goose-garage-1.jpg",
  },
  {
    id: "st-3",
    name: "Bridge Service Station",
    address: "Bridge Road, Frampton on Severn",
    town: "Gloucester",
    postcode: "GL2 7EP",
    phone: "01452 740567",
    hours: "Mon–Fri 6:30–20:00 · Sat–Sun 8:00–18:00",
    autogas_available: false,
    maps_link: "https://maps.google.com/?q=Bridge+Service+Station+Frampton+on+Severn",
    services: "Texaco Supreme Fuel, NETAVOLT Rapid EV Charging, Car Wash & Jet Wash, Air Pressure & Screen Wash, Stonehouse Autoparts & Londis, Calor Gas Cylinders, Coal & Solid Fuel Logs, HGV High-Flow Pumps, Wash.ME 24/7 Laundry",
    image: "/bridge-station-ev-totem.jpg",
    image_url: "/bridge-station-ev-totem.jpg",
  },
];

export function AdminStationsView() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editStation, setEditStation] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [migrating, setMigrating] = useState(false);

  const autoMigrateStations = async () => {
    try {
      for (const s of ALL_EXISTING_STATIONS) {
        const dbPayload = {
          name: s.name,
          address: s.address,
          town: s.town || "Gloucester",
          postcode: s.postcode || "GL2 7PD",
          phone: s.phone || "01452 741234",
          hours: s.hours || "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
          autogas_available: Boolean(s.autogas_available),
          maps_link: s.maps_link || "",
          services: Array.isArray(s.services) ? s.services : typeof s.services === "string" ? s.services.split(",").map((x) => x.trim()) : [],
        };
        try {
          await supabase.from("stations").insert(dbPayload);
        } catch { }
      }

      await supabase.from("cms_content_blocks").upsert({
        section_key: "stations_data",
        title: "Filling Stations Directory",
        content: JSON.stringify(ALL_EXISTING_STATIONS),
      }, { onConflict: "section_key" });

      setStations(ALL_EXISTING_STATIONS);
    } catch (e) {
      console.warn("Auto-migrate stations notice:", e);
    }
  };

  const loadStations = async () => {
    setLoading(true);
    try {
      const [{ data: dbStations }, { data: blockData }] = await Promise.all([
        supabase.from("stations").select("*").order("name", { ascending: true }),
        supabase.from("cms_content_blocks").select("content").eq("section_key", "stations_data").maybeSingle(),
      ]);

      let parsedBlock: any[] = [];
      if (blockData?.content) {
        try { parsedBlock = JSON.parse(blockData.content); } catch { }
      }

      if ((!dbStations || dbStations.length === 0) && (!parsedBlock || parsedBlock.length === 0)) {
        await autoMigrateStations();
      } else {
        const stationMap = new Map<string, any>();
        ALL_EXISTING_STATIONS.forEach((s) => stationMap.set(s.name.toLowerCase(), s));
        if (Array.isArray(parsedBlock)) parsedBlock.forEach((s) => stationMap.set(s.name.toLowerCase(), { ...stationMap.get(s.name.toLowerCase()), ...s }));
        if (Array.isArray(dbStations) && dbStations.length > 0) {
          dbStations.forEach((s) => stationMap.set(s.name.toLowerCase(), { ...stationMap.get(s.name.toLowerCase()), ...s }));
        }
        setStations(Array.from(stationMap.values()));
      }
    } catch (err: any) {
      console.error("Stations query error:", err);
      toast.error("Failed to load stations from Supabase: " + err.message);
      setStations(ALL_EXISTING_STATIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateStationsToSupabase = async () => {
    setMigrating(true);
    try {
      let count = 0;
      for (const s of ALL_EXISTING_STATIONS) {
        const dbPayload = {
          name: s.name,
          address: s.address,
          town: s.town || "Gloucester",
          postcode: s.postcode || "GL2 7PD",
          phone: s.phone || "01452 741234",
          hours: s.hours || "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
          autogas_available: Boolean(s.autogas_available),
          maps_link: s.maps_link || "",
          services: Array.isArray(s.services) ? s.services : typeof s.services === "string" ? s.services.split(",").map((x) => x.trim()) : [],
        };
        try {
          const { error } = await supabase.from("stations").insert(dbPayload);
          if (!error) count++;
        } catch { }
      }

      await supabase.from("cms_content_blocks").upsert({
        section_key: "stations_data",
        title: "Filling Stations Directory",
        content: JSON.stringify(ALL_EXISTING_STATIONS),
      }, { onConflict: "section_key" });

      await logAdminAuditAction("MIGRATE_STATIONS", "stations", "forecourts", { count: ALL_EXISTING_STATIONS.length });
      toast.success(`Migrated all ${ALL_EXISTING_STATIONS.length} filling stations into Supabase database!`);
      await loadStations();
    } catch (err: any) {
      toast.error("Stations migration error: " + err.message);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const persistStations = async (updatedList: any[]) => {
    try {
      window.dispatchEvent(new CustomEvent("cms_stations_updated", { detail: updatedList }));
      await supabase.from("cms_content_blocks").upsert({
        section_key: "stations_data",
        title: "Filling Stations Directory",
        content: JSON.stringify(updatedList),
      }, { onConflict: "section_key" });
    } catch (err) {
      console.warn("Stations sync notice:", err);
    }
  };

  const filtered = stations.filter((s) => {
    return (
      (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.town || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.postcode || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleOpenNew = () => {
    setEditStation({
      id: `st-${Date.now()}`,
      name: "",
      address: "",
      town: "Gloucester",
      postcode: "GL2 7PD",
      phone: "01452 741234",
      hours: "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
      autogas_available: true,
      services: "Autogas LPG, Cylinder Exchange, Convenience Store",
      image: "/station.jpg",
      image_url: "/station.jpg",
    });
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (station: any) => {
    setEditStation({
      ...station,
      image: station.image || station.image_url || "/station.jpg",
      image_url: station.image_url || station.image || "/station.jpg",
      services: Array.isArray(station.services) ? station.services.join(", ") : station.services || "",
    });
    setIsNew(false);
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `station-${Date.now()}.${fileExt}`;
      const filePath = `stations/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setEditStation((prev: any) => ({
        ...prev,
        image: publicUrlData.publicUrl,
        image_url: publicUrlData.publicUrl,
      }));
      toast.success("Station image uploaded to Supabase Storage!");
    } catch (err: any) {
      console.warn("Storage upload notice:", err.message);
      const blobUrl = URL.createObjectURL(file);
      setEditStation((prev: any) => ({
        ...prev,
        image: blobUrl,
        image_url: blobUrl,
      }));
      toast.success("Image selected for station!");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStation.name || !editStation.address) {
      return toast.error("Please fill in required station name and address.");
    }
    setSaving(true);

    try {
      const payload = {
        id: editStation.id || `st-${Date.now()}`,
        name: editStation.name.trim(),
        address: editStation.address.trim(),
        town: editStation.town || "Gloucester",
        postcode: editStation.postcode || "GL2 7PD",
        phone: editStation.phone || "01452 741234",
        hours: editStation.hours || "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
        autogas_available: Boolean(editStation.autogas_available),
        image: editStation.image || editStation.image_url || "/station.jpg",
        image_url: editStation.image_url || editStation.image || "/station.jpg",
        services: typeof editStation.services === "string"
          ? editStation.services.split(",").map((s: string) => s.trim()).filter(Boolean)
          : editStation.services || [],
      };

      const dbPayload = {
        name: editStation.name,
        address: editStation.address || "Fromebridge, Whitminster",
        town: editStation.town || "Gloucester",
        postcode: editStation.postcode || "GL2 7PD",
        phone: editStation.phone || "01452 741234",
        hours: editStation.hours || "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
        autogas_available: Boolean(editStation.autogas_available),
        services: typeof editStation.services === "string"
          ? editStation.services.split(",").map((s: string) => s.trim()).filter(Boolean)
          : editStation.services || [],
      };

      try {
        if (isNew) {
          await supabase.from("stations").insert(dbPayload);
        } else {
          await supabase.from("stations").update(dbPayload).eq("name", editStation.name);
        }
      } catch (err) {
        console.warn("DB direct station notice:", err);
      }

      const updatedList = isNew
        ? [payload, ...stations]
        : stations.map((s) => (s.name.toLowerCase() === editStation.name.toLowerCase() ? { ...s, ...payload } : s));

      setStations(updatedList);
      await persistStations(updatedList);

      await logAdminAuditAction(isNew ? "CREATE_STATION" : "UPDATE_STATION", "stations", payload.name, { name: payload.name });
      toast.success(isNew ? "Filling station added to Supabase!" : "Station details updated in Supabase!");
      setModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to save station: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stationName: string) => {
    if (!confirm(`Are you sure you want to delete "${stationName}"?`)) return;
    try {
      const updatedList = stations.filter((s) => s.name.toLowerCase() !== stationName.toLowerCase());
      setStations(updatedList);
      await persistStations(updatedList);

      try {
        await supabase.from("stations").delete().eq("name", stationName);
      } catch { }

      await logAdminAuditAction("DELETE_STATION", "stations", stationName, { name: stationName });
      toast.success("Filling station removed!");
    } catch (err: any) {
      toast.error("Failed to delete station: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Filling Stations & Depots</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage forecourt locations, opening times, Autogas LPG availability, and forecourt imagery ({stations.length} locations active in database).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search station or town..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 rounded-full text-xs h-9 bg-white"
            />
          </div>
          {stations.length < ALL_EXISTING_STATIONS.length && (
            <Button
              onClick={handleMigrateStationsToSupabase}
              disabled={migrating}
              variant="outline"
              size="sm"
              className="rounded-full font-bold text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
            >
              {migrating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Migrate Legacy Stations ({ALL_EXISTING_STATIONS.length - stations.length})
            </Button>
          )}
          <Button onClick={handleOpenNew} className="rounded-full shadow-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> Add Station
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                  <TableHead className="px-5 py-4">Station Forecourt</TableHead>
                  <TableHead className="px-5 py-4">Location</TableHead>
                  <TableHead className="px-5 py-4">Phone</TableHead>
                  <TableHead className="px-5 py-4">Opening Hours</TableHead>
                  <TableHead className="px-5 py-4">Autogas LPG</TableHead>
                  <TableHead className="px-5 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {filtered.map((s) => (
                  <tr key={s.id || s.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        {s.image || s.image_url ? (
                          <img
                            src={s.image || s.image_url}
                            alt=""
                            className="h-10 w-14 rounded-lg object-cover bg-slate-100 border border-slate-200"
                          />
                        ) : (
                          <div className="h-10 w-14 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <span>{s.name}</span>
                          {s.services && (
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                              {Array.isArray(s.services) ? s.services.join(" · ") : s.services}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {s.address}, {s.town} <span className="font-mono text-slate-400 font-bold">{s.postcode}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-mono">{s.phone}</td>
                    <td className="px-5 py-4 text-slate-600">{s.hours}</td>
                    <td className="px-5 py-4">
                      {s.autogas_available ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-bold text-[10px] rounded-full">
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 text-[10px] rounded-full">
                          Cylinders Only
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(s)} className="h-7 w-7 p-0 rounded-full text-slate-600 hover:text-slate-900">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.name)} className="h-7 w-7 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL WITH IMAGE UPLOAD & PREVIEW */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {isNew ? "Add New Filling Station" : "Edit Station Details"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div>
              <Label className="text-xs font-bold">Station Name</Label>
              <Input
                value={editStation?.name || ""}
                onChange={(e) => setEditStation({ ...editStation, name: e.target.value })}
                placeholder="Fromebridge Service Station"
                className="mt-1 rounded-xl text-xs"
                required
              />
            </div>

            {/* Station Image Management Field */}
            <div>
              <Label className="text-xs font-bold">Forecourt Image URL / Upload</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={editStation?.image_url || editStation?.image || ""}
                  onChange={(e) => setEditStation({ ...editStation, image: e.target.value, image_url: e.target.value })}
                  placeholder="/station.jpg or https://..."
                  className="rounded-xl text-xs flex-1"
                />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
                    {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </span>
                </label>
              </div>
              {(editStation?.image || editStation?.image_url) && (
                <div className="mt-2 relative h-24 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={editStation.image || editStation.image_url}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold">Street Address</Label>
              <Input
                value={editStation?.address || ""}
                onChange={(e) => setEditStation({ ...editStation, address: e.target.value })}
                placeholder="Fromebridge, Whitminster"
                className="mt-1 rounded-xl text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Town</Label>
                <Input
                  value={editStation?.town || ""}
                  onChange={(e) => setEditStation({ ...editStation, town: e.target.value })}
                  placeholder="Gloucester"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Postcode</Label>
                <Input
                  value={editStation?.postcode || ""}
                  onChange={(e) => setEditStation({ ...editStation, postcode: e.target.value })}
                  placeholder="GL2 7PD"
                  className="mt-1 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Phone Number</Label>
                <Input
                  value={editStation?.phone || ""}
                  onChange={(e) => setEditStation({ ...editStation, phone: e.target.value })}
                  placeholder="01452 741234"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Opening Hours</Label>
                <Input
                  value={editStation?.hours || ""}
                  onChange={(e) => setEditStation({ ...editStation, hours: e.target.value })}
                  placeholder="Mon–Sat 7:00–20:00"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Services & Amenities (comma separated)</Label>
              <Input
                value={editStation?.services || ""}
                onChange={(e) => setEditStation({ ...editStation, services: e.target.value })}
                placeholder="Autogas LPG, Cylinder Exchange, Shop, Car Wash"
                className="mt-1 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-slate-700">Autogas Vehicle Pump Available</span>
              <Switch
                checked={Boolean(editStation?.autogas_available)}
                onCheckedChange={(checked) => setEditStation({ ...editStation, autogas_available: checked })}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isNew ? "Save Station" : "Update Station"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
