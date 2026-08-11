import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { DashShell, StatCard, StatusPill } from "@/components/dash/DashShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notifications, orders, tickets } from "@/data/ops";
import { gbp, findProduct, useStore } from "@/lib/store";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "My Account | John Stayte Services" },
      { name: "description", content: "Your JSS customer dashboard: orders, invoices, addresses, wishlist and support tickets." },
      { property: "og:title", content: "My Account | John Stayte Services" },
      { property: "og:description", content: "Track orders, download invoices and reorder." },
    ],
  }),
  component: Account,
});

function Account() {
  const { wishlist, addToCart } = useStore();
  const mine = orders.filter((o) => o.email === "customer@jss.com");

  return (
    <DashShell role="customer" title="My account" subtitle="Orders, invoices, addresses and wishlist in one place.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders" value={String(mine.length)} />
        <StatCard label="Lifetime spend" value={gbp(mine.reduce((s, o) => s + o.total, 0))} />
        <StatCard label="Loyalty points" value="320" hint="+40 this month" />
        <StatCard label="Wishlist" value={String(wishlist.length)} />
      </div>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="flex-wrap rounded-full">
          {["orders", "invoices", "addresses", "wishlist", "notifications", "support"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="orders" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {mine.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-bold">{o.id}</TableCell>
                  <TableCell>{o.date}</TableCell>
                  <TableCell>{gbp(o.total)}</TableCell>
                  <TableCell><StatusPill status={o.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => toast.success(`${o.id} added to basket again`)}>
                      <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Reorder
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="invoices" className="surface-card mt-4 space-y-2 p-6">
          {mine.map((o) => (
            <div key={o.id} className="flex items-center justify-between border-b py-3 last:border-0">
              <span className="text-sm font-semibold">Invoice {o.id} · {gbp(o.total)}</span>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => toast.success("Invoice PDF generated")}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="addresses" className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            { l: "Home", a: "12 Meadow Lane, Frampton on Severn, GL2 7EP" },
            { l: "Workshop", a: "Unit 4, Bristol Road, Cambridge, GL2 7AL" },
          ].map((ad) => (
            <div key={ad.l} className="surface-card p-6">
              <p className="font-bold">{ad.l}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ad.a}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="wishlist" className="mt-4 grid gap-3 sm:grid-cols-2">
          {wishlist.length === 0 && <p className="text-sm text-muted-foreground">Nothing saved yet.</p>}
          {wishlist.map((slug) => {
            const p = findProduct(slug);
            if (!p) return null;
            return (
              <div key={slug} className="surface-card flex items-center gap-4 p-4">
                <img src={p.image} alt="" className="h-16 w-16 rounded-xl bg-surface object-contain p-1" loading="lazy" />
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{p.name}</p><p className="text-sm text-muted-foreground">{gbp(p.price)}</p></div>
                <Button size="sm" className="rounded-full" onClick={() => { addToCart(slug); toast.success("Added to basket"); }}>Add</Button>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="notifications" className="surface-card mt-4 p-6">
          {notifications.map((n) => (
            <div key={n.title} className="border-b py-3 last:border-0">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.time}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="support" className="surface-card mt-4 p-6">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b py-3 last:border-0">
              <span className="text-sm font-semibold">{t.id} · {t.subject}</span>
              <span className="text-xs text-muted-foreground">{t.status} · {t.updated}</span>
            </div>
          ))}
          <Button asChild className="mt-4 rounded-full"><Link to="/contact">New enquiry</Link></Button>
        </TabsContent>
      </Tabs>
    </DashShell>
  );
}
