import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Plus, Search, Trash2, Edit, Save } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

export function AdminStationsView() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editStation, setEditStation] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStations(data || []);
    } catch (err: any) {
      toast.error("Failed to load stations: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const filtered = stations.filter((s) => {
    return (
      (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.town || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.postcode || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleOpenNew = () => {
    setEditStation({
      name: "",
      address: "",
      town: "Gloucester",
      postcode: "GL1 1AA",
      phone: "01452 123456",
      hours: "Mon-Sat: 07:30 - 18:00",
      autogas_available: true,
    });
    setIsNew(true);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStation.name || !editStation.address) {
      return toast.error("Please fill in required station name and address.");
    }
    setSaving(true);

    try {
      if (isNew) {
        const { error } = await supabase.from("stations").insert([
          {
            name: editStation.name,
            address: editStation.address,
            town: editStation.town || "Gloucester",
            postcode: editStation.postcode || "GL1 1AA",
            phone: editStation.phone,
            hours: editStation.hours,
            autogas_available: Boolean(editStation.autogas_available),
          },
        ]);
        if (error) throw error;
        toast.success("Filling station added to Supabase!");
      } else {
        const { error } = await supabase
          .from("stations")
          .update({
            name: editStation.name,
            address: editStation.address,
            town: editStation.town,
            postcode: editStation.postcode,
            phone: editStation.phone,
            hours: editStation.hours,
            autogas_available: Boolean(editStation.autogas_available),
          })
          .eq("id", editStation.id);

        if (error) throw error;
        toast.success("Filling station updated!");
      }

      setModalOpen(false);
      await loadStations();
    } catch (err: any) {
      toast.error("Failed to save station: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this station?")) return;
    try {
      const { error } = await supabase.from("stations").delete().eq("id", id);
      if (error) throw error;
      toast.success("Station deleted!");
      await loadStations();
    } catch (err: any) {
      toast.error("Failed to delete station: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Filling Stations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            LPG & Autogas Station Network ({stations.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage physical depot locations and Autogas availability in Supabase.
          </p>
        </div>

        <Button onClick={handleOpenNew} className="rounded-full font-bold text-xs gap-1.5 shadow-md shrink-0">
          <Plus className="h-4 w-4" /> Add Station Location
        </Button>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search station name, town, postcode..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading station network from Supabase...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No station locations found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add filling stations using the "Add Station Location" button.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Station Name</TableHead>
                <TableHead className="font-bold text-xs">Town / City</TableHead>
                <TableHead className="font-bold text-xs">Postcode</TableHead>
                <TableHead className="font-bold text-xs">Phone</TableHead>
                <TableHead className="font-bold text-xs">Autogas</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-bold text-xs text-foreground">{s.name}</TableCell>
                  <TableCell className="text-xs font-semibold">{s.town}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">{s.postcode}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.phone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold text-[10px] ${
                        s.autogas_available
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.autogas_available ? "Available" : "No Autogas"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditStation(s); setIsNew(false); setModalOpen(true); }}
                        className="h-8 w-8 rounded-full hover:bg-slate-100"
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(s.id)}
                        className="h-8 w-8 rounded-full hover:bg-red-50 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {isNew ? "Add Station Location" : "Edit Station Details"}
            </DialogTitle>
          </DialogHeader>
          {editStation && (
            <form onSubmit={handleSave} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Station Name</label>
                <Input
                  value={editStation.name}
                  onChange={(e) => setEditStation({ ...editStation, name: e.target.value })}
                  placeholder="e.g. Fromebridge Service Station"
                  className="mt-1 rounded-xl text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Address</label>
                <Input
                  value={editStation.address}
                  onChange={(e) => setEditStation({ ...editStation, address: e.target.value })}
                  placeholder="A38 Whitminster"
                  className="mt-1 rounded-xl text-xs font-semibold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Town</label>
                  <Input
                    value={editStation.town}
                    onChange={(e) => setEditStation({ ...editStation, town: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Postcode</label>
                  <Input
                    value={editStation.postcode}
                    onChange={(e) => setEditStation({ ...editStation, postcode: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-full font-bold text-xs gap-1.5 shadow-md">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Station"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
