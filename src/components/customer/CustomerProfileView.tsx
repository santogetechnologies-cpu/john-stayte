import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { User, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerProfileView() {
  const { user } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch real profile from Supabase
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        setEmail(authUser.user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.user.id)
          .single();

        if (profile) {
          setName(profile.full_name || "");
          setPhone(profile.phone || "");
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.user.id);

      if (error) throw error;
      toast.success("Profile saved to database successfully!");
    } catch (err: any) {
      toast.error("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
          <span>/</span>
          <span className="text-foreground font-bold">Profile</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          My Profile
        </h1>
      </div>

      <div className="surface-card p-6 max-w-xl rounded-3xl border bg-white space-y-6 shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
            Loading profile from Supabase...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="mt-1 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-muted-foreground">Email Address (Read-only)</label>
              <Input
                type="email"
                value={email}
                disabled
                className="mt-1 rounded-xl text-xs font-semibold bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="font-bold text-muted-foreground">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07700 900123"
                className="mt-1 rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving} className="rounded-full font-bold text-xs gap-2 shadow-xs">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
