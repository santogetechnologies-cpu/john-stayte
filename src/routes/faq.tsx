import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HelpCircle,
  Truck,
  Flame,
  CreditCard,
  RefreshCw,
  Phone,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  ArrowRight,
} from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COMPREHENSIVE_FAQS } from "@/data/faqs";

export { COMPREHENSIVE_FAQS };

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions (FAQ) | John Stayte Services" },
      {
        name: "description",
        content:
          "Find answers to common questions about ordering bottled Calor gas, doorstep delivery across Gloucestershire, Click & Collect forecourt collection, and cylinder exchanges.",
      },
      { property: "og:title", content: "Frequently Asked Questions (FAQ) | John Stayte Services" },
      {
        property: "og:description",
        content: "Clear answers on gas deliveries, cylinder exchanges, trade credit accounts, and customer support.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredCategories = COMPREHENSIVE_FAQS.map((cat) => {
    const matchingQs = cat.questions.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCategory === "All" || cat.category === activeCategory;
      return matchesSearch && matchesCat;
    });
    return {
      ...cat,
      questions: matchingQs,
    };
  }).filter((cat) => cat.questions.length > 0);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="HELP &amp; CUSTOMER SUPPORT"
        title="Frequently Asked Questions"
        subtitle="Clear answers on ordering bottled gas, regional deliveries, Click &amp; Collect forecourt collections, and cylinder exchanges."
      />

      <div className="container-page py-12 sm:py-16">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Search & Filter Bar */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search questions (e.g. delivery areas, cylinder swap, payment, collection)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 pr-4 rounded-full border-slate-300 bg-white text-slate-900 shadow-sm text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory("All")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activeCategory === "All"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Topics
              </button>
              {COMPREHENSIVE_FAQS.map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setActiveCategory(cat.category)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    activeCategory === cat.category
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat.category}
                </button>
              ))}
            </div>
          </div>

          {/* Accordion Questions */}
          {filteredCategories.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <HelpCircle className="h-10 w-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900">No matching questions found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try a different search keyword or contact our friendly customer desk directly for help.
              </p>
              <Button asChild size="sm" variant="outline" className="rounded-full text-xs font-semibold">
                <Link to="/contact">Contact Our Team</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div key={cat.category} className="space-y-3 text-left">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                      <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <h2 className="font-display font-extrabold text-lg text-slate-900 tracking-tight">
                        {cat.category}
                      </h2>
                    </div>

                    <Accordion type="single" collapsible className="space-y-2">
                      {cat.questions.map((item, idx) => (
                        <AccordionItem
                          key={idx}
                          value={`${cat.category}-${idx}`}
                          className="rounded-xl border border-slate-200 bg-white px-4 transition-colors hover:border-slate-300"
                        >
                          <AccordionTrigger className="text-left font-display font-bold text-sm text-slate-900 py-3.5 hover:no-underline hover:text-red-600">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed pb-4 pt-1">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}

          {/* Direct Support Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white text-left space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-lg text-white">Have a question not listed here?</h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Our friendly, knowledgeable team at Eastington depot is ready to assist with orders, cylinder advice, and commercial enquiries.
                </p>
              </div>
              <Button asChild size="sm" className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shrink-0">
                <Link to="/contact">Talk to the Team</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="h-4 w-4 text-red-400 shrink-0" />
                <span>+44 (0)1453 822859</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="h-4 w-4 text-red-400 shrink-0" />
                <span>Mon–Fri 8:00–17:00 · Sat 8:30–12:30</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-red-400 shrink-0" />
                <span>Eastington, Stonehouse, GL10 3AH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
