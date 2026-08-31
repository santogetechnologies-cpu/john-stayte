import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Product } from "@/data/catalog";
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
      if (raw) {
        let parsed = JSON.parse(raw);
        if (key === "jss.cart" && Array.isArray(parsed)) {
          parsed = parsed
            .filter((i) => i && typeof i === "object")
            .map((i) => ({
              slug: typeof i.slug === "string" ? i.slug : (typeof i.slug === "object" && i.slug?.slug ? String(i.slug.slug) : ""),
              qty: typeof i.qty === "number" && i.qty > 0 ? i.qty : 1,
            }))
            .filter((i) => i.slug && i.slug.length > 0);
        }
        setValue(parsed as T);
      }
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
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("jss.wishlist");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Sync user's wishlist from Supabase wishlists + wishlist_items tables
  const syncWishlistWithDb = useCallback(async (userId: string) => {
    if (!userId || typeof userId !== "string") return;

    try {
      // 1. Get or create user's wishlist container row
      const { data: wList, error: getWishlistErr } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", userId);

      if (getWishlistErr) {
        console.error("Wishlist fetch error:", getWishlistErr.message);
      }

      let wid: string | null = null;
      if (wList && wList.length > 0) {
        wid = wList[0].id;
      } else {
        const { data: newWishlist, error: createWishlistErr } = await supabase
          .from("wishlists")
          .insert({ user_id: userId })
          .select("id");

        if (createWishlistErr) {
          console.error("Wishlist create error:", createWishlistErr.message);
        }
        if (newWishlist && newWishlist.length > 0) {
          wid = newWishlist[0].id;
        }
      }

      if (!wid) {
        console.warn("Could not resolve wishlist container for user:", userId);
        return;
      }

      // 2. Fetch all wishlist items for this wishlist
      const { data: items, error: itemsErr } = await supabase
        .from("wishlist_items")
        .select("id, product_id, products(slug)")
        .eq("wishlist_id", wid);

      if (itemsErr) {
        console.error("Wishlist items fetch error:", itemsErr.message);
        return;
      }

      let dbSlugs = (items || [])
        .map((item: any) => item.products?.slug)
        .filter(Boolean) as string[];

      // Fallback: If products join didn't populate slug, resolve by product_id directly
      if (dbSlugs.length === 0 && items && items.length > 0) {
        const pids = items.map((i: any) => i.product_id).filter(Boolean);
        if (pids.length > 0) {
          const { data: directProds } = await supabase
            .from("products")
            .select("id, slug")
            .in("id", pids);
          if (directProds) {
            dbSlugs = directProds.map((p) => p.slug).filter(Boolean);
          }
        }
      }

      // 3. Migrate any guest wishlist items from localStorage if not already in DB
      let finalSlugs = [...dbSlugs];
      try {
        const rawLocal = localStorage.getItem("jss.wishlist");
        if (rawLocal) {
          const localSlugs = JSON.parse(rawLocal) as string[];
          if (Array.isArray(localSlugs) && localSlugs.length > 0) {
            const missingSlugs = localSlugs.filter((s) => !dbSlugs.includes(s));
            if (missingSlugs.length > 0) {
              const { data: prodsToMigrate } = await supabase
                .from("products")
                .select("id, slug")
                .in("slug", missingSlugs);

              if (prodsToMigrate && prodsToMigrate.length > 0) {
                const insertPayload = prodsToMigrate.map((p) => ({
                  wishlist_id: wid!,
                  product_id: p.id,
                }));
                await supabase.from("wishlist_items").insert(insertPayload);
                prodsToMigrate.forEach((p) => {
                  if (!finalSlugs.includes(p.slug)) finalSlugs.push(p.slug);
                });
              }
            }
            // Clear the guest local storage cache once migrated
            localStorage.removeItem("jss.wishlist");
          }
        }
      } catch (migrationErr) {
        console.error("Guest wishlist migration error:", migrationErr);
      }

      setWishlist(Array.from(new Set(finalSlugs)));
    } catch (err) {
      console.error("Failed to sync wishlist from Supabase:", err);
    }
  }, []);

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    const fetchSessionUser = async (session: any) => {
      if (!session?.user?.id) {
        setUser(null);
        return;
      }

      const currentUid = session.user.id;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUid)
          .single();

        setUser({
          id: currentUid,
          name: profile?.full_name || session.user.email?.split("@")[0] || "Customer",
          email: session.user.email || "",
          role: (profile?.role as Role) || "customer",
        });
      } catch {
        setUser({
          id: currentUid,
          name: session.user.email?.split("@")[0] || "Customer",
          email: session.user.email || "",
          role: "customer",
        });
      }

      // Sync Supabase-backed Wishlist for authenticated user
      syncWishlistWithDb(currentUid);
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionUser(session);
    });

    // Auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionUser(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [syncWishlistWithDb]);

  const login: Store["login"] = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user?.id) {
        const uid = data.user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .single();

        const u: User = {
          id: uid,
          name: profile?.full_name || data.user.email?.split("@")[0] || "Customer",
          email: data.user.email || email,
          role: (profile?.role as Role) || "customer",
        };
        setUser(u);
        syncWishlistWithDb(uid);
        return { ok: true, user: u };
      }

      return { ok: false, error: "Sign in failed" };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Authentication failed" };
    }
  }, [syncWishlistWithDb]);

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

      if (data.user?.id) {
        const uid = data.user.id;
        const u: User = {
          id: uid,
          name,
          email,
          role,
        };
        setUser(u);
        syncWishlistWithDb(uid);
        return { ok: true, user: u };
      }

      return { ok: false, error: "Registration failed" };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Registration error" };
    }
  }, [syncWishlistWithDb]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    setUser(null);
    setWishlist([]);
    try {
      localStorage.removeItem("jss.wishlist");
    } catch {}
  }, []);

  const toggleWishlist = useCallback(async (slug: string) => {
    if (!slug) return;

    // 1. Optimistic UI update for immediate feedback
    setWishlist((current) => {
      const exists = current.includes(slug);
      return exists ? current.filter((s) => s !== slug) : [...current, slug];
    });

    // 2. Obtain current user ID directly from state or live session
    let effectiveUserId: string | null = user?.id || null;
    if (!effectiveUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        effectiveUserId = session.user.id;
      }
    }

    if (!effectiveUserId) {
      // Unauthenticated guest user: store in localStorage
      try {
        const raw = localStorage.getItem("jss.wishlist");
        const current = raw ? (JSON.parse(raw) as string[]) : [];
        const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
        localStorage.setItem("jss.wishlist", JSON.stringify(next));
      } catch {}
      return;
    }

    // 3. Authenticated user: persist to Supabase wishlists + wishlist_items
    try {
      // Get or create user's wishlist container row
      const { data: wList } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", effectiveUserId);

      let wid: string | null = null;
      if (wList && wList.length > 0) {
        wid = wList[0].id;
      } else {
        const { data: newWishlist } = await supabase
          .from("wishlists")
          .insert({ user_id: effectiveUserId })
          .select("id");
        if (newWishlist && newWishlist.length > 0) {
          wid = newWishlist[0].id;
        }
      }

      if (!wid) {
        console.error("Failed to obtain wishlist ID for user:", effectiveUserId);
        return;
      }

      // Resolve product ID by slug
      const { data: prod } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!prod?.id) {
        console.error("Product slug not found in DB:", slug);
        return;
      }

      // Check if item already exists in wishlist_items
      const { data: existingItems } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("wishlist_id", wid)
        .eq("product_id", prod.id);

      if (existingItems && existingItems.length > 0) {
        // Remove from DB
        await supabase
          .from("wishlist_items")
          .delete()
          .eq("wishlist_id", wid)
          .eq("product_id", prod.id);
      } else {
        // Add to DB
        await supabase
          .from("wishlist_items")
          .insert({
            wishlist_id: wid,
            product_id: prod.id,
          });
      }
    } catch (err) {
      console.error("Failed to toggle wishlist in Supabase:", err);
    }
  }, [user?.id]);

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
      toggleWishlist,
    }),
    [user, cart, wishlist, login, register, logout, setCart, toggleWishlist],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}


export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

export interface CartSystemSettings {
  vatRate: number;
  fuelVatRate: number;
  defaultShippingFee: number;
  freeDeliveryThreshold: number;
  minOrderValue: number;
  deliverySlaDays: number;
}

export const DEFAULT_CART_SYSTEM_SETTINGS: CartSystemSettings = {
  vatRate: 20,
  fuelVatRate: 5,
  defaultShippingFee: 4.99,
  freeDeliveryThreshold: 100,
  minOrderValue: 15,
  deliverySlaDays: 2,
};

/**
 * Reconciles cart lines against live Supabase public.products database.
 * Dynamically applies system shipping thresholds & VAT rates from admin_system_settings.
 * Automatically removes stale/deleted products from cart.
 */
export function useCartTotals() {
  const { cart, removeFromCart } = useStore();
  const [liveLines, setLiveLines] = useState<(CartLine & { product: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CartSystemSettings>(DEFAULT_CART_SYSTEM_SETTINGS);

  // Load Admin System Settings from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const { data } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "admin_system_settings")
          .maybeSingle();

        if (data?.content && isMounted) {
          const parsed = JSON.parse(data.content);
          if (parsed && typeof parsed === "object") {
            setSettings({
              vatRate: Number(parsed.vatRate ?? 20),
              fuelVatRate: Number(parsed.fuelVatRate ?? 5),
              defaultShippingFee: Number(parsed.defaultShippingFee ?? 4.99),
              freeDeliveryThreshold: Number(parsed.freeDeliveryThreshold ?? 100),
              minOrderValue: Number(parsed.minOrderValue ?? 15),
              deliverySlaDays: Number(parsed.deliverySlaDays ?? 2),
            });
          }
        }
      } catch (err) {
        console.warn("Cart system settings fetch notice:", err);
      }
    }

    loadSettings();

    const handleUpdate = () => loadSettings();
    window.addEventListener("admin_system_settings_updated", handleUpdate);

    const channel = supabase
      .channel("cart_system_settings_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_content_blocks" },
        () => loadSettings()
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("admin_system_settings_updated", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

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
          const prod = dbMap.get(line.slug);
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
    () => (subtotal === 0 || subtotal >= settings.freeDeliveryThreshold ? 0 : settings.defaultShippingFee),
    [subtotal, settings.freeDeliveryThreshold, settings.defaultShippingFee],
  );
  const vat = useMemo(
    () => subtotal * (settings.vatRate / 100),
    [subtotal, settings.vatRate]
  );
  const total = useMemo(() => subtotal + shipping + vat, [subtotal, shipping, vat]);

  return { lines: liveLines, subtotal, shipping, vat, total, loading, settings };
}
