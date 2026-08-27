import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs as defaultFaqs } from "@/data/catalog";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Contact & FAQ | John Stayte Services" },
      { name: "description", content: "Call, email or message John Stayte Services. Opening hours, location and answers to common gas delivery questions." },
      { property: "og:title", content: "Contact John Stayte Services" },
      { property: "og:description", content: "Get in touch about gas, fuel, deliveries and trade accounts." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(5, "Tell us a little more").max(1000),
});

function Contact() {
  const [faqsList, setFaqsList] = useState<any[]>(defaultFaqs);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const { data } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "faqs_data")
          .maybeSingle();

        let local: any[] = [];
        try {
          const stored = localStorage.getItem("jss_admin_faqs");
          if (stored) local = JSON.parse(stored);
        } catch {}

        if (data?.content) {
          try {
            const parsed = JSON.parse(data.content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const activeOnly = parsed.filter((item) => item.is_active !== false);
              if (activeOnly.length > 0) {
                setFaqsList(activeOnly.map((f) => ({ q: f.q || f.question, a: f.a || f.answer })));
                return;
              }
            }
          } catch {}
        }

        if (local.length > 0) {
          const activeOnly = local.filter((item) => item.is_active !== false);
          if (activeOnly.length > 0) {
            setFaqsList(activeOnly.map((f) => ({ q: f.q || f.question, a: f.a || f.answer })));
          }
        }
      } catch (err) {
        console.error("Failed to load FAQs from Supabase:", err);
      }
    }
    loadFaqs();

    const handleUpdate = () => loadFaqs();
    window.addEventListener("cms_faqs_updated", handleUpdate);
    return () => window.removeEventListener("cms_faqs_updated", handleUpdate);
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSubmitting(true);
    try {
      // 1. Create enquiry in support_tickets or cms_content_blocks
      const ticketNumber = `ENQ-${Date.now().toString().slice(-6)}`;
      const enquiryRecord = {
        id: `enq-${Date.now()}`,
        ticketNumber,
        customerName: parsed.data.name,
        customerEmail: parsed.data.email,
        customerPhone: "",
        subject: `Website Contact Enquiry: ${parsed.data.message.slice(0, 40)}...`,
        category: "General",
        priority: "Medium",
        status: "Open",
        created: new Date().toISOString(),
        lastUpdated: "Just now",
        messages: [
          {
            sender: parsed.data.name,
            role: "Customer",
            timestamp: new Date().toISOString(),
            text: parsed.data.message,
          },
        ],
      };

      // Try inserting into support_tickets table
      try {
        await supabase.from("support_tickets").insert({
          ticket_number: ticketNumber,
          customer_name: parsed.data.name,
          customer_email: parsed.data.email,
          subject: "Website Contact Form Enquiry",
          description: parsed.data.message,
          category: "General",
          priority: "Medium",
          status: "Open",
        });
      } catch {
        /* fallback to block */
      }

      // Persist to enquiries_data CMS block
      try {
        const { data: existingBlock } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "enquiries_data")
          .maybeSingle();

        let currentList = [];
        if (existingBlock?.content) {
          try {
            currentList = JSON.parse(existingBlock.content);
          } catch {
            currentList = [];
          }
        }
        const updatedList = [enquiryRecord, ...(Array.isArray(currentList) ? currentList : [])];
        await supabase.from("cms_content_blocks").upsert({
          section_key: "enquiries_data",
          title: "Customer & Manager Enquiries",
          content: JSON.stringify(updatedList),
        }, { onConflict: "section_key" });
      } catch {
        /* continue */
      }

      toast.success("Thanks — we'll be in touch shortly.");
      form.reset();
    } catch (err: any) {
      console.error("Enquiry submission error:", err);
      toast.success("Thanks — we'll be in touch shortly.");
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      {/* 1. HERO SECTION */}
      <section className="border-b border-slate-200/60 bg-[#f8fafc]/70 py-8 sm:py-10 lg:py-12">
        <div className="container-page text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200/90 bg-red-50/80 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs backdrop-blur-xs mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>CONTACT</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
            Talk to the team
          </h1>
          <p className="mt-2.5 max-w-2xl text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Deliveries, trade accounts, appliance advice — we're happy to help.
          </p>
        </div>
      </section>

      {/* 2. MAIN CONTACT AREA */}
      <div className="container-page py-10 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_420px] gap-8 items-start">
          {/* 3. CONTACT FORM CARD */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 lg:p-10">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Send an enquiry
              </h2>
              <div className="h-1 w-10 bg-primary rounded-full mt-2" />
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                    Name *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    maxLength={100}
                    required
                    placeholder="Your full name"
                    className="h-11 sm:h-12 rounded-xl border-slate-200/90 focus-visible:ring-primary/20 bg-slate-50/50 hover:bg-white text-sm sm:text-base transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    maxLength={255}
                    required
                    placeholder="name@example.co.uk"
                    className="h-11 sm:h-12 rounded-xl border-slate-200/90 focus-visible:ring-primary/20 bg-slate-50/50 hover:bg-white text-sm sm:text-base transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  Message *
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  maxLength={1000}
                  required
                  rows={5}
                  placeholder="How can we help you?"
                  className="rounded-xl border-slate-200/90 focus-visible:ring-primary/20 bg-slate-50/50 hover:bg-white text-sm sm:text-base p-3.5 sm:p-4 transition-colors"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="rounded-xl px-8 sm:px-10 h-11 sm:h-12 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_22px_rgba(220,38,38,0.35)] hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Send enquiry
                </Button>
              </div>
            </form>
          </div>

          {/* 5. CONTACT INFORMATION CARD */}
          <aside className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display mb-2">
                Contact information
              </h2>
              <div className="h-1 w-10 bg-primary rounded-full mb-6" />

              <ul className="space-y-4 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="h-4.5 w-4.5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Phone</span>
                    <a href="tel:01452741234" className="font-extrabold text-slate-900 text-sm sm:text-base hover:text-primary transition-colors">
                      01452 741234
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="h-4.5 w-4.5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Email</span>
                    <a href="mailto:sales@johnstayte.co.uk" className="font-extrabold text-slate-900 text-sm sm:text-base hover:text-primary transition-colors">
                      sales@johnstayte.co.uk
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-4.5 w-4.5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Address</span>
                    <span className="font-bold text-slate-800 leading-snug">
                      Fromebridge, Whitminster, Gloucester GL2 7PD
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4.5 w-4.5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Opening Hours</span>
                    <span className="font-bold text-slate-800 leading-snug">
                      Mon–Sat 7:00–20:00 · Sun 8:00–18:00
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            {/* 6. MAP */}
            <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs bg-slate-100 mt-2">
              <iframe
                title="Our location"
                className="h-52 sm:h-60 w-full border-0"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-2.42%2C51.74%2C-2.30%2C51.80&layer=mapnik"
              />
            </div>
          </aside>
        </div>
      </div>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <div className="container-page pb-16 sm:pb-20">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Frequently asked questions
          </h2>
          <div className="h-1 w-12 bg-primary rounded-full mt-2" />
        </div>

        <Accordion type="single" collapsible className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] px-6 sm:px-8 divide-y divide-slate-100">
          {faqsList.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-b-0 py-1">
              <AccordionTrigger className="text-left font-extrabold text-slate-900 text-sm sm:text-base hover:text-primary transition-colors py-4">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-xs sm:text-sm leading-relaxed pb-4">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SiteLayout>
  );
}
