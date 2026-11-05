import { createFileRoute, Link } from "@tanstack/react-router";
import { Cookie, Settings2, ShieldCheck, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy | John Stayte Services" },
      {
        name: "description",
        content:
          "Understand how John Stayte Services uses cookies and local storage tokens to provide a secure, seamless online gas ordering experience.",
      },
      { property: "og:title", content: "Cookie Policy | John Stayte Services" },
      {
        property: "og:description",
        content: "Transparent guidance on essential cookies, functional preferences, performance measurement, and managing your cookie consent.",
      },
    ],
  }),
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  const lastUpdated = "5 November 2026";

  const openSettings = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jss_open_cookie_settings"));
    }
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="PRIVACY &amp; TRANSPARENCY"
        title="Cookie Policy"
        subtitle="How John Stayte Services uses cookies and similar storage technologies to ensure secure authentication, preserve your shopping cart, and deliver dependable service."
      />

      <div className="container-page py-12 sm:py-16">
        <div className="max-w-4xl mx-auto space-y-10 text-left">
          {/* Action Callout */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Cookie className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Manage Your Cookie Preferences</p>
                <p className="text-xs text-slate-600">You can adjust or revoke your cookie choices at any time · Last updated: {lastUpdated}</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={openSettings}
              size="sm"
              className="rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shrink-0"
            >
              <Settings2 className="h-3.5 w-3.5" /> Open Cookie Settings
            </Button>
          </div>

          {/* Section 1: What Are Cookies? */}
          <section className="space-y-3">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              1. What Are Cookies?
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Cookies are small text files placed on your computer, tablet, or smartphone when you visit a website. They are widely used to make websites work efficiently, remember your preferences, protect against fraud, and provide analytical data to website operators.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              In addition to standard browser cookies, modern web applications may utilize secure local browser storage (such as HTML5 `localStorage` and `sessionStorage`) to remember temporary session states, such as items currently saved in your gas order basket or your selected forecourt collection branch.
            </p>
          </section>

          {/* Section 2: Cookie Categories We Use */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              2. Cookie Categories We Use
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              In accordance with UK Privacy and Electronic Communications Regulations (PECR) and UK GDPR, we categorize our cookies into four distinct types:
            </p>

            <div className="space-y-4 pt-2">
              {/* Category A */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-display font-bold text-base text-slate-900">A. Strictly Necessary Cookies (Essential)</h3>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Always Active
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  These cookies and tokens are required for the website to function safely and cannot be disabled. They handle authentication sessions, prevent Cross-Site Request Forgery (CSRF), preserve your shopping cart during checkout, and enforce database Row-Level Security.
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <strong>Examples:</strong> `sb-*-auth-token` (secure user authentication), `jss_cart` (saved basket items), `jss_cookie_consent` (records your consent choices).
                </div>
              </div>

              {/* Category B */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Settings2 className="h-4 w-4 text-indigo-600" />
                    <h3 className="font-display font-bold text-base text-slate-900">B. Functional Cookies</h3>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    Optional
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  These allow the website to remember choices you make (such as your preferred forecourt branch for Click &amp; Collect orders or keeping cylinder return notes saved) to provide a more tailored experience.
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <strong>Examples:</strong> `jss_branch_preference`, UI layout preferences.
                </div>
              </div>

              {/* Category C */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <h3 className="font-display font-bold text-base text-slate-900">C. Performance &amp; Analytics Cookies</h3>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    Optional
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  These cookies collect aggregated, anonymous information about how visitors use our site (for example, identifying slow-loading checkout steps or popular cylinder categories). They do not collect personally identifiable information.
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <strong>Examples:</strong> Anonymous visitor count, page transition telemetry.
                </div>
              </div>

              {/* Category D */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Cookie className="h-4 w-4 text-purple-600" />
                    <h3 className="font-display font-bold text-base text-slate-900">D. Marketing &amp; Social Cookies</h3>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    Optional
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  These cookies may be used to display relevant seasonal heating or gas notices on external networks. We do not sell user data to advertising brokers. Non-essential tracking cookies remain deactivated until you provide explicit consent.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Managing & Withdrawing Consent */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              3. How to Manage or Withdraw Consent
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              When you first visit our site, our Cookie Consent Banner allows you to Accept All, Reject Non-Essential, or Customise your preferences. You can reopen the settings panel at any time by clicking the button below or using the &ldquo;Cookie Settings&rdquo; link in the website footer.
            </p>
            <div className="pt-1">
              <Button
                type="button"
                onClick={openSettings}
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold gap-1.5"
              >
                <Settings2 className="h-3.5 w-3.5" /> Reopen Cookie Settings Dialog
              </Button>
            </div>
          </section>

          {/* Section 4: Browser Settings Guidance */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              4. Controlling Cookies Through Your Browser
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Most web browsers allow you to control or block cookies through their system settings. Note that blocking all cookies (including essential cookies) will prevent you from logging in, maintaining an active shopping cart, or completing gas orders on our website.
            </p>
            <p className="text-xs text-slate-600">
              For comprehensive information on managing and deleting cookies in your specific browser, visit{" "}
              <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-red-600 underline">
                www.allaboutcookies.org
              </a>{" "}
              or the Information Commissioner&apos;s Office guidance at{" "}
              <a href="https://ico.org.uk/for-the-public/online/cookies/" target="_blank" rel="noopener noreferrer" className="text-red-600 underline">
                ico.org.uk/cookies
              </a>.
            </p>
          </section>

          {/* Section 5: Contact Us */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              5. Enquiries
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              For questions regarding our use of cookies or privacy practices, please contact our team at{" "}
              <a href="mailto:info@johnstayteservices.co.uk" className="text-red-600 underline font-semibold">
                info@johnstayteservices.co.uk
              </a>{" "}
              or call +44 (0)1453 822859.
            </p>
          </section>

          <div className="pt-6 flex items-center justify-between">
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5">
              <Link to="/">
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full text-xs font-semibold">
              <Link to="/privacy-policy">View Privacy Policy</Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
