import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, Mail, Phone, MapPin, FileText, ArrowLeft, CheckCircle2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | John Stayte Services" },
      {
        name: "description",
        content:
          "Read how John Stayte Services collects, uses, and safeguards your personal data in compliance with UK GDPR and the Data Protection Act 2018.",
      },
      { property: "og:title", content: "Privacy Policy | John Stayte Services" },
      {
        property: "og:description",
        content: "Transparent information about data privacy, storage, security and your rights as a John Stayte Services customer.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const lastUpdated = "5 November 2026";

  return (
    <SiteLayout>
      <PageHero
        eyebrow="LEGAL & DATA PROTECTION"
        title="Privacy Policy"
        subtitle="How we collect, manage, and safeguard your personal information across our website, delivery operations, and forecourt services."
      />

      <div className="container-page py-12 sm:py-16">
        <div className="max-w-4xl mx-auto space-y-10 text-left">
          {/* Quick Notice Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">UK Data Protection &amp; GDPR Commitment</p>
                <p className="text-xs text-slate-600">Last reviewed &amp; updated: {lastUpdated}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold">
                <Link to="/contact">Contact Data Officer</Link>
              </Button>
            </div>
          </div>

          {/* Section 1: Introduction & Data Controller */}
          <section className="space-y-3">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              1. Introduction &amp; Data Controller
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              John Stayte Services (WSM) Limited (&ldquo;JSS&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to respecting your privacy and protecting personal data collected through our website (
              <a href="https://www.johnstayteservices.co.uk" className="text-red-600 hover:underline font-medium">www.johnstayteservices.co.uk</a>), our telephone order desk, and our forecourt collection points.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              For the purposes of the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, the data controller is:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
              <p className="font-bold text-slate-900">John Stayte Services (WSM) Limited</p>
              <p>Company Registration Number: 00303703 (Registered in England and Wales)</p>
              <p>Registered Office: Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom</p>
              <p>VAT Registration: GB 207 610 984</p>
              <p>Data Protection Contact: <a href="mailto:info@johnstayteservices.co.uk" className="text-red-600 font-semibold underline">info@johnstayteservices.co.uk</a></p>
            </div>
          </section>

          {/* Section 2: Information We Collect */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              2. Information We Collect
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We collect only the personal information required to safely fulfill bottled gas deliveries, maintain Calor cylinder tracking records, process payments, and provide customer support. This includes:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Contact &amp; Identity Data
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full name, title, business name (if trade account), email address, and mobile/landline telephone number for dispatch updates.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Delivery &amp; Forecourt Data
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Residential or site delivery addresses, access instructions, selected collection forecourt, delivery signatures, and delivery handover OTP records.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Order &amp; Cylinder Traceability
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Product selections, cylinder sizes, exchange quantities, Calor refill agreements, and historical invoices for statutory accounting.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Technical &amp; Device Data
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  IP address, browser type, operating system, and essential session identifiers strictly used for fraud detection and checkout reliability.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: How Customer Information is Used */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              3. How We Use Your Information
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We process your personal information under lawful bases specified by UK GDPR, including contract performance, legal obligations, and legitimate commercial interests:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
              <li>
                <strong>Order Fulfilment:</strong> Routing delivery vehicles across Gloucestershire, verifying delivery access, sending SMS one-time delivery passcodes (OTP), and completing forecourt handovers.
              </li>
              <li>
                <strong>Cylinder Safety &amp; Compliance:</strong> Managing refill agreements and mandatory cylinder return tracking in accordance with UK LPG safety codes and our Calor Gas principal dealership agreement.
              </li>
              <li>
                <strong>Payment &amp; Billing:</strong> Authorising secure payments via our PCI-DSS compliant payment gateway, issuing VAT invoices, and managing approved 30-day trade credit accounts.
              </li>
              <li>
                <strong>Customer Support:</strong> Responding to enquiries, handling cylinder replacements, and notifying you of seasonal weather or bank holiday delivery schedule alterations.
              </li>
              <li>
                <strong>Legal &amp; Tax Obligations:</strong> Retaining financial transactions and VAT records for the statutory 6-year period required by HMRC.
              </li>
            </ul>
          </section>

          {/* Section 4: Data Storage, Security & Retention */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              4. Data Storage, Security &amp; Retention
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We take information security seriously. All web communications are transmitted over encrypted Transport Layer Security (TLS/HTTPS). Database storage utilizes encrypted-at-rest storage with strict Row-Level Security (RLS) policies that isolate customer records.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              We never store full debit or credit card numbers on our servers. Payment tokenisation is handled directly by our certified UK payment provider.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Personal data is retained only for as long as necessary to provide ongoing fuel supplies, administer trade accounts, and meet statutory tax, legal, and safety requirements.
            </p>
          </section>

          {/* Section 5: Third-Party Processors */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              5. Third-Party Service Providers
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We do not sell, rent, or trade your personal information. We share data only with trusted service partners under strict data processing agreements:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
              <li><strong>Calor Gas plc:</strong> For cylinder ownership records, regulatory safety compliance, and refill agreement registers.</li>
              <li><strong>Payment Processors:</strong> PCI-DSS compliant UK banking gateway providers for encrypted card authentication.</li>
              <li><strong>SMS Providers (Twilio):</strong> Strictly to transmit delivery notifications and verification one-time passcodes (OTP).</li>
              <li><strong>Infrastructure Hosting:</strong> UK and EU cloud servers maintaining enterprise physical and technical security certifications.</li>
            </ul>
          </section>

          {/* Section 6: Customer Privacy Rights */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              6. Your Legal Privacy Rights
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Under UK data protection law, you have specific rights regarding your personal information:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Right of Access</span>
                Request a copy of the personal information we hold about you.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Right to Rectification</span>
                Request correction of inaccurate or incomplete details.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Right to Erasure</span>
                Request deletion of data where retention is no longer legally required.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Right to Restrict or Object</span>
                Object to or limit how your data is processed in certain circumstances.
              </div>
            </div>
            <p className="text-xs text-slate-500 pt-2">
              To exercise any of these rights, please contact our team in writing. We respond to all verified requests within 30 days. You also have the right to lodge a complaint with the UK Information Commissioner&apos;s Office (ICO) at{" "}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-red-600 underline">ico.org.uk</a>.
            </p>
          </section>

          {/* Section 7: Contact Information */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              7. Privacy Enquiries &amp; Contact Information
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              If you have any questions about this Privacy Policy, your rights, or our data handling practices, please contact us:
            </p>
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2 text-xs sm:text-sm">
              <p className="font-bold text-white text-base">John Stayte Services – Privacy &amp; Data Administration</p>
              <p className="flex items-center gap-2 text-slate-300">
                <Mail className="h-4 w-4 text-red-400" /> Email:{" "}
                <a href="mailto:info@johnstayteservices.co.uk" className="text-white hover:underline">
                  info@johnstayteservices.co.uk
                </a>
              </p>
              <p className="flex items-center gap-2 text-slate-300">
                <Phone className="h-4 w-4 text-red-400" /> Telephone: +44 (0)1453 822859
              </p>
              <p className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-red-400" /> Address: Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom
              </p>
              <p className="text-slate-400 text-xs pt-1">
                Office Hours: Monday–Friday 8:00–17:00 · Saturday 8:30–12:30
              </p>
            </div>
          </section>

          <div className="pt-6 flex items-center justify-between">
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5">
              <Link to="/">
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full text-xs font-semibold">
              <Link to="/terms">View Terms &amp; Conditions</Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
