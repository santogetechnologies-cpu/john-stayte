import { supabase } from "@/lib/supabase";
import { getCustomerGasApplication } from "@/lib/application-service";

export interface ChatAction {
  type: "link" | "cart" | "prompt";
  label: string;
  url?: string;
  payload?: any;
  icon?: string;
  primary?: boolean;
}

export interface AssistantProductCard {
  id: string;
  name: string;
  price: number;
  brand?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  stock?: number;
  is_active?: boolean;
  slug: string;
  size?: string;
  gas_type?: string;
  description?: string;
}

export interface AssistantOrderCard {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  delivery_date?: string;
  items_count: number;
  items_summary?: string;
}

export interface AssistantStationCard {
  id: string;
  name: string;
  address: string;
  town: string;
  postcode: string;
  phone: string;
  hours: string;
  autogas_available: boolean;
  maps_link: string;
}

export interface AssistantAppCard {
  id: string;
  status: string;
  business_type?: string;
  company_name?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  actions?: ChatAction[];
  products?: AssistantProductCard[];
  orders?: AssistantOrderCard[];
  stations?: AssistantStationCard[];
  application?: AssistantAppCard[];
}

export const JSS_FILLING_STATIONS_DATA: AssistantStationCard[] = [
  {
    id: "st-1",
    name: "Wild Goose Garage",
    address: "27 Kingshill Road, Dursley, Gloucestershire, GL11 4BJ",
    town: "Dursley",
    postcode: "GL11 4BJ",
    phone: "01453 545696",
    hours: "Mon–Sat 7:00–19:00 • Sun 9:00–17:00",
    autogas_available: true,
    maps_link: "https://maps.google.com/?q=Wild+Goose+Garage+27+Kingshill+Road+Dursley+GL11+4BJ",
  },
  {
    id: "st-2",
    name: "Fromebridge Service Station",
    address: "Bristol Road, Whitminster, Gloucestershire, GL2 7PG",
    town: "Whitminster",
    postcode: "GL2 7PG",
    phone: "01452 740753",
    hours: "Mon–Sat 7:00–20:00 • Sun 8:00–18:00",
    autogas_available: true,
    maps_link: "https://maps.google.com/?q=Fromebridge+Service+Station+Bristol+Road+Whitminster+GL2+7PG",
  },
];

export function formatGbp(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// 1. DATABASE TOOL RETRIEVERS
// ---------------------------------------------------------------------------

export async function fetchAllActiveProducts(): Promise<any[]> {
  try {
    const { data, error } = await (supabase.from("products") as any)
      .select("id, name, slug, price, stock, brand, category_id, subcategory, image_url, description, is_active, specs")
      .limit(150);

    if (error || !data) return [];
    return (data as any[]).filter((p) => p.is_active !== false);
  } catch (err) {
    console.error("fetchAllActiveProducts error:", err);
    return [];
  }
}

export async function toolGetCustomerOrders(): Promise<{
  isAuthenticated: boolean;
  orders: AssistantOrderCard[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { isAuthenticated: false, orders: [] };
    }

    const { data, error } = await (supabase.from("orders") as any)
      .select("id, order_number, status, total, subtotal, created_at, delivery_date, order_items(id, name, quantity, price)")
      .or(`customer_id.eq.${user.id},customer_email.eq.${user.email}`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return { isAuthenticated: true, orders: [], error: error.message };
    }

    const orders: AssistantOrderCard[] = (data || []).map((o: any) => {
      const items = o.order_items || [];
      const itemsSummary = items
        .map((i: any) => `${i.quantity}x ${i.name || "Item"}`)
        .join(", ");

      return {
        id: o.id,
        order_number: o.order_number || o.id.slice(0, 8).toUpperCase(),
        status: o.status || "Pending",
        total: Number(o.total || o.subtotal || 0),
        created_at: o.created_at,
        delivery_date: o.delivery_date,
        items_count: items.length || 1,
        items_summary: itemsSummary,
      };
    });

    return { isAuthenticated: true, orders };
  } catch (err) {
    return { isAuthenticated: false, orders: [] };
  }
}

export async function toolGetCustomerApplication(): Promise<{
  isAuthenticated: boolean;
  application: AssistantAppCard | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { isAuthenticated: false, application: null };
    }

    const app = await getCustomerGasApplication(user.id);
    if (!app) {
      return { isAuthenticated: true, application: null };
    }

    return {
      isAuthenticated: true,
      application: {
        id: app.id || "app-1",
        status: app.status || "SUBMITTED",
        business_type: app.business_type || undefined,
        company_name: app.business_name || undefined,
        created_at: app.created_at || new Date().toISOString(),
      },
    };
  } catch (err) {
    return { isAuthenticated: false, application: null };
  }
}

export async function toolGetFillingStations(): Promise<AssistantStationCard[]> {
  try {
    const { data } = await (supabase.from("filling_stations") as any).select("*").eq("is_active", true);
    if (data && data.length > 0) {
      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        address: s.address || `${s.name}, Gloucestershire`,
        town: s.town || "Gloucestershire",
        postcode: s.postcode || "",
        phone: s.phone || "01453 545696",
        hours: s.hours || "Mon–Sat 7:00–19:00",
        autogas_available: !!s.autogas_available,
        maps_link:
          s.maps_link ||
          `https://maps.google.com/?q=${encodeURIComponent(s.name + " " + (s.postcode || ""))}`,
      }));
    }
  } catch (_) {}
  return JSS_FILLING_STATIONS_DATA;
}

function mapProductToCard(p: any): AssistantProductCard {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    brand: p.brand || undefined,
    subcategory: p.subcategory || undefined,
    image_url: p.image_url || undefined,
    stock: p.stock,
    is_active: p.is_active !== false,
    slug: p.slug || p.id,
    gas_type: typeof p.specs === "object" && p.specs !== null ? p.specs.gas_type : undefined,
    size: typeof p.specs === "object" && p.specs !== null ? p.specs.weight || p.specs.size : undefined,
    description: p.description || undefined,
  };
}

// ---------------------------------------------------------------------------
// 2. CONVERSATIONAL INTENT RESOLVER & LIVE QUERY HANDLER
// ---------------------------------------------------------------------------

export async function processCustomerMessage(
  userText: string,
  history: ChatMessage[] = [],
): Promise<{
  text: string;
  actions?: ChatAction[];
  products?: AssistantProductCard[];
  orders?: AssistantOrderCard[];
  stations?: AssistantStationCard[];
  application?: AssistantAppCard[];
}> {
  const trimmed = userText.trim();
  const lower = trimmed.toLowerCase();
  const cleanTokens = lower.replace(/[^\w\s]/g, " ").trim().split(/\s+/).filter(Boolean);

  // =========================================================================
  // 1. BASIC GREETINGS & PLEASANTRIES (Respond naturally, NO info dumps)
  // =========================================================================
  const isGreetingWord = [
    "hi",
    "hello",
    "hey",
    "heya",
    "hiya",
    "howdy",
    "morning",
    "good morning",
    "good afternoon",
    "good evening",
    "good day",
    "greetings",
    "yo",
  ].some((g) => lower === g || cleanTokens.length <= 2 && (cleanTokens.includes(g) || lower.startsWith(g)));

  const isHowAreYou =
    lower.includes("how are you") ||
    lower.includes("how r u") ||
    lower.includes("how's it going") ||
    lower.includes("hows it going");

  if (isGreetingWord || isHowAreYou) {
    if (lower.includes("good morning")) {
      return {
        text: "Good morning! 👋 How can I help you today?",
        actions: [
          { type: "prompt", label: "How to order gas?" },
          { type: "prompt", label: "Browse Calor gas cylinders" },
          { type: "prompt", label: "Cylinder exchange rules" },
        ],
      };
    }
    if (lower.includes("good afternoon")) {
      return {
        text: "Good afternoon! 👋 How can I help you today?",
        actions: [
          { type: "prompt", label: "How to order gas?" },
          { type: "prompt", label: "Browse Calor gas cylinders" },
          { type: "prompt", label: "Where is my order?" },
        ],
      };
    }
    if (lower.includes("good evening")) {
      return {
        text: "Good evening! 👋 How can I help you today?",
        actions: [
          { type: "prompt", label: "How to order gas?" },
          { type: "prompt", label: "Browse Calor gas cylinders" },
          { type: "prompt", label: "Filling station hours" },
        ],
      };
    }
    if (isHowAreYou) {
      return {
        text: "I'm doing great, thank you! 😊 How can I assist you with John Stayte Services today?",
        actions: [
          { type: "prompt", label: "How to order gas?" },
          { type: "prompt", label: "Browse gas cylinders" },
          { type: "prompt", label: "Check order status" },
        ],
      };
    }

    return {
      text: "Hi! 👋 How can I help you today?",
      actions: [
        { type: "prompt", label: "How to order gas?" },
        { type: "prompt", label: "Do you sell Calor gas?" },
        { type: "prompt", label: "Where is my order?" },
      ],
    };
  }

  // =========================================================================
  // 2. THANKS & APPRECIATION
  // =========================================================================
  if (
    lower === "thank you" ||
    lower === "thanks" ||
    lower === "thx" ||
    lower === "thank you so much" ||
    lower === "cheers" ||
    lower === "great thanks" ||
    lower === "perfect thank you" ||
    (cleanTokens.length <= 3 && (cleanTokens.includes("thanks") || cleanTokens.includes("thank")))
  ) {
    return {
      text: "You're very welcome! 😊 Let me know if you need any further help with your order or gas products.",
      actions: [
        { type: "link", label: "Shop & Order Gas", url: "/order-gas", primary: true },
      ],
    };
  }

  // Extract conversational context for follow-up questions
  const pastUserTexts = history.filter((m) => m.role === "user").map((m) => m.content.toLowerCase());
  const pastAssistantTexts = history.filter((m) => m.role === "assistant").map((m) => m.content.toLowerCase());
  const fullContext = `${pastUserTexts.join(" ")} ${pastAssistantTexts.join(" ")} ${lower}`;

  const isCalorContext = fullContext.includes("calor");
  const isPubGasContext = fullContext.includes("pub gas") || fullContext.includes("co2") || fullContext.includes("cellar");
  const isBBQContext = fullContext.includes("bbq") || fullContext.includes("patio");

  // Load live active products from Supabase
  const allProducts = await fetchAllActiveProducts();

  // =========================================================================
  // 3. CONTACT DETAILS (ONLY when explicitly asked for contact/phone/email)
  // =========================================================================
  const isPhoneQuery =
    lower.includes("phone number") ||
    lower.includes("telephone") ||
    lower.includes("contact number") ||
    lower.includes("call you") ||
    lower.includes("call jss") ||
    lower.includes("give me your phone") ||
    lower.includes("what is your number");

  const isEmailQuery =
    lower.includes("email") ||
    lower.includes("what is your email") ||
    lower.includes("send an email") ||
    lower.includes("email address");

  const isGeneralContactQuery =
    lower.includes("how can i contact you") ||
    lower.includes("how do i contact you") ||
    lower.includes("contact information") ||
    lower.includes("contact details") ||
    lower.includes("contact jss") ||
    lower.includes("speak to someone") ||
    lower.includes("speak to a human") ||
    lower.includes("customer service contact") ||
    lower.includes("talk to someone");

  if (isPhoneQuery && !isEmailQuery) {
    return {
      text: "You can reach John Stayte Services by phone on:\n\n• **Phone**: +44 (0)1453 822859\n\nOur office team is available Monday–Friday 8:00–17:00 and Saturday 8:30–12:30.",
      actions: [
        { type: "link", label: "Contact Us Page", url: "/contact", primary: true },
      ],
    };
  }

  if (isEmailQuery && !isPhoneQuery) {
    return {
      text: "You can email our customer support team at:\n\n✉️ **info@johnstayteservices.co.uk**\n\nWe respond promptly during office hours (Mon–Fri 8:00–17:00, Sat 8:30–12:30).",
      actions: [
        { type: "link", label: "Send an Enquiry", url: "/contact", primary: true },
      ],
    };
  }

  if (isGeneralContactQuery) {
    return {
      text: "### Contact John Stayte Services\n\n• **Phone**: +44 (0)1453 822859\n• **Email**: info@johnstayteservices.co.uk\n• **Head Office**: Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom\n• **Office Hours**: Monday–Friday 8:00–17:00 • Saturday 8:30–12:30\n• **Forecourts**: Wild Goose Garage (Dursley) & Fromebridge Service Station (Whitminster) open 7 days.",
      actions: [
        { type: "link", label: "View Contact Page", url: "/contact", primary: true },
        { type: "link", label: "Filling Stations", url: "/filling-stations" },
      ],
    };
  }

  // =========================================================================
  // 4. "HOW TO ORDER GAS?" / STEP-BY-STEP ORDERING INSTRUCTIONS
  // =========================================================================
  if (
    lower.includes("how to order gas") ||
    lower.includes("how can i order gas") ||
    lower.includes("how do i order gas") ||
    lower.includes("how do i order a cylinder") ||
    lower.includes("how can i order a cylinder") ||
    lower.includes("how can i buy gas") ||
    lower.includes("how do i buy gas") ||
    lower.includes("i want to order gas") ||
    lower.includes("ordering process") ||
    lower.includes("how does ordering work") ||
    (lower.includes("how to order") && !lower.includes("tracking"))
  ) {
    return {
      text: "### How to Order Gas with John Stayte Services\n\nOrdering bottled gas and fuels online is quick and straightforward:\n\n1. **Browse Categories**: Go to **Shop & Order Gas** and select your brand or fuel type (e.g. Calor Gas, Pub Gas, Solid Fuels).\n2. **Choose Product**: Select the cylinder size you need (e.g. 13kg Propane, 5kg Patio Gas).\n3. **Select Option**:\n   • **Refill / Exchange**: Choose this if you have an empty cylinder to hand to the driver on delivery (pay refill gas price only).\n   • **New Cylinder Purchase**: Choose this if you do not have an empty cylinder to return.\n4. **Add to Cart & Review**: Add your items to the basket and check your order summary.\n5. **Checkout & Delivery Details**: Enter your delivery address in Gloucestershire and contact phone number.\n6. **Confirmation & Tracking**: Once submitted, you'll receive an order confirmation and can track scheduled driver delivery with your delivery PIN/OTP directly in your account!",
      actions: [
        { type: "link", label: "Shop & Order Gas →", url: "/order-gas", primary: true },
        { type: "link", label: "Browse Calor Gas", url: "/order-gas?category=calor-gas" },
      ],
    };
  }

  // =========================================================================
  // 5. HELP CHOOSING / "WHICH ONE SHOULD I CHOOSE?" / BBQ RECOMMENDATIONS
  // =========================================================================
  if (
    lower.includes("which one should i choose") ||
    lower.includes("which gas should i choose") ||
    lower.includes("which one do i need") ||
    lower.includes("what gas do i need") ||
    lower.includes("help me choose") ||
    lower.includes("recommend a cylinder") ||
    ((lower.includes("which one") || lower.includes("what should i")) && isBBQContext)
  ) {
    return {
      text: "I'd be happy to help you choose the right cylinder! Here is a quick guide based on what you are running:\n\n• **For Barbecues & Patio Heaters**: Choose **Calor Patio Gas (5kg or 13kg Green)** with the 27mm easy Clip-On valve.\n• **For Indoor Portable Heaters**: Choose **Calor Butane (7kg or 15kg Blue)**.\n• **For Caravans, Catering & Heavy Heating**: Choose **Calor Propane (13kg, 19kg, or 47kg Red)**.\n• **For Beer & Cellar Dispense**: Choose **Stayte Pub Gas CO2 or Mixed Gas**.\n\nTell me what equipment or appliance you want to run, and I will find the exact match!",
      actions: [
        { type: "prompt", label: "I need gas for a BBQ" },
        { type: "prompt", label: "I need indoor heater gas" },
        { type: "link", label: "Shop All Gas Cylinders", url: "/order-gas", primary: true },
      ],
    };
  }

  // =========================================================================
  // 6. ORDER STATUS & DELIVERY TRACKING
  // =========================================================================
  if (
    lower.includes("where is my order") ||
    lower.includes("track my order") ||
    lower.includes("where is my delivery") ||
    lower.includes("when will my delivery arrive") ||
    lower.includes("my latest order") ||
    lower.includes("order status") ||
    lower.includes("has my order been delivered") ||
    lower.includes("has my order been approved") ||
    (lower.includes("when will") && (lower.includes("arrive") || lower.includes("deliver")))
  ) {
    const { isAuthenticated, orders, error } = await toolGetCustomerOrders();

    if (!isAuthenticated) {
      return {
        text: "To check the live status of your order and track scheduled deliveries, please log in to your John Stayte Services account.",
        actions: [
          { type: "link", label: "Log In to Account", url: "/login", primary: true },
          { type: "link", label: "Track with Order ID", url: "/account/orders" },
        ],
      };
    }

    if (error || orders.length === 0) {
      return {
        text: "I checked your account, but there are currently no recent orders on file. If you placed an order as a guest or need assistance, please contact our support team.",
        actions: [
          { type: "link", label: "Shop Gas & Products", url: "/order-gas", primary: true },
          { type: "link", label: "Contact Customer Support", url: "/contact" },
        ],
      };
    }

    const latest = orders[0];
    let statusDescription = "";
    if (latest.status === "Delivered") {
      statusDescription = `Your latest order **#${latest.order_number}** has been **Delivered**.`;
    } else if (latest.status === "Out for Delivery") {
      statusDescription = `Your order **#${latest.order_number}** is **Out for Delivery today** with our delivery driver.`;
    } else if (latest.status === "Approved") {
      statusDescription = `Your order **#${latest.order_number}** has been **Approved** and scheduled for vehicle loading.`;
    } else {
      statusDescription = `Your order **#${latest.order_number}** is currently **${latest.status}**.`;
    }

    const deliveryTiming = latest.delivery_date
      ? ` Scheduled delivery date: **${new Date(latest.delivery_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}**.`
      : " You will receive automated SMS / email updates as the driver approaches your delivery route.";

    return {
      text: `${statusDescription}${deliveryTiming}\n\nHere are your account order details:`,
      orders: [latest],
      actions: [
        { type: "link", label: "View Order Tracking", url: `/account/orders/${latest.id}`, primary: true },
        { type: "link", label: "All Account Orders", url: "/account/orders" },
      ],
    };
  }

  // =========================================================================
  // 7. OPENING HOURS & OFFICE LOCATION (Without generic phone dump)
  // =========================================================================
  if (
    lower.includes("opening hours") ||
    lower.includes("what are your hours") ||
    lower.includes("what time do you open") ||
    lower.includes("what time do you close") ||
    lower.includes("office hours") ||
    lower.includes("are you open today") ||
    lower.includes("open on saturday") ||
    lower.includes("where are you located") ||
    lower.includes("where is your office") ||
    lower.includes("where is your depot")
  ) {
    return {
      text: "### John Stayte Services Opening Hours\n\n• **Main Office & Depot (Stroud / Whitminster)**:\n  - Monday–Friday: **8:00 – 17:00**\n  - Saturday: **8:30 – 12:30**\n  - Sunday: Closed (Deliveries and office)\n\n• **Forecourt Filling Stations (7 Days a Week)**:\n  - **Wild Goose Garage (Dursley)**: Mon–Sat 7:00–19:00 • Sun 9:00–17:00\n  - **Fromebridge Service Station (Whitminster)**: Mon–Sat 7:00–20:00 • Sun 8:00–18:00",
      actions: [
        { type: "link", label: "View Filling Stations", url: "/filling-stations", primary: true },
        { type: "link", label: "Contact Us", url: "/contact" },
      ],
    };
  }

  // =========================================================================
  // 8. FILLING STATIONS & SUNDAY HOURS
  // =========================================================================
  if (
    lower.includes("filling station") ||
    lower.includes("nearest filling station") ||
    lower.includes("open on sunday") ||
    lower.includes("open sunday") ||
    lower.includes("sunday hours") ||
    lower.includes("nearest station") ||
    lower.includes("where can i fill") ||
    lower.includes("autogas near") ||
    lower.includes("wild goose") ||
    lower.includes("fromebridge") ||
    lower.includes("lpg pump") ||
    lower.includes("forecourt")
  ) {
    const stations = await toolGetFillingStations();

    if (lower.includes("sunday")) {
      const sundayDetails = stations
        .map((s) => {
          const sunMatch = s.hours.match(/Sun\s*([\d:–-]+)/i);
          const sunHours = sunMatch ? sunMatch[0] : s.hours;
          return `• **${s.name}** (${s.town}, ${s.postcode}): Open on Sunday (${sunHours}) — Phone: ${s.phone}`;
        })
        .join("\n\n");

      return {
        text: `Yes! Both of our filling stations are open on Sundays across Gloucestershire:\n\n${sundayDetails}\n\nBoth locations offer vehicle Autogas (LPG), bottled gas cylinder exchange, and forecourt supplies.`,
        stations,
        actions: [
          { type: "link", label: "Open Station Map & Directions", url: "/filling-stations", primary: true },
          { type: "link", label: "Contact Forecourts", url: "/contact" },
        ],
      };
    }

    return {
      text: "John Stayte Services operates convenient forecourt filling stations across Gloucestershire offering vehicle Autogas (LPG), cylinder exchanges, and fuels:",
      stations,
      actions: [
        { type: "link", label: "View Station Locations & Maps", url: "/filling-stations", primary: true },
        { type: "link", label: "Contact Forecourts", url: "/contact" },
      ],
    };
  }

  // =========================================================================
  // 9. CYLINDER EXCHANGE & REFILL RULES / NEW CYLINDERS
  // =========================================================================
  if (
    lower.includes("exchange an empty") ||
    lower.includes("exchange my empty") ||
    lower.includes("without an empty") ||
    lower.includes("dont have an empty") ||
    lower.includes("don't have an empty") ||
    lower.includes("no empty cylinder") ||
    lower.includes("need an empty cylinder") ||
    lower.includes("can i buy a new cylinder") ||
    lower.includes("buy a new cylinder") ||
    lower.includes("cylinder exchange work") ||
    lower.includes("how does exchange work") ||
    lower.includes("refill without an empty") ||
    lower.includes("how does cylinder exchange") ||
    (lower.includes("can i get a refill") && !lower.includes("price") && !lower.includes("how much"))
  ) {
    const hasEmpty = !lower.includes("without") && !lower.includes("no empty") && !lower.includes("dont have") && !lower.includes("don't have");

    if (!hasEmpty || lower.includes("buy a new")) {
      return {
        text: "### Buying Without an Empty Cylinder\n\n**Yes, you can absolutely purchase a cylinder without returning an empty one!**\n\n• Simply choose **New Cylinder Purchase** on the product page. You will receive a brand-new, filled cylinder with factory safety seal.\n• If you do have an empty cylinder of the matching group later, you can choose **Refill / Cylinder Exchange** on future orders to pay only the gas refill price.",
        actions: [
          { type: "link", label: "Browse Gas Cylinders", url: "/order-gas?category=calor-gas", primary: true },
          { type: "link", label: "View All Brands", url: "/order-gas" },
        ],
      };
    }

    return {
      text: "### How Cylinder Exchange Works at JSS\n\n• **Refill / Exchange Orders**: You pay for the gas refill. When our delivery driver arrives at your premises, they will simply take your empty cylinder in exchange. There is **no separate return/pickup booking** needed.\n• **New Cylinder Purchase**: If you don't have an empty cylinder to return, select New Cylinder Purchase.\n• **Delivery**: All deliveries are carried out by our dedicated liveried vehicles across Gloucestershire.",
      actions: [
        { type: "link", label: "Order Cylinder Refill", url: "/order-gas?category=calor-gas", primary: true },
        { type: "link", label: "View All Gas Products", url: "/order-gas" },
      ],
    };
  }

  // =========================================================================
  // 10. DELIVERY COVERAGE & TIMINGS
  // =========================================================================
  if (
    lower.includes("do you deliver") ||
    lower.includes("delivery area") ||
    lower.includes("where do you deliver") ||
    lower.includes("how long does delivery take") ||
    lower.includes("delivery take") ||
    lower.includes("delivery timing") ||
    lower.includes("when will it be delivered") ||
    lower.includes("what happens after i place an order") ||
    lower.includes("what happens when the driver arrives") ||
    lower.includes("delivery otp") ||
    lower.includes("handover")
  ) {
    return {
      text: "### Gloucestershire Delivery Information\n\n• **Coverage Area**: We deliver across Gloucestershire including **Stroud, Dursley, Gloucester, Cheltenham, Cirencester, Tewkesbury, Stonehouse, Cotswolds**, and surrounding local zones.\n• **Delivery Timing**: Deliveries typically take **1–3 working days** according to scheduled local rounds.\n• **Order Handover**: When our driver arrives with your cylinders, simply provide the **Delivery Verification PIN/OTP** shown on your delivery tracker.\n• **Cylinder Swap**: If you ordered a Refill Exchange, please have your empty cylinder ready for collection.",
      actions: [
        { type: "link", label: "Track Live Delivery", url: "/account/deliveries", primary: true },
        { type: "link", label: "Order Gas Online", url: "/order-gas" },
      ],
    };
  }

  // =========================================================================
  // 11. PROPANE VS BUTANE & USAGE GUIDES
  // =========================================================================
  if (
    (lower.includes("propane") && lower.includes("butane")) ||
    lower.includes("difference between propane") ||
    lower.includes("which gas should i use")
  ) {
    return {
      text: "### Propane vs Butane Guide\n\n• **Propane (Red Cylinders & Green Patio Gas)**: Operates down to -42°C. Ideal for **outdoor use**, patio heaters, BBQ grills, caravans, commercial catering, and winter heating.\n• **Patio Gas (5kg & 13kg Green)**: Propane gas fitted with a 27mm easy Clip-On valve for modern barbecues and patio heaters.\n• **Butane (Blue Cylinders)**: Operates down to 0°C. Best suited for **indoor portable cabinet heaters** (e.g. Superheat, Lifestyle) and indoor camping stoves in mild weather.",
      actions: [
        { type: "link", label: "Shop Calor Propane", url: "/order-gas?brand=calor-gas&category=calor-gas", primary: true },
        { type: "link", label: "Shop Calor Butane", url: "/order-gas?brand=calor-gas&category=calor-gas" },
      ],
    };
  }

  // =========================================================================
  // 12. GAS FOR BBQS & PATIO HEATERS
  // =========================================================================
  if (
    lower.includes("gas for bbq") ||
    lower.includes("bbq gas") ||
    lower.includes("barbecue gas") ||
    lower.includes("patio heater") ||
    lower.includes("patio gas") ||
    (lower.includes("bbq") && (lower.includes("sell") || lower.includes("have") || lower.includes("gas") || lower.includes("need") || lower.includes("want")))
  ) {
    const bbqGasProds = allProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sub = (p.subcategory || "").toLowerCase();
      return (
        name.includes("patio gas") ||
        name.includes("propane") ||
        name.includes("bbq") ||
        sub.includes("patio") ||
        sub.includes("barbecue")
      );
    });

    return {
      text: "Yes, we supply gas specifically designed for barbecues and outdoor patio heaters:\n\n• **Calor Patio Gas (5kg & 13kg Green Cylinders)**: Propane gas featuring a 27mm Clip-On connection designed for quick attachment to gas BBQs and patio heaters.\n• **Standard Calor Propane (6kg, 13kg, 19kg, 47kg Red Cylinders)**: For larger commercial patio heaters, catering grills, and screw-on POL fittings.\n• We also stock charcoal BBQs, smoker BBQs, and Sahara & Bonningtons patio heaters.",
      products: bbqGasProds.slice(0, 4).map(mapProductToCard),
      actions: [
        { type: "link", label: "Shop Patio Gas & BBQs", url: "/order-gas?category=calor-gas", primary: true },
        { type: "link", label: "View Gas Appliances", url: "/order-gas?category=gas-appliances" },
      ],
    };
  }

  // =========================================================================
  // 13. PUB GAS, CO2 & CELLAR PRODUCTS
  // =========================================================================
  if (
    lower.includes("pub gas") ||
    lower.includes("cellar gas") ||
    lower.includes("beer gas") ||
    lower.includes("co2") ||
    lower.includes("carbon dioxide") ||
    lower.includes("mixed gas") ||
    lower.includes("30/70") ||
    lower.includes("50/50") ||
    lower.includes("60/40") ||
    lower.includes("o-ring") ||
    lower.includes("spanner")
  ) {
    let pubProds = allProducts.filter((p) => {
      const b = (p.brand || "").toLowerCase();
      const n = (p.name || "").toLowerCase();
      const s = (p.slug || "").toLowerCase();
      return (
        b === "air liquide" ||
        b === "stayte pub gas" ||
        n.includes("carbon dioxide") ||
        n.includes("mixed gas") ||
        n.includes("o-ring") ||
        n.includes("spanner") ||
        s.includes("co2")
      );
    });

    if (lower.includes("o-ring") || lower.includes("spanner")) {
      pubProds = pubProds.filter((p) => {
        const n = (p.name || "").toLowerCase();
        return n.includes("o-ring") || n.includes("spanner");
      });
    } else if (lower.includes("co2") || lower.includes("carbon dioxide")) {
      pubProds = pubProds.filter((p) => {
        const n = (p.name || "").toLowerCase();
        return n.includes("carbon dioxide") || n.includes("co2");
      });
    }

    return {
      text: "John Stayte Services is an official distributor of Air Liquide and Stayte Pub Gas supplies for hospitality, pubs, and cellars across Gloucestershire:\n\n• **Carbon Dioxide (CO2)**: Available in 6.35kg, 22.6kg, and 34kg cylinders.\n• **Mixed Gas**: 10L & 47L cylinders in 30/70 (stouts/ales), 50/50, and 60/40 (lagers/ciders).\n• **Cellar Accessories**: CO2 O-rings, Mixed Gas O-rings, and heavy-duty Pub Gas Spanners.",
      products: pubProds.slice(0, 5).map(mapProductToCard),
      actions: [
        { type: "link", label: "Shop Pub Gas Range", url: "/order-gas?category=pub-gas", primary: true },
      ],
    };
  }

  // =========================================================================
  // 14. SOLID FUELS, COAL, KILN DRIED LOGS, HEAT LOGS & KINDLING
  // =========================================================================
  if (
    lower.includes("coal") ||
    lower.includes("solid fuel") ||
    lower.includes("kiln dried") ||
    lower.includes("logs") ||
    lower.includes("kindling") ||
    lower.includes("smokeless fuel") ||
    lower.includes("brazier") ||
    lower.includes("taybrite") ||
    lower.includes("homefire") ||
    lower.includes("heat log")
  ) {
    const solidProds = allProducts.filter((p) => {
      const b = (p.brand || "").toLowerCase();
      const n = (p.name || "").toLowerCase();
      const s = (p.subcategory || "").toLowerCase();
      return (
        b === "cpl" ||
        b === "brazier" ||
        b === "taybrite" ||
        b === "homefire" ||
        b === "national coal" ||
        b === "stayte fuels" ||
        s.includes("smokeless") ||
        s.includes("logs") ||
        s.includes("kindling") ||
        s.includes("fuel") ||
        n.includes("coal") ||
        n.includes("logs") ||
        n.includes("kindling")
      );
    });

    return {
      text: "We supply Defra-approved Ready-to-Burn domestic smokeless coal, kiln-dried hardwood logs, heat logs, and kindling:\n\n• **Smokeless Fuels**: Homefire 25kg, Brazier 10kg/20kg, Taybrite 25kg, Stoveflame 25kg.\n• **Kiln-Dried Logs**: Homefire 8kg bags (under 20% moisture content) and Stayte Fuels nets.\n• **Heat Logs & Kindling**: CPL Heat Log Blocks (pack of 8), Homefire Twizlers natural firelighters, Big K hollow heat logs.",
      products: solidProds.slice(0, 5).map(mapProductToCard),
      actions: [
        { type: "link", label: "Shop Coal & Logs", url: "/order-gas?category=coal-logs", primary: true },
      ],
    };
  }

  // =========================================================================
  // 15. BRANDS & GENERAL CATALOGUE OVERVIEW
  // =========================================================================
  if (
    lower.includes("what brands") ||
    lower.includes("which brands") ||
    lower.includes("brands do you sell") ||
    lower.includes("brands do you have") ||
    lower.includes("what products do you have") ||
    lower.includes("what do you sell") ||
    lower.includes("show all products")
  ) {
    return {
      text: `John Stayte Services is an authorized distributor for leading energy, outdoor living, and fuel brands:\n\n• **Bottled Gas & LPG**: Calor Gas, Campingaz, Air Liquide, Stayte Pub Gas\n• **Gas Appliances & BBQs**: Char-Broil, Sahara, Bonningtons, Kingfisher, Lifestyle Appliances\n• **Solid Fuels & Logs**: Homefire, CPL, Brazier, Taybrite, National Coal, Big K, Stayte Fuels\n• **Gas Regulators & Spares**: Clesse (Valves, Clip-On & Propane Regulators)\n• **Country & Field Supplies**: Dynamite Baits (Fishing), Autarky & Countrywide (Animal Feeds)\n\nWhat category or brand can I help you find?`,
      actions: [
        { type: "link", label: "Shop by Brand", url: "/order-gas", primary: true },
        { type: "link", label: "Shop All Categories", url: "/order-gas" },
      ],
    };
  }

  // =========================================================================
  // 16. CHEAPEST CYLINDER / PRICE RANKING
  // =========================================================================
  if (
    lower.includes("cheapest") ||
    lower.includes("lowest price") ||
    lower.includes("most affordable")
  ) {
    const gasCylinders = allProducts
      .filter((p) => {
        const b = (p.brand || "").toLowerCase();
        const n = (p.name || "").toLowerCase();
        return (b === "calor" || b === "campingaz" || n.includes("refill") || n.includes("cylinder")) && p.price > 0;
      })
      .sort((a, b) => a.price - b.price);

    return {
      text: `Here are our most affordable bottled gas refills and cylinder options currently available in the catalogue:`,
      products: gasCylinders.slice(0, 4).map(mapProductToCard),
      actions: [
        { type: "link", label: "Shop Gas Refills", url: "/order-gas?category=calor-gas", primary: true },
      ],
    };
  }

  // =========================================================================
  // 17. STOCK AVAILABILITY / IN-STOCK PRODUCTS
  // =========================================================================
  if (
    lower.includes("in stock") ||
    lower.includes("currently in stock") ||
    lower.includes("stock availability")
  ) {
    const inStock = allProducts.filter((p) => (p.stock || 0) > 0 || p.is_active);
    return {
      text: `Our Gloucestershire depot is fully stocked with active inventory across all major categories including Calor Propane, Butane, Patio Gas, Air Liquide Pub Gas, smokeless coal, and kiln-dried logs. All items marked in stock are available for prompt delivery.`,
      products: inStock.slice(0, 4).map(mapProductToCard),
      actions: [
        { type: "link", label: "View Live Stock Catalogue", url: "/order-gas", primary: true },
      ],
    };
  }

  // =========================================================================
  // 18. TRADE ACCOUNT & GAS APPLICATION
  // =========================================================================
  if (
    lower.includes("apply for a gas account") ||
    lower.includes("trade account") ||
    lower.includes("open an account") ||
    lower.includes("commercial gas account") ||
    lower.includes("my application") ||
    lower.includes("application status")
  ) {
    const { isAuthenticated, application } = await toolGetCustomerApplication();

    if (isAuthenticated && application) {
      const statusBadge = (application.status || "SUBMITTED").toUpperCase();
      return {
        text: `Your gas account application (**#${application.id}**) is currently **${statusBadge}**.\n\n${
          application.status === "APPROVED"
            ? "✅ Your trade account is active! You can place cylinder orders at your agreed business rates."
            : "⏳ Our team is reviewing your application details. You will receive confirmation via email as soon as approval is finalized."
        }`,
        application: [application],
        actions: [
          { type: "link", label: "View Application Form", url: "/account/application", primary: true },
        ],
      };
    }

    return {
      text: "### Gas Customer Account Application\n\nCommercial kitchens, pubs, farms, heating engineers, and high-volume domestic users can open an account with John Stayte Services:\n\n1. **Submit Application**: Complete our online form with your business and cylinder requirements.\n2. **Email Verification**: Confirm your email via the secure verification link.\n3. **Approval**: Our accounts team reviews details promptly and activates trade pricing on your account.",
      actions: [
        { type: "link", label: "Apply for Gas Account", url: "/account/application", primary: true },
        { type: "link", label: "Commercial LPG Details", url: "/about" },
      ],
    };
  }

  // =========================================================================
  // 19. DYNAMIC NATURAL PRODUCT & PRICE MATCHING (Live Database Query)
  // =========================================================================
  // Extract weight/size keywords (e.g. 13kg, 19kg, 47kg, 6kg, 7kg, 15kg, 34kg, 22.6kg, 6.35kg, 10kg, 20kg, 25kg)
  const weightMatch = lower.match(/(\d+(?:\.\d+)?\s*(?:kg|l|kw))/i);
  const targetWeight = weightMatch ? weightMatch[0].replace(/\s+/g, "").toLowerCase() : "";

  // Extract explicit brand or gas keywords
  const isCalor = lower.includes("calor") || (isCalorContext && !lower.includes("campingaz"));
  const isPropane = lower.includes("propane") || lower.includes("patio gas");
  const isButane = lower.includes("butane");
  const isCampingaz = lower.includes("campingaz") || lower.includes("camping gaz");
  const isCharBroil = lower.includes("char-broil") || lower.includes("charbroil");
  const isBonningtons = lower.includes("bonningtons");
  const isClesse = lower.includes("clesse") || lower.includes("regulator") || lower.includes("valve");

  const isPriceQuery =
    lower.includes("how much") ||
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("rate");

  // Score products based on natural language match
  const scoredProducts = allProducts
    .map((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const sub = (p.subcategory || "").toLowerCase();
      const slug = (p.slug || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      let score = 0;

      if (targetWeight && (name.includes(targetWeight) || sub.includes(targetWeight) || slug.includes(targetWeight))) {
        score += 50;
      }
      if (isCalor && brand === "calor") score += 30;
      if (isCampingaz && brand === "campingaz") score += 30;
      if (isPropane && (name.includes("propane") || name.includes("patio gas") || sub.includes("propane"))) score += 30;
      if (isButane && (name.includes("butane") || sub.includes("butane"))) score += 30;
      if (isCharBroil && brand === "char-broil") score += 30;
      if (isBonningtons && brand === "bonningtons") score += 30;
      if (isClesse && (brand === "clesse" || name.includes("regulator") || name.includes("valve"))) score += 30;

      // Match user query tokens
      const words = lower.split(/\s+/).filter((w) => w.length > 2 && !["the", "and", "for", "with", "you", "have", "sell", "much", "price", "cost", "how", "what", "can", "get", "need", "where", "when", "does", "order"].includes(w));
      words.forEach((w) => {
        if (name.includes(w)) score += 15;
        if (brand.includes(w)) score += 10;
        if (sub.includes(w)) score += 10;
        if (desc.includes(w)) score += 5;
      });

      return { product: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // If we found solid product matches for product/price intents
  const hasProductIntent =
    isCalor ||
    isPropane ||
    isButane ||
    isCampingaz ||
    isPriceQuery ||
    Boolean(targetWeight) ||
    lower.includes("product") ||
    lower.includes("cylinder") ||
    lower.includes("bottle") ||
    lower.includes("sell") ||
    lower.includes("buy") ||
    lower.includes("have");

  if (scoredProducts.length > 0 && hasProductIntent) {
    const topMatches = scoredProducts.slice(0, 5).map((item) => mapProductToCard(item.product));
    const firstProd = topMatches[0];

    let responseHeadline = "";
    if (isPriceQuery) {
      responseHeadline = `Our current live price for **${firstProd.name}** is **${formatGbp(firstProd.price)}**.`;
      if (topMatches.length > 1) {
        responseHeadline += ` We also have related options available:`;
      }
    } else {
      responseHeadline = `Yes, we supply **${firstProd.name}** (${formatGbp(firstProd.price)}) in stock and available for delivery across Gloucestershire:`;
    }

    const actions: ChatAction[] = [
      {
        type: "link",
        label: `View ${firstProd.name}`,
        url: `/products/${firstProd.slug}`,
        primary: true,
      },
      {
        type: "link",
        label: "Shop Catalogue",
        url: firstProd.brand ? `/order-gas?brand=${encodeURIComponent(firstProd.brand)}` : "/order-gas",
      },
    ];

    return {
      text: `${responseHeadline}\n\nAll cylinders are available for **Refill / Exchange** or **New Cylinder Purchase** with doorstep delivery by our Gloucestershire team.`,
      products: topMatches,
      actions,
    };
  }

  // =========================================================================
  // 20. NATURAL CONVERSATIONAL FALLBACK (Polite, specific, never dumping spam)
  // =========================================================================
  return {
    text: "I want to make sure I give you the most accurate answer. You can ask me about our bottled gas prices, cylinder exchange rules, delivery areas, filling stations, or order tracking.\n\nIf you have a specific enquiry for our office, our team can also assist you directly on **+44 (0)1453 822859** or **info@johnstayteservices.co.uk**.",
    actions: [
      { type: "prompt", label: "How to order gas?" },
      { type: "prompt", label: "Do you sell Calor gas?" },
      { type: "prompt", label: "Where is my order?" },
      { type: "link", label: "Contact Us", url: "/contact" },
    ],
  };
}
