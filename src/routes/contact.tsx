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

  useEffect(() => {
    async function loadFaqs() {
      try {
        const { data } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "faqs_data")
          .maybeSingle();

        if (data?.content) {
          const parsed = JSON.parse(data.content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const activeOnly = parsed.filter((item) => item.is_active !== false);
            if (activeOnly.length > 0) {
              setFaqsList(activeOnly.map((f) => ({ q: f.q || f.question, a: f.a || f.answer })));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load FAQs from Supabase:", err);
      }
    }
    loadFaqs();
  }, []);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    toast.success("Thanks — we'll be in touch shortly.");
    e.currentTarget.reset();
  };

  return (
    <SiteLayout>
      <PageHero eyebrow="Contact" title="Talk to the team" subtitle="Deliveries, trade accounts, appliance advice — we're happy to help." />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={submit} className="surface-card space-y-4 p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="name">Name</Label><Input id="name" name="name" maxLength={100} required className="mt-1.5 rounded-full" /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" maxLength={255} required className="mt-1.5 rounded-full" /></div>
          </div>
          <div><Label htmlFor="message">Message</Label><Textarea id="message" name="message" maxLength={1000} required rows={6} className="mt-1.5 rounded-2xl" /></div>
          <Button type="submit" size="lg" className="rounded-full px-8">Send enquiry</Button>
        </form>
        <aside className="surface-card h-fit space-y-3 p-7 text-sm">
          <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" /> 01452 741234</p>
          <p className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-primary" /> sales@johnstayte.co.uk</p>
          <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /> Fromebridge, Whitminster, Gloucester GL2 7PD</p>
          <p className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-primary" /> Mon–Sat 7:00–20:00 · Sun 8:00–18:00</p>
          <div className="overflow-hidden rounded-2xl border">
            <iframe title="Our location" className="h-56 w-full" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=-2.42%2C51.74%2C-2.30%2C51.80&layer=mapnik" />
          </div>
        </aside>
      </div>
      <div className="container-page pb-16">
        <h2 className="mb-6 text-2xl font-extrabold">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="surface-card px-6">
          {faqsList.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left font-bold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SiteLayout>
  );
}
