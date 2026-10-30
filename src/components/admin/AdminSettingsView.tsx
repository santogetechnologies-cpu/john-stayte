import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Settings,
  Save,
  Loader2,
  Layers,
  ShieldCheck,
  Building,
  Truck,
  ShoppingBag,
  Bell,
  Info,
  AlertTriangle,
  Receipt,
  Gift,
  CheckCircle2,
  Percent,
  Coins,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";
import { gbp } from "@/lib/store";
import {
  verifyFirebaseCredentialsServerFn,
  sendTestPushNotificationServerFn,
  getAuthToken,
} from "@/lib/push-notifications";

export function AdminSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. General & Business Preferences
  const [platformName, setPlatformName] = useState("John Stayte Services — Admin Portal");
  const [businessName, setBusinessName] = useState("John Stayte Services Ltd");
  const [supportEmail, setSupportEmail] = useState("info@johnstayteservices.co.uk");
  const [phone, setPhone] = useState("+44 (0)1453 822859");
  const [operatingHours, setOperatingHours] = useState("Mon–Sat 7:00–20:00 · Sun 8:00–18:00");

  // 2. Tax & VAT Settings (Initial configured rate: 0%)
  const [vatRate, setVatRate] = useState("0");
  const [fuelVatRate, setFuelVatRate] = useState("0");
  const [taxPricingMode, setTaxPricingMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [taxEnabled, setTaxEnabled] = useState(false);

  // 3. Delivery Settings (Initial configured fee: £0.00)
  const [defaultShippingFee, setDefaultShippingFee] = useState("0.00");
  const [deliveryChargesEnabled, setDeliveryChargesEnabled] = useState(false);
  const [deliveryTierName, setDeliveryTierName] = useState("Standard Fleet Delivery");
  const [deliverySlaDays, setDeliverySlaDays] = useState("2");

  // 4. Free Delivery Settings (Initial configured threshold: £0.00)
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(false);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("0.00");

  // 5. Order Rules
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [autoApproveOrders, setAutoApproveOrders] = useState(false);

  // 6. Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [pushDiagLoading, setPushDiagLoading] = useState(false);
  const [pushDiagResult, setPushDiagResult] = useState<any>(null);
  const [testPushLoading, setTestPushLoading] = useState(false);

  const runPushDiagnostic = async () => {
    setPushDiagLoading(true);
    try {
      const res = await verifyFirebaseCredentialsServerFn({ data: {} });
      setPushDiagResult(res);
      if (res.credentialsLoaded && res.oauthTokenExchangeOk) {
        toast.success("Push Notification credentials verified successfully with Firebase!");
      } else {
        toast.error(res.error || "Firebase credentials check failed.");
      }
    } catch (err: any) {
      toast.error("Failed to run push diagnostic: " + err.message);
    } finally {
      setPushDiagLoading(false);
    }
  };

  const sendTestPush = async () => {
    setTestPushLoading(true);
    try {
      const authToken = await getAuthToken();
      const res: any = await sendTestPushNotificationServerFn({ data: { authToken } });
      if (res?.success) {
        toast.success(`Test push dispatched! Attempted: ${res.tokensAttempted}, Succeeded: ${res.tokensSucceeded}`);
      } else {
        toast.error(`Test push failed: ${res?.message || res?.status || "Unknown error"}`);
      }
      // Re-run diagnostic to update recent logs
      await runPushDiagnostic();
    } catch (err: any) {
      toast.error("Test push error: " + err.message);
    } finally {
      setTestPushLoading(false);
    }
  };

  // 7. Sidebar Module Matrix
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
        supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "admin_modules_config")
          .maybeSingle(),
        supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "admin_system_settings")
          .maybeSingle(),
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

          // Tax & VAT
          setVatRate(parsed.vatRate !== undefined ? String(parsed.vatRate) : "0");
          setFuelVatRate(parsed.fuelVatRate !== undefined ? String(parsed.fuelVatRate) : "0");
          setTaxPricingMode(parsed.taxPricingMode === "inclusive" ? "inclusive" : "exclusive");
          setTaxEnabled(Boolean(parsed.taxEnabled ?? false));

          // Delivery Charges
          setDefaultShippingFee(
            parsed.defaultShippingFee !== undefined ? String(parsed.defaultShippingFee) : "0.00",
          );
          setDeliveryChargesEnabled(Boolean(parsed.deliveryChargesEnabled ?? false));
          if (parsed.deliveryTierName) setDeliveryTierName(parsed.deliveryTierName);
          if (parsed.deliverySlaDays) setDeliverySlaDays(String(parsed.deliverySlaDays));

          // Free Delivery
          setFreeDeliveryEnabled(Boolean(parsed.freeDeliveryEnabled ?? false));
          setFreeDeliveryThreshold(
            parsed.freeDeliveryThreshold !== undefined
              ? String(parsed.freeDeliveryThreshold)
              : "0.00",
          );

          // Order Rules & Alerts
          if (parsed.minOrderValue !== undefined) setMinOrderValue(String(parsed.minOrderValue));
          if (typeof parsed.autoApproveOrders === "boolean")
            setAutoApproveOrders(parsed.autoApproveOrders);
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
    // Basic Form Validation
    const numVat = Number(vatRate);
    const numFuelVat = Number(fuelVatRate);
    const numShipping = Number(defaultShippingFee);
    const numFreeThreshold = Number(freeDeliveryThreshold);
    const numMinOrder = Number(minOrderValue);
    const numSlaDays = Number(deliverySlaDays);

    if (isNaN(numVat) || numVat < 0 || numVat > 100) {
      toast.error("Standard VAT rate must be between 0% and 100%.");
      return;
    }
    if (isNaN(numFuelVat) || numFuelVat < 0 || numFuelVat > 100) {
      toast.error("Fuel VAT rate must be between 0% and 100%.");
      return;
    }
    if (isNaN(numShipping) || numShipping < 0) {
      toast.error("Default shipping fee must be £0.00 or greater.");
      return;
    }
    if (isNaN(numFreeThreshold) || numFreeThreshold < 0) {
      toast.error("Free delivery threshold must be £0.00 or greater.");
      return;
    }
    if (isNaN(numMinOrder) || numMinOrder < 0) {
      toast.error("Minimum order value must be £0.00 or greater.");
      return;
    }
    if (isNaN(numSlaDays) || numSlaDays < 1) {
      toast.error("Delivery SLA days must be at least 1 day.");
      return;
    }

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
          vatRate: numVat,
          fuelVatRate: numFuelVat,
          taxPricingMode,
          taxEnabled,
          taxCategories: {
            standard: numVat,
            reducedFuel: numFuelVat,
            zeroRated: 0,
          },
          defaultShippingFee: numShipping,
          deliveryChargesEnabled,
          deliveryTierName,
          freeDeliveryEnabled,
          freeDeliveryThreshold: numFreeThreshold,
          minOrderValue: numMinOrder,
          deliverySlaDays: numSlaDays,
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

      await logAdminAuditAction("UPDATE_SETTINGS", "settings", "admin_config", {
        platformName,
        vatRate: numVat,
        taxEnabled,
        defaultShippingFee: numShipping,
        freeDeliveryThreshold: numFreeThreshold,
      });

      toast.success("System preferences and pricing settings saved successfully!");
      window.dispatchEvent(new Event("admin_modules_updated"));
      window.dispatchEvent(new Event("admin_system_settings_updated"));
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Live Simulation Calculations
  const simSubtotal = 50.0;
  const numVat = Number(vatRate) || 0;
  const simTaxActive = taxEnabled && numVat > 0;
  const simVat = simTaxActive
    ? taxPricingMode === "inclusive"
      ? simSubtotal - simSubtotal / (1 + numVat / 100)
      : simSubtotal * (numVat / 100)
    : 0;
  const numShipping = Number(defaultShippingFee) || 0;
  const numFreeThreshold = Number(freeDeliveryThreshold) || 0;
  const simFreeQualified =
    freeDeliveryEnabled && (numFreeThreshold === 0 || simSubtotal >= numFreeThreshold);
  const simShipping = simFreeQualified
    ? 0
    : deliveryChargesEnabled && numShipping > 0
      ? numShipping
      : 0;
  const simTotal =
    taxPricingMode === "inclusive"
      ? simSubtotal + simShipping
      : simSubtotal + simShipping + simVat;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" /> Enterprise System Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure persisted business rules, tax rates, delivery fees, and module visibility.
          </p>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={saving || loading}
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
            <Receipt className="h-3.5 w-3.5" /> Tax & VAT
          </TabsTrigger>
          <TabsTrigger value="delivery" className="rounded-xl text-xs font-bold gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Delivery Charges
          </TabsTrigger>
          <TabsTrigger value="freedelivery" className="rounded-xl text-xs font-bold gap-1.5">
            <Gift className="h-3.5 w-3.5" /> Free Delivery
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl text-xs font-bold gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Order Rules
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl text-xs font-bold gap-1.5">
            <Bell className="h-3.5 w-3.5 text-primary" /> Push Notifications & Alerts
          </TabsTrigger>
          <TabsTrigger value="modules" className="rounded-xl text-xs font-bold gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Module Matrix
          </TabsTrigger>
        </TabsList>

        {/* 1. General & Business Information */}
        <TabsContent
          value="general"
          className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs"
        >
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">
            Business & Platform Information
          </h3>
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

        {/* 2. Tax & VAT Settings */}
        <TabsContent
          value="vat"
          className="surface-card p-6 rounded-3xl border bg-white space-y-5 max-w-2xl shadow-xs"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Tax & VAT Configuration</h3>
              <p className="text-[11px] text-muted-foreground">
                Configure VAT rates, pricing rules, and tax engine activation.
              </p>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                taxEnabled && Number(vatRate) > 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {taxEnabled && Number(vatRate) > 0 ? "Tax Engine Active" : "0% Initial Config"}
            </span>
          </div>

          {/* Critical UK Tax Advisory Notice */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold block">UK Tax Treatment Notice</span>
              <p className="leading-relaxed text-blue-900 font-medium">
                The initial configured VAT rate is <strong>0% (£0.00 cart VAT)</strong>. Treat 0% as the
                initial application configuration, not as confirmation that every product is legally
                zero-rated. The business must confirm the applicable UK tax treatment before production
                tax rules are enabled.
              </p>
            </div>
          </div>

          {/* Enable Tax Engine Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <Label className="font-bold text-slate-800 cursor-pointer text-xs">
                Enable Tax / VAT Engine
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                When disabled, 0% VAT (£0.00) is charged on all customer orders.
              </p>
            </div>
            <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
          </div>

          <div className="space-y-4 text-xs pt-1">
            {/* Pricing Mode */}
            <div>
              <Label className="font-bold text-slate-700">Tax Pricing Model</Label>
              <Select
                value={taxPricingMode}
                onValueChange={(val: "exclusive" | "inclusive") => setTaxPricingMode(val)}
              >
                <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200 bg-white">
                  <SelectValue placeholder="Select pricing model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">
                    Tax Exclusive (VAT added on top of subtotal at checkout)
                  </SelectItem>
                  <SelectItem value="inclusive">
                    Tax Inclusive (Catalog prices include VAT; tax is extracted for invoicing)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Standard UK e-commerce consumer prices typically display tax inclusive or exclusive depending on trade vs domestic customer segment.
              </p>
            </div>

            {/* Standard VAT Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="font-bold text-slate-700">Standard UK VAT Rate (%)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="rounded-xl text-xs font-extrabold h-10 border-slate-200 pr-8"
                  />
                  <Percent className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Initial configured value: 0%</p>
              </div>

              <div>
                <Label className="font-bold text-slate-700">
                  Reduced Domestic Fuel VAT Rate (%)
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={fuelVatRate}
                    onChange={(e) => setFuelVatRate(e.target.value)}
                    className="rounded-xl text-xs font-extrabold h-10 border-slate-200 pr-8"
                  />
                  <Percent className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Applies to domestic heating and qualifying fuel
                </p>
              </div>
            </div>

            {/* Live Tax Simulation Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mt-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                Live Tax Calculation Preview (Sample Basket: £50.00)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Taxable Subtotal</span>
                  <span className="text-xs font-black text-slate-800">{gbp(simSubtotal)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    Calculated VAT ({simTaxActive ? `${numVat}%` : "0%"})
                  </span>
                  <span className="text-xs font-black text-primary">{gbp(simVat)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Basket Total</span>
                  <span className="text-xs font-black text-slate-900">{gbp(simTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. Delivery Settings */}
        <TabsContent
          value="delivery"
          className="surface-card p-6 rounded-3xl border bg-white space-y-5 max-w-2xl shadow-xs"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Delivery Charges & Logistics
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Configure standard fleet delivery fees, method name, and dispatch SLAs.
              </p>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                deliveryChargesEnabled && Number(defaultShippingFee) > 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {deliveryChargesEnabled && Number(defaultShippingFee) > 0
                ? `${gbp(Number(defaultShippingFee))} Fee`
                : "£0.00 Initial Fee"}
            </span>
          </div>

          {/* Delivery Advisory Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold block">Approved Delivery Fee Notice</span>
              <p className="leading-relaxed text-amber-900 font-medium">
                The initial configured delivery fee is <strong>£0.00</strong> until an approved commercial
                fee is entered by the business. Do not silently assume £4.99 or any prior value is
                approved.
              </p>
            </div>
          </div>

          {/* Enable Delivery Charges Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <Label className="font-bold text-slate-800 cursor-pointer text-xs">
                Enable Standard Delivery Charges
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                When disabled, £0.00 is charged for delivery on customer orders.
              </p>
            </div>
            <Switch
              checked={deliveryChargesEnabled}
              onCheckedChange={setDeliveryChargesEnabled}
            />
          </div>

          <div className="space-y-4 text-xs pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="font-bold text-slate-700">Standard Delivery Fee (£)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={defaultShippingFee}
                    onChange={(e) => setDefaultShippingFee(e.target.value)}
                    className="rounded-xl text-xs font-extrabold h-10 border-slate-200"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Initial configured value: £0.00</p>
              </div>

              <div>
                <Label className="font-bold text-slate-700">Delivery Tier Display Label</Label>
                <Input
                  value={deliveryTierName}
                  onChange={(e) => setDeliveryTierName(e.target.value)}
                  placeholder="Standard Fleet Delivery"
                  className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Shown to customers at checkout</p>
              </div>
            </div>

            <div>
              <Label className="font-bold text-slate-700">Target Delivery SLA (Days)</Label>
              <Input
                type="number"
                min="1"
                value={deliverySlaDays}
                onChange={(e) => setDeliverySlaDays(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200 max-w-xs"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Expected transit days from depot dispatch</p>
            </div>
          </div>
        </TabsContent>

        {/* 4. Free Delivery Settings */}
        <TabsContent
          value="freedelivery"
          className="surface-card p-6 rounded-3xl border bg-white space-y-5 max-w-2xl shadow-xs"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Free Delivery Eligibility & Threshold
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Configure spending thresholds for customer free shipping qualification.
              </p>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                freeDeliveryEnabled
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {freeDeliveryEnabled
                ? Number(freeDeliveryThreshold) === 0
                  ? "All Orders Free"
                  : `Free over ${gbp(Number(freeDeliveryThreshold))}`
                : "Rule Disabled"}
            </span>
          </div>

          {/* Free Delivery Advisory Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <Gift className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold block">Free Delivery Policy Notice</span>
              <p className="leading-relaxed text-emerald-900 font-medium">
                The initial configured threshold is <strong>£0.00</strong>, meaning no minimum spending
                threshold is required by this setting. Note: This does not automatically entitle all orders
                to free delivery unless free delivery eligibility is explicitly enabled by the Admin.
              </p>
            </div>
          </div>

          {/* Free Delivery Enable Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <Label className="font-bold text-slate-800 cursor-pointer text-xs">
                Enable Free Delivery Eligibility Rule
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                When active, qualifying orders receive £0.00 delivery fee.
              </p>
            </div>
            <Switch
              checked={freeDeliveryEnabled}
              onCheckedChange={setFreeDeliveryEnabled}
            />
          </div>

          <div className="space-y-4 text-xs pt-1">
            <div>
              <Label className="font-bold text-slate-700">
                Minimum Qualifying Spend (£) Threshold
              </Label>
              <div className="relative mt-1 max-w-sm">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                  className="rounded-xl text-xs font-extrabold h-10 border-slate-200"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Initial configured value: £0.00</p>
            </div>

            {/* Operational Logic Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                Active Rule Behavior Summary
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Rule Status:</strong>{" "}
                    {freeDeliveryEnabled ? (
                      <span className="text-emerald-700 font-bold">Enabled</span>
                    ) : (
                      <span className="text-slate-600 font-bold">
                        Disabled (Standard delivery fee applies to all orders)
                      </span>
                    )}
                  </span>
                </li>
                {freeDeliveryEnabled && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {Number(freeDeliveryThreshold) === 0 ? (
                        <>
                          Threshold is <strong>£0.00</strong>: Free delivery is granted on{" "}
                          <strong>all orders</strong>.
                        </>
                      ) : (
                        <>
                          Threshold is <strong>{gbp(Number(freeDeliveryThreshold))}</strong>: Orders
                          at or above this amount qualify for free delivery; orders below pay{" "}
                          <strong>{gbp(Number(defaultShippingFee))}</strong>.
                        </>
                      )}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* 5. Order Settings */}
        <TabsContent
          value="orders"
          className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs"
        >
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">
            Order Rules & Thresholds
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Minimum Order Value (£)</Label>
              <Input
                type="number"
                min="0"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Minimum order threshold (set to 0 to allow all positive order amounts)</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border mt-2">
              <div>
                <Label className="font-bold text-slate-700 cursor-pointer">
                  Auto-approve Customer Orders
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Automatically mark new customer orders as Approved upon submission
                </p>
              </div>
              <Switch checked={autoApproveOrders} onCheckedChange={setAutoApproveOrders} />
            </div>
          </div>
        </TabsContent>

        {/* 6. Notification Preferences */}
        <TabsContent
          value="notifications"
          className="surface-card p-6 rounded-3xl border bg-white space-y-5 max-w-2xl shadow-xs"
        >
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">
            System Notification Preferences
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
              <div>
                <Label className="font-bold text-slate-700 cursor-pointer">
                  Admin Email Alerts
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Receive email alerts on critical operational events
                </p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
              <div>
                <Label className="font-bold text-slate-700 cursor-pointer">Low Stock Alerts</Label>
                <p className="text-[11px] text-muted-foreground">
                  Trigger notification center alerts when stock &le; 5
                </p>
              </div>
              <Switch checked={lowStockAlerts} onCheckedChange={setLowStockAlerts} />
            </div>
          </div>

          {/* Mobile Push Notification Engine & Live Diagnostic */}
          <div className="pt-2 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                  Mobile Push Notifications (Android & iOS)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  FCM HTTP v1 delivery engine, Vercel credentials & active device status
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runPushDiagnostic}
                  disabled={pushDiagLoading}
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  {pushDiagLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-primary" />
                  )}
                  Run Diagnostic
                </Button>
                {pushDiagResult?.credentialsLoaded && (
                  <Button
                    size="sm"
                    onClick={sendTestPush}
                    disabled={testPushLoading}
                    className="h-8 text-xs font-bold rounded-xl bg-primary text-white"
                  >
                    {testPushLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Bell className="w-3.5 h-3.5 mr-1" />
                    )}
                    Send Test Push
                  </Button>
                )}
              </div>
            </div>

            {pushDiagResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Firebase Credentials:</span>
                  {pushDiagResult.credentialsLoaded ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Loaded ({pushDiagResult.projectId})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <AlertTriangle className="w-3 h-3" /> Not Configured
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Google OAuth2 Token Exchange:</span>
                  {pushDiagResult.oauthTokenExchangeOk ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Verified (HTTP 200)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> {pushDiagResult.oauthError || "Not verified"}
                    </span>
                  )}
                </div>

                {pushDiagResult.activeTokens && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Active Mobile Devices:</span>
                    <span className="font-mono text-slate-800 font-bold">
                      {pushDiagResult.activeTokens.total} total (Android: {pushDiagResult.activeTokens.android}, iOS: {pushDiagResult.activeTokens.ios})
                    </span>
                  </div>
                )}

                {pushDiagResult.details && (
                  <div className="pt-2 border-t text-[11px] text-muted-foreground font-mono space-y-0.5">
                    <div>FIREBASE_SERVICE_ACCOUNT_KEY: {pushDiagResult.details.FIREBASE_SERVICE_ACCOUNT_KEY}</div>
                    <div>FIREBASE_PROJECT_ID: {pushDiagResult.details.FIREBASE_PROJECT_ID}</div>
                  </div>
                )}

                {pushDiagResult.recentLogs && pushDiagResult.recentLogs.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="font-bold text-slate-600 block mb-1.5">Recent Notification Dispatches:</span>
                    <div className="space-y-1 font-mono text-[11px]">
                      {pushDiagResult.recentLogs.slice(0, 3).map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between bg-white p-2 rounded-lg border">
                          <span className="font-bold">{log.event_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "sent" ? "bg-emerald-100 text-emerald-700" :
                            log.status === "no_tokens" ? "bg-amber-100 text-amber-700" :
                            "bg-rose-100 text-rose-700"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 7. Module Matrix */}
        <TabsContent
          value="modules"
          className="surface-card p-6 rounded-3xl border bg-white space-y-4 max-w-2xl shadow-xs"
        >
          <h3 className="text-sm font-extrabold text-foreground border-b pb-2">
            Admin Modules Visibility Matrix
          </h3>
          <p className="text-xs text-muted-foreground">
            Control which operational modules appear in the administrative portal sidebar.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {Object.entries(modulesConfig).map(([key, enabled]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-xl border bg-slate-50"
              >
                <Label className="font-bold text-xs capitalize text-slate-700 cursor-pointer">
                  {key} Module
                </Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) =>
                    setModulesConfig((prev) => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
