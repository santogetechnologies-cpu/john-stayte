import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products, type Product } from "@/data/catalog";

export type Role = "customer" | "manager" | "admin";
export type User = { name: string; email: string; role: Role };

const ACCOUNTS: Record<string, { password: string; user: User }> = {
  "customer@jss.com": {
    password: "123456",
    user: { name: "Sarah Hughes", email: "customer@jss.com", role: "customer" },
  },
  "manager@jss.com": {
    password: "123456",
    user: { name: "Dave Miller", email: "manager@jss.com", role: "manager" },
  },
  "admin@jss.com": {
    password: "123456",
    user: { name: "John Stayte", email: "admin@jss.com", role: "admin" },
  },
};

export type CartLine = { slug: string; qty: number };

type Store = {
  user: User | null;
  login: (email: string, password: string) => { ok: boolean; error?: string; user?: User };
  register: (name: string, email: string) => User;
  logout: () => void;
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
  const [user, setUser] = usePersisted<User | null>("jss.user", null);
  const [cart, setCart] = usePersisted<CartLine[]>("jss.cart", []);
  const [wishlist, setWishlist] = usePersisted<string[]>("jss.wishlist", []);

  const login: Store["login"] = useCallback(
    (email, password) => {
      const account = ACCOUNTS[email.trim().toLowerCase()];
      if (!account || account.password !== password) {
        return { ok: false, error: "Invalid email or password." };
      }
      setUser(account.user);
      return { ok: true, user: account.user };
    },
    [setUser],
  );

  const register: Store["register"] = useCallback(
    (name, email) => {
      const u: User = { name, email, role: "customer" };
      setUser(u);
      return u;
    },
    [setUser],
  );

  const value = useMemo<Store>(
    () => ({
      user,
      login,
      register,
      logout: () => setUser(null),
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
    [user, cart, wishlist, login, register, setUser, setCart, setWishlist],
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

export function useCartTotals() {
  const { cart } = useStore();
  const lines = cart
    .map((l) => ({ ...l, product: findProduct(l.slug) }))
    .filter((l): l is CartLine & { product: Product } => Boolean(l.product));
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= 75 ? 0 : 6.95;
  const vat = subtotal * 0.2;
  return { lines, subtotal, shipping, vat, total: subtotal + shipping + vat };
}
