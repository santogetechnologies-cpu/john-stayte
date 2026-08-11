import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashShell, StatCard, StatusPill } from "@/components/dash/DashShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditLogs, categoryPerformance, customersList, managers, orders, salesByMonth } from "@/data/ops";
import { products, categories, stations } from "@/data/catalog";
import { gbp } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Admin ERP Dashboard | John Stayte Services" },
      { name: "description", content: "Admin control centre: revenue, orders, products, inventory, managers, CMS and audit logs." },
      { property: "og:title", content: "Admin Dashboard | John Stayte Services" },
      { property: "og:description", content: "Full ERP control of the JSS platform." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const revenue = salesByMonth.reduce((s, m) => s + m.revenue, 0);
  return (
    <DashShell role="admin" title="Admin dashboard" subtitle="Revenue, operations, catalogue and content — all in one control centre.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue YTD" value={gbp(revenue)} hint="+16% vs last year" />
        <StatCard label="Orders" value={String(salesByMonth.reduce((s, m) => s + m.orders, 0))} />
        <StatCard label="Products" value={String(products.length)} />
        <StatCard label="Customers" value={String(customersList.length * 42)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="font-extrabold">Revenue trend</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface-card p-6">
          <h2 className="font-extrabold">Category performance</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="flex-wrap rounded-full">
          {["orders", "products", "managers", "customers", "stations", "cms", "audit"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="orders" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-bold">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell>{gbp(o.total)}</TableCell>
                  <TableCell><StatusPill status={o.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="products" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead></TableRow></TableHeader>
            <TableBody>
              {products.slice(0, 16).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="capitalize">{p.category.replace("-", " ")}</TableCell>
                  <TableCell>{gbp(p.price)}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="managers" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Manager</TableHead><TableHead>Area</TableHead><TableHead>Orders</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {managers.map((m) => (
                <TableRow key={m.email}>
                  <TableCell className="font-semibold">{m.name}</TableCell>
                  <TableCell>{m.area}</TableCell>
                  <TableCell>{m.orders}</TableCell>
                  <TableCell>{m.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="customers" className="surface-card mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Orders</TableHead><TableHead>Spend</TableHead><TableHead>Points</TableHead></TableRow></TableHeader>
            <TableBody>
              {customersList.map((c) => (
                <TableRow key={c.email}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell>{c.orders}</TableCell>
                  <TableCell>{gbp(c.spend)}</TableCell>
                  <TableCell>{c.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="stations" className="mt-4 grid gap-3 md:grid-cols-3">
          {stations.map((s) => (
            <div key={s.name} className="surface-card p-5">
              <p className="font-bold">{s.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.address}</p>
              <p className="mt-2 text-xs text-muted-foreground">{s.hours}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="cms" className="mt-4 grid gap-3 md:grid-cols-3">
          {["Homepage banner", "Hero slider", "Offers", "Blogs", "FAQs", "Footer & contact"].map((c) => (
            <div key={c} className="surface-card p-5">
              <p className="font-bold">{c}</p>
              <p className="mt-1 text-xs text-muted-foreground">Editable content block</p>
            </div>
          ))}
          <div className="surface-card p-5">
            <p className="font-bold">Categories</p>
            <p className="mt-1 text-xs text-muted-foreground">{categories.length} live categories</p>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="surface-card mt-4 p-6">
          {auditLogs.map((l, i) => (
            <div key={i} className="border-b py-3 last:border-0">
              <p className="text-sm font-semibold">{l.action}</p>
              <p className="text-xs text-muted-foreground">{l.actor} · {l.time}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </DashShell>
  );
}
