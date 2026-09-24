import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Product } from "@/data/catalog";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl } from "@/lib/utils";
import { INITIAL_ACTIVE_AGENTS } from "@/lib/delivery-agent-service";
import { type Offer, evaluateOfferForCart } from "@/lib/offer-service";

export type Role = "customer" | "manager" | "admin" | "delivery_agent";
export type User = { id?: string; name: string; email: string; role: Role; avatar?: string };

export type CartLine = { slug: string; qty: number };

type Store = {
  user: User | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: Role,
  ) => Promise<{ ok: boolean; error?: string; user?: User }>;
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
              slug:
                typeof i.slug === "string"
                  ? i.slug
                  : typeof i.slug === "object" && i.slug?.slug
                    ? String(i.slug.slug)
                    : "",
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

function resolveUserRole(
  uid?: string,
  email?: string | null,
  metadataRole?: string | null,
  profileRole?: string | null,
): Role {
  const normEmail = (email || "").trim().toLowerCase();

  // 1. Direct match with canonical active delivery agents (Aswin & Astin)
  const isDeliveryAgent = INITIAL_ACTIVE_AGENTS.some(
    (ag) =>
      (uid && ag.id === uid) ||
      (ag.email && ag.email.toLowerCase() === normEmail) ||
      (ag.full_name && ag.full_name.toLowerCase() === normEmail),
  );
  if (isDeliveryAgent) {
    return "delivery_agent";
  }

  // 2. Explicit elevated role in Supabase Auth user_metadata
  if (
    metadataRole === "delivery_agent" ||
    metadataRole === "manager" ||
    metadataRole === "admin"
  ) {
    return metadataRole as Role;
  }

  // 3. Explicit elevated role in Supabase profiles table
  if (
    profileRole === "delivery_agent" ||
    profileRole === "manager" ||
    profileRole === "admin"
  ) {
    return profileRole as Role;
  }

  return "customer";
}

function resolveUserName(
  email?: string | null,
  metadataName?: string | null,
  profileName?: string | null,
): string {
  const normEmail = (email || "").trim().toLowerCase();
  const matchedAgent = INITIAL_ACTIVE_AGENTS.find(
    (ag) => ag.email?.toLowerCase() === normEmail,
  );
  if (matchedAgent?.full_name) {
    return matchedAgent.full_name;
  }
  if (metadataName && metadataName.trim()) {
    return metadataName.trim();
  }
  if (profileName && profileName.trim() && profileName !== email) {
    return profileName.trim();
  }
  return email ? email.split("@")[0] : "User";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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
      const finalSlugs = [...dbSlugs];
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
      try {
        if (!session?.user?.id) {
          setUser(null);
          try {
            localStorage.removeItem("jss.auth_user");
          } catch {}
          return;
        }
        const currentUid = session.user.id;

        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUid)
            .maybeSingle();

          let resolvedRole: Role = resolveUserRole(
            currentUid,
            session.user.email,
            session.user.user_metadata?.role,
            profile?.role,
          );

          // If role is still customer, check delivery_agents table by id or email
          if (resolvedRole === "customer") {
            const { data: da } = await (supabase.from("delivery_agents") as any)
              .select("id")
              .or(`id.eq.${currentUid},email.ilike.${session.user.email || ""}`)
              .maybeSingle();
            if (da) {
              resolvedRole = "delivery_agent";
            }
          }

          let userAvatar: string | undefined = undefined;
          if (
            profile?.notification_prefs &&
            typeof profile.notification_prefs === "object" &&
            !Array.isArray(profile.notification_prefs)
          ) {
            const prefs = profile.notification_prefs as Record<string, unknown>;
            if (typeof prefs.avatar_url === "string") {
              userAvatar = prefs.avatar_url;
            }
          }

          const u: User = {
            id: currentUid,
            name: resolveUserName(
              session.user.email,
              session.user.user_metadata?.full_name,
              profile?.full_name,
            ),
            email: session.user.email || "",
            role: resolvedRole,
            avatar: userAvatar,
          };
          setUser(u);
        } catch {
          let resolvedRole: Role = resolveUserRole(
            currentUid,
            session.user.email,
            session.user.user_metadata?.role,
            null,
          );
          const u: User = {
            id: currentUid,
            name: resolveUserName(
              session.user.email,
              session.user.user_metadata?.full_name,
              null,
            ),
            email: session.user.email || "",
            role: resolvedRole,
          };
          setUser(u);
        }

        // Sync Supabase-backed Wishlist for authenticated user
        syncWishlistWithDb(currentUid);
      } finally {
        setAuthLoading(false);
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionUser(session);
    });

    // Auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionUser(session);
    });

    const handleProfileUpdated = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetchSessionUser(session);
      });
    };
    window.addEventListener("user_profile_updated", handleProfileUpdated);

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener("user_profile_updated", handleProfileUpdated);
    };
  }, [syncWishlistWithDb]);

  const login: Store["login"] = useCallback(
    async (email, password) => {
      const cleanEmail = email.trim();

      if (!cleanEmail || !password) {
        return { ok: false, error: "Please enter both email address and password." };
      }

      try {
        const authRes = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        // If Supabase authentication failed (wrong password, account not found, etc.)
        if (authRes.error || !authRes.data?.user?.id) {
          return {
            ok: false,
            error: authRes.error?.message || "Invalid email or password.",
          };
        }

        // Supabase Auth genuinely succeeded
        const uid = authRes.data.user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();

        let resolvedRole: Role = resolveUserRole(
          uid,
          authRes.data.user.email || cleanEmail,
          authRes.data.user.user_metadata?.role,
          profile?.role,
        );

        // Check if user is registered in delivery_agents table
        if (resolvedRole === "customer") {
          const { data: da } = await (supabase.from("delivery_agents") as any)
            .select("id")
            .or(`id.eq.${uid},email.ilike.${cleanEmail}`)
            .maybeSingle();
          if (da) {
            resolvedRole = "delivery_agent";
          }
        }

        let userAvatar: string | undefined = undefined;
        if (
          profile?.notification_prefs &&
          typeof profile.notification_prefs === "object" &&
          !Array.isArray(profile.notification_prefs)
        ) {
          const prefs = profile.notification_prefs as Record<string, unknown>;
          if (typeof prefs.avatar_url === "string") {
            userAvatar = prefs.avatar_url;
          }
        }

        const u: User = {
          id: uid,
          name: resolveUserName(
            authRes.data.user.email || cleanEmail,
            authRes.data.user.user_metadata?.full_name,
            profile?.full_name,
          ),
          email: authRes.data.user.email || cleanEmail,
          role: resolvedRole,
          avatar: userAvatar,
        };

        setUser(u);
        syncWishlistWithDb(uid);
        return { ok: true, user: u };
      } catch (err: any) {
        return { ok: false, error: err?.message || "Authentication failed. Please try again." };
      }
    },
    [syncWishlistWithDb],
  );

  const register: Store["register"] = useCallback(
    async (name, email, password, role = "customer") => {
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
    },
    [syncWishlistWithDb],
  );

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem("jss.wishlist");
      localStorage.removeItem("jss.auth_user");
    } catch {
      /* ignore */
    }
    setUser(null);
    setWishlist([]);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }, []);

  const toggleWishlist = useCallback(
    async (slug: string) => {
      if (!slug) return;

      // 1. Optimistic UI update for immediate feedback
      setWishlist((current) => {
        const exists = current.includes(slug);
        return exists ? current.filter((s) => s !== slug) : [...current, slug];
      });

      // 2. Obtain current user ID directly from state or live session
      let effectiveUserId: string | null = user?.id || null;
      if (!effectiveUserId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          effectiveUserId = session.user.id;
        }
      }

      if (!effectiveUserId) {
        // Unauthenticated guest user: store in localStorage
        try {
          const raw = localStorage.getItem("jss.wishlist");
          const current = raw ? (JSON.parse(raw) as string[]) : [];
          const next = current.includes(slug)
            ? current.filter((s) => s !== slug)
            : [...current, slug];
          localStorage.setItem("jss.wishlist", JSON.stringify(next));
        } catch {
          /* ignore */
        }
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
          await supabase.from("wishlist_items").insert({
            wishlist_id: wid,
            product_id: prod.id,
          });
        }
      } catch (err) {
        console.error("Failed to toggle wishlist in Supabase:", err);
      }
    },
    [user?.id],
  );

  const value = useMemo<Store>(
    () => ({
      user,
      authLoading,
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
    [user, authLoading, cart, wishlist, login, register, logout, setCart, toggleWishlist],
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

export function getOrderPaymentMethod(order: any): string {
  if (!order) return "Credit / Debit Card";
  if (order.payment_method) return order.payment_method;
  if (typeof order.delivery_address === "object" && order.delivery_address?.payment_method) {
    return order.delivery_address.payment_method;
  }
  if (typeof order.notes === "string") {
    const match = order.notes.match(/\[Payment:\s*([^\]]+)\]/i);
    if (match?.[1]) return match[1].trim();
    if (order.notes.toLowerCase().includes("paypal")) return "PayPal";
    if (
      order.notes.toLowerCase().includes("delivery / collection") ||
      order.notes.toLowerCase().includes("pay on delivery")
    ) {
      return "Pay on Delivery / Collection";
    }
  }
  if (order.payment_status?.toLowerCase() === "paid") {
    return "Credit / Debit Card";
  }
  return "Pay on Delivery / Collection";
}

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
 * Optionally applies active Offer discount if provided.
 */
export function useCartTotals(appliedOffer?: Offer | null) {
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
      .on("postgres_changes", { event: "*", schema: "public", table: "cms_content_blocks" }, () =>
        loadSettings(),
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
        const { data: dbProducts } = await supabase.from("products").select("*").in("slug", slugs);

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
              image: cleanImageUrl(p.image_url, p.slug),
              rating: Number(p.rating || 5.0),
              reviews: Number(p.reviews_count || 0),
              featured: Boolean(p.is_featured),
              offer: Boolean(p.is_offer),
              description: p.description || "",
              specs:
                p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
                  ? (p.specs as Record<string, string>)
                  : {},
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

  const offerDiscount = useMemo(() => {
    if (!appliedOffer || subtotal === 0) return 0;
    const evalResult = evaluateOfferForCart(appliedOffer, liveLines, subtotal);
    return evalResult.isEligible ? evalResult.discountAmount : 0;
  }, [appliedOffer, liveLines, subtotal]);

  const taxableSubtotal = useMemo(
    () => Math.max(0, subtotal - offerDiscount),
    [subtotal, offerDiscount],
  );

  const shipping = useMemo(
    () =>
      subtotal === 0 || subtotal >= settings.freeDeliveryThreshold
        ? 0
        : settings.defaultShippingFee,
    [subtotal, settings.freeDeliveryThreshold, settings.defaultShippingFee],
  );
  const vat = useMemo(() => taxableSubtotal * (settings.vatRate / 100), [taxableSubtotal, settings.vatRate]);
  const total = useMemo(() => taxableSubtotal + shipping + vat, [taxableSubtotal, shipping, vat]);

  return { lines: liveLines, subtotal, offerDiscount, shipping, vat, total, loading, settings };
}
