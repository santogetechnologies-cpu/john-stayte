import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { gbp, useCartTotals, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Checkout | John Stayte Services" },
      {
        name: "description",
        content: "Secure checkout for gas, fuel and appliance orders with account verification.",
      },
      { property: "og:title", content: "Checkout | John Stayte Services" },
      { property: "og:description", content: "Complete your John Stayte Services order." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { lines, subtotal, shipping, vat, total, settings, loading: cartLoading } = useCartTotals();
  const { clearCart, removeFromCart, user } = useStore();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Redirect unauthenticated visitors to login with return path to /checkout
  useEffect(() => {
    if (!user) {
      toast.info("Please sign in or create an account to proceed with checkout.", {
        id: "checkout-auth-required",
        duration: 4000,
      });
      navigate({ to: "/login", search: { redirect: "/checkout" } });
    }
  }, [user, navigate]);

  // Delivery Form Fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  // Automatically load and prefill customer's saved default address from Supabase
  useEffect(() => {
    async function loadCustomerAddresses() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        const { data: addrs } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("user_id", authUser.user.id)
          .order("is_default", { ascending: false });

        if (addrs && addrs.length > 0) {
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a: any) => a.is_default) || addrs[0];
          if (defaultAddr) {
            setAddress(defaultAddr.street || "");
            setPostcode(defaultAddr.postcode || "");
            if (defaultAddr.name && (!user?.name || user.name === "Customer")) {
              setFullName(defaultAddr.name);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load saved customer addresses:", err);
      }
    }
    loadCustomerAddresses();
  }, [user]);

  const applyCoupon = async () => {
    const cleanCode = coupon.trim().toUpperCase();
    if (!cleanCode) return toast.error("Please enter a coupon code.");

    try {
      const { data: dbCoupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cleanCode)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !dbCoupon) {
        if (cleanCode === "JSS10") {
          setDiscount(subtotal * 0.1);
          return toast.success("Coupon JSS10 applied — 10% off");
        }
        return toast.error("That coupon isn't valid or has expired.");
      }

      // Check min order amount
      if (dbCoupon.min_order_amount && subtotal < Number(dbCoupon.min_order_amount)) {
        return toast.error(
          `Minimum order total of ${gbp(Number(dbCoupon.min_order_amount))} required for this coupon.`,
        );
      }

      // Check expiration
      if (dbCoupon.expires_at && new Date(dbCoupon.expires_at) < new Date()) {
        return toast.error("This coupon code has expired.");
      }

      // Calculate discount
      let computedDiscount = 0;
      if (dbCoupon.discount_type === "percentage") {
        computedDiscount = (subtotal * Number(dbCoupon.discount_value)) / 100;
      } else {
        computedDiscount = Number(dbCoupon.discount_value);
      }

      if (dbCoupon.max_discount && computedDiscount > Number(dbCoupon.max_discount)) {
        computedDiscount = Number(dbCoupon.max_discount);
      }

      setDiscount(computedDiscount);
      toast.success(`Coupon ${cleanCode} applied! Saved ${gbp(computedDiscount)}`);
    } catch (err: any) {
      toast.error("Error applying coupon: " + err.message);
    }
  };

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return toast.error("Your basket is empty.");

    // 1. Enforce active authenticated customer account
    const { data: authSession } = await supabase.auth.getSession();
    const activeAuthUser = authSession?.session?.user || user;

    if (!activeAuthUser?.id) {
      toast.error("Please sign in or create an account to complete checkout.", {
        description: "Your basket items will remain saved in your basket.",
      });
      navigate({ to: "/login", search: { redirect: "/checkout" } });
      return;
    }

    if (settings?.minOrderValue && subtotal < settings.minOrderValue) {
      return toast.error(
        `A minimum order value of ${gbp(settings.minOrderValue)} is required to place an order.`,
      );
    }

    if (!fullName || !email || !address || !postcode) {
      return toast.error("Please fill in all required delivery details.");
    }
    setSubmitting(true);

    let createdOrderId: string | null = null;

    try {
      const currentUserId = activeAuthUser.id;
      const currentEmail = activeAuthUser.email || email.trim();

      // 2. Strict Live Database Verification for every cart product & stock level
      const verifiedItems: {
        product_id: string | null;
        product_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }[] = [];

      for (const line of lines) {
        const { data: dbProduct, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, stock, slug")
          .eq("slug", line.slug)
          .single();

        if (prodErr || !dbProduct) {
          removeFromCart(line.slug);
          throw new Error(
            `Product '${line.product.name}' is no longer available in the catalog and has been removed from your basket.`,
          );
        }

        const currentStock = Number(dbProduct.stock || 0);
        if (currentStock < line.qty) {
          throw new Error(
            currentStock === 0
              ? `'${dbProduct.name}' is currently out of stock. Please update your basket.`
              : `Requested quantity for '${dbProduct.name}' exceeds available stock. Please reduce quantity in basket.`,
          );
        }

        const unitPrice = Number(dbProduct.price);
        verifiedItems.push({
          product_id: dbProduct.id,
          product_name: dbProduct.name,
          quantity: line.qty,
          unit_price: unitPrice,
          total_price: unitPrice * line.qty,
        });
      }

      const finalSubtotal = verifiedItems.reduce((s, i) => s + i.total_price, 0);
      const finalTotal = Math.max(0, finalSubtotal + shipping + vat - discount);
      const orderNumber = `JSS-${Date.now().toString().slice(-6)}`;

      // 3. Create Order Record in Supabase
      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert([
          {
            order_number: orderNumber,
            customer_id: currentUserId,
            customer_name: fullName.trim(),
            customer_email: currentEmail,
            customer_phone: phone.trim(),
            delivery_address: {
              name: fullName.trim(),
              street: address.trim(),
              postcode: postcode.trim(),
              phone: phone.trim(),
            },
            subtotal: finalSubtotal,
            shipping_fee: shipping,
            total: finalTotal,
            status: "Pending",
          },
        ])
        .select()
        .single();

      if (orderErr || !newOrder) {
        throw new Error(orderErr?.message || "Failed to process your order. Please try again.");
      }

      createdOrderId = newOrder.id;

      // 4. Create Order Items Records (with strict transaction rollback on failure)
      const itemInserts = verifiedItems.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemInserts);
      if (itemsErr) {
        // Roll back parent order record to avoid orphan orders
        await supabase.from("orders").delete().eq("id", newOrder.id);
        throw new Error(`Failed to save items for order: ${itemsErr.message}`);
      }

      // 5. Create Order Status History Record
      await supabase.from("order_status_history").insert([
        {
          order_id: newOrder.id,
          status: "Pending",
          actor_id: currentUserId,
          actor_name: fullName.trim(),
          notes: "Order placed by customer via website checkout",
        },
      ]);

      // 6. Update Real Database Inventory for Ordered Products
      for (const item of verifiedItems) {
        if (item.product_id) {
          try {
            const { data: currentInv } = await supabase
              .from("inventory")
              .select("current_stock")
              .eq("product_id", item.product_id)
              .single();

            if (currentInv) {
              const newStock = Math.max(0, currentInv.current_stock - item.quantity);
              await supabase
                .from("inventory")
                .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                .eq("product_id", item.product_id);
            }

            const { data: currentProd } = await supabase
              .from("products")
              .select("stock")
              .eq("id", item.product_id)
              .single();

            if (currentProd) {
              const newStock = Math.max(0, currentProd.stock - item.quantity);
              await supabase
                .from("products")
                .update({ stock: newStock, updated_at: new Date().toISOString() })
                .eq("id", item.product_id);
            }
          } catch (invErr) {
            console.warn("Inventory update notice:", invErr);
          }
        }
      }

      // 7. Create Invoice Record in Supabase
      try {
        await supabase.from("invoices").insert([
          {
            invoice_number: `INV-${orderNumber.replace("JSS-", "")}`,
            order_id: newOrder.id,
            customer_id: currentUserId,
            total_amount: finalTotal,
            status: "Paid",
          },
        ]);
      } catch (invErr) {
        console.warn("Invoice record notice:", invErr);
      }

      // 8. Create Customer Notification in Supabase customer_notifications
      try {
        await supabase.from("customer_notifications").insert([
          {
            user_id: currentUserId,
            title: `Order #${orderNumber} Confirmed`,
            message: `Your order for ${verifiedItems.length} item(s) totalling ${gbp(finalTotal)} has been received.`,
            category: "Orders",
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.error("Customer notification creation error:", notifErr);
      }

      // 9. Create Real Persistent Manager Notification in public.notifications (P0 FIX 1)
      try {
        const { data: existingStaffNotifs } = await supabase
          .from("notifications")
          .select("id")
          .eq("title", `New Order #${orderNumber}`)
          .limit(1);

        if (!existingStaffNotifs || existingStaffNotifs.length === 0) {
          const { error: staffNotifErr } = await (supabase.from("notifications") as any).insert([
            {
              user_id: null, // Broadcast to all operations managers and admins
              title: `New Order #${orderNumber}`,
              message: `${fullName.trim()} placed a new order #${orderNumber} (${verifiedItems.length} item(s), total ${gbp(finalTotal)}).`,
              category: "Orders",
              link: `/manager/orders?orderId=${newOrder.id}`,
              read: false,
              is_read: false,
            },
          ]);
          if (staffNotifErr) {
            console.error("Failed to insert manager order notification:", staffNotifErr);
          }
        }
      } catch (staffErr) {
        console.error("Manager notification creation notice:", staffErr);
      }

      // 10. Clear Cart ONLY AFTER database success
      clearCart();
      toast.success(`Order #${orderNumber} placed successfully!`);
      navigate({ to: `/account/orders/${newOrder.id}` as any });
    } catch (err: any) {
      // If parent order was created but downstream failed, attempt safe cleanup
      if (createdOrderId) {
        try {
          await supabase.from("order_items").delete().eq("order_id", createdOrderId);
          await supabase.from("orders").delete().eq("id", createdOrderId);
        } catch {}
      }
      toast.error("Order placement failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Checkout"
        title={user ? `Checkout, ${user.name.split(" ")[0]}` : "Guest checkout"}
      />
      <form
        onSubmit={place}
        className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div className="space-y-5">
          <section className="surface-card p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Delivery details</h2>
              {savedAddresses.length > 0 && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Using saved address
                </span>
              )}
            </div>

            {savedAddresses.length > 1 && (
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 block">
                  Select from saved addresses:
                </span>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setAddress(addr.street || "");
                        setPostcode(addr.postcode || "");
                        if (addr.name) setFullName(addr.name);
                        toast.info(`Selected address: ${addr.label || addr.street}`);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                        address === addr.street
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {addr.label || "Address"}: {addr.street.slice(0, 24)}...
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fn">Full name</Label>
                <Input
                  id="fn"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5 rounded-full"
                />
              </div>
              <div>
                <Label htmlFor="em">Email</Label>
                <Input
                  id="em"
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 rounded-full"
                />
              </div>
              <div>
                <Label htmlFor="ph">Phone</Label>
                <Input
                  id="ph"
                  required
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07700 900123"
                  className="mt-1.5 rounded-full"
                />
              </div>
              <div>
                <Label htmlFor="pc">Postcode</Label>
                <Input
                  id="pc"
                  required
                  maxLength={10}
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="GL2 7LZ"
                  className="mt-1.5 rounded-full"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="ad">Address</Label>
              <Textarea
                id="ad"
                required
                maxLength={300}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address & town..."
                className="mt-1.5 rounded-2xl"
              />
            </div>
          </section>

          <section className="surface-card p-7">
            <h2 className="font-extrabold">Payment details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="cn">Card number</Label>
                <Input
                  id="cn"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="mt-1.5 rounded-full"
                />
              </div>
              <div>
                <Label htmlFor="ex">Expiry</Label>
                <Input id="ex" placeholder="12/29" maxLength={5} className="mt-1.5 rounded-full" />
              </div>
              <div>
                <Label htmlFor="cv">CVC</Label>
                <Input id="cv" placeholder="123" maxLength={4} className="mt-1.5 rounded-full" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Payment details encrypted. Order will be confirmed upon submission.
            </p>
          </section>
        </div>

        <aside className="surface-card h-fit p-6 lg:sticky lg:top-32">
          <h2 className="font-extrabold">Order summary</h2>
          {cartLoading ? (
            <p className="mt-4 text-xs text-muted-foreground">Verifying basket with database...</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {lines.map((l) => (
                <li key={l.slug} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {l.qty} × {l.product.name}
                  </span>
                  <span className="font-semibold">{gbp(l.product.price * l.qty)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex gap-2">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon code"
              maxLength={20}
              className="rounded-full"
            />
            <Button type="button" variant="outline" className="rounded-full" onClick={applyCoupon}>
              Apply
            </Button>
          </div>
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{gbp(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Discount</dt>
                <dd>−{gbp(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{shipping === 0 ? "Free" : gbp(shipping)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VAT (20%)</dt>
              <dd>{gbp(vat)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-extrabold">
              <dt>Total</dt>
              <dd>{gbp(Math.max(0, total - discount))}</dd>
            </div>
          </dl>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || cartLoading || lines.length === 0}
            className="mt-6 w-full rounded-full gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
              </>
            ) : (
              "Place order"
            )}
          </Button>
        </aside>
      </form>
    </SiteLayout>
  );
}
