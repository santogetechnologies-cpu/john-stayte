import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, ShieldCheck, Settings2, X, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface CookiePreferences {
  necessary: boolean; // Always true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentGiven: boolean;
  timestamp: string;
}

const STORAGE_KEY = "jss_cookie_consent_v1";

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  consentGiven: false,
  timestamp: "",
};

export function getCookieConsent(): CookiePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      consentGiven: Boolean(parsed.consentGiven),
      timestamp: parsed.timestamp || "",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveCookieConsent(prefs: Partial<CookiePreferences>) {
  if (typeof window === "undefined") return;
  const full: CookiePreferences = {
    necessary: true,
    functional: Boolean(prefs.functional),
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
    consentGiven: true,
    timestamp: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    window.dispatchEvent(new CustomEvent("jss_cookie_consent_updated", { detail: full }));
  } catch {}
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const current = getCookieConsent();
    setPrefs(current);
    if (!current.consentGiven) {
      // Delay slightly for smooth appearance
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }

    const handleOpenSettings = () => {
      setPrefs(getCookieConsent());
      setSettingsOpen(true);
    };

    window.addEventListener("jss_open_cookie_settings", handleOpenSettings);
    return () => window.removeEventListener("jss_open_cookie_settings", handleOpenSettings);
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({
      functional: true,
      analytics: true,
      marketing: true,
    });
    setVisible(false);
    setSettingsOpen(false);
  };

  const handleRejectNonEssential = () => {
    saveCookieConsent({
      functional: false,
      analytics: false,
      marketing: false,
    });
    setVisible(false);
    setSettingsOpen(false);
  };

  const handleSavePreferences = () => {
    saveCookieConsent(prefs);
    setVisible(false);
    setSettingsOpen(false);
  };

  return (
    <>
      {/* Banner */}
      {visible && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 md:p-5 pointer-events-none select-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="container-page max-w-5xl mx-auto pointer-events-auto">
            <div className="rounded-2xl bg-slate-900/95 text-white p-4 sm:p-5 md:p-6 shadow-2xl border border-white/15 backdrop-blur-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 max-w-3xl">
                  <div className="h-10 w-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Cookie className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 text-left">
                    <h3 className="font-display font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                      Your Privacy & Cookie Choices
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      We use essential cookies to maintain secure authentication and process your gas orders.
                      With your permission, we also use optional functional and performance cookies to improve your browsing experience.
                      You can manage your preferences or read our{" "}
                      <Link
                        to="/cookie-policy"
                        className="text-red-400 hover:text-red-300 underline underline-offset-2 font-medium"
                      >
                        Cookie Policy
                      </Link>{" "}
                      at any time.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0 justify-end pt-1 md:pt-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                    className="h-9 px-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-full border border-white/10"
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                    Customise
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRejectNonEssential}
                    className="h-9 px-4 text-xs font-semibold bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white rounded-full"
                  >
                    Reject Non-Essential
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAcceptAll}
                    className="h-9 px-5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md"
                  >
                    Accept All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-slate-900 border-slate-200">
          <DialogHeader className="text-left space-y-1.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display font-extrabold text-lg text-slate-900">
                  Cookie Preferences & Settings
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configure which categories of cookies and local storage tokens you permit on this device.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-left">
            {/* 1. Necessary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-900">Strictly Necessary Cookies</span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Always Active
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Required for core website security, customer login sessions, shopping cart continuity, and secure payment tokenisation. These cannot be switched off.
              </p>
            </div>

            {/* 2. Functional */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-600" />
                  <Label htmlFor="cookie-functional" className="text-sm font-bold text-slate-900 cursor-pointer">
                    Functional Preferences
                  </Label>
                </div>
                <Switch
                  id="cookie-functional"
                  checked={prefs.functional}
                  onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, functional: checked }))}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enables personalised features, such as remembering your preferred collection forecourt and saving your cylinder exchange checklist state.
              </p>
            </div>

            {/* 3. Analytics */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cookie className="h-4 w-4 text-slate-600" />
                  <Label htmlFor="cookie-analytics" className="text-sm font-bold text-slate-900 cursor-pointer">
                    Performance & Analytics
                  </Label>
                </div>
                <Switch
                  id="cookie-analytics"
                  checked={prefs.analytics}
                  onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, analytics: checked }))}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Helps us measure site traffic anonymously and understand how pages perform so we can improve loading speeds and checkout usability.
              </p>
            </div>

            {/* 4. Marketing */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                  <Label htmlFor="cookie-marketing" className="text-sm font-bold text-slate-900 cursor-pointer">
                    Marketing & Communications
                  </Label>
                </div>
                <Switch
                  id="cookie-marketing"
                  checked={prefs.marketing}
                  onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, marketing: checked }))}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Permits tailored seasonal fuel notifications and regional promotional updates. We never sell your personal data to external advertisers.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <Link
              to="/cookie-policy"
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Read full Cookie Policy
            </Link>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRejectNonEssential}
                className="text-xs font-semibold rounded-full h-9"
              >
                Reject Non-Essential
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSavePreferences}
                className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-full h-9 px-4"
              >
                Save Preferences
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

