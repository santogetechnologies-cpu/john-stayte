import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Sign In or Register | John Stayte Services" },
      { name: "description", content: "Sign in to your John Stayte Services account to track orders, download invoices and reorder gas." },
      { property: "og:title", content: "Sign In | John Stayte Services" },
      { property: "og:description", content: "Access your customer, manager or admin dashboard." },
    ],
  }),
  component: LoginPage,
});

const demos = [
  { role: "Customer", email: "customer@jss.com" },
  { role: "Manager", email: "manager@jss.com" },
  { role: "Admin", email: "admin@jss.com" },
];

function LoginPage() {
  const { login, register } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("customer@jss.com");
  const [password, setPassword] = useState("123456");

  const go = (role: string) =>
    navigate({ to: role === "admin" ? "/admin" : role === "manager" ? "/manager" : "/account" });

  return (
    <SiteLayout>
      <PageHero eyebrow="Account" title="Sign in to your account" subtitle="Track orders, download invoices and reorder in one click." />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <Tabs defaultValue="signin" className="surface-card p-7">
          <TabsList className="w-full rounded-full">
            <TabsTrigger value="signin" className="flex-1 rounded-full">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1 rounded-full">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" asChild>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = login(email, password);
                if (!res.ok || !res.user) return toast.error(res.error ?? "Login failed");
                toast.success(`Welcome back, ${res.user.name}`);
                go(res.user.role);
              }}
            >
              <div><Label htmlFor="e">Email</Label><Input id="e" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="p">Password</Label><Input id="p" type="password" value={password} onChange={(ev) => setPassword(ev.target.value)} className="mt-1.5 rounded-full" /></div>
              <Button type="submit" size="lg" className="w-full rounded-full">Sign in</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" asChild>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = String(fd.get("name") ?? "").trim();
                const mail = String(fd.get("email") ?? "").trim();
                if (name.length < 2 || !mail.includes("@")) return toast.error("Check your details.");
                register(name, mail);
                toast.success("Account created");
                navigate({ to: "/account" });
              }}
            >
              <div><Label htmlFor="n2">Full name</Label><Input id="n2" name="name" maxLength={100} required className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="e2">Email</Label><Input id="e2" name="email" type="email" maxLength={255} required className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="p2">Password</Label><Input id="p2" name="password" type="password" minLength={6} required className="mt-1.5 rounded-full" /></div>
              <Button type="submit" size="lg" className="w-full rounded-full">Create account</Button>
            </form>
          </TabsContent>
        </Tabs>

        <aside className="surface-card h-fit p-7">
          <h2 className="font-extrabold">Demo accounts</h2>
          <p className="mt-2 text-sm text-muted-foreground">Password for all three: <strong>123456</strong></p>
          <div className="mt-4 grid gap-2">
            {demos.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => { setEmail(d.email); setPassword("123456"); }}
                className="flex items-center justify-between rounded-2xl border p-4 text-left text-sm transition-colors hover:border-primary"
              >
                <span className="font-bold">{d.role}</span>
                <span className="text-muted-foreground">{d.email}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
