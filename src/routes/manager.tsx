import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DashShell, StatCard, StatusPill } from "@/components/dash/DashShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customersList, lowStock, orders, salesByMonth } from "@/data/ops";
import { products } from "@/data/catalog";
import { gbp } from "@/lib/store";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Manager Portal | John Stayte Services" },
      { name: "description", content: "Manager dashboard for order approval, deliveries, inventory and customer enquiries." },
      { property: "og:title", content: "Manager Portal | John Stayte Services" },
      { property: "og:description", content: "Approve orders, schedule deliveries and manage stock." },
    ],
  }),
  component: Manager,
});

function Manager() {
  const pending = orders.filter((o) => o.status === "Pending");
  return (
    <DashShell role="manager" title="Manager portal" subtitle="Approve orders, schedule deliveries and keep stock topped up.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's orders" value={String(orders.length)} />
        <StatCard label="Pending approval" value={String(pending.length)} />
        <StatCard label="Out for delivery" value={String(orders.filter((o) => o.status === "Out for Delivery").length)} />
        <StatCard label="Low stock alerts" value={String(lowStock.length)} />
      </div>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="flex-wrap rounded-full">
          {["orders", "deliveries", "inventory", "customers", "reports"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="orders" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Area</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-bold">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell>{o.area}</TableCell>
                  <TableCell>{gbp(o.total)}</TableCell>
                  <TableCell><StatusPill status={o.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => toast.success(`${o.id} approved`)}>Approve</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {orders.filter((o) => o.driver).map((o) => (
            <div key={o.id} className="surface-card p-5">
              <div className="flex items-center justify-between"><p className="font-bold">{o.id}</p><StatusPill status={o.status} /></div>
              <p className="mt-2 text-sm text-muted-foreground">{o.customer} · {o.area}</p>
              <p className="mt-1 text-sm">Driver: <strong>{o.driver}</strong> · {o.date}</p>
              <Button size="sm" variant="outline" className="mt-4 rounded-full" onClick={() => toast.success("Delivery note sent to printer")}>Print delivery note</Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="inventory" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {products.slice(0, 14).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="capitalize">{p.category.replace("-", " ")}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell className={p.stock < 10 ? "font-bold text-primary" : "text-success"}>{p.stock < 10 ? "Low" : "Healthy"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="customers" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Email</TableHead><TableHead>Orders</TableHead><TableHead>Spend</TableHead></TableRow></TableHeader>
            <TableBody>
              {customersList.map((c) => (
                <TableRow key={c.email}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{c.orders}</TableCell>
                  <TableCell>{gbp(c.spend)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="reports" className="surface-card mt-4 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {salesByMonth.slice(-3).map((m) => (
              <div key={m.month} className="rounded-2xl bg-surface p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">{m.month}</p>
                <p className="mt-1 font-display text-xl font-extrabold">{gbp(m.revenue)}</p>
                <p className="text-xs text-muted-foreground">{m.orders} orders</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashShell>
  );
}
