import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Settings, Save, Loader2, Layers, ShieldCheck, Mail, Building, Truck, ShoppingBag, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function AdminSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General & Business Preferences
  const [platformName, setPlatformName] = useState("John Stayte Services — Admin Portal");
  const [businessName, setBusinessName] = useState("John Stayte Services Ltd");
  const [supportEmail, setSupportEmail] = useState("admin@jss.com");
  const [phone, setPhone] = useState("01452 741234");
  const [operatingHours, setOperatingHours] = useState("Mon–Sat 7:00–20:00 · Sun 8:00–18:00");

  // Tax & VAT Rates
  const [vatRate, setVatRate] = useState("20");
  const [fuelVatRate, setFuelVatRate] = useState("5");

  // Order & Delivery Settings
  const [minOrderValue, setMinOrderValue] = useState("15");
  const [defaultShippingFee, setDefaultShippingFee] = useState("4.99");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("100");
  const [deliverySlaDays, setDeliverySlaDays] = useState("2");
  const [autoApproveOrders, setAutoApproveOrders] = useState(false);

  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);

  // Sidebar Module Matrix
  const [modulesConfig, setModulesConfig] = useState<Record<string, boolean>>({
    stations: true,
    reports: true,
    analytics: true,
    cms: true,
    banners: true,
    blog: true,
    faqs: true,
    notifications: true,
    audit: true,
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [{ data: moduleBlock }, { data: settingsBlock }] = await Promise.all([
        supabase.from("cms_content_blocks").select("content").eq("section_key", "admin_modules_config").maybeSingle(),
        supabase.from("cms_content_blocks").select("content").eq("section_key", "admin_system_settings").maybeSingle(),
      ]);

      if (moduleBlock?.content) {
        try {
          const parsed = JSON.parse(moduleBlock.content);
          setModulesConfig((prev) => ({ ...prev, ...parsed }));
        } catch (e) {}
      }

      if (settingsBlock?.content) {
        try {
          const parsed = JSON.parse(settingsBlock.content);
          if (parsed.platformName) setPlatformName(parsed.platformName);
          if (parsed.businessName) setBusinessName(parsed.businessName);
          if (parsed.supportEmail) setSupportEmail(parsed.supportEmail);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.operatingHours) setOperatingHours(parsed.operatingHours);
          if (parsed.vatRate) setVatRate(String(parsed.vatRate));
          if (parsed.fuelVatRate) setFuelVatRate(String(parsed.fuelVatRate));
          if (parsed.minOrderValue) setMinOrderValue(String(parsed.minOrderValue));
          if (parsed.defaultShippingFee) setDefaultShippingFee(String(parsed.defaultShippingFee));
          if (parsed.freeDeliveryThreshold) setFreeDeliveryThreshold(String(parsed.freeDeliveryThreshold));
          if (parsed.deliverySlaDays) setDeliverySlaDays(String(parsed.deliverySlaDays));
          if (typeof parsed.autoApproveOrders === "boolean") setAutoApproveOrders(parsed.autoApproveOrders);
          if (typeof parsed.emailAlerts === "boolean") setEmailAlerts(parsed.emailAlerts);
          if (typeof parsed.lowStockAlerts === "boolean") setLowStockAlerts(parsed.lowStockAlerts);
        } catch (e) {}
      }
    } catch (err: any) {
      toast.error("Failed to load system settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const modulePayload = {
        section_key: "admin_modules_config",
        title: "Admin Modules Visibility Matrix",
        content: JSON.stringify(modulesConfig),
      };

      const settingsPayload = {
        section_key: "admin_system_settings",
        title: "Admin System Settings",
        content: JSON.stringify({
          platformName,
          businessName,
          supportEmail,
          phone,
          operatingHours,
          vatRate: Number(vatRate),
          fuelVatRate: Number(fuelVatRate),
          minOrderValue: Number(minOrderValue),
          defaultShippingFee: Number(defaultShippingFee),
          freeDeliveryThreshold: Number(freeDeliveryThreshold),
          deliverySlaDays: Number(deliverySlaDays),
          autoApproveOrders,
          emailAlerts,
          lowStockAlerts,
        }),
      };

      const [{ error: err1 }, { error: err2 }] = await Promise.all([
        supabase.from("cms_content_blocks").upsert(modulePayload, { onConflict: "section_key" }),
        supabase.from("cms_content_blocks").upsert(settingsPayload, { onConflict: "section_key" }),
      ]);

      if (err1 || err2) throw new Error((err1 || err2)?.message);

      await logAdminAuditAction("UPDATE_SETTINGS", "settings", "admin_config", { platformName, vatRate });
      toast.success("System preferences saved to Supabase database!");
      window.dispatchEvent(new Event("admin_modules_updated"));
      window.dispatchEvent(new Event("admin_system_settings_updated"));
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (key: string, enabled: boolean) => {
    setModulesConfig((prev) => ({ ...prev, [key]: enabled }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" /> Enterprise System Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure persisted business rules, tax rates, delivery SLAs, and module controls in Supabase.
          </p>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="rounded-full font-extrabold text-xs gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white shrink-0"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save System Settings
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl">
          <TabsTrigger value="general" className="rounded-xl text-xs font-bold gap-1.5">
            <Building className="h-3.5 w-3.5" /> General & Business
          </TabsTrigger>
          <TabsTrigger value="vat" className="rounded-xl text-xs font-bold gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Tax & VAT
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl text-xs font-bold gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Order Rules
          </TabsTrigger>
          <TabsTrigger value="delivery" className="rounded-xl text-xs font-bold gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Delivery SLAs
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl text-xs font-bold gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Alerts & Prefs
          </TabsTrigger>
          <TabsTrigger value="modules" className="rounded-xl text-xs font-bold gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Module Matrix
          </TabsTrigger>
        </TabsList>

        {/* 1. General & Business Information */}
        <TabsContent value="general" className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs">
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">Business & Platform Information</h3>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Platform Display Title</Label>
              <Input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">Registered Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">Admin Support Email</Label>
              <Input
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">Contact Telephone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">Operating Hours</Label>
              <Input
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
          </div>
        </TabsContent>

        {/* 2. Tax & VAT Rates */}
        <TabsContent value="vat" className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs">
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">Tax & VAT Configuration</h3>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Standard UK VAT Rate (%)</Label>
              <Input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="mt-1 rounded-xl text-xs font-extrabold h-10 border-slate-200"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">Reduced Domestic Gas & Fuel VAT Rate (%)</Label>
              <Input
                type="number"
                value={fuelVatRate}
                onChange={(e) => setFuelVatRate(e.target.value)}
                className="mt-1 rounded-xl text-xs font-extrabold h-10 border-slate-200"
              />
            </div>
          </div>
        </TabsContent>

        {/* 3. Order Settings */}
        <TabsContent value="orders" className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs">
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">Order Rules & Thresholds</h3>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Minimum Order Value (£)</Label>
              <Input
                type="number"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border mt-2">
              <div>
                <Label className="font-bold text-slate-700 cursor-pointer">Auto-approve Customer Orders</Label>
                <p className="text-[11px] text-muted-foreground">Automatically mark new customer orders as Approved</p>
              </div>
              <Switch checked={autoApproveOrders} onCheckedChange={setAutoApproveOrders} />
            </div>
          </div>
        </TabsContent>

        {/* 4. Delivery Settings */}
        <TabsContent value="delivery" className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs">
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">Logistics & Delivery SLAs</h3>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Default Shipping Fee (£)</Label>
              <Input
                type="number"
                value={defaultShippingFee}
                onChange={(e) => setDefaultShippingFee(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">Free Delivery Threshold (£)</Label>
              <Input
                type="number"
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">Target Delivery SLA (Days)</Label>
              <Input
                type="number"
                value={deliverySlaDays}
                onChange={(e) => setDeliverySlaDays(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>
          </div>
        </TabsContent>

        {/* 5. Notification Preferences */}
        <TabsContent value="notifications" className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs">
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">System Notification Preferences</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
              <div>
                <Label className="font-bold text-slate-700 cursor-pointer">Admin Email Alerts</Label>
                <p className="text-[11px] text-muted-foreground">Receive email alerts on critical operational events</p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
              <div>
                <Label className="font-bold text-slate-700 cursor-pointer">Low Stock Alerts</Label>
                <p className="text-[11px] text-muted-foreground">Trigger notification center alerts when stock &le; 5</p>
              </div>
              <Switch checked={lowStockAlerts} onCheckedChange={setLowStockAlerts} />
            </div>
          </div>
        </TabsContent>

        {/* 6. Sidebar Module Control Matrix */}
        <TabsContent value="modules" className="surface-card p-6 rounded-3xl border bg-white space-y-6 max-w-3xl shadow-xs">
          <div>
            <h3 className="text-base font-extrabold text-foreground">Admin Sidebar Module Availability Matrix</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control which operational, content, and system modules appear in the Admin portal sidebar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "stations", title: "Autogas Stations", desc: "Depot & refilling station directory" },
              { key: "reports", title: "Reports & Audits", desc: "Commercial sales & VAT reports" },
              { key: "analytics", title: "Revenue Analytics", desc: "Live interactive BI charts" },
              { key: "cms", title: "CMS Content Manager", desc: "Content blocks & category management" },
              { key: "banners", title: "Banners", desc: "Homepage promotional banners" },
              { key: "blog", title: "Blog Posts", desc: "News & energy advisory guides" },
              { key: "faqs", title: "FAQs", desc: "Customer help center Q&A" },
              { key: "notifications", title: "Notifications", desc: "Real-time admin notification center" },
              { key: "audit", title: "Audit Trail Logs", desc: "Immutable security & action logs" },
            ].map((m) => (
              <div key={m.key} className="flex items-center justify-between p-4 rounded-2xl border bg-slate-50/50">
                <div className="space-y-0.5">
                  <Label htmlFor={`mod-${m.key}`} className="font-extrabold text-xs text-foreground cursor-pointer">
                    {m.title}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                </div>
                <Switch
                  id={`mod-${m.key}`}
                  checked={modulesConfig[m.key] !== false}
                  onCheckedChange={(checked) => toggleModule(m.key, checked)}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
