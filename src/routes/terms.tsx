import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ArrowLeft, ShieldCheck, Truck, Scale, AlertTriangle, Phone, Mail } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | John Stayte Services" },
      {
        name: "description",
        content:
          "Trading terms and conditions for ordering bottled Calor gas, solid fuel, animal feed and outdoor equipment from John Stayte Services.",
      },
      { property: "og:title", content: "Terms & Conditions | John Stayte Services" },
      {
        property: "og:description",
        content: "Transparent conditions of sale, delivery policies, cylinder exchange rules, and customer guarantees.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const lastUpdated = "5 November 2026";

  return (
    <SiteLayout>
      <PageHero
        eyebrow="TRADING CONDITIONS &amp; SALE"
        title="Terms &amp; Conditions"
        subtitle="The terms and conditions governing product sales, bottled gas supply, forecourt Click &amp; Collect, and deliveries across Gloucestershire."
      />

      <div className="container-page py-12 sm:py-16">
        <div className="max-w-4xl mx-auto space-y-10 text-left">
          {/* Header Summary Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Commercial &amp; Consumer Trading Terms</p>
                <p className="text-xs text-slate-600">Applicable to all orders placed online, by phone, or at forecourts · Reviewed {lastUpdated}</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold shrink-0">
              <Link to="/refund-policy">Refund &amp; Cancellations</Link>
            </Button>
          </div>

          {/* Section 1: Information About Us */}
          <section className="space-y-3">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              1. Information About Us
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              1.1 <strong>John Stayte Services (WSM) Limited</strong> (&ldquo;JSS&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is a company registered in England and Wales under company number <strong>00303703</strong>. Our registered office is located at:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
              <p className="font-bold text-slate-900">John Stayte Services (WSM) Limited</p>
              <p>Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom</p>
              <p>VAT Registration Number: GB 207 610 984</p>
              <p>General Enquiries: <a href="mailto:info@johnstayteservices.co.uk" className="text-red-600 font-semibold underline">info@johnstayteservices.co.uk</a> · Telephone: +44 (0)1453 822859</p>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              1.2 John Stayte Services is an authorised principal dealer for <strong>Calor Gas plc</strong>, supplying domestic, commercial, and agricultural LPG cylinders since 1972.
            </p>
          </section>

          {/* Section 2: Account Registration & User Status */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              2. Account Usage &amp; Customer Status
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              2.1 By placing an order through our website or creating an online account, you warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
              <li>You are legally capable of entering into binding contracts under the laws of England and Wales.</li>
              <li>You are at least 18 years of age.</li>
              <li>You are ordering for delivery within our verified delivery postcodes in Gloucestershire and immediate surrounding areas, or for collection from one of our designated forecourts.</li>
              <li>The information provided during registration and checkout is accurate, current, and complete.</li>
            </ul>
            <p className="text-sm text-slate-700 leading-relaxed">
              2.2 You are responsible for maintaining the confidentiality of your account credentials and password. Please notify us immediately if you suspect unauthorised access to your account.
            </p>
          </section>

          {/* Section 3: Product Orders & Contract Formation */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              3. Product Orders &amp; Contract Formation
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              3.1 Placing an order constitutes an offer to purchase the specified goods. After placing an order online, you will receive an automated confirmation email with your order summary and invoice reference.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              3.2 The contract between you and JSS is formed when we dispatch the order for delivery or confirm that the goods are ready for forecourt collection.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              3.3 All orders are subject to stock availability. In the rare event that an item or cylinder size is temporarily out of stock, we will contact you promptly (normally within 24–48 hours) to offer a suitable alternative, a revised delivery schedule, or a full refund.
            </p>
          </section>

          {/* Section 4: Pricing & Payments */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              4. Pricing &amp; Payment Methods
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              4.1 All prices quoted on our consumer website include UK Value Added Tax (VAT) at the prevailing rate, unless explicitly marked as Exclusive of VAT (for commercial trade accounts).
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              4.2 We accept major UK credit and debit cards processed through our secure, encrypted UK banking gateway. We do not store cardholder security codes or full card numbers on our servers.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              4.3 <strong>Commercial Trade Accounts:</strong> Approved commercial and agricultural customers may settle via 30-day invoice credit terms, subject to credit checks and depot management approval. Payment is due strictly within 30 days of invoice date.
            </p>
          </section>

          {/* Section 5: Delivery & Forecourt Click & Collect */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              5. Delivery &amp; Forecourt Collection
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              5.1 <strong>Doorstep Delivery:</strong> We operate a regional fleet delivering across Gloucestershire and surrounding areas according to set geographical delivery days (e.g. Gloucester, Cheltenham, Stroud, Cotswolds, Cirencester, Dursley).
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              5.2 <strong>Delivery Access:</strong> Customers must ensure safe, clear vehicular and pedestrian access to the delivery location. Our drivers are trained to transport and position cylinders safely. For safety and security, high-value or hazardous fuel deliveries require customer verification via signature or SMS one-time passcode (OTP).
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              5.3 <strong>Click &amp; Collect:</strong> Orders designated for forecourt Click &amp; Collect must be collected from the selected branch (Eastington Depot, Gloucester Forecourt, Bridge 76 Cirencester, or Wild Goose BP) during operating hours. Staff will perform an OTP or order reference verification and verify empty cylinder returns at handover.
            </p>
          </section>

          {/* Section 6: Calor Cylinder Refill Agreement & Gas Safety */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              6. Calor Cylinder Refill Agreement &amp; Safety Compliance
            </h2>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" /> Important Gas Cylinder Terms
              </div>
              <p>
                Calor Gas cylinders remain the property of <strong>Calor Gas plc</strong> at all times. When you purchase cylinder gas without returning an equivalent empty cylinder in the same group, a standard non-refundable Calor Cylinder Refill Agreement charge is applied.
              </p>
              <p>
                Cylinders may only be refilled by Calor Gas plc. It is illegal and hazardous for third parties to attempt refilling Calor cylinders.
              </p>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              6.1 Customers must comply with all Calor safety instructions and the Gas Safety (Installation and Use) Regulations 1998. Permanent gas appliances must be installed and inspected by an LPG-qualified Gas Safe registered engineer.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              6.2 Gas cylinders must always be stored and transported in an upright, well-ventilated position, away from sources of ignition, heat, and drains.
            </p>
          </section>

          {/* Section 7: Cancellations & Returns */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              7. Cancellations &amp; Consumer Rights
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              7.1 Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, consumer buyers have the statutory right to cancel an order within 14 days of receiving the goods.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              7.2 Full details regarding return eligibility, faulty product procedures, and refund timeframes are set out in our dedicated{" "}
              <Link to="/refund-policy" className="text-red-600 underline font-semibold">
                Refund &amp; Cancellation Policy
              </Link>.
            </p>
          </section>

          {/* Section 8: Liability & Governing Law */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              8. Limitation of Liability &amp; Governing Law
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              8.1 Nothing in these terms excludes or limits our liability for death or personal injury arising from our negligence, fraudulent misrepresentation, or any liability which cannot be excluded under UK law.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              8.2 Subject to clause 8.1, we are not liable for any business losses, loss of revenue, loss of goodwill, or indirect damages resulting from delayed deliveries due to severe adverse weather, road closures, or external supply chain disruptions beyond our reasonable control.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              8.3 These terms and any dispute arising out of or in connection with them shall be governed by and construed in accordance with the <strong>laws of England and Wales</strong>. Both parties submit to the exclusive jurisdiction of the English courts.
            </p>
          </section>

          {/* Section 9: Customer Support & Enquiries */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              9. Contact &amp; Enquiries
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              If you have any questions regarding these terms, our commercial agreements, or your rights, our customer desk is happy to help:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 space-y-1.5">
              <p><strong>Telephone:</strong> +44 (0)1453 822859 (Mon–Fri 8:00–17:00 · Sat 8:30–12:30)</p>
              <p><strong>Email:</strong> <a href="mailto:info@johnstayteservices.co.uk" className="text-red-600 underline">info@johnstayteservices.co.uk</a></p>
              <p><strong>Postal Address:</strong> John Stayte Services, Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH</p>
            </div>
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
