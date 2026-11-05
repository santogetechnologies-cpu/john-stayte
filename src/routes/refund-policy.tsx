import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, ArrowLeft, ShieldCheck, CheckCircle2, Phone, Mail, Clock, AlertTriangle, Truck } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy | John Stayte Services" },
      {
        name: "description",
        content:
          "Clear, fair refund, exchange, and cancellation terms for bottled gas, solid fuel, and equipment from John Stayte Services.",
      },
      { property: "og:title", content: "Refund & Cancellation Policy | John Stayte Services" },
      {
        property: "og:description",
        content: "Transparent consumer rights, 14-day cooling-off returns, faulty goods resolution, and cylinder exchange guidelines.",
      },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  const lastUpdated = "5 November 2026";

  return (
    <SiteLayout>
      <PageHero
        eyebrow="TRANSPARENT CUSTOMER CARE"
        title="Refund &amp; Cancellation Policy"
        subtitle="Our commitment to fair, dependable service: how cancellations, cylinder returns, and refunds are managed across Gloucestershire."
      />

      <div className="container-page py-12 sm:py-16">
        <div className="max-w-4xl mx-auto space-y-10 text-left">
          {/* Quick Summary Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Fair Customer Service Standards</p>
                <p className="text-xs text-slate-600">Compliant with the UK Consumer Rights Act 2015 · Last updated: {lastUpdated}</p>
              </div>
            </div>
            <Button asChild size="sm" className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shrink-0">
              <Link to="/contact">Need Assistance? Contact Us</Link>
            </Button>
          </div>

          {/* Section 1: Overview */}
          <section className="space-y-3">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              1. Overview &amp; Customer Commitment
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              At John Stayte Services, we have been delivering bottled Calor gas, fuels, and outdoor living equipment across Gloucestershire since 1972. We take pride in delivering dependable, safe, and transparent service.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              If an order needs to be altered, if an item arrives damaged, or if you change your mind, we aim to resolve the matter quickly and courteously in accordance with the <strong>Consumer Rights Act 2015</strong> and the <strong>Consumer Contracts Regulations 2013</strong>.
            </p>
          </section>

          {/* Section 2: Order Cancellations Before Dispatch */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              2. Order Cancellations Prior to Dispatch
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              If you wish to cancel an order before it has been dispatched on our delivery vehicle or prepared for forecourt collection:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
              <li>Please contact our order desk immediately on <strong>+44 (0)1453 822859</strong> during office hours.</li>
              <li>Alternatively, email <a href="mailto:info@johnstayteservices.co.uk" className="text-red-600 underline font-semibold">info@johnstayteservices.co.uk</a> quoting your order reference (e.g. `JSS-XXXXXX`).</li>
              <li>If the order has not yet been loaded onto our vehicles, we will cancel the order immediately and issue a 100% full refund to your original payment method.</li>
            </ul>
          </section>

          {/* Section 3: Statutory 14-Day Cooling-Off Period (Consumer Rights) */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              3. Statutory 14-Day Cooling-Off Period (Consumer Orders)
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Under UK law, consumer buyers have the legal right to cancel a contract for any reason within <strong>14 calendar days</strong>, beginning the day after the products are delivered or collected:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Eligible Return Items
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Unused appliances, gas regulators, sealed fittings, barbecue accessories, tools, and unopened bagged solid fuels in their original condition and packaging.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" /> Bottled Gas Cylinders
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cylinder gas can be returned provided the tamper-evident safety seal remains intact and untampered. Due to ADR hazardous goods transport regulations, gas cylinders must be collected by our licensed vehicles or returned directly to one of our authorised forecourts.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Customers have a duty of reasonable care while products remain in their possession. Cylinders must be stored safely in an upright, well-ventilated position.
            </p>
          </section>

          {/* Section 4: Damaged, Defective or Incorrect Products */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              4. Damaged, Defective, or Incorrect Products
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We carefully inspect cylinders and goods before dispatch. In the unlikely event that an item is damaged in transit, defective, or does not match your order:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
              <li>
                <strong>Report Promptly:</strong> Please notify our customer support team within <strong>48 hours</strong> of receipt by calling <strong>+44 (0)1453 822859</strong> or emailing photos/details to <a href="mailto:info@johnstayteservices.co.uk" className="text-red-600 underline">info@johnstayteservices.co.uk</a>.
              </li>
              <li>
                <strong>Free Collection or Swap:</strong> We will arrange a prompt, free collection or priority doorstep replacement on our next scheduled delivery route to your area.
              </li>
              <li>
                <strong>Full Refund:</strong> If you prefer a refund rather than a replacement, we will refund the full purchase price including any delivery charge originally paid.
              </li>
            </ol>
          </section>

          {/* Section 5: Cylinder Exchanges & Deposit Terms */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              5. Cylinder Exchanges &amp; Refill Agreements
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Calor Gas cylinders remain the permanent property of Calor Gas plc. Understanding how exchanges work ensures transparent billing:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
              <li>
                <strong>Standard Refill / Exchange:</strong> When you provide an empty cylinder within the same exchange category, you only pay for the gas refill.
              </li>
              <li>
                <strong>New Cylinder (No Exchange):</strong> If you do not have an empty cylinder to return, a standard Calor Cylinder Refill Agreement charge is applied to provide you with the cylinder.
              </li>
              <li>
                <strong>Empty Cylinder Discrepancy at Handover:</strong> If an order was placed as an exchange but no empty cylinder is available when the driver delivers (or at forecourt handover), the order cannot be completed until either the empty is provided or the new cylinder refill agreement difference is settled.
              </li>
            </ul>
          </section>

          {/* Section 6: Refund Processing & Timeframes */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              6. Refund Processing &amp; Timeframes
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Once a return has been received, inspected, or verified by our depot team:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-600" />
                <span className="font-bold text-slate-900">Processing Time:</span>
                <span>Refunds are initiated within <strong>2 to 5 business days</strong> of product inspection.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-slate-900">Payment Method:</span>
                <span>Refunds are credited directly to the original card or payment method used at checkout.</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-600" />
                <span className="font-bold text-slate-900">Trade Accounts:</span>
                <span>Credit adjustments for trade account holders are applied directly as a credit note against your monthly statement.</span>
              </div>
            </div>
          </section>

          {/* Section 7: Customer Support Contact */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              7. Customer Support &amp; Returns Enquiries
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Our customer service team is based at our Eastington depot and ready to assist you:
            </p>
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2 text-xs sm:text-sm">
              <p className="font-bold text-white text-base">John Stayte Services – Customer Order &amp; Returns Desk</p>
              <p className="text-slate-300">
                Telephone: <strong>+44 (0)1453 822859</strong> (Mon–Fri 8:00–17:00 · Sat 8:30–12:30)
              </p>
              <p className="text-slate-300">
                Email: <a href="mailto:info@johnstayteservices.co.uk" className="text-white hover:underline underline">info@johnstayteservices.co.uk</a>
              </p>
              <p className="text-slate-300">
                Depot Address: Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH
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
