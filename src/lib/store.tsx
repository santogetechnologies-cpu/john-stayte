import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products, type Product } from "@/data/catalog";
import { supabase } from "@/lib/supabase";

export type Role = "customer" | "manager" | "admin";
export type User = { id?: string; name: string; email: string; role: Role };

export type CartLine = { slug: string; qty: number };

type Store = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  register: (name: string, email: string, password: string, role?: Role) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  cart: CartLine[];
  addToCart: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  removeFromCart: (slug: string) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (slug: string) => void;
};

const StoreContext = createContext<Store | null>(null);

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded) localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, loaded]);
  return [value, setValue] as const;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = usePersisted<CartLine[]>("jss.cart", []);
  const [wishlist, setWishlist] = usePersisted<string[]>("jss.wishlist", []);

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    const fetchSessionUser = async (session: any) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setUser({
          id: session.user.id,
          name: profile?.full_name || session.user.email?.split("@")[0] || "Customer",
          email: session.user.email || "",
          role: (profile?.role as Role) || "customer",
        });
      } catch {
        setUser({
          id: session.user.id,
          name: session.user.email?.split("@")[0] || "Customer",
          email: session.user.email || "",
          role: "customer",
        });
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionUser(session);
    });

    // Auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionUser(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login: Store["login"] = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        const u: User = {
          id: data.user.id,
          name: profile?.full_name || data.user.email?.split("@")[0] || "Customer",
          email: data.user.email || email,
          role: (profile?.role as Role) || "customer",
        };
        setUser(u);
        return { ok: true, user: u };
      }

      return { ok: false, error: "Sign in failed" };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Authentication failed" };
    }
  }, []);

  const register: Store["register"] = useCallback(async (name, email, password, role = "customer") => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          },
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user) {
        const u: User = {
          id: data.user.id,
          name,
          email,
          role,
        };
        setUser(u);
        return { ok: true, user: u };
      }

      return { ok: false, error: "Registration failed" };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Registration error" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo<Store>(
    () => ({
      user,
      login,
      register,
      logout,
      cart,
      addToCart: (slug, qty = 1) =>
        setCart((c) =>
          c.some((l) => l.slug === slug)
            ? c.map((l) => (l.slug === slug ? { ...l, qty: l.qty + qty } : l))
            : [...c, { slug, qty }],
        ),
      setQty: (slug, qty) =>
        setCart((c) => c.map((l) => (l.slug === slug ? { ...l, qty: Math.max(1, qty) } : l))),
      removeFromCart: (slug) => setCart((c) => c.filter((l) => l.slug !== slug)),
      clearCart: () => setCart([]),
      wishlist,
      toggleWishlist: (slug) =>
        setWishlist((w) => (w.includes(slug) ? w.filter((s) => s !== slug) : [...w, slug])),
    }),
    [user, cart, wishlist, login, register, logout, setCart, setWishlist],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const findProduct = (slug: string): Product | undefined => products.find((p) => p.slug === slug);

export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

/**
 * Reconciles cart lines against live Supabase public.products database.
 * Automatically removes stale/deleted products from cart.
 */
export function useCartTotals() {
  const { cart, removeFromCart } = useStore();
  const [liveLines, setLiveLines] = useState<(CartLine & { product: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function reconcileCart() {
      if (cart.length === 0) {
        if (isMounted) {
          setLiveLines([]);
          setLoading(false);
        }
        return;
      }

      try {
        const slugs = cart.map((c) => c.slug);
        const { data: dbProducts } = await supabase
          .from("products")
          .select("*")
          .in("slug", slugs);

        if (!isMounted) return;

        const dbMap = new Map<string, Product>();
        if (dbProducts) {
          for (const p of dbProducts) {
            dbMap.set(p.slug, {
              id: p.id,
              slug: p.slug,
              name: p.name,
              brand: p.brand || "Calor",
              category: p.category_slug || "gas",
              sub: p.subcategory || "General",
              price: Number(p.price),
              compareAt: p.compare_at_price ? Number(p.compare_at_price) : undefined,
              stock: Number(p.stock || 0),
              image: p.image_url || "/placeholder.svg",
              rating: Number(p.rating || 5.0),
              reviews: Number(p.reviews_count || 0),
              featured: Boolean(p.is_featured),
              offer: Boolean(p.is_offer),
              description: p.description || "",
              specs: p.specs && typeof p.specs === "object" && !Array.isArray(p.specs) ? (p.specs as Record<string, string>) : {},
            });
          }
        }

        const validLines: (CartLine & { product: Product })[] = [];
        const staleSlugs: string[] = [];

        for (const line of cart) {
          const prod = dbMap.get(line.slug) || findProduct(line.slug);
          if (prod) {
            validLines.push({ ...line, product: prod });
          } else {
            staleSlugs.push(line.slug);
          }
        }

        // Auto prune stale items that no longer exist in DB
        if (staleSlugs.length > 0) {
          staleSlugs.forEach((s) => removeFromCart(s));
        }

        setLiveLines(validLines);
      } catch (err) {
        console.error("Cart database reconciliation error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    reconcileCart();

    return () => {
      isMounted = false;
    };
  }, [cart, removeFromCart]);

  const subtotal = useMemo(
    () => liveLines.reduce((s, l) => s + l.product.price * l.qty, 0),
    [liveLines],
  );
  const shipping = useMemo(
    () => (subtotal === 0 || subtotal >= 75 ? 0 : 6.95),
    [subtotal],
  );
  const vat = useMemo(() => subtotal * 0.2, [subtotal]);
  const total = useMemo(() => subtotal + shipping + vat, [subtotal, shipping, vat]);

  return { lines: liveLines, subtotal, shipping, vat, total, loading };
}
