import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import logo from "@/assets/image-5.png";
import { categories } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="John Stayte Services" className="h-10 w-10 rounded-xl" width={40} height={40} loading="lazy" />
            <span className="font-display text-lg font-extrabold">JOHN STAYTE SERVICES</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-ink-foreground/70">
            Family-run supplier of bottled gas, solid fuel, animal feed and outdoor living since 1972.
            Delivering across Gloucestershire.
          </p>
          <div className="mt-5 flex gap-2">
            {[Facebook, Instagram, Youtube, Mail].map((Icon, i) => (
              <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/75">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link to="/products" search={{ category: c.slug }} className="hover:text-primary">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Information</h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/75">
            <li><Link to="/about" className="hover:text-primary">About us</Link></li>
            <li><Link to="/services" className="hover:text-primary">Services</Link></li>
            <li><Link to="/filling-stations" className="hover:text-primary">Filling stations</Link></li>
            <li><Link to="/offers" className="hover:text-primary">Offers</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact & FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Newsletter</h4>
          <p className="mt-4 text-sm text-ink-foreground/75">Seasonal offers and fuel price updates.</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("You're subscribed to JSS updates.");
              (e.target as HTMLFormElement).reset();
            }}
          >
            <Input required type="email" placeholder="Email address" className="h-11 rounded-full border-white/15 bg-white/10 text-ink-foreground placeholder:text-ink-foreground/50" />
            <Button type="submit" className="h-11 rounded-full px-5">Join</Button>
          </form>
          <ul className="mt-6 space-y-2 text-sm text-ink-foreground/75">
            <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /> Whitminster, Gloucester GL2 7PD</li>
            <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" /> 01452 741234</li>
            <li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-primary" /> sales@johnstayte.co.uk</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} John Stayte Services. All rights reserved.</p>
          <p>Registered in England · VAT GB 123 4567 89</p>
        </div>
      </div>
    </footer>
  );
}
