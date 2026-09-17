import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Flame,
  UtensilsCrossed,
  Logs,
  Fish,
  Dog,
  Tent,
  CookingPot,
  Sprout,
  Utensils,
  Wrench,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Info,
  HelpCircle,
  Truck,
  ArrowRight,
  Tag,
  Layers,
  Star,
  Mail,
  Award,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Plus,
  Minus,
  XCircle,
  X,
  SlidersHorizontal,
  Package,
  Heart,
  ShoppingCart,
  Shirt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gbp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { INITIAL_GAS_PRODUCTS } from "@/lib/cylinder-service";
import { ProductDetailsModal } from "@/components/site/ProductDetailsModal";
import { ShopByBrandSection } from "@/components/site/ShopByBrandSection";
import { ALL_BRANDS } from "@/data/brands";
import { ConditionsOfUseContent } from "@/components/site/ConditionsOfUseContent";

export const resolveBrandToCategoryId = (brandQuery?: string | null): string => {
  if (!brandQuery) return "calor-gas";
  const b = brandQuery.trim().toLowerCase();

  if (b === "calor" || b === "calor gas" || b === "calor-gas") return "calor-gas";
  if (b === "air liquide" || b === "air-liquide" || b === "airliquide") return "air-liquide";
  if (b === "boc" || b === "boc gases" || b === "boc-gases") return "boc-gases";
  if (b === "dynamite baits" || b === "dynamite-baits" || b === "dynamite" || b === "fishing-baits") return "dynamite-baits";
  if (b === "campingaz" || b === "camping az") return "campingaz";
  if (b === "melcourt" || b.includes("melcourt")) return "garden";
  if (b.includes("clesse") || b.includes("cleese")) return "cleese-uk";
  if (b.includes("rudrum")) return "c-rudrum-and-sons";
  if (b.includes("bio-bean") || b.includes("bio bean") || b === "biobean") return "bio-bean";
  if (b.includes("bar-be-quick") || b.includes("bar be quick") || b === "barbequick") return "bar-be-quick";
  if (b.includes("broil-king") || b.includes("broil king") || b === "broilking") return "broil-king";
  if (b.includes("char-broil") || b.includes("char broil") || b === "charbroil") return "char-broil";
  if (b.includes("lifestyle") || b.includes("lifestyle-appliances")) return "lifestyle-appliances";
  if (b.includes("renewable") || b.includes("renewable-wood-fuels")) return "renewable-wood-fuels";
  if (b.includes("swf") || b.includes("scotland")) return "swf-scotland";
  if (b.includes("sunngas") || b.includes("sungas") || b.includes("sun-gas")) return "sunngas";
  if (b.includes("cpl") || b.includes("c.p.l")) return "cpl-products";
  if (b.includes("forest") || b.includes("forest-lighter")) return "forest-lighter";
  if (b.includes("devon") || b.includes("devon-bio-fuels")) return "devon-bio-fuels";
  if (b.includes("national-coal") || b.includes("national coal")) return "national-coal";
  if (b.includes("new-world") || b.includes("new world")) return "new-world";

  // Check ALL_BRANDS by exact id, slug, or matching name
  const found = ALL_BRANDS.find(
    (item) =>
      item.id.toLowerCase() === b ||
      item.slug.toLowerCase() === b ||
      item.name.toLowerCase() === b ||
      item.name.toLowerCase().includes(b) ||
      b.includes(item.slug.toLowerCase()) ||
      b.includes(item.id.toLowerCase())
  );
  if (found) {
    return found.id;
  }
  return b;
};

interface OrderGasCatalogueSectionProps {
  onSelectGasProduct?: (
    productId: string,
    usageType?: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS",
    product?: any,
    quantity?: number,
  ) => void;
  onViewProductDetail?: (product: any) => void;
  selectedCategoryOverride?: string | null;
  onSelectCategoryChange?: (categoryId: string) => void;
}

type MainCategoryKey =
  | "calor-gas"
  | "air-liquide"
  | "boc-gases"
  | "autarky"
  | "big-k"
  | "bar-be-quick"
  | "beekind"
  | "bio-bean"
  | "bonningtons"
  | "broil-king"
  | "c-rudrum-and-sons"
  | "cadac"
  | "cambrian"
  | "char-broil"
  | "cleese-uk"
  | "cpl-products"
  | "devon-bio-fuels"
  | "forest-lighter"
  | "homefire"
  | "indesit"
  | "kingfisher"
  | "lifestyle-appliances"
  | "maxibrite"
  | "national-coal"
  | "new-world"
  | "renewable-wood-fuels"
  | "sahara"
  | "swp"
  | "swf-scotland"
  | "sunngas"
  | "pub-gas"
  | "coal-fuels"
  | "coal-logs"
  | "dynamite-baits"
  | "animal-feed"
  | "campingaz"
  | "gas-appliances"
  | "garden"
  | "food"
  | "trailers"
  | "workwear"
  | "gas-spares";

interface CategoryItem {
  id: MainCategoryKey | string;
  name: string;
  icon: React.ElementType;
  subs: { id: string; name: string; isRefill?: boolean }[];
  description: string;
  notice?: string;
  brandLogo?: string;
}

const ICON_LOOKUP: Record<string, React.ElementType> = {
  Flame,
  UtensilsCrossed,
  Logs,
  Fish,
  Dog,
  Tent,
  CookingPot,
  Sprout,
  Utensils,
  Wrench,
  Truck,
  Shirt,
  Layers,
  Package,
  Car: Truck,
  Home: Flame,
  Building2: Flame,
  Factory: Flame,
};

export interface CalorGasGroup {
  id: string;
  name: string;
  refillId: string;
  refillName: string;
  description: string;
  image: string;
}

export const CALOR_GAS_GROUPS: CalorGasGroup[] = [
  {
    id: "patio-gas",
    name: "Patio Gas",
    refillId: "patio-refill",
    refillName: "Patio Gas Refill (cylinder exchange)",
    description:
      "Calor Patio Gas cylinders equipped with easy 27mm clip-on connector. You must have an empty bottle to return when ordering a gas refill.",
    image: "/calor-patio-13kg.png",
  },
  {
    id: "butane",
    name: "Butane",
    refillId: "butane-refill",
    refillName: "Butane Refill (cylinder exchange)",
    description:
      "Butane Refill cylinders. You must have an empty bottle to return when ordering a gas refill.",
    image: "/calor-butane-7kg.png",
  },
  {
    id: "propane",
    name: "Propane",
    refillId: "propane-refill",
    refillName: "Propane Refill (cylinder exchange)",
    description:
      "Calor Propane cylinders with standard POL screw connector. You must have an empty bottle to return when ordering a gas refill.",
    image: "/calor-propane-13kg.png",
  },
];

const CATEGORIES_DATA: CategoryItem[] = [
  {
    id: "calor-gas",
    name: "Calor Gas",
    icon: Flame,
    subs: [
      { id: "patio-gas", name: "Patio Gas" },
      { id: "patio-refill", name: "Patio Gas Refill (cylinder exchange)", isRefill: true },
      { id: "butane", name: "Butane" },
      { id: "butane-refill", name: "Butane Refill (cylinder exchange)", isRefill: true },
      { id: "propane", name: "Propane" },
      { id: "propane-refill", name: "Propane Refill (cylinder exchange)", isRefill: true },
    ],
    description:
      "Calor Patio Gas & LPG Refill cylinders. You must have an empty bottle to return when ordering a gas refill.",
    brandLogo: "/brands/calor.png",
  },
  {
    id: "air-liquide",
    name: "Air Liquide",
    icon: Flame,
    subs: [
      { id: "all", name: "All Air Liquide" },
      { id: "co2", name: "CO2 / Carbon Dioxide" },
      { id: "mixed-gas", name: "Mixed Gas" },
    ],
    description:
      "Official Air Liquide dispense and cellar gases for hospitality, pub, restaurant and beverage operations.",
    brandLogo: "/brands/air-liquide-official.png",
  },
  {
    id: "boc-gases",
    name: "BOC Gases",
    icon: Flame,
    subs: [{ id: "all", name: "All BOC Gases" }],
    description:
      "Official BOC industrial, medical and specialty gases. Real product catalogue coming soon.",
    brandLogo: "/brands/boc-logo.svg",
  },
  {
    id: "autarky",
    name: "Autarky",
    icon: Dog,
    subs: [{ id: "all", name: "All Autarky" }],
    description:
      "Autarky naturally balanced, 100% natural canine nutrition crafted with delicious recipes for active and working dogs.",
    brandLogo: "/brands/autarky.png",
  },
  {
    id: "big-k",
    name: "Big K",
    icon: Flame,
    subs: [{ id: "all", name: "All Big K" }],
    description:
      "Restaurant-grade lumpwood charcoal, instant lighting firelogs, hollow heat logs, disposable barbecues and lighter fluid.",
    brandLogo: "/brands/big-k.png",
  },
  {
    id: "bar-be-quick",
    name: "Bar-Be-Quick",
    icon: CookingPot,
    subs: [{ id: "all", name: "All Bar-Be-Quick" }],
    description:
      "Instant barbecues, lighting fluid and outdoor cooking accessories.",
    brandLogo: "/brands/bar-be-quick.png",
  },
  {
    id: "beekind",
    name: "BeeKind",
    icon: Logs,
    subs: [{ id: "all", name: "All BeeKind" }],
    description:
      "Eco-friendly wood briquettes and sustainable clean heating fuels.",
    brandLogo: "/brands/beekind.png",
  },
  {
    id: "bio-bean",
    name: "bio-bean",
    icon: Logs,
    subs: [{ id: "all", name: "All bio-bean" }],
    description:
      "Coffee logs and sustainable clean biomass fuels.",
    brandLogo: "/brands/bio-bean.png",
  },
  {
    id: "bonningtons",
    name: "Bonningtons",
    icon: CookingPot,
    subs: [{ id: "all", name: "All Bonningtons" }],
    description:
      "Outdoor patio heaters, barbecue fire pits, and garden smokers.",
    brandLogo: "/brands/bonningtons.png",
  },
  {
    id: "broil-king",
    name: "Broil King",
    icon: Flame,
    subs: [{ id: "all", name: "All Broil King" }],
    description:
      "High-performance gas and charcoal barbecues.",
    brandLogo: "/brands/broil-king.png",
  },
  {
    id: "c-rudrum-and-sons",
    name: "C. Rudrum & Sons",
    icon: Logs,
    subs: [{ id: "all", name: "All C. Rudrum & Sons" }],
    description:
      "Solid fuels, logs, smokeless coal, and domestic heating supplies.",
    brandLogo: "/brands/c-rudrum-and-sons.png",
  },
  {
    id: "cadac",
    name: "Cadac",
    icon: CookingPot,
    subs: [{ id: "all", name: "All Cadac" }],
    description:
      "Modular portable gas barbecues and camping chef equipment.",
    brandLogo: "/brands/cadac.png",
  },
  {
    id: "cambrian",
    name: "Cambrian",
    icon: Flame,
    subs: [{ id: "all", name: "All Cambrian" }],
    description:
      "Coal and domestic heating fuel supplies.",
    brandLogo: "/brands/cambrian.png",
  },
  {
    id: "char-broil",
    name: "Char-Broil",
    icon: Flame,
    subs: [{ id: "all", name: "All Char-Broil" }],
    description:
      "America's favourite gas, charcoal and electric outdoor barbecues and modular outdoor kitchens.",
    brandLogo: "/brands/char-broil.png",
  },
  {
    id: "cleese-uk",
    name: "Cleese UK",
    icon: Settings,
    subs: [{ id: "all", name: "All Cleese UK" }],
    description:
      "High performance LPG regulators, automatic changeover valves, and gas safety fittings.",
    brandLogo: "/brands/cleese-uk.png",
  },
  {
    id: "cpl-products",
    name: "CPL Products",
    icon: Flame,
    subs: [{ id: "all", name: "All CPL Products" }],
    description:
      "Smokeless solid fuels, coal, firelighters, and winter heating supplies.",
    brandLogo: "/brands/cpl-products.png",
  },
  {
    id: "devon-bio-fuels",
    name: "Devon Bio Fuels",
    icon: Flame,
    subs: [{ id: "all", name: "All Devon Bio Fuels" }],
    description: "Kiln-dried hardwood logs, kindling, and bio-heating.",
    brandLogo: "/brands/devon-bio-fuels.png",
  },
  {
    id: "forest-lighter",
    name: "Forest Lighter",
    icon: Flame,
    subs: [{ id: "all", name: "All Forest Lighter" }],
    description: "Natural wood firelighters and kiln dried kindling sticks.",
    brandLogo: "/brands/forest-lighter.png",
  },
  {
    id: "homefire",
    name: "Homefire",
    icon: Flame,
    subs: [{ id: "all", name: "All Homefire" }],
    description: "Market-leading smokeless ovals, kiln dried logs, and fire supplies.",
    brandLogo: "/brands/homefire.png",
  },
  {
    id: "indesit",
    name: "Indesit",
    icon: Flame,
    subs: [{ id: "all", name: "All Indesit" }],
    description: "Domestic and commercial gas cookers and appliances.",
    brandLogo: "/brands/indesit.png",
  },
  {
    id: "kingfisher",
    name: "Kingfisher",
    icon: Flame,
    subs: [{ id: "all", name: "All Kingfisher" }],
    description: "Outdoor tools, garden accessories, and durable hardware.",
    brandLogo: "/brands/kingfisher.png",
  },
  {
    id: "lifestyle-appliances",
    name: "Lifestyle Appliances",
    icon: Flame,
    subs: [{ id: "all", name: "All Lifestyle Appliances" }],
    description: "Mobile cabinet heaters, patio heaters, and indoor flame heaters.",
    brandLogo: "/brands/lifestyle-appliances.png",
  },
  {
    id: "maxibrite",
    name: "Maxibrite",
    icon: Flame,
    subs: [{ id: "all", name: "All Maxibrite" }],
    description: "Clean burning, high heat smokeless ovals for open fires and stoves.",
    brandLogo: "/brands/maxibrite.png",
  },
  {
    id: "national-coal",
    name: "National Coal",
    icon: Flame,
    subs: [{ id: "all", name: "All National Coal" }],
    description: "Traditional British coals, kiln dried kindling, and premium solid fuels.",
    brandLogo: "/brands/national-coal.png",
  },
  {
    id: "new-world",
    name: "New World",
    icon: Flame,
    subs: [{ id: "all", name: "All New World" }],
    description: "Freestanding gas cookers, hobs, and domestic appliances.",
    brandLogo: "/brands/new-world.png",
  },
  {
    id: "renewable-wood-fuels",
    name: "Renewable Wood Fuels Ltd",
    icon: Flame,
    subs: [{ id: "all", name: "All Renewable Wood Fuels Ltd" }],
    description: "Sustainable hardwood logs and biomass energy solutions.",
    brandLogo: "/brands/renewable-wood-fuels.png",
  },
  {
    id: "sahara",
    name: "Sahara",
    icon: Flame,
    subs: [{ id: "all", name: "All Sahara" }],
    description: "Premium gas barbecues and outdoor patio heating systems.",
    brandLogo: "/brands/sahara.png",
  },
  {
    id: "swp",
    name: "SWP",
    icon: Flame,
    subs: [{ id: "all", name: "All SWP" }],
    description: "Specialized welding products, regulators, torches, and gas fittings.",
    brandLogo: "/brands/swp.png",
  },
  {
    id: "swf-scotland",
    name: "SWF Scotland",
    icon: Flame,
    subs: [{ id: "all", name: "All SWF Scotland" }],
    description: "Solid fuels, premium coals, and heating supplies.",
    brandLogo: "/brands/swf-scotland.png",
  },
  {
    id: "sunngas",
    name: "SunGas",
    icon: Flame,
    subs: [{ id: "all", name: "All SunGas" }],
    description: "Camping cookers, portable gas stoves, and leisure accessories.",
    brandLogo: "/brands/sunngas.png",
  },
  {
    id: "pub-gas",
    name: "Pub Gas",
    icon: UtensilsCrossed,
    subs: [
      { id: "all", name: "All Pub Gas" },
      { id: "co2", name: "CO2 / Carbon Dioxide" },
      { id: "mixed-gas", name: "Mixed Gas" },
      { id: "spanner", name: "Pub Gas Spanner" },
      { id: "mixed-oring", name: "Mixed Gas O-ring" },
      { id: "co2-oring", name: "CO2 O-ring" },
    ],
    description:
      "Food-grade dispense gases and cellar accessories for pubs, bars, restaurants and breweries across Gloucestershire. (Pub customers only for cellar cylinders).",
    brandLogo: "/pub-gas-co2-6-35kg.png",
  },
  {
    id: "coal-fuels",
    name: "Coal & Other Fuels",
    icon: Logs,
    subs: [
      { id: "all", name: "All" },
      { id: "smokeless-fuel", name: "Smokeless Fuel" },
      { id: "kiln-dried-logs", name: "Kiln Dried Logs" },
      { id: "kindling-heat-logs", name: "Kindling & Heat Logs" },
      { id: "charcoal", name: "Charcoal" },
      { id: "firelighters", name: "Firelighters" },
      { id: "barbecue", name: "Barbecue" },
    ],
    description:
      "HETAS and Defra approved Ready-to-Burn domestic fuels, smokeless coal ovals, and kiln-dried ash logs.",
  },
  {
    id: "dynamite-baits",
    name: "Dynamite Fishing Baits",
    icon: Fish,
    subs: [
      { id: "groundbait", name: "Groundbait" },
      { id: "pellets", name: "Pellets" },
    ],
    description:
      "Premium carp, coarse and predator fishing baits, groundbait, and pellets.",
    brandLogo: "/brands/dynamite-baits.png",
  },
  {
    id: "animal-feed",
    name: "Animal Feed",
    icon: Dog,
    subs: [
      { id: "all", name: "All" },
      { id: "wild-bird", name: "Wild Bird Food" },
      { id: "dog-food", name: "Dog Food" },
      { id: "poultry-feed", name: "Poultry & Farm Feed" },
    ],
    description:
      "Nutritious wild bird seed, complete dog food, equine feeds, and farm supplements.",
    brandLogo: "/more-than-fuel-animal-feed.jpg",
  },
  {
    id: "campingaz",
    name: "Campingaz",
    icon: Tent,
    subs: [],
    description:
      "Lightweight, portable butane gas bottles and camping equipment exchangeable across Europe.",
    brandLogo: "/brands/campingaz.png",
  },
  {
    id: "gas-appliances",
    name: "Gas Appliances",
    icon: CookingPot,
    subs: [
      { id: "barbecues", name: "Barbecues" },
      { id: "mobile-heaters", name: "Mobile Heaters" },
      { id: "patio-heaters", name: "Patio Heaters" },
      { id: "camping", name: "Camping" },
    ],
    description:
      "Gas appliances for all your heating, barbecue and camping needs.",
    brandLogo: "/brands/char-broil.png",
  },
  {
    id: "garden",
    name: "Garden",
    icon: Sprout,
    subs: [],
    description:
      "Compost, soil, organic planters, decorative bark & everything you need for a thriving garden.",
    brandLogo: "/garden-cat.jpg",
  },
  {
    id: "food",
    name: "Food",
    icon: Utensils,
    subs: [
      { id: "local", name: "Local Forecourt Produce" },
      { id: "wildlife", name: "Wild Bird Seed & Treats" },
    ],
    description:
      "Forecourt pantry goods, local honey, snacks, and wild bird feeds available at our service stations.",
  },
  {
    id: "gas-spares",
    name: "Gas Spares",
    icon: Wrench,
    subs: [
      { id: "butane-regulators", name: "Butane Regulators" },
      { id: "propane-regulators", name: "Propane Regulators" },
      { id: "changeover-valves", name: "Changeover Valves" },
    ],
    description:
      "BS certified low-pressure gas regulators, clip-on cylinder fittings, and automatic changeover valves.",
  },
  {
    id: "trailers",
    name: "Trailers",
    icon: Truck,
    subs: [],
    description:
      "Single axle & heavy-duty haulage trailers for domestic & commercial use, trailer servicing and accessories.",
    brandLogo: "/trailers-cat.jpg",
  },
  {
    id: "workwear",
    name: "Workwear",
    icon: Shirt,
    subs: [],
    description:
      "High-visibility waterproof jackets, heavy-duty trousers, safety boots & PPE for trade and agricultural work.",
    brandLogo: "/workwear-cat.jpg",
  },
];

export interface CatalogProductItem {
  id: string;
  name: string;
  slug: string;
  brand: string;
  price: number;
  stock: number;
  image_url?: string | null;
  image?: string | null;
  category_slug?: string | null;
  category_id?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  specs?: Record<string, any>;
  is_active?: boolean;
  is_bestseller?: boolean;
  gas_type?: string;
  cylinder_size?: string;
  deposit_price?: number;
  refill_price?: number;
  delivery_charge?: number;
  is_refill?: boolean;
  usage_type?: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS";
}

export function OrderGasCatalogueSection({
  onSelectGasProduct,
  onViewProductDetail,
  selectedCategoryOverride,
  onSelectCategoryChange,
}: OrderGasCatalogueSectionProps) {
  const navigate = useNavigate();

  // Active Category State: Calor Gas selected with Patio Gas Refill by default
  const [activeCategoryId, setActiveCategoryId] = useState<MainCategoryKey | string>("calor-gas");
  const [activeSubId, setActiveSubId] = useState<string>("patio-refill");
  const [sortBy, setSortBy] = useState<string>("default");

  // Sync external category selections (e.g. from the Shop by Category section)
  useEffect(() => {
    if (selectedCategoryOverride) {
      setActiveCategoryId(selectedCategoryOverride);
      if (selectedCategoryOverride === "calor-gas") {
        setActiveSubId("patio-refill");
      } else if (selectedCategoryOverride === "gas-appliances") {
        setActiveSubId("barbecues");
      } else if (selectedCategoryOverride === "gas-spares") {
        setActiveSubId("butane-regulators");
      } else {
        setActiveSubId("all");
      }
      setExpandedCategories((prev) => ({ ...prev, [selectedCategoryOverride]: true }));
    }
  }, [selectedCategoryOverride]);

  // Accordion state: Calor Gas is expanded by default
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "calor-gas": true,
  });

  // Mobile drawer state for category navigation
  const [mobileCategoryDrawerOpen, setMobileCategoryDrawerOpen] = useState(false);
  const [highlightedCategoryId, setHighlightedCategoryId] = useState<string | null>(null);

  // Real Database Categories & Products from Supabase (Single Source of Truth)
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<CatalogProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch real category records from Supabase database
  const loadDatabaseCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.warn("Notice loading DB categories:", error);
      }
      if (data) {
        setDbCategories(data);
      }
    } catch (err) {
      console.warn("Categories fetch error:", err);
    }
  };

  // Fetch real product records from Supabase database
  const loadDatabaseProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Notice loading DB products for catalogue:", error);
      }

      if (data && data.length > 0) {
        const mapped: CatalogProductItem[] = data.map((p: any) => {
          const specsObj: Record<string, any> =
            p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
              ? (p.specs as Record<string, any>)
              : {};
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: p.brand || "Calor",
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            image_url: p.image_url || "/safety_away_from_flames_v2.jpg",
            category_slug: p.category_slug,
            category_id: p.category_id,
            subcategory: p.subcategory,
            description: p.description,
            specs: specsObj,
            is_active: (p as any).is_active !== false && specsObj.is_active !== false,
            is_bestseller: Boolean(specsObj.is_bestseller),
          };
        });
        setDbProducts(mapped);
      } else {
        // Fallback to initial service records if DB table is unpopulated
        const fallback: CatalogProductItem[] = INITIAL_GAS_PRODUCTS.map((seed, idx) => ({
          id: `seed-${seed.slug}-${idx}`,
          name: seed.name,
          slug: seed.slug,
          brand: seed.brand,
          price: seed.price,
          stock: seed.stock,
          image_url: seed.image_url,
          category_slug: seed.category_slug,
          subcategory: seed.subcategory,
          description: seed.description,
          specs: {
            usage_type: seed.usage_type,
            gas_type: seed.gas_type,
            cylinder_size: seed.cylinder_size,
            is_active: seed.is_active,
          },
          is_active: seed.is_active,
          is_bestseller: idx < 4,
        }));
        setDbProducts(fallback);
      }
    } catch (err) {
      console.warn("Catalog fetch error:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadDatabaseCategories();
    loadDatabaseProducts();

    // Listen to real-time changes on categories & products tables so admin updates reflect immediately
    const catChannel = supabase
      .channel("public-categories-catalogue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          loadDatabaseCategories();
        },
      )
      .subscribe();

    const prodChannel = supabase
      .channel("public-products-catalogue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          loadDatabaseProducts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(catChannel);
      supabase.removeChannel(prodChannel);
    };
  }, []);

  // Compute merged dynamic categories from Supabase + Canonical configurations
  const mergedCategories = useMemo(() => {
    if (!dbCategories || dbCategories.length === 0) return CATEGORIES_DATA;

    const inactiveSlugs = new Set(
      dbCategories.filter((c) => c.is_active === false).map((c) => c.slug),
    );

    const baseList = CATEGORIES_DATA.filter((c) => !inactiveSlugs.has(c.id)).map((c) => {
      const dbCat = dbCategories.find((d) => d.slug === c.id);
      if (!dbCat) return c;
      const updatedSubs =
        Array.isArray(dbCat.subcategories) && dbCat.subcategories.length > 0
          ? dbCat.subcategories.map((sub: string) => ({
            id: sub.toLowerCase().replace(/\s+/g, "-"),
            name: sub,
          }))
          : c.subs;
      return {
        ...c,
        name: dbCat.name || c.name,
        description: dbCat.description || c.description,
        subs: updatedSubs,
      };
    });

    const existingIds = new Set(baseList.map((c) => c.id));
    const newFromDb: CategoryItem[] = [];

    dbCategories
      .filter((c) => c.is_active !== false && !existingIds.has(c.slug))
      .forEach((dbCat) => {
        const IconComponent = (ICON_LOOKUP[dbCat.icon] || Flame) as React.ElementType;
        const subs =
          Array.isArray(dbCat.subcategories) && dbCat.subcategories.length > 0
            ? dbCat.subcategories.map((sub: string) => ({
              id: sub.toLowerCase().replace(/\s+/g, "-"),
              name: sub,
            }))
            : [{ id: "all", name: `All ${dbCat.name}` }];

        newFromDb.push({
          id: dbCat.slug,
          name: dbCat.name,
          icon: IconComponent,
          subs: subs,
          description: dbCat.description || "",
        });
      });

    return [...baseList, ...newFromDb];
  }, [dbCategories]);

  // Canonical Patio Gas products (13kg & 5kg)
  const CANONICAL_PATIO_REFILLS: CatalogProductItem[] = [
    {
      id: "c874e66e-1797-47cf-accc-25571775432d",
      slug: "calor-patio-gas-13kg-refill",
      name: "Calor Patio Gas - 13kg Refill",
      brand: "Calor",
      price: 52.50,
      stock: 30,
      image_url: "/calor-patio-13kg.png",
      category_slug: "gas",
      subcategory: "Patio Cylinders",
      specs: {
        usage_type: "DOMESTIC",
        gas_type: "Patio Gas",
        cylinder_size: "13kg",
        deposit_price: 44.99,
        refill_price: 52.50,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
      },
      is_active: true,
      is_bestseller: true,
      description:
        "13kg Patio Gas cylinder refill equipped with 27mm clip-on connector for 4+ burner barbecues and patio heaters. Requires an empty cylinder exchange on delivery.",
    },
    {
      id: "fa53859f-d5b0-49c7-91b2-fb1b83b32ba2",
      slug: "calor-patio-gas-5kg-refill",
      name: "Calor Patio Gas - 5kg Refill",
      brand: "Calor",
      price: 23.25,
      stock: 25,
      image_url: "/calor-patio-5kg.png",
      category_slug: "gas",
      subcategory: "Patio Cylinders",
      specs: {
        usage_type: "DOMESTIC",
        gas_type: "Patio Gas",
        cylinder_size: "5kg",
        deposit_price: 34.99,
        refill_price: 23.25,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
      },
      is_active: true,
      is_bestseller: true,
      description:
        "5kg Patio Gas cylinder refill for compact tabletop barbecues and portable patio heaters. Requires an empty cylinder exchange on delivery.",
    },
  ];

  // Canonical Butane products as specified in Image 1
  const CANONICAL_BUTANE_REFILLS: CatalogProductItem[] = [
    {
      id: "prod-calor-15kg-butane-refill",
      slug: "calor-gas-butane-15kg-refill",
      name: "Calor Gas Butane - 15kg Refill",
      brand: "Calor",
      price: 58.25,
      stock: 35,
      image_url: "/calor-butane-15kg.png",
      category_slug: "gas",
      subcategory: "Butane Cylinders",
      specs: {
        usage_type: "DOMESTIC",
        gas_type: "Butane",
        cylinder_size: "15kg",
        deposit_price: 39.99,
        refill_price: 58.25,
        is_active: true,
        is_refill: true,
      },
      is_active: true,
      is_bestseller: true,
      description:
        "15kg Butane gas cylinder refill for indoor portable room heaters and domestic gas appliances. Requires an empty cylinder exchange on delivery.",
    },
    {
      id: "prod-calor-7kg-butane-refill",
      slug: "calor-gas-butane-7kg-refill",
      name: "Calor Gas Butane - 7kg Refill",
      brand: "Calor",
      price: 37.0,
      stock: 28,
      image_url: "/calor-butane-7kg.png",
      category_slug: "gas",
      subcategory: "Butane Cylinders",
      specs: {
        usage_type: "DOMESTIC",
        gas_type: "Butane",
        cylinder_size: "7kg",
        deposit_price: 34.99,
        refill_price: 37.0,
        is_active: true,
        is_refill: true,
      },
      is_active: true,
      is_bestseller: true,
      description:
        "7kg Butane gas cylinder refill for small portable heaters, camping stoves and indoor appliances. Requires an empty cylinder exchange on delivery.",
    },
  ];

  // Canonical Propane products (6kg, 13kg, 19kg, 47kg)
  const CANONICAL_PROPANE_REFILLS: CatalogProductItem[] = [
    {
      id: "04e2ef7d-203c-45f5-8183-97958debae88",
      slug: "calor-gas-propane-6kg-refill",
      name: "Calor Gas Propane - 6kg Refill",
      brand: "Calor",
      price: 32.90,
      stock: 25,
      image_url: "/calor-propane-6kg.png",
      category_slug: "gas",
      subcategory: "Propane Cylinders",
      specs: {
        usage_type: "DOMESTIC",
        gas_type: "Propane",
        cylinder_size: "6kg",
        deposit_price: 34.99,
        refill_price: 32.90,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
      },
      is_active: true,
      is_bestseller: true,
      description:
        "6kg Propane gas cylinder refill with standard POL screw connection for caravans, campervans and outdoor catering. Requires an empty cylinder exchange on delivery.",
    },
    {
      id: "ca5ba722-845b-4efe-8db5-ae8a6a2522ef",
      slug: "calor-gas-propane-13kg-refill",
      name: "Calor Gas Propane - 13kg Refill",
      brand: "Calor",
      price: 50.00,
      stock: 30,
      image_url: "/calor-propane-13kg.png",
      category_slug: "gas",
      subcategory: "Propane Cylinders",
      specs: {
        usage_type: "DOMESTIC",
        gas_type: "Propane",
        cylinder_size: "13kg",
        deposit_price: 39.99,
        refill_price: 50.00,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
      },
      is_active: true,
      is_bestseller: true,
      description:
        "13kg Propane gas cylinder refill with standard POL screw connection for whole-home heating, cooking and light commercial use. Requires an empty cylinder exchange on delivery.",
    },
    {
      id: "b09f7d15-90be-42ac-b1f9-0fce9162a3ce",
      slug: "calor-gas-propane-19kg-refill",
      name: "Calor Gas Propane - 19kg Refill",
      brand: "Calor",
      price: 62.00,
      stock: 20,
      image_url: "/calor-propane-19kg.png",
      category_slug: "gas",
      subcategory: "Propane Cylinders",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Propane",
        cylinder_size: "19kg",
        deposit_price: 49.99,
        refill_price: 62.00,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
      },
      is_active: true,
      is_bestseller: true,
      description:
        "19kg Propane gas cylinder refill with standard POL screw connection for commercial kitchens, catering trailers and space heaters. Requires an empty cylinder exchange on delivery.",
    },
    {
      id: "a726b178-9281-4441-bd96-ea2f01f0496f",
      slug: "calor-gas-propane-47kg-refill",
      name: "Calor Gas Propane - 47kg Refill",
      brand: "Calor",
      price: 113.50,
      stock: 15,
      image_url: "/calor-propane-47kg.png",
      category_slug: "gas",
      subcategory: "Propane Cylinders",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Propane",
        cylinder_size: "47kg",
        deposit_price: 69.99,
        refill_price: 113.50,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
      },
      is_active: true,
      is_bestseller: true,
      description:
        "47kg Propane gas cylinder refill with standard POL screw connection for central heating packs, drying kilns and large commercial installations. Requires an empty cylinder exchange on delivery.",
    },
  ];

  // Canonical Air Liquide Products (The 7 Real Dispense Gas Cylinders)
  const CANONICAL_AIR_LIQUIDE_PRODUCTS: CatalogProductItem[] = [
    {
      id: "pub-gas-co2-6-35kg",
      name: "6.35kg Carbon Dioxide",
      slug: "6-35kg-carbon-dioxide",
      brand: "Air Liquide",
      price: 28.80,
      stock: 25,
      image_url: "/pub-gas-co2-0-35kg.png",
      category_slug: "pub-gas",
      subcategory: "CO2 / Carbon Dioxide",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "6.35kg",
        deposit_price: 25.00,
        refill_price: 28.80,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "6.35kg food-grade Carbon Dioxide (CO2) cylinder for draught beer, cider and soft drinks dispense. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-10l-30-70",
      name: "10L 30/70 Mixed Gas",
      slug: "10l-30-70-mixed-gas",
      brand: "Air Liquide",
      price: 25.20,
      stock: 30,
      image_url: "/pub-gas-mixed-10l-30-70.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "10L",
        deposit_price: 35.00,
        refill_price: 25.20,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "10L 30% CO2 / 70% Nitrogen dispense gas mixture for creamy stouts, smooth ales and draught bitters. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-10l-50-50",
      name: "10L 50/50 Mixed Gas",
      slug: "10l-50-50-mixed-gas",
      brand: "Air Liquide",
      price: 27.00,
      stock: 20,
      image_url: "/pub-gas-mixed-10l-50-50.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "10L",
        deposit_price: 35.00,
        refill_price: 27.00,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "10L 50% CO2 / 50% Nitrogen dispense gas mixture for craft beers, ales and designated draught lines. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-10l-60-40",
      name: "10L 60/40 Mixed Gas",
      slug: "10l-60-40-mixed-gas",
      brand: "Air Liquide",
      price: 28.80,
      stock: 35,
      image_url: "/pub-gas-mixed-10l-60-40.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "10L",
        deposit_price: 35.00,
        refill_price: 28.80,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "10L 60% CO2 / 40% Nitrogen dispense gas mixture for lagers, ciders and highly carbonated draught drinks. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-47l-30-70",
      name: "47L 30/70 Mixed Gas",
      slug: "47l-30-70-mixed-gas",
      brand: "Air Liquide",
      price: 68.40,
      stock: 15,
      image_url: "/pub-gas-mixed-47l-30-70.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "47L",
        deposit_price: 55.00,
        refill_price: 68.40,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "High-capacity 47L 30% CO2 / 70% Nitrogen dispense cylinder for busy pub cellars and high-turnover draught venues. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-co2-22-6kg",
      name: "22.6kg Carbon Dioxide",
      slug: "22-6kg-carbon-dioxide",
      brand: "Air Liquide",
      price: 69.00,
      stock: 20,
      image_url: "/pub-gas-co2-22-6kg.png",
      category_slug: "pub-gas",
      subcategory: "CO2 / Carbon Dioxide",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "22.6kg",
        deposit_price: 55.00,
        refill_price: 69.00,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "22.6kg food-grade Carbon Dioxide (CO2) cellar cylinder for high-volume soft drinks and draught beer dispense. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-co2-34kg",
      name: "34kg Carbon Dioxide",
      slug: "34kg-carbon-dioxide",
      brand: "Air Liquide",
      price: 97.20,
      stock: 15,
      image_url: "/pub-gas-co2-34kg.png",
      category_slug: "pub-gas",
      subcategory: "CO2 / Carbon Dioxide",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "34kg",
        deposit_price: 65.00,
        refill_price: 97.20,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "Large 34kg industrial/commercial food-grade Carbon Dioxide cylinder for multi-line pub cellars, clubs and brewery taprooms. Restricted to pub and licensed hospitality customers.",
    },
  ];

  // Canonical Autarky Products (The 3 Real Animal Feed Dog Food Products)
  const CANONICAL_AUTARKY_PRODUCTS: CatalogProductItem[] = [
    {
      id: "feed-autarky-mature-lite-chicken-12kg",
      name: "Autarky Mature Lite - Chicken 12kg",
      slug: "autarky-mature-lite-chicken-12kg",
      brand: "Autarky",
      price: 25.20,
      stock: 50,
      image_url: "/feed-autarky-mature-lite-chicken-12kg.png",
      category_slug: "autarky",
      subcategory: "Dog Food",
      specs: { weight: "12kg", type: "Mature Lite Dog Food", flavor: "Chicken", brand: "Autarky" },
      is_active: true,
      description:
        "Autarky Mature Lite Complete Dog Food with Delicious Chicken (12kg) – 100% natural goodness with added herbs for senior and weight-conscious dogs.",
    },
    {
      id: "feed-autarky-puppy-junior-chicken-12kg",
      name: "Autarky Puppy/Junior - Chicken 12kg",
      slug: "autarky-puppy-junior-chicken-12kg",
      brand: "Autarky",
      price: 29.30,
      stock: 50,
      image_url: "/feed-autarky-puppy-junior-chicken-12kg.png",
      category_slug: "autarky",
      subcategory: "Dog Food",
      specs: { weight: "12kg", type: "Puppy/Junior Dog Food", flavor: "Chicken", brand: "Autarky" },
      is_active: true,
      description:
        "Autarky Puppy/Junior Complete Dog Food with Delicious Chicken (12kg) – hypoallergenic recipe with prebiotics and minerals for healthy puppy development.",
    },
    {
      id: "feed-autarky-adult-salmon-12kg",
      name: "Autarky Adult - Salmon 12kg",
      slug: "autarky-adult-salmon-12kg",
      brand: "Autarky",
      price: 26.00,
      stock: 50,
      image_url: "/feed-autarky-adult-salmon-12kg.png",
      category_slug: "autarky",
      subcategory: "Dog Food",
      specs: { weight: "12kg", type: "Adult Dog Food", flavor: "Salmon", brand: "Autarky" },
      is_active: true,
      description:
        "Autarky Adult Complete Dog Food with Succulent Salmon (12kg) – rich in Omega 3 fatty acids, wheat-gluten free for active adult working dogs.",
    },
  ];

  // Canonical Big K Products (The 5 Real Solid Fuel & Barbecue Products)
  const CANONICAL_BIG_K_PRODUCTS: CatalogProductItem[] = [
    {
      id: "fuel-instant-lighting-firelog",
      name: "Instant Lighting Firelog - Single",
      slug: "instant-lighting-firelog-single",
      brand: "Big K",
      price: 2.00,
      stock: 75,
      image_url: "/fuel-instant-lighting-firelog.png",
      category_slug: "coal-fuels",
      subcategory: "Firelighters",
      specs: { fuel_type: "Instant Firelog", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description:
        "Big K instant lighting firelog (single) – just light the wrapper for up to 2 hours of warm ambient fire.",
    },
    {
      id: "fuel-heat-logs-hollow-12",
      name: "Heat Logs Hollow - wrapped pack of 12",
      slug: "heat-logs-hollow-wrapped-pack-of-12",
      brand: "Big K",
      price: 7.35,
      stock: 50,
      image_url: "/fuel-heat-logs-hollow-12.png",
      category_slug: "coal-fuels",
      subcategory: "Kindling & Heat Logs",
      specs: {
        fuel_type: "Heat Logs",
        quantity: "Pack of 12",
        max_quantity: 10,
        is_active: true,
        usage_type: "DOMESTIC_COMMERCIAL",
      },
      is_active: true,
      description:
        "Hollow heat logs (wrapped pack of 12) – high-density compressed sawdust logs. Maximum 10 packs per order.",
    },
    {
      id: "fuel-instant-lighting-charcoal-2kg",
      name: "Instant Lighting Charcoal - 2kg",
      slug: "instant-lighting-charcoal-2kg",
      brand: "Big K",
      price: 4.50,
      stock: 45,
      image_url: "/fuel-instant-lighting-charcoal-2kg.png",
      category_slug: "coal-fuels",
      subcategory: "Charcoal",
      specs: {
        fuel_type: "Instant Charcoal",
        weight: "2kg",
        is_active: true,
        usage_type: "DOMESTIC_COMMERCIAL",
      },
      is_active: true,
      description:
        "Big K instant lighting charcoal (2kg pack) – ready to cook in 20 minutes with no firelighters required.",
    },
    {
      id: "fuel-large-party-bbq",
      name: "Large Party Barbecue",
      slug: "large-party-barbecue",
      brand: "Big K",
      price: 7.15,
      stock: 35,
      image_url: "/fuel-large-party-bbq.png",
      category_slug: "coal-fuels",
      subcategory: "Barbecue",
      specs: {
        fuel_type: "Party Disposable BBQ",
        is_active: true,
        usage_type: "DOMESTIC_COMMERCIAL",
      },
      is_active: true,
      description:
        "Big K party size disposable instant BBQ – extra-large cooking surface for family gatherings and outdoor parties.",
    },
    {
      id: "fuel-bbq-lighter-fluid-1l",
      name: "BBQ Lighter Fluid 1L",
      slug: "bbq-lighter-fluid-1l",
      brand: "Big K",
      price: 4.00,
      stock: 60,
      image_url: "/fuel-bbq-lighter-fluid-1l.png",
      category_slug: "coal-fuels",
      subcategory: "Firelighters",
      specs: {
        fuel_type: "Lighter Fluid",
        volume: "1L",
        is_active: true,
        usage_type: "DOMESTIC_COMMERCIAL",
      },
      is_active: true,
      description:
        "Big K premium barbecue lighting fluid (1 Litre bottle) with safety cap for charcoal barbecues.",
    },
  ];

  // Canonical Bonningtons Products (The 6 Real Patio Heater, Fire Pit & BBQ Products)
  const CANONICAL_BONNINGTONS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "patio-heater-free-standing",
      name: "Free Standing Patio Heater",
      slug: "free-standing-patio-heater",
      brand: "Bonningtons",
      price: 60.95,
      stock: 20,
      image_url: "/patio-heater-free-standing.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Bonningtons", type: "Electric Free Standing Heater", features: "Adjustable Height" },
      is_active: true,
      description:
        "Free Standing Patio Heater – versatile infrared quartz electric garden heater with 3 heat settings, adjustable pole height, and heavy stable base.",
    },
    {
      id: "bbq-outdoor-fire-pit-heater",
      name: "Outdoor BBQ Fire Pit Heater",
      slug: "outdoor-bbq-fire-pit-heater",
      brand: "Bonningtons",
      price: 69.65,
      stock: 25,
      image_url: "/bbq-outdoor-fire-pit-heater.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { brand: "Bonningtons", type: "Fire Pit & BBQ", fuel: "Wood / Charcoal", features: "Spark Guard & Grate" },
      is_active: true,
      description:
        "Outdoor BBQ Fire Pit Heater – dual-purpose garden fire pit with stainless steel outer ring, safety spark mesh guard, and barbecue cooking grate.",
    },
    {
      id: "patio-heater-outdoor-fire-pit",
      name: "OUTDOOR BBQ FIRE PIT HEATER",
      slug: "patio-heater-outdoor-fire-pit",
      brand: "Bonningtons",
      price: 69.65,
      stock: 25,
      image_url: "/patio-heater-outdoor-fire-pit.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Bonningtons", type: "Fire Pit & BBQ", fuel: "Wood / Charcoal", features: "Spark Guard & Chrome Grill" },
      is_active: true,
      description:
        "OUTDOOR BBQ FIRE PIT HEATER – dual-purpose circular garden fire pit and barbecue with spark mesh guard, chrome cooking grill, and heat-resistant finish.",
    },
    {
      id: "patio-heater-outdoor-gas-tall",
      name: "Outdoor Gas Patio Heater",
      slug: "outdoor-gas-patio-heater",
      brand: "Bonningtons",
      price: 162.00,
      stock: 12,
      image_url: "/patio-heater-outdoor-gas-tall.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Bonningtons", type: "Tall Gas Patio Heater", finish: "Green", features: "Cylinder Housing & Wheeled" },
      is_active: true,
      description:
        "Outdoor Gas Patio Heater – classic tall outdoor mushroom heater with powder-coated green finish, integrated cylinder enclosure, and electronic ignition.",
    },
    {
      id: "patio-heater-table-top",
      name: "Outdoor Table Top Patio Heater",
      slug: "outdoor-table-top-patio-heater",
      brand: "Bonningtons",
      price: 74.00,
      stock: 16,
      image_url: "/patio-heater-table-top.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Bonningtons", type: "Table Top Gas Patio Heater", finish: "Green", features: "Compact Tabletop Design" },
      is_active: true,
      description:
        "Outdoor Table Top Patio Heater – compact garden dining table heater with stainless steel burner, safety guard, and anti-tilt mechanism.",
    },
    {
      id: "bbq-smoker",
      name: "Smoker BBQ",
      slug: "smoker-bbq",
      brand: "Bonningtons",
      price: 149.00,
      stock: 20,
      image_url: "/bbq-smoker.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { brand: "Bonningtons", type: "Smoker & Charcoal" },
      is_active: true,
      description:
        "Smoker BBQ – premium offset smoker and charcoal barbecue with front access door, chimney damper, and spacious lower storage shelf.",
    },
  ];

  const CANONICAL_PUB_GAS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "pub-gas-co2-6-35kg",
      name: "6.35kg Carbon Dioxide",
      slug: "6-35kg-carbon-dioxide",
      brand: "Air Liquide",
      price: 28.80,
      stock: 25,
      image_url: "/pub-gas-co2-0-35kg.png",
      category_slug: "pub-gas",
      subcategory: "CO2 / Carbon Dioxide",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "6.35kg",
        deposit_price: 25.00,
        refill_price: 28.80,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "6.35kg food-grade Carbon Dioxide (CO2) cylinder for draught beer, cider and soft drinks dispense. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-10l-30-70",
      name: "10L 30/70 Mixed Gas",
      slug: "10l-30-70-mixed-gas",
      brand: "Air Liquide",
      price: 25.20,
      stock: 30,
      image_url: "/pub-gas-mixed-10l-30-70.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "10L",
        deposit_price: 35.00,
        refill_price: 25.20,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "10L 30% CO2 / 70% Nitrogen dispense gas mixture for creamy stouts, smooth ales and draught bitters. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-10l-50-50",
      name: "10L 50/50 Mixed Gas",
      slug: "10l-50-50-mixed-gas",
      brand: "Air Liquide",
      price: 27.00,
      stock: 20,
      image_url: "/pub-gas-mixed-10l-50-50.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "10L",
        deposit_price: 35.00,
        refill_price: 27.00,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "10L 50% CO2 / 50% Nitrogen dispense gas mixture for craft beers, ales and designated draught lines. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-10l-60-40",
      name: "10L 60/40 Mixed Gas",
      slug: "10l-60-40-mixed-gas",
      brand: "Air Liquide",
      price: 28.80,
      stock: 35,
      image_url: "/pub-gas-mixed-10l-60-40.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "10L",
        deposit_price: 35.00,
        refill_price: 28.80,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "10L 60% CO2 / 40% Nitrogen dispense gas mixture for lagers, ciders and highly carbonated draught drinks. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-mixed-47l-30-70",
      name: "47L 30/70 Mixed Gas",
      slug: "47l-30-70-mixed-gas",
      brand: "Air Liquide",
      price: 68.40,
      stock: 15,
      image_url: "/pub-gas-mixed-47l-30-70.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "47L",
        deposit_price: 55.00,
        refill_price: 68.40,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "High-capacity 47L 30% CO2 / 70% Nitrogen dispense cylinder for busy pub cellars and high-turnover draught venues. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-spanner",
      name: "Pub Gas Spanner (CO2 and Mixed)",
      slug: "pub-gas-spanner-co2-and-mixed",
      brand: "Stayte Pub Gas",
      price: 5.95,
      stock: 50,
      image_url: "/pub-gas-spanner.png",
      category_slug: "pub-gas",
      subcategory: "Pub Gas Spanner",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Hardware & Adapter",
        cylinder_size: "Universal Tool",
        is_active: true,
        is_refill: false,
        empty_cylinder_required: false,
        product_mode: "Outright Purchase",
      },
      is_active: true,
      description:
        "Heavy-duty dual-ended combination spanner designed for tightening and changing both CO2 and Mixed Gas cylinder regulator connections securely.",
    },
    {
      id: "pub-gas-mixed-oring",
      name: "Mixed Gas O-ring",
      slug: "mixed-gas-o-ring",
      brand: "Stayte Pub Gas",
      price: 1.50,
      stock: 100,
      image_url: "/pub-gas-mixed-oring.png",
      category_slug: "pub-gas",
      subcategory: "Mixed Gas O-ring",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Hardware & Adapter",
        cylinder_size: "Mixed Gas Seal",
        is_active: true,
        is_refill: false,
        empty_cylinder_required: false,
        product_mode: "Outright Purchase",
      },
      is_active: true,
      description:
        "Replacement sealing O-rings for Mixed Gas bottle valves and secondary regulators. Prevents cellar gas leaks and maintains optimal line pressure.",
    },
    {
      id: "pub-gas-co2-oring",
      name: "CO2 O-ring",
      slug: "co2-o-ring",
      brand: "Stayte Pub Gas",
      price: 1.50,
      stock: 100,
      image_url: "/pub-gas-co2-oring.png",
      category_slug: "pub-gas",
      subcategory: "CO2 O-ring",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Hardware & Adapter",
        cylinder_size: "CO2 Seal",
        is_active: true,
        is_refill: false,
        empty_cylinder_required: false,
        product_mode: "Outright Purchase",
      },
      is_active: true,
      description:
        "High-durability sealing O-rings specifically sized for CO2 Carbon Dioxide cylinder valves and cellar regulators.",
    },
    {
      id: "pub-gas-co2-22-6kg",
      name: "22.6kg Carbon Dioxide",
      slug: "22-6kg-carbon-dioxide",
      brand: "Air Liquide",
      price: 69.00,
      stock: 20,
      image_url: "/pub-gas-co2-22-6kg.png",
      category_slug: "pub-gas",
      subcategory: "CO2 / Carbon Dioxide",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "22.6kg",
        deposit_price: 55.00,
        refill_price: 69.00,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "22.6kg food-grade Carbon Dioxide (CO2) cellar cylinder for high-volume soft drinks and draught beer dispense. Restricted to pub and licensed hospitality customers.",
    },
    {
      id: "pub-gas-co2-34kg",
      name: "34kg Carbon Dioxide",
      slug: "34kg-carbon-dioxide",
      brand: "Air Liquide",
      price: 97.20,
      stock: 15,
      image_url: "/pub-gas-co2-34kg.png",
      category_slug: "pub-gas",
      subcategory: "CO2 / Carbon Dioxide",
      specs: {
        usage_type: "COMMERCIAL",
        gas_type: "Pub Gas",
        cylinder_size: "34kg",
        deposit_price: 65.00,
        refill_price: 97.20,
        is_active: true,
        is_refill: true,
        empty_cylinder_required: true,
        product_mode: "Refill / Cylinder Exchange",
        restricted_to: "Pub customers only",
      },
      is_active: true,
      description:
        "Large 34kg industrial/commercial food-grade Carbon Dioxide cylinder for multi-line pub cellars, clubs and brewery taprooms. Restricted to pub and licensed hospitality customers.",
    },
  ];

  const CANONICAL_COAL_FUELS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "fuel-brazier-10kg",
      name: "Brazier - 10kg",
      slug: "brazier-10kg",
      brand: "Brazier",
      price: 6.50,
      stock: 50,
      image_url: "/fuel-brazier-10kg.png",
      category_slug: "coal-fuels",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Coal", weight: "10kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Brazier smokeless fuel (10kg) – value for money smokeless fuel for open fires and multi-fuel stoves.",
    },
    {
      id: "fuel-brazier-20kg",
      name: "Brazier - 20kg",
      slug: "brazier-20kg",
      brand: "Brazier",
      price: 12.75,
      stock: 45,
      image_url: "/fuel-brazier-20kg.png",
      category_slug: "coal-fuels",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Coal", weight: "20kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Brazier smokeless fuel (20kg) – 24% hotter and produces up to 80% less smoke. Suitable for open fires and multi-fuel stoves.",
    },
    {
      id: "fuel-coffee-bricks-7kg",
      name: "Coffee Bricks - 7kg",
      slug: "coffee-bricks-7kg",
      brand: "Homefire",
      price: 7.75,
      stock: 35,
      image_url: "/fuel-coffee-bricks-7kg.png",
      category_slug: "coal-fuels",
      subcategory: "Kindling & Heat Logs",
      specs: { fuel_type: "Eco Briquettes", weight: "7kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Homefire Coffee Bricks (7kg) – eco-friendly briquettes made from recycled coffee grounds for open fires, chimineas and stoves.",
    },
    {
      id: "fuel-homefire-twizlers",
      name: "Homefire Twizlers (Wood Wool) Natural Firelighters",
      slug: "homefire-twizlers-wood-wool-natural-firelighters",
      brand: "Homefire",
      price: 2.30,
      stock: 100,
      image_url: "/fuel-homefire-twizlers.png",
      category_slug: "coal-fuels",
      subcategory: "Firelighters",
      specs: { fuel_type: "Firelighters", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Homefire Twizlers wood wool firelighters – 100% natural, odorless and quick to light for open fires and multi-fuel stoves.",
    },
    {
      id: "fuel-kiln-dried-kindling",
      name: "Kiln Dried Kindling",
      slug: "kiln-dried-kindling",
      brand: "Stayte Fuels",
      price: 4.00,
      stock: 80,
      image_url: "/fuel-kiln-dried-kindling.png",
      category_slug: "coal-fuels",
      subcategory: "Kindling & Heat Logs",
      specs: { fuel_type: "Kindling Wood", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Premium kiln dried kindling wood – ideal starter fuel for open fires, log burners and chimineas.",
    },
    {
      id: "fuel-stoveflame-25kg",
      name: "Stoveflame Original 25kg",
      slug: "stoveflame-original-25kg",
      brand: "National Coal",
      price: 18.25,
      stock: 40,
      image_url: "/fuel-stoveflame-25kg.png",
      category_slug: "coal-fuels",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Ovoids", weight: "25kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Stoveflame Original 25kg smokeless fuel ovoids for multi-fuel stoves, roomheaters and boilers.",
    },
    {
      id: "fuel-taybrite-25kg",
      name: "Taybrite - 25kg",
      slug: "taybrite-25kg",
      brand: "Taybrite",
      price: 18.75,
      stock: 40,
      image_url: "/fuel-taybrite-25kg.png",
      category_slug: "coal-fuels",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Fuel", weight: "25kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Taybrite 25kg multi-purpose economy smokeless fuel for room heaters, boilers and multi-fuel stoves.",
    },
    {
      id: "fuel-homefire-25kg",
      name: "Homefire - 25kg",
      slug: "homefire-25kg",
      brand: "Homefire",
      price: 21.15,
      stock: 50,
      image_url: "/fuel-homefire-25kg.png",
      category_slug: "coal-fuels",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Coal", weight: "25kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Homefire 25kg premier smokeless coal for open fires and multi-fuel stoves. Up to 33% more heat and burns for up to 9 hours.",
    },
    {
      id: "fuel-net-of-logs-10kg",
      name: "Net of Logs - Approx 10kg",
      slug: "net-of-logs-approx-10kg",
      brand: "Stayte Fuels",
      price: 5.25,
      stock: 60,
      image_url: "/fuel-net-of-logs-10kg.png",
      category_slug: "coal-fuels",
      subcategory: "Kiln Dried Logs",
      specs: { fuel_type: "Hardwood Logs", weight: "approx 10kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Net bag of seasoned hardwood logs (approx 10kg) for open fireplaces and wood-burning stoves.",
    },
    {
      id: "fuel-homefire-kiln-dried-logs-8kg",
      name: "Homefire Kiln Dried Logs - Approx 8kg",
      slug: "homefire-kiln-dried-logs-approx-8kg",
      brand: "Homefire",
      price: 8.00,
      stock: 45,
      image_url: "/fuel-homefire-kiln-dried-logs-8kg.png",
      category_slug: "coal-fuels",
      subcategory: "Kiln Dried Logs",
      specs: { fuel_type: "Kiln Dried Hardwood", weight: "approx 8kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Homefire premium kiln dried hardwood logs (approx 8kg) – Ready to Burn certified with moisture content under 20%.",
    },
    {
      id: "fuel-pre-packed-paraffin-4l",
      name: "Pre-packed Paraffin 4L",
      slug: "pre-packed-paraffin-4l",
      brand: "Barrettine",
      price: 10.00,
      stock: 30,
      image_url: "/fuel-pre-packed-paraffin-4l.png",
      category_slug: "coal-fuels",
      subcategory: "Firelighters",
      specs: { fuel_type: "Paraffin", volume: "4L", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Barrettine premium pre-packed paraffin (4 Litres) for greenhouse heaters, domestic paraffin heaters and lamps.",
    },
    {
      id: "fuel-instant-lighting-firelog",
      name: "Instant Lighting Firelog - Single",
      slug: "instant-lighting-firelog-single",
      brand: "Big K",
      price: 2.00,
      stock: 75,
      image_url: "/fuel-instant-lighting-firelog.png",
      category_slug: "coal-fuels",
      subcategory: "Firelighters",
      specs: { fuel_type: "Instant Firelog", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Big K instant lighting firelog (single) – just light the wrapper for up to 2 hours of warm ambient fire.",
    },
    {
      id: "fuel-heat-logs-hollow-12",
      name: "Heat Logs Hollow - wrapped pack of 12",
      slug: "heat-logs-hollow-wrapped-pack-of-12",
      brand: "Stayte Fuels",
      price: 7.35,
      stock: 50,
      image_url: "/fuel-heat-logs-hollow-12.png",
      category_slug: "coal-fuels",
      subcategory: "Kindling & Heat Logs",
      specs: { fuel_type: "Heat Logs", quantity: "Pack of 12", max_quantity: 10, is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Hollow heat logs (wrapped pack of 12) – high-density compressed sawdust logs. Maximum 10 packs per order.",
    },
    {
      id: "fuel-net-of-kindling-5kg",
      name: "Net of Kindling - Approx 5kg",
      slug: "net-of-kindling-approx-5kg",
      brand: "Stayte Fuels",
      price: 4.45,
      stock: 60,
      image_url: "/fuel-net-of-kindling-5kg.png",
      category_slug: "coal-fuels",
      subcategory: "Kindling & Heat Logs",
      specs: { fuel_type: "Kindling", weight: "approx 5kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Net bag of dry kindling sticks (approx 5kg) for lighting log fires and stoves effortlessly.",
    },
    {
      id: "fuel-instant-lighting-charcoal-2kg",
      name: "Instant Lighting Charcoal - 2kg",
      slug: "instant-lighting-charcoal-2kg",
      brand: "Big K",
      price: 4.50,
      stock: 45,
      image_url: "/fuel-instant-lighting-charcoal-2kg.png",
      category_slug: "coal-fuels",
      subcategory: "Charcoal",
      specs: { fuel_type: "Instant Charcoal", weight: "2kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Big K instant lighting charcoal (2kg pack) – ready to cook in 20 minutes with no firelighters required.",
    },
    {
      id: "fuel-heat-log-blocks-8",
      name: "Heat Log Blocks - Pack of 8",
      slug: "heat-log-blocks-pack-of-8",
      brand: "CPL",
      price: 3.85,
      stock: 40,
      image_url: "/fuel-heat-log-blocks-8.png",
      category_slug: "coal-fuels",
      subcategory: "Kindling & Heat Logs",
      specs: { fuel_type: "Heat Log Blocks", quantity: "Pack of 8", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "CPL high energy ultra dry heat log blocks (pack of 8) for open fires, chimineas and multi-fuel stoves.",
    },
    {
      id: "fuel-lumpwood-charcoal-4kg",
      name: "Lumpwood Charcoal - 4kg",
      slug: "lumpwood-charcoal-4kg",
      brand: "Homefire",
      price: 5.60,
      stock: 50,
      image_url: "/fuel-lumpwood-charcoal-4kg.png",
      category_slug: "coal-fuels",
      subcategory: "Charcoal",
      specs: { fuel_type: "Lumpwood Charcoal", weight: "4kg", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Homefire 100% natural lumpwood charcoal (4kg) – fast lighting, high heat for authentic barbecue flavor.",
    },
    {
      id: "fuel-small-instant-bbq",
      name: "Small Instant Barbecue",
      slug: "small-instant-barbecue",
      brand: "Kingfisher",
      price: 3.00,
      stock: 40,
      image_url: "/fuel-small-instant-bbq.png",
      category_slug: "coal-fuels",
      subcategory: "Barbecue",
      specs: { fuel_type: "Disposable BBQ", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Kingfisher instant disposable barbecue – all in one pack, easy to light, ready in 20 minutes, burns for up to 1.5 hours.",
    },
    {
      id: "fuel-large-party-bbq",
      name: "Large Party Barbecue",
      slug: "large-party-barbecue",
      brand: "Big K",
      price: 7.15,
      stock: 35,
      image_url: "/fuel-large-party-bbq.png",
      category_slug: "coal-fuels",
      subcategory: "Barbecue",
      specs: { fuel_type: "Party Disposable BBQ", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Big K party size disposable instant BBQ – extra-large cooking surface for family gatherings and outdoor parties.",
    },
    {
      id: "fuel-bbq-lighter-fluid-1l",
      name: "BBQ Lighter Fluid 1L",
      slug: "bbq-lighter-fluid-1l",
      brand: "Big K",
      price: 4.00,
      stock: 60,
      image_url: "/fuel-bbq-lighter-fluid-1l.png",
      category_slug: "coal-fuels",
      subcategory: "Firelighters",
      specs: { fuel_type: "Lighter Fluid", volume: "1L", is_active: true, usage_type: "DOMESTIC_COMMERCIAL" },
      is_active: true,
      description: "Big K premium barbecue lighting fluid (1 Litre bottle) with safety cap for charcoal barbecues.",
    },
  ];

  const GROUNDBAIT_DESCRIPTION =
    'Groundbait is used in coarse fishing in order to attract fish to the fishing area. It is a mixture of various natural ingredients, for example bread crumbs, vanilla sugar, hemp, maize and other ingredients, and moistened with water so it\'s possible to make balls. These balls are then thrown out into the water at the fishing spot. Depending on the groundbait mixture, the balls may break up quickly and create a "cloud" of particles in the water attractive for mid-water feeding fish, or sink to the bottom where they slowly release feed to species feeding on the bottom.';

  const PELLETS_DESCRIPTION =
    "There can be no other bait that has had such an impact as pellets on the world of coarse fishing as pellet has recently, they are universally popular with pleasure angler, match men and specimen hunter alike. Pellets come in many different sizes from tiny ones about 2 mm to great big donkey chokers around 28 mm, you can get them in high oil or low oil content and containing many different ingredients including fish meals (the most popular) to crushed hemp, bloodworm and corn steep liquor to name just three, there are hard and soft versions too. Originally manufactured as feed for fish farms it never took anglers long to see the potential of this food source for farmed fish for coarse angling";

  const CANONICAL_DYNAMITE_BAITS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "bait-marine-halibut-groundbait-1kg",
      name: "Marine Halibut Groundbait 1kg",
      slug: "marine-halibut-groundbait-1kg",
      brand: "Dynamite Baits",
      price: 5.0,
      stock: 50,
      image_url: "/bait-marine-halibut-groundbait-1kg.png",
      category_slug: "dynamite-baits",
      subcategory: "Groundbait",
      specs: { weight: "1kg", type: "Groundbait", brand: "Dynamite Baits" },
      is_active: true,
      description:
        "High energy marine halibut groundbait (1kg) – specially formulated with marine halibut attractants for coarse and match angling.",
    },
    {
      id: "bait-marine-halibut-method-mix-2kg",
      name: "Marine Halibut Method Mix - 2kg",
      slug: "marine-halibut-method-mix-2kg",
      brand: "Dynamite Baits",
      price: 7.3,
      stock: 50,
      image_url: "/bait-marine-halibut-method-mix-2kg.png",
      category_slug: "dynamite-baits",
      subcategory: "Groundbait",
      specs: { weight: "2kg", type: "Method Mix", brand: "Dynamite Baits" },
      is_active: true,
      description:
        "High energy marine halibut method mix (2kg) – big carp range with proven attraction and binding properties for method feeders.",
    },
    {
      id: "bait-swim-stim-carp-groundbait-amino-black-900g",
      name: "Swim Stim Carp Groundbait - Amino Black - 900g",
      slug: "swim-stim-carp-groundbait-amino-black-900g",
      brand: "Dynamite Baits",
      price: 4.25,
      stock: 50,
      image_url: "/bait-swim-stim-carp-groundbait-amino-black-900g.png",
      category_slug: "dynamite-baits",
      subcategory: "Groundbait",
      specs: { weight: "900g", type: "Groundbait", brand: "Dynamite Baits" },
      is_active: true,
      description:
        "Swim Stim carp groundbait amino black (900g) – advanced koi technology groundbait with amino acids and dark finish for wary fish.",
    },
  ];

  const CANONICAL_ANIMAL_FEED_PRODUCTS: CatalogProductItem[] = [
    {
      id: "feed-no-mess-wild-bird-seed-20kg",
      name: "No Mess Wild Bird Seed 20kg",
      slug: "no-mess-wild-bird-seed-20kg",
      brand: "Countrywide",
      price: 28.25,
      stock: 50,
      image_url: "/feed-no-mess-wild-bird-seed-20kg.png",
      category_slug: "animal-feed",
      subcategory: "Wild Bird Food",
      specs: { weight: "20kg", type: "Wild Bird Seed", brand: "Countrywide" },
      is_active: true,
      description:
        "Countrywide No Mess Wild Bird Seed (20kg) – husk-free premium seed mix to attract wild birds without garden waste.",
    },
    {
      id: "feed-summer-wild-bird-20kg",
      name: "Summer Wild Bird 20kg",
      slug: "summer-wild-bird-20kg",
      brand: "Countrywide",
      price: 13.70,
      stock: 50,
      image_url: "/feed-summer-wild-bird-20kg.png",
      category_slug: "animal-feed",
      subcategory: "Wild Bird Food",
      specs: { weight: "20kg", type: "Wild Bird Food", brand: "Countrywide" },
      is_active: true,
      description:
        "Countrywide Summer Season Wild Bird Food (20kg) – specially formulated high-energy blend for garden birds during warm breeding months.",
    },
    {
      id: "feed-autarky-mature-lite-chicken-12kg",
      name: "Autarky Mature Lite - Chicken 12kg",
      slug: "autarky-mature-lite-chicken-12kg",
      brand: "Autarky",
      price: 25.20,
      stock: 50,
      image_url: "/feed-autarky-mature-lite-chicken-12kg.png",
      category_slug: "animal-feed",
      subcategory: "Dog Food",
      specs: { weight: "12kg", type: "Mature Lite Dog Food", flavor: "Chicken", brand: "Autarky" },
      is_active: true,
      description:
        "Autarky Mature Lite Complete Dog Food with Delicious Chicken (12kg) – 100% natural goodness with added herbs for senior and weight-conscious dogs.",
    },
    {
      id: "feed-autarky-puppy-junior-chicken-12kg",
      name: "Autarky Puppy/Junior - Chicken 12kg",
      slug: "autarky-puppy-junior-chicken-12kg",
      brand: "Autarky",
      price: 29.30,
      stock: 50,
      image_url: "/feed-autarky-puppy-junior-chicken-12kg.png",
      category_slug: "animal-feed",
      subcategory: "Dog Food",
      specs: { weight: "12kg", type: "Puppy/Junior Dog Food", flavor: "Chicken", brand: "Autarky" },
      is_active: true,
      description:
        "Autarky Puppy/Junior Complete Dog Food with Delicious Chicken (12kg) – hypoallergenic recipe with prebiotics and minerals for healthy puppy development.",
    },
    {
      id: "feed-autarky-adult-salmon-12kg",
      name: "Autarky Adult - Salmon 12kg",
      slug: "autarky-adult-salmon-12kg",
      brand: "Autarky",
      price: 26.00,
      stock: 50,
      image_url: "/feed-autarky-adult-salmon-12kg.png",
      category_slug: "animal-feed",
      subcategory: "Dog Food",
      specs: { weight: "12kg", type: "Adult Dog Food", flavor: "Salmon", brand: "Autarky" },
      is_active: true,
      description:
        "Autarky Adult Complete Dog Food with Succulent Salmon (12kg) – rich in Omega 3 fatty acids, wheat-gluten free for active adult working dogs.",
    },
  ];

  const CANONICAL_CAMPINGAZ_PRODUCTS: CatalogProductItem[] = [
    {
      id: "campingaz-904-refill",
      name: "904 Refill",
      slug: "904-refill",
      brand: "Campingaz",
      price: 39.95,
      stock: 50,
      image_url: "/campingaz-904-refill.png",
      category_slug: "campingaz",
      subcategory: "Refill",
      specs: { weight: "1.81kg", gas_type: "Butane", brand: "Campingaz", product_mode: "Refill Exchange" },
      is_active: true,
      description:
        "Campingaz 904 refillable butane gas cylinder (1.81kg) – compact and widely available across the UK and Europe for camping stoves and small barbecues.",
    },
    {
      id: "campingaz-907-refill",
      name: "907 Refill",
      slug: "907-refill",
      brand: "Campingaz",
      price: 44.25,
      stock: 50,
      image_url: "/campingaz-907-refill.png",
      category_slug: "campingaz",
      subcategory: "Refill",
      specs: { weight: "2.72kg", gas_type: "Butane", brand: "Campingaz", product_mode: "Refill Exchange" },
      is_active: true,
      description:
        "Campingaz 907 refillable butane gas cylinder (2.72kg) – popular high-capacity cylinder for camping, campervans, and portable gas appliances.",
    },
    {
      id: "camping-206l",
      name: "Camping 206L",
      slug: "camping-206l",
      brand: "Campingaz",
      price: 12.00,
      stock: 20,
      image_url: "/camping-206l.png",
      category_slug: "campingaz",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Camping Gas Lantern", power: "80W" },
      is_active: true,
      description:
        "Campingaz Camping 206L – high-power 80W portable camping gas lantern with globe protection guard and integrated carry handle.",
    },
    {
      id: "camping-206s",
      name: "Camping 206S",
      slug: "camping-206s",
      brand: "Campingaz",
      price: 10.00,
      stock: 25,
      image_url: "/camping-206s.png",
      category_slug: "campingaz",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Single Burner Camping Stove", power: "1250W" },
      is_active: true,
      description:
        "Campingaz Camping 206S – compact 1250W single burner portable camping stove with wide pan supports and stable cartridge base.",
    },
    {
      id: "campingaz-party-grill-400",
      name: "Camping Gaz Party Grill 400",
      slug: "camping-gaz-party-grill-400",
      brand: "Campingaz",
      price: 79.95,
      stock: 25,
      image_url: "/campingaz-party-grill-400.png",
      category_slug: "campingaz",
      subcategory: "Grill",
      specs: { power: "2000W", type: "Multi-cooker Stove / Grill", brand: "Campingaz" },
      is_active: true,
      description:
        "Camping Gaz Party Grill 400 – essential camping companion offering stove, grill, griddle, and plancha cooking options with piezo ignition.",
    },
    {
      id: "campingaz-cp250-4pack",
      name: "CP250 4 Pack",
      slug: "cp250-4-pack",
      brand: "Campingaz",
      price: 8.15,
      stock: 100,
      image_url: "/campingaz-cp250-4pack.png",
      category_slug: "campingaz",
      subcategory: "Gas Cartridges",
      specs: { quantity: "4 x 220g", type: "Isobutane Gas Cartridges", brand: "Campingaz" },
      is_active: true,
      description:
        "Campingaz CP250 4 Pack – high-performance isobutane gas cartridges designed for Bistro stoves and Camp'Bistro portable cookers.",
    },
    {
      id: "camp-bistro-3-camping-gas-stove",
      name: "Camp Bistro 3 Camping Gas Stove",
      slug: "camp-bistro-3-camping-gas-stove",
      brand: "Campingaz",
      price: 20.50,
      stock: 30,
      image_url: "/camping-camp-bistro-3.png",
      category_slug: "campingaz",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Tabletop Gas Stove", ignition: "Piezo" },
      is_active: true,
      description:
        "Campingaz Camp Bistro 3 Camping Gas Stove – classic tabletop portable gas cooker with automatic piezo ignition and durable carry case included.",
    },
    {
      id: "camping-instaflam-stove",
      name: "Instaflam Stove",
      slug: "instaflam-stove",
      brand: "Campingaz",
      price: 3.50,
      stock: 40,
      image_url: "/camping-instaflam-stove.png",
      category_slug: "campingaz",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Portable Camping Stove" },
      is_active: true,
      description:
        "Instaflam Stove – ultra-compact lightweight backpacking gas stove with fold-out pan supports and fine flame control knob.",
    },
    {
      id: "camping-chef-cv-gas-stove",
      name: "Camping Chef CV Gas Stove",
      slug: "camping-chef-cv-gas-stove",
      brand: "Campingaz",
      price: 44.95,
      stock: 15,
      image_url: "/camping-chef-cv.png",
      category_slug: "campingaz",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Double Burner Stove with Grill", power: "4000W" },
      is_active: true,
      description:
        "Campingaz Camping Chef CV Gas Stove – powerful double burner camping cooker with central downward radiant toaster grill.",
    },
  ];

  const CANONICAL_CHAR_BROIL_PRODUCTS: CatalogProductItem[] = [
    {
      id: "bbq-ultimate-entertainment",
      name: "Ultimate Entertainment",
      slug: "ultimate-entertainment",
      brand: "Char-Broil",
      price: 1300.00,
      stock: 8,
      image_url: "/bbq-ultimate-entertainment.png",
      category_slug: "char-broil",
      subcategory: "Outdoor Kitchen",
      specs: { type: "Entertainment & Sink Module", material: "304 Stainless Steel", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate Entertainment Module – outdoor kitchen preparation station featuring running-water sink faucet, integrated ice bucket / cooler, and storage drawers.",
    },
    {
      id: "bbq-ultimate-3200",
      name: "Ultimate 3200",
      slug: "ultimate-3200",
      brand: "Char-Broil",
      price: 1300.00,
      stock: 6,
      image_url: "/bbq-ultimate-3200.png",
      category_slug: "char-broil",
      subcategory: "Outdoor Kitchen",
      specs: { type: "Outdoor Kitchen BBQ", material: "304 Stainless Steel", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate 3200 – premium 3-burner outdoor kitchen barbecue island crafted from marine-grade 304 stainless steel with granite-look countertop.",
    },
    {
      id: "bbq-ultimate-package",
      name: "Ultimate BBQ Package",
      slug: "ultimate-bbq-package",
      brand: "Char-Broil",
      price: 3100.00,
      stock: 4,
      image_url: "/bbq-ultimate-package.png",
      category_slug: "char-broil",
      subcategory: "Outdoor Kitchen",
      specs: { type: "Complete Modular Kitchen", material: "304 Stainless Steel", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate BBQ Package – complete L-shaped luxury modular outdoor kitchen including Ultimate 3200 Grill, Entertainment Sink Module, and Corner Unit.",
    },
    {
      id: "bbq-ultimate-corner-module",
      name: "Ultimate Corner Module",
      slug: "ultimate-corner-module",
      brand: "Char-Broil",
      price: 565.00,
      stock: 10,
      image_url: "/bbq-ultimate-corner-module.png",
      category_slug: "char-broil",
      subcategory: "Outdoor Kitchen",
      specs: { type: "Modular Corner Unit", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate Corner Module – 90-degree connecting corner unit with granite worktop and double-door storage cabinet for custom outdoor kitchen layouts.",
    },
    {
      id: "bbq-performance-pro-s-3",
      name: "Performance Pro S 3",
      slug: "performance-pro-s-3",
      brand: "Char-Broil",
      price: 0,
      stock: 10,
      image_url: "/bbq-performance-pro-s-3.png",
      category_slug: "char-broil",
      subcategory: "Barbecues",
      specs: { burners: "3 Burners", technology: "TRU-Infrared", call_for_price: true, brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Performance Pro S 3 – 3-burner TRU-Infrared gas barbecue with stainless steel hood, side burner, and cast iron grates.",
    },
    {
      id: "bbq-professional-core-b-3",
      name: "Professional Core B 3",
      slug: "professional-core-b-3",
      brand: "Char-Broil",
      price: 0,
      stock: 10,
      image_url: "/bbq-professional-core-b-3.png",
      category_slug: "char-broil",
      subcategory: "Barbecues",
      specs: { burners: "3 Burners", finish: "Black Core", call_for_price: true, brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Core B 3 – premium 3-burner black finish gas barbecue with TRU-Infrared cooking system and electronic SureFire ignition.",
    },
    {
      id: "bbq-professional-core-b-4",
      name: "Professional Core B 4",
      slug: "professional-core-b-4",
      brand: "Char-Broil",
      price: 0,
      stock: 8,
      image_url: "/bbq-professional-core-b-4.png",
      category_slug: "char-broil",
      subcategory: "Barbecues",
      specs: { burners: "4 Burners", finish: "Black Core", call_for_price: true, brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Core B 4 – extra-large 4-burner gas barbecue with side burner, cast iron grates, and high-heat sear burner.",
    },
    {
      id: "bbq-professional-pro-s-2",
      name: "Professional Pro S 2",
      slug: "professional-pro-s-2",
      brand: "Char-Broil",
      price: 459.00,
      stock: 15,
      image_url: "/bbq-professional-pro-s-2.png",
      category_slug: "char-broil",
      subcategory: "Barbecues",
      specs: { burners: "2 Burners", finish: "Stainless Steel", technology: "TRU-Infrared", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Pro S 2 – compact 2-burner stainless steel barbecue featuring patented TRU-Infrared cooking system for 50% juicier food.",
    },
    {
      id: "bbq-professional-pro-s-3",
      name: "Professional Pro S 3",
      slug: "professional-pro-s-3",
      brand: "Char-Broil",
      price: 665.00,
      stock: 12,
      image_url: "/bbq-professional-pro-s-3.png",
      category_slug: "char-broil",
      subcategory: "Barbecues",
      specs: { burners: "3 Burners", finish: "Stainless Steel", technology: "TRU-Infrared", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Pro S 3 – 3-burner stainless steel gas barbecue with high-power sear burner, LED illuminated control knobs, and TRU-Infrared technology.",
    },
    {
      id: "bbq-smart-e",
      name: "Smart-E",
      slug: "smart-e",
      brand: "Char-Broil",
      price: 599.00,
      stock: 15,
      image_url: "/bbq-smart-e.png",
      category_slug: "char-broil",
      subcategory: "Electric Grills",
      specs: { type: "Electric Grill", technology: "SMART-E Precision", power: "2400W", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil SMART-E – 100% electric barbecue delivering true grill performance without gas or charcoal. SMART PRECISION temperature control from 90°C to 370°C.",
    },
  ];

  const CANONICAL_CPL_PRODUCTS: CatalogProductItem[] = [
    {
      id: "fuel-brazier-10kg",
      name: "Brazier - 10kg",
      slug: "brazier-10kg",
      brand: "CPL Products",
      price: 6.50,
      stock: 50,
      image_url: "/fuel-brazier-10kg.png",
      category_slug: "cpl-products",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Coal", weight: "10kg", is_active: true, brand: "CPL Products" },
      is_active: true,
      description: "Brazier smokeless fuel (10kg) – value for money smokeless fuel for open fires and multi-fuel stoves.",
    },
    {
      id: "fuel-brazier-20kg",
      name: "Brazier - 20kg",
      slug: "brazier-20kg",
      brand: "CPL Products",
      price: 12.75,
      stock: 45,
      image_url: "/fuel-brazier-20kg.png",
      category_slug: "cpl-products",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Coal", weight: "20kg", is_active: true, brand: "CPL Products" },
      is_active: true,
      description: "Brazier smokeless fuel (20kg) – 24% hotter and produces up to 80% less smoke. Suitable for open fires and multi-fuel stoves.",
    },
    {
      id: "fuel-homefire-twizlers",
      name: "Homefire Twizlers (Wood Wool) Natural Firelighters",
      slug: "homefire-twizlers-wood-wool-natural-firelighters",
      brand: "CPL Products",
      price: 2.30,
      stock: 100,
      image_url: "/fuel-homefire-twizlers.png",
      category_slug: "cpl-products",
      subcategory: "Firelighters",
      specs: { fuel_type: "Firelighters", is_active: true, brand: "CPL Products" },
      is_active: true,
      description: "Homefire Twizlers wood wool firelighters – 100% natural, odorless and quick to light for open fires and multi-fuel stoves.",
    },
    {
      id: "fuel-taybrite-25kg",
      name: "Taybrite - 25kg",
      slug: "taybrite-25kg",
      brand: "CPL Products",
      price: 18.75,
      stock: 40,
      image_url: "/fuel-taybrite-25kg.png",
      category_slug: "cpl-products",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Fuel", weight: "25kg", is_active: true, brand: "CPL Products" },
      is_active: true,
      description: "Taybrite 25kg multi-purpose economy smokeless fuel for room heaters, boilers and multi-fuel stoves.",
    },
    {
      id: "fuel-homefire-25kg",
      name: "Homefire - 25kg",
      slug: "homefire-25kg",
      brand: "CPL Products",
      price: 21.15,
      stock: 50,
      image_url: "/fuel-homefire-25kg.png",
      category_slug: "cpl-products",
      subcategory: "Smokeless Fuel",
      specs: { fuel_type: "Smokeless Coal", weight: "25kg", is_active: true, brand: "CPL Products" },
      is_active: true,
      description: "Homefire 25kg premier smokeless coal for open fires and multi-fuel stoves. Up to 33% more heat and burns for up to 9 hours.",
    },
    {
      id: "fuel-homefire-kiln-dried-logs-8kg",
      name: "Homefire Kiln Dried Logs - Approx 8kg",
      slug: "homefire-kiln-dried-logs-approx-8kg",
      brand: "CPL Products",
      price: 8.00,
      stock: 45,
      image_url: "/fuel-homefire-kiln-dried-logs-8kg.png",
      category_slug: "cpl-products",
      subcategory: "Kiln Dried Logs",
      specs: { fuel_type: "Kiln Dried Hardwood", weight: "approx 8kg", is_active: true, brand: "CPL Products" },
      is_active: true,
      description: "Homefire premium kiln dried hardwood logs (approx 8kg) – Ready to Burn certified with moisture content under 20%.",
    },
    {
      id: "fuel-heat-log-blocks-8",
      name: "Heat Log Blocks - Pack of 8",
      slug: "heat-log-blocks-pack-of-8",
      brand: "CPL Products",
      price: 3.85,
      stock: 40,
      image_url: "/fuel-heat-log-blocks-8.png",
      category_slug: "cpl-products",
      subcategory: "Kindling & Heat Logs",
      specs: { fuel_type: "Heat Log Blocks", quantity: "Pack of 8", is_active: true, brand: "CPL Products" },
      is_active: true,
      description: "CPL high energy ultra dry heat log blocks (pack of 8) for open fires, chimineas and multi-fuel stoves.",
    },
  ];

  const CANONICAL_HOMEFIRE_PRODUCTS: CatalogProductItem[] = [
    {
      id: "fuel-coffee-bricks-7kg",
      name: "Coffee Bricks - 7kg",
      slug: "coffee-bricks-7kg",
      brand: "Homefire",
      price: 7.75,
      stock: 35,
      image_url: "/fuel-coffee-bricks-7kg.png",
      category_slug: "homefire",
      subcategory: "Eco Fuel",
      specs: { fuel_type: "Eco Briquettes", weight: "7kg", is_active: true, brand: "Homefire" },
      is_active: true,
      description: "Homefire Coffee Bricks (7kg) – eco-friendly briquettes made from recycled coffee grounds for open fires, chimineas and stoves.",
    },
    {
      id: "fuel-lumpwood-charcoal-4kg",
      name: "Lumpwood Charcoal - 4kg",
      slug: "lumpwood-charcoal-4kg",
      brand: "Homefire",
      price: 5.60,
      stock: 50,
      image_url: "/fuel-lumpwood-charcoal-4kg.png",
      category_slug: "homefire",
      subcategory: "Charcoal",
      specs: { fuel_type: "Lumpwood Charcoal", weight: "4kg", is_active: true, brand: "Homefire" },
      is_active: true,
      description: "Homefire restaurant-grade lumpwood charcoal (4kg) – quick lighting, high heat output, and 100% natural hardwood.",
    },
  ];

  const CANONICAL_KINGFISHER_PRODUCTS: CatalogProductItem[] = [
    {
      id: "bbq-oil-drum-charcoal",
      name: "Oil Drum Charcoal BBQ",
      slug: "oil-drum-charcoal-bbq",
      brand: "Kingfisher",
      price: 72.00,
      stock: 20,
      image_url: "/bbq-oil-drum-charcoal.png",
      category_slug: "kingfisher",
      subcategory: "Barbecues",
      specs: { fuel_type: "Charcoal", is_active: true, brand: "Kingfisher" },
      is_active: true,
      description: "Kingfisher classic oil drum style charcoal barbecue with wide grilling area and warming rack.",
    },
    {
      id: "fuel-small-instant-bbq",
      name: "Small Instant Barbecue",
      slug: "small-instant-barbecue",
      brand: "Kingfisher",
      price: 3.00,
      stock: 50,
      image_url: "/fuel-small-instant-bbq.png",
      category_slug: "kingfisher",
      subcategory: "Barbecues",
      specs: { fuel_type: "Instant Lighting", is_active: true, brand: "Kingfisher" },
      is_active: true,
      description: "Kingfisher BBQ Time instant disposable barbecue with charcoal included. Ready to light for outdoor camping and picnics.",
    },
  ];

  const CANONICAL_LIFESTYLE_APPLIANCES_PRODUCTS: CatalogProductItem[] = [
    {
      id: "heater-lifestyle-catalytic",
      name: "Lifestyle Catalytic",
      slug: "lifestyle-catalytic",
      brand: "Lifestyle Appliances",
      price: 142.95,
      stock: 15,
      image_url: "/heater-lifestyle-catalytic.png",
      category_slug: "lifestyle-appliances",
      subcategory: "Mobile Heaters",
      specs: { fuel_type: "Butane (15kg)", power: "3.0 kW", is_active: true, brand: "Lifestyle Appliances" },
      is_active: true,
      description: "Lifestyle Catalytic portable gas heater (Made in EU) with catalytic panel for clean, odourless, gentle radiant heat.",
    },
    {
      id: "heater-lifestyle-mini-black",
      name: "Lifestyle Mini Black",
      slug: "lifestyle-mini-black",
      brand: "Lifestyle Appliances",
      price: 99.95,
      stock: 20,
      image_url: "/heater-lifestyle-mini-black.png",
      category_slug: "lifestyle-appliances",
      subcategory: "Mobile Heaters",
      specs: { fuel_type: "Butane (7kg / 15kg)", power: "4.2 kW", color: "Black", is_active: true, brand: "Lifestyle Appliances" },
      is_active: true,
      description: "Lifestyle Mini Black portable radiant cabinet heater featuring 3 heat settings, piezo ignition and robust castor wheels.",
    },
    {
      id: "heater-lifestyle-mini-red",
      name: "Lifestyle Mini Red",
      slug: "lifestyle-mini-red",
      brand: "Lifestyle Appliances",
      price: 99.95,
      stock: 20,
      image_url: "/heater-lifestyle-mini-red.png",
      category_slug: "lifestyle-appliances",
      subcategory: "Mobile Heaters",
      specs: { fuel_type: "Butane (7kg / 15kg)", power: "4.2 kW", color: "Red", is_active: true, brand: "Lifestyle Appliances" },
      is_active: true,
      description: "Lifestyle Mini Red portable radiant cabinet heater in striking gloss red with ODS safety protection and castors.",
    },
  ];

  const CANONICAL_NATIONAL_COAL_PRODUCTS: CatalogProductItem[] = [
    {
      id: "fuel-kiln-dried-kindling",
      name: "Kiln Dried Kindling",
      slug: "kiln-dried-kindling",
      brand: "National Coal",
      price: 4.00,
      stock: 45,
      image_url: "/fuel-kiln-dried-kindling.png",
      category_slug: "national-coal",
      subcategory: "Kindling & Logs",
      specs: { fuel_type: "Kindling", is_active: true, brand: "National Coal" },
      is_active: true,
      description: "National Coal kiln dried kindling wood – ideal starter fuel for open fires, log burners and chimineas.",
    },
    {
      id: "fuel-stoveflame-25kg",
      name: "Stoveflame Original 25kg",
      slug: "stoveflame-original-25kg",
      brand: "National Coal",
      price: 18.25,
      stock: 30,
      image_url: "/fuel-stoveflame-25kg.png",
      category_slug: "national-coal",
      subcategory: "Smokeless Coal",
      specs: { fuel_type: "Smokeless Fuel", weight: "25kg", is_active: true, brand: "National Coal" },
      is_active: true,
      description: "National Coal Stoveflame Original (25kg) smokeless fuel – high heat output, low ash, approved for multi-fuel stoves and open fires.",
    },
  ];

  const CANONICAL_SAHARA_PRODUCTS: CatalogProductItem[] = [
    {
      id: "patio-heater-13kw-charcoal",
      name: "13kW Heat Focus Patio Heater Charcoal",
      slug: "13kw-heat-focus-patio-heater-charcoal",
      brand: "Sahara",
      price: 199.99,
      stock: 12,
      image_url: "/patio-heater-13kw-charcoal.png",
      category_slug: "sahara",
      subcategory: "Patio Heaters",
      specs: { fuel_type: "Propane (13kg Patio Gas)", power: "13 kW", color: "Charcoal", is_active: true, brand: "Sahara" },
      is_active: true,
      description: "Sahara 13kW Heat Focus patio heater in sleek charcoal finish featuring revolutionary adjustable reflector to direct heat exactly where needed.",
    },
    {
      id: "patio-heater-15kw-white",
      name: "15kW Heat Focus Patio Heater White",
      slug: "15kw-heat-focus-patio-heater-white",
      brand: "Sahara",
      price: 319.99,
      stock: 8,
      image_url: "/patio-heater-15kw-white.png",
      category_slug: "sahara",
      subcategory: "Patio Heaters",
      specs: { fuel_type: "Propane (13kg Patio Gas)", power: "15 kW", color: "White", is_active: true, brand: "Sahara" },
      is_active: true,
      description: "Sahara 15kW heavy duty Heat Focus patio heater in gloss white with weighted base, wheels and focusable heat reflector.",
    },
  ];

  const CANONICAL_SUNNGAS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "camping-compact-double-burner-stove",
      name: "Compact Double Burner Stove",
      slug: "compact-double-burner-stove",
      brand: "SunnGas",
      price: 20.00,
      stock: 1,
      image_url: "/camping-compact-double-burner.png",
      category_slug: "sunngas",
      subcategory: "Camping",
      specs: {
        model: "CCKE210",
        manufacturer: "SunnGas",
        fuel_type: "Butane or Propane",
        brand: "SunnGas",
        is_active: true,
      },
      is_active: true,
      description:
        "Compact Double Burner Stove, compact size and high performance. Quality construction that works from butane or propane.",
    },
  ];

  const CANONICAL_BARBECUE_PRODUCTS: CatalogProductItem[] = [
    {
      id: "bbq-oil-drum-charcoal",
      name: "Oil Drum Charcoal BBQ",
      slug: "oil-drum-charcoal-bbq",
      brand: "Char-Broil",
      price: 72.00,
      stock: 20,
      image_url: "/bbq-oil-drum-charcoal.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Charcoal Barbecue", fuel: "Charcoal", brand: "Char-Broil" },
      is_active: true,
      description:
        "Oil Drum Charcoal BBQ – heavy-duty classic charcoal barrel barbecue with warming rack, side handles, and wheeled mobility.",
    },
    {
      id: "bbq-outdoor-fire-pit-heater",
      name: "Outdoor BBQ Fire Pit Heater",
      slug: "outdoor-bbq-fire-pit-heater",
      brand: "Char-Broil",
      price: 69.65,
      stock: 25,
      image_url: "/bbq-outdoor-fire-pit-heater.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Fire Pit & BBQ", fuel: "Wood / Charcoal", brand: "Char-Broil" },
      is_active: true,
      description:
        "Outdoor BBQ Fire Pit Heater – dual-purpose garden fire pit with stainless steel outer ring, safety spark mesh guard, and barbecue cooking grate.",
    },
    {
      id: "bbq-performance-pro-s-3",
      name: "Performance Pro S 3",
      slug: "performance-pro-s-3",
      brand: "Char-Broil",
      price: 0,
      stock: 10,
      image_url: "/bbq-performance-pro-s-3.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { burners: "3 Burners", technology: "TRU-Infrared", call_for_price: true, brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Performance Pro S 3 – 3-burner TRU-Infrared gas barbecue with stainless steel hood, side burner, and cast iron grates.",
    },
    {
      id: "bbq-professional-core-b-3",
      name: "Professional Core B 3",
      slug: "professional-core-b-3",
      brand: "Char-Broil",
      price: 0,
      stock: 10,
      image_url: "/bbq-professional-core-b-3.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { burners: "3 Burners", finish: "Black Core", call_for_price: true, brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Core B 3 – premium 3-burner black finish gas barbecue with TRU-Infrared cooking system and electronic SureFire ignition.",
    },
    {
      id: "bbq-professional-core-b-4",
      name: "Professional Core B 4",
      slug: "professional-core-b-4",
      brand: "Char-Broil",
      price: 0,
      stock: 8,
      image_url: "/bbq-professional-core-b-4.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { burners: "4 Burners", finish: "Black Core", call_for_price: true, brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Core B 4 – extra-large 4-burner gas barbecue with side burner, cast iron grates, and high-heat sear burner.",
    },
    {
      id: "bbq-professional-pro-s-2",
      name: "Professional Pro S 2",
      slug: "professional-pro-s-2",
      brand: "Char-Broil",
      price: 459.00,
      stock: 15,
      image_url: "/bbq-professional-pro-s-2.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { burners: "2 Burners", finish: "Stainless Steel", technology: "TRU-Infrared", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Pro S 2 – compact 2-burner stainless steel barbecue featuring patented TRU-Infrared cooking system for 50% juicier food.",
    },
    {
      id: "bbq-professional-pro-s-3",
      name: "Professional Pro S 3",
      slug: "professional-pro-s-3",
      brand: "Char-Broil",
      price: 665.00,
      stock: 12,
      image_url: "/bbq-professional-pro-s-3.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { burners: "3 Burners", finish: "Stainless Steel", technology: "TRU-Infrared", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Professional Pro S 3 – 3-burner stainless steel gas barbecue with high-power sear burner, LED illuminated control knobs, and TRU-Infrared technology.",
    },
    {
      id: "bbq-smart-e",
      name: "Smart-E",
      slug: "smart-e",
      brand: "Char-Broil",
      price: 599.00,
      stock: 15,
      image_url: "/bbq-smart-e.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Electric Grill", technology: "SMART-E Precision", power: "2400W", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil SMART-E – 100% electric barbecue delivering true grill performance without gas or charcoal. SMART PRECISION temperature control from 90°C to 370°C.",
    },
    {
      id: "bbq-smoker",
      name: "Smoker BBQ",
      slug: "smoker-bbq",
      brand: "Char-Broil",
      price: 149.00,
      stock: 20,
      image_url: "/bbq-smoker.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Smoker & Charcoal", brand: "Char-Broil" },
      is_active: true,
      description:
        "Smoker BBQ – premium offset smoker and charcoal barbecue with front access door, chimney damper, and spacious lower storage shelf.",
    },
    {
      id: "bbq-ultimate-3200",
      name: "Ultimate 3200",
      slug: "ultimate-3200",
      brand: "Char-Broil",
      price: 1300.00,
      stock: 6,
      image_url: "/bbq-ultimate-3200.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Outdoor Kitchen BBQ", material: "304 Stainless Steel", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate 3200 – premium 3-burner outdoor kitchen barbecue island crafted from marine-grade 304 stainless steel with granite-look countertop.",
    },
    {
      id: "bbq-ultimate-package",
      name: "Ultimate BBQ Package",
      slug: "ultimate-bbq-package",
      brand: "Char-Broil",
      price: 3100.00,
      stock: 4,
      image_url: "/bbq-ultimate-package.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Complete Modular Kitchen", material: "304 Stainless Steel", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate BBQ Package – complete L-shaped luxury modular outdoor kitchen including Ultimate 3200 Grill, Entertainment Sink Module, and Corner Unit.",
    },
    {
      id: "bbq-ultimate-corner-module",
      name: "Ultimate Corner Module",
      slug: "ultimate-corner-module",
      brand: "Char-Broil",
      price: 565.00,
      stock: 10,
      image_url: "/bbq-ultimate-corner-module.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Modular Corner Unit", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate Corner Module – 90-degree connecting corner unit with granite worktop and double-door storage cabinet for custom outdoor kitchen layouts.",
    },
    {
      id: "bbq-ultimate-entertainment",
      name: "Ultimate Entertainment",
      slug: "ultimate-entertainment",
      brand: "Char-Broil",
      price: 1300.00,
      stock: 8,
      image_url: "/bbq-ultimate-entertainment.png",
      category_slug: "gas-appliances",
      subcategory: "Barbecues",
      specs: { type: "Entertainment & Sink Module", material: "304 Stainless Steel", brand: "Char-Broil" },
      is_active: true,
      description:
        "Char-Broil Ultimate Entertainment Module – outdoor kitchen preparation station featuring running-water sink faucet, integrated ice bucket / cooler, and storage drawers.",
    },
  ];

  const CANONICAL_MOBILE_HEATERS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "heater-lifestyle-catalytic",
      name: "Lifestyle Catalytic",
      slug: "lifestyle-catalytic-mobile-heater",
      brand: "Lifestyle",
      price: 142.95,
      stock: 12,
      image_url: "/heater-lifestyle-catalytic.png",
      category_slug: "gas-appliances",
      subcategory: "Mobile Heaters",
      specs: { brand: "Lifestyle", type: "Catalytic Gas Heater", heat_output: "3.0 kW" },
      is_active: true,
      description:
        "Lifestyle Catalytic Mobile Gas Heater – clean-burning catalytic heating with 3.0 kW heat output, integrated piezo ignition, and oxygen depletion safety system.",
    },
    {
      id: "heater-lifestyle-mini-black",
      name: "Lifestyle Mini Black",
      slug: "lifestyle-mini-black-mobile-heater",
      brand: "Lifestyle",
      price: 99.95,
      stock: 15,
      image_url: "/heater-lifestyle-mini-black.png",
      category_slug: "gas-appliances",
      subcategory: "Mobile Heaters",
      specs: { brand: "Lifestyle", type: "Radiant Gas Heater", finish: "Black", heat_output: "4.2 kW" },
      is_active: true,
      description:
        "Lifestyle Mini Black Mobile Gas Heater – compact portable cabinet heater with 3 heat settings up to 4.2 kW, castors for easy mobility, and safety flame failure device.",
    },
    {
      id: "heater-lifestyle-mini-red",
      name: "Lifestyle Mini Red",
      slug: "lifestyle-mini-red-mobile-heater",
      brand: "Lifestyle",
      price: 99.95,
      stock: 15,
      image_url: "/heater-lifestyle-mini-red.png",
      category_slug: "gas-appliances",
      subcategory: "Mobile Heaters",
      specs: { brand: "Lifestyle", type: "Radiant Gas Heater", finish: "Red", heat_output: "4.2 kW" },
      is_active: true,
      description:
        "Lifestyle Mini Red Mobile Gas Heater – stylish compact red cabinet heater with variable heat settings, ODS safety cut-off, and easy cylinder loading.",
    },
    {
      id: "heater-manhatten-living-flame",
      name: "Manhatten Living Flame",
      slug: "manhatten-living-flame-mobile-heater",
      brand: "Universal Innovations",
      price: 269.99,
      stock: 8,
      image_url: "/heater-manhatten-living-flame.png",
      category_slug: "gas-appliances",
      subcategory: "Mobile Heaters",
      specs: { brand: "Universal Innovations", type: "Living Flame Gas Heater", finish: "Contemporary Black & Chrome" },
      is_active: true,
      description:
        "Manhatten Living Flame Mobile Gas Heater – contemporary living flame stove design with real dancing flames, coals effect, 3.4 kW heat output, and safety shut-off.",
    },
    {
      id: "heater-phoenix-cabinet",
      name: "Phoenix Cabinet Heater",
      slug: "phoenix-cabinet-heater",
      brand: "Phoenix",
      price: 99.99,
      stock: 14,
      image_url: "/heater-phoenix-cabinet.png",
      category_slug: "gas-appliances",
      subcategory: "Mobile Heaters",
      specs: { brand: "Phoenix", type: "Radiant Cabinet Heater", heat_output: "4.2 kW" },
      is_active: true,
      description:
        "Phoenix Cabinet Heater – dependable high-efficiency 4.2 kW portable infrared gas heater with 3 heat settings, ergonomic handles, and swivel castors.",
    },
    {
      id: "heater-provence-flame-effect",
      name: "Provence Flame Effect Heater",
      slug: "provence-flame-effect-heater",
      brand: "Universal Innovations",
      price: 340.00,
      stock: 6,
      image_url: "/heater-provence-flame-effect.png",
      category_slug: "gas-appliances",
      subcategory: "Mobile Heaters",
      specs: { brand: "Universal Innovations", type: "Traditional Living Flame Stove", finish: "Matt Cast Iron Style" },
      is_active: true,
      description:
        "Provence Flame Effect Heater – traditional rustic cast iron style gas stove heater with genuine living flame effect, 3.0 kW max heat output, and no chimney required.",
    },
    {
      id: "heater-superheat-model-h46",
      name: "Superheat Model H46",
      slug: "superheat-model-h46-mobile-heater",
      brand: "Superheat",
      price: 129.95,
      stock: 10,
      image_url: "/heater-superheat-model-h46.png",
      category_slug: "gas-appliances",
      subcategory: "Mobile Heaters",
      specs: { brand: "Superheat", type: "Radiant Gas Heater", model: "H46", heat_output: "4.2 kW" },
      is_active: true,
      description:
        "Superheat Model H46 Portable Gas Heater – heavy-duty 4.2 kW ceramic radiant heater with rotary control, oxygen depletion sensor, and robust steel body.",
    },
  ];

  const CANONICAL_PATIO_HEATERS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "patio-heater-13kw-charcoal",
      name: "13kW Heat Focus Patio Heater Charcoal",
      slug: "13kw-heat-focus-patio-heater-charcoal",
      brand: "Lifestyle",
      price: 199.99,
      stock: 15,
      image_url: "/patio-heater-13kw-charcoal.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Lifestyle", type: "Gas Patio Heater", output: "13kW", finish: "Charcoal" },
      is_active: true,
      description:
        "13kW Heat Focus Patio Heater Charcoal – high-performance outdoor gas patio heater with revolutionary heat focus directional reflector for optimal heating efficiency.",
    },
    {
      id: "patio-heater-15kw-white",
      name: "15kW Heat Focus Patio Heater White",
      slug: "15kw-heat-focus-patio-heater-white",
      brand: "Lifestyle",
      price: 319.99,
      stock: 10,
      image_url: "/patio-heater-15kw-white.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Lifestyle", type: "Gas Patio Heater", output: "15kW", finish: "White" },
      is_active: true,
      description:
        "15kW Heat Focus Patio Heater White – premium commercial-grade outdoor gas heater with adjustable heat reflector, sleek white gloss body, and anti-tilt safety shut-off.",
    },
    {
      id: "patio-heater-free-standing",
      name: "Free Standing Patio Heater",
      slug: "free-standing-patio-heater",
      brand: "Kingfisher",
      price: 60.95,
      stock: 20,
      image_url: "/patio-heater-free-standing.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Kingfisher", type: "Electric Free Standing Heater" },
      is_active: true,
      description:
        "Free Standing Patio Heater – versatile infrared quartz electric garden heater with 3 heat settings, adjustable pole height, and heavy stable base.",
    },
    {
      id: "patio-heater-outdoor-fire-pit",
      name: "Outdoor BBQ Fire Pit Heater",
      slug: "outdoor-bbq-fire-pit-heater",
      brand: "Char-Broil",
      price: 69.65,
      stock: 25,
      image_url: "/patio-heater-outdoor-fire-pit.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Char-Broil", type: "Fire Pit & BBQ", fuel: "Wood / Charcoal" },
      is_active: true,
      description:
        "Outdoor BBQ Fire Pit Heater – dual-purpose circular garden fire pit and barbecue with spark mesh guard, chrome cooking grill, and heat-resistant finish.",
    },
    {
      id: "patio-heater-outdoor-gas-tall",
      name: "Outdoor Gas Patio Heater",
      slug: "outdoor-gas-patio-heater",
      brand: "Lifestyle",
      price: 162.00,
      stock: 12,
      image_url: "/patio-heater-outdoor-gas-tall.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Lifestyle", type: "Tall Gas Patio Heater", finish: "Green" },
      is_active: true,
      description:
        "Outdoor Gas Patio Heater – classic tall outdoor mushroom heater with powder-coated green finish, integrated cylinder enclosure, and electronic ignition.",
    },
    {
      id: "patio-heater-table-top",
      name: "Outdoor Table Top Patio Heater",
      slug: "outdoor-table-top-patio-heater",
      brand: "Lifestyle",
      price: 74.00,
      stock: 16,
      image_url: "/patio-heater-table-top.png",
      category_slug: "gas-appliances",
      subcategory: "Patio Heaters",
      specs: { brand: "Lifestyle", type: "Table Top Gas Patio Heater", finish: "Green" },
      is_active: true,
      description:
        "Outdoor Table Top Patio Heater – compact garden dining table heater with stainless steel burner, safety guard, and anti-tilt mechanism.",
    },
  ];

  const CANONICAL_CAMPING_PRODUCTS: CatalogProductItem[] = [
    {
      id: "camping-206l",
      name: "Camping 206L",
      slug: "camping-206l",
      brand: "Campingaz",
      price: 12.00,
      stock: 20,
      image_url: "/camping-206l.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Camping Gas Lantern", power: "80W" },
      is_active: true,
      description:
        "Campingaz Camping 206L – high-power 80W portable camping gas lantern with globe protection guard and integrated carry handle.",
    },
    {
      id: "camping-206s",
      name: "Camping 206S",
      slug: "camping-206s",
      brand: "Campingaz",
      price: 10.00,
      stock: 25,
      image_url: "/camping-206s.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Single Burner Camping Stove", power: "1250W" },
      is_active: true,
      description:
        "Campingaz Camping 206S – compact 1250W single burner portable camping stove with wide pan supports and stable cartridge base.",
    },
    {
      id: "camp-bistro-3-camping-gas-stove",
      name: "Camp Bistro 3 Camping Gas Stove",
      slug: "camp-bistro-3-camping-gas-stove",
      brand: "Campingaz",
      price: 20.50,
      stock: 30,
      image_url: "/camping-camp-bistro-3.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Tabletop Gas Stove", ignition: "Piezo" },
      is_active: true,
      description:
        "Campingaz Camp Bistro 3 Camping Gas Stove – classic tabletop portable gas cooker with automatic piezo ignition and durable carry case included.",
    },
    {
      id: "camping-instaflam-stove",
      name: "Instaflam Stove",
      slug: "instaflam-stove",
      brand: "Instaflam",
      price: 3.50,
      stock: 40,
      image_url: "/camping-instaflam-stove.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "Instaflam", type: "Portable Camping Stove" },
      is_active: true,
      description:
        "Instaflam Stove – ultra-compact lightweight backpacking gas stove with fold-out pan supports and fine flame control knob.",
    },
    {
      id: "camping-chef-cv-gas-stove",
      name: "Camping Chef CV Gas Stove",
      slug: "camping-chef-cv-gas-stove",
      brand: "Campingaz",
      price: 44.95,
      stock: 15,
      image_url: "/camping-chef-cv.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Double Burner & Grill", power: "4900W" },
      is_active: true,
      description:
        "Campingaz Camping Chef CV Gas Stove – double burner camping stove with downward grill for toasting, briefcase lid closure, and CV cartridge compatibility.",
    },
    {
      id: "camping-bleuet-cv270l",
      name: "Bleuet CV270L",
      slug: "bleuet-cv270l",
      brand: "Campingaz",
      price: 10.00,
      stock: 18,
      image_url: "/camping-bleuet-cv270l.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Camping Gas Lantern" },
      is_active: true,
      description:
        "Campingaz Bleuet CV270L – reliable outdoor gas lantern with frosted globe for soft diffused campsite illumination, using Easy Clic Plus connection.",
    },
    {
      id: "camping-bleuet-cv270s",
      name: "Bleuet CV270S",
      slug: "bleuet-cv270s",
      brand: "Campingaz",
      price: 7.00,
      stock: 22,
      image_url: "/camping-bleuet-cv270s.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "Campingaz", type: "Single Burner Camping Stove", power: "1200W" },
      is_active: true,
      description:
        "Campingaz Bleuet CV270S – 1200W pocket-sized camping gas burner with Easy Clic cartridge connection and rugged serrated pan support arms.",
    },
    {
      id: "compact-double-burner-stove",
      name: "Compact Double Burner Stove",
      slug: "compact-double-burner-stove",
      brand: "SunnGas",
      price: 20.00,
      stock: 16,
      image_url: "/camping-compact-double-burner.png",
      category_slug: "gas-appliances",
      subcategory: "Camping",
      specs: { brand: "SunnGas", type: "Dual Burner Camping Stove" },
      is_active: true,
      description:
        "SunnGas Compact Double Burner Stove – heavy-duty enameled dual-burner family camping stove with individual burner control and chrome wire cooking grid.",
    },
  ];

  const CANONICAL_GARDEN_PRODUCTS: CatalogProductItem[] = [
    {
      id: "sylvagrow-multi-purpose-compost-15l",
      name: "SylvaGrow® Multi-Purpose Compost 15L",
      slug: "sylvagrow-multi-purpose-compost-15l",
      brand: "Melcourt",
      price: 2.50,
      stock: 50,
      image_url: "/garden-sylvagrow-15l.png",
      category_slug: "garden",
      subcategory: "Compost",
      specs: { brand: "Melcourt", volume: "15L", type: "Multi-Purpose Peat-Free Compost", endorsed_by: "RHS" },
      is_active: true,
      description:
        "Melcourt SylvaGrow® Multi-Purpose Compost (15L) – 100% peat-free professional quality compost ideal for potting, containers, hanging baskets, and garden planting.",
    },
    {
      id: "sylvagrow-multi-purpose-compost-40l",
      name: "SylvaGrow® Multi-Purpose Compost 40L",
      slug: "sylvagrow-multi-purpose-compost-40l",
      brand: "Melcourt",
      price: 6.50,
      stock: 60,
      image_url: "/garden-sylvagrow-40l.png",
      category_slug: "garden",
      subcategory: "Compost",
      specs: { brand: "Melcourt", volume: "40L", type: "Multi-Purpose Peat-Free Compost", endorsed_by: "RHS" },
      is_active: true,
      description:
        "Melcourt SylvaGrow® Multi-Purpose Compost (40L) – premium 100% peat-free growing medium endorsed by the RHS for seed sowing, pricking out, potting, and bed planting.",
    },
    {
      id: "sylvagrow-organic-planter",
      name: "SylvaGrow Organic Planter",
      slug: "sylvagrow-organic-planter",
      brand: "Melcourt",
      price: 5.25,
      stock: 35,
      image_url: "/garden-sylvagrow-planter.png",
      category_slug: "garden",
      subcategory: "Planters",
      specs: { brand: "Melcourt", type: "Organic Peat-Free Planter Grow Bag", endorsed_by: "RHS" },
      is_active: true,
      description:
        "Melcourt SylvaGrow® Organic Planter – 100% peat-free deep grow bag planter enriched with balanced organic nutrients, ideal for tomatoes, peppers, cucumbers, and salad crops.",
    },
    {
      id: "melcourt-decorative-bark-large-nuggets-mulch-60l",
      name: "Melcourt Decorative Bark Large Nuggets Mulch 60L",
      slug: "melcourt-decorative-bark-large-nuggets-mulch-60l",
      brand: "Melcourt",
      price: 10.30,
      stock: 45,
      image_url: "/garden-melcourt-bark-60l.png",
      category_slug: "garden",
      subcategory: "Bark & Mulch",
      specs: { brand: "Melcourt", volume: "60L", type: "Decorative Chunky Bark Nuggets", endorsed_by: "RHS" },
      is_active: true,
      description:
        "Melcourt Decorative Bark Large Nuggets Mulch (60L) – long-lasting British chunky pine bark mulch for decorative borders, moisture retention, weed suppression, and garden landscape paths.",
    },
  ];

  const CANONICAL_FOOD_PRODUCTS: CatalogProductItem[] = [
    {
      id: "free-range-eggs",
      name: "Free Range Eggs",
      slug: "free-range-eggs",
      brand: "Local Produce",
      price: 1.95,
      stock: 10,
      image_url: "/food-free-range-eggs.png",
      category_slug: "food",
      subcategory: "Local Forecourt Produce",
      specs: { quantity: "Half a dozen (6 eggs)", type: "Free Range Eggs", origin: "Local Gloucestershire Farm" },
      is_active: true,
      description: "Free range eggs - half a dozen.",
    },
  ];

  const CANONICAL_GAS_SPARES_PRODUCTS: CatalogProductItem[] = [
    {
      id: "spares-butane-regulator-low-pressure",
      name: "Low Pressure Butane Regulator",
      slug: "low-pressure-butane-regulator",
      brand: "Clesse",
      price: 8.99,
      stock: 50,
      image_url: "/spares-butane-regulator-low-pressure.png",
      category_slug: "gas-spares",
      subcategory: "Butane Regulators",
      specs: { type: "Low Pressure Butane Regulator", fitting: "Screw Fitting", pressure: "28mbar", brand: "Clesse" },
      is_active: true,
      description: "Low pressure butane gas regulator with screw fitting for standard UK butane cylinders.",
    },
    {
      id: "spares-butane-clip-on-21mm",
      name: "Low Pressure Clip-On Regulator 21mm",
      slug: "low-pressure-clip-on-regulator-21mm",
      brand: "Clesse",
      price: 8.99,
      stock: 50,
      image_url: "/spares-butane-clip-on-21mm.png",
      category_slug: "gas-spares",
      subcategory: "Butane Regulators",
      specs: { type: "Clip-On Butane Regulator", fitting: "21mm Clip-on", pressure: "28mbar", brand: "Clesse" },
      is_active: true,
      description: "Low pressure 21mm clip-on butane gas regulator for Calor and standard 21mm butane cylinders.",
    },
    {
      id: "spares-propane-regulator-low-pressure",
      name: "Low Pressure Propane Regulator",
      slug: "low-pressure-propane-regulator",
      brand: "Clesse",
      price: 8.99,
      stock: 50,
      image_url: "/spares-propane-regulator-low-pressure.png",
      category_slug: "gas-spares",
      subcategory: "Propane Regulators",
      specs: { type: "Low Pressure Propane Regulator", fitting: "POL Screw Fitting", pressure: "37mbar", brand: "Clesse" },
      is_active: true,
      description: "Low pressure propane gas regulator with POL male screw fitting for domestic and light commercial propane bottles.",
    },
    {
      id: "spares-propane-clip-on-27mm",
      name: "Low Pressure Propane Clip-On Regulator 27mm",
      slug: "low-pressure-propane-clip-on-regulator-27mm",
      brand: "Clesse",
      price: 10.50,
      stock: 50,
      image_url: "/spares-propane-clip-on-27mm.png",
      category_slug: "gas-spares",
      subcategory: "Propane Regulators",
      specs: { type: "Clip-On Propane Patio Regulator", fitting: "27mm Clip-on", pressure: "37mbar", brand: "Clesse" },
      is_active: true,
      description: "Low pressure 27mm clip-on propane gas regulator specifically engineered for Patio Gas cylinders and BBQs.",
    },
    {
      id: "spares-compact-800-acov-2pack",
      name: "Compact 800 Acov (OPSO) - 2 Pack",
      slug: "compact-800-acov-opso-2-pack",
      brand: "Clesse",
      price: 140.00,
      stock: 20,
      image_url: "/spares-compact-800-acov-2pack.png",
      category_slug: "gas-spares",
      subcategory: "Changeover Valves",
      specs: { type: "Automatic Changeover Valve (OPSO)", capacity: "2 Cylinder System", brand: "Clesse", safety: "Over Pressure Shut Off (OPSO)" },
      is_active: true,
      description: "Compact 800 automatic changeover valve (OPSO) 2-cylinder pack with pigtail hoses and bracket for off-grid propane systems.",
    },
    {
      id: "spares-compact-800-acov-4pack",
      name: "Compact 800 Acov (OPSO) - 4 Pack",
      slug: "compact-800-acov-opso-4-pack",
      brand: "Clesse",
      price: 199.95,
      stock: 15,
      image_url: "/spares-compact-800-acov-4pack.png",
      category_slug: "gas-spares",
      subcategory: "Changeover Valves",
      specs: { type: "Automatic Changeover Valve (OPSO)", capacity: "4 Cylinder System", brand: "Clesse", safety: "Over Pressure Shut Off (OPSO)" },
      is_active: true,
      description: "Compact 800 automatic changeover valve (OPSO) 4-cylinder pack with multi-bottle pigtail manifolds for whole-house propane heating.",
    },
  ];

  const CANONICAL_TRAILERS_PRODUCTS: CatalogProductItem[] = [
    {
      id: "trailer-single-axle-500",
      name: "Single Axle Unbraked Box Trailer",
      slug: "single-axle-unbraked-box-trailer",
      brand: "John Stayte Trailers",
      price: 895.0,
      stock: 5,
      image_url: "/trailers-cat.jpg",
      category_slug: "trailers",
      subcategory: "Domestic Trailers",
      specs: {
        payload: "500kg Capacity",
        axle: "Single Unbraked Axle",
        hitch: "50mm Standard Ball Coupling",
        body: "Galvanised Steel Sides & Non-Slip Base",
      },
      is_active: true,
      description:
        "Robust single-axle box trailer ideal for garden clearances, domestic luggage, DIY and light haulage across Gloucestershire.",
    },
    {
      id: "trailer-twin-axle-haulage",
      name: "Heavy-Duty Twin-Axle Commercial Trailer",
      slug: "heavy-duty-twin-axle-commercial-trailer",
      brand: "John Stayte Trailers",
      price: 1850.0,
      stock: 3,
      image_url: "/trailers-cat.jpg",
      category_slug: "trailers",
      subcategory: "Commercial Trailers",
      specs: {
        payload: "1500kg Gross Weight",
        axle: "Twin Braked Axle",
        hitch: "Inertia Braked Tow Hitch",
        features: "Drop-down Tailgate & Jockey Wheel Included",
      },
      is_active: true,
      description:
        "Commercial grade twin-axle plant and goods trailer built for machinery, building supplies, farm and estate maintenance.",
    },
  ];

  const CANONICAL_WORKWEAR_PRODUCTS: CatalogProductItem[] = [
    {
      id: "workwear-hivis-waterproof-traffic-jacket",
      name: "Hi-Vis Waterproof Traffic Jacket",
      slug: "hi-vis-waterproof-traffic-jacket",
      brand: "Stayte Workwear",
      price: 39.5,
      stock: 40,
      image_url: "/workwear-cat.jpg",
      category_slug: "workwear",
      subcategory: "High-Visibility Outerwear",
      specs: {
        standard: "EN ISO 20471 Class 3 Certified",
        weather: "100% Waterproof with Storm Flap",
        lining: "Quilted Thermal Insulation",
        pockets: "Concealed Mobile & Radio Pockets",
      },
      is_active: true,
      description:
        "Certified heavy-duty high-visibility waterproof winter work jacket engineered for forecourt, road transport, agricultural and construction safety.",
    },
    {
      id: "workwear-steel-toe-safety-dealer-boots",
      name: "Steel Toe Cap Dealer Work Boots",
      slug: "steel-toe-cap-dealer-work-boots",
      brand: "Stayte Workwear",
      price: 48.0,
      stock: 35,
      image_url: "/workwear-cat.jpg",
      category_slug: "workwear",
      subcategory: "Safety Footwear & PPE",
      specs: {
        safety: "S3 SRC Safety Standard",
        protection: "Steel Toe Cap & Midsole Barrier",
        leather: "Full Grain Water-Resistant Leather",
        sole: "Oil, Acid & Slip Resistant PU Sole",
      },
      is_active: true,
      description:
        "Comfortable and durable elastic-sided dealer boots with steel safety toe cap and penetration-resistant sole for yard and farm duties.",
    },
  ];

  // Filter products for the active category / subcategory directly from live Supabase dbProducts
  const categoryProducts = useMemo(() => {
    const activeProducts = dbProducts.filter((p) => p.is_active !== false);
    const catIdNorm = (activeCategoryId || "").toLowerCase().trim();
    const subNorm = (activeSubId || "").toLowerCase().trim();

    // 1. Calor Gas
    if (catIdNorm === "calor-gas" || catIdNorm === "gas" || catIdNorm === "bottled-gas") {
      const calorProds = activeProducts.filter((p) => {
        const c = (p.category_slug || "").toLowerCase();
        const b = (p.brand || "").toLowerCase();
        return b === "calor" || c === "calor-gas" || c === "gas" || c === "bottled-gas";
      });

      if (!activeSubId || activeSubId === "all") return calorProds;
      if (subNorm === "patio-gas" || subNorm === "patio" || subNorm === "patio-refill") {
        return calorProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("patio") ||
            p.name.toLowerCase().includes("patio"),
        );
      }
      if (subNorm === "butane" || subNorm === "butane-refill") {
        return calorProds.filter(
          (p) =>
            ((p.subcategory || "").toLowerCase().includes("butane") ||
              p.name.toLowerCase().includes("butane")) &&
            !p.name.toLowerCase().includes("patio"),
        );
      }
      if (subNorm === "propane" || subNorm === "propane-refill") {
        return calorProds.filter(
          (p) =>
            ((p.subcategory || "").toLowerCase().includes("propane") ||
              p.name.toLowerCase().includes("propane")) &&
            !p.name.toLowerCase().includes("patio"),
        );
      }
      return calorProds;
    }

    // 2. Pub Gas
    if (catIdNorm === "pub-gas") {
      const pubProds = activeProducts.filter((p) => {
        const c = (p.category_slug || "").toLowerCase();
        const b = (p.brand || "").toLowerCase();
        return (
          c === "pub-gas" ||
          b === "stayte pub gas" ||
          (b === "air liquide" && (p.category_id === "3421fe8c-b76d-44f2-8801-b84226f8b4f5" || c === "pub-gas"))
        );
      });

      if (!activeSubId || activeSubId === "all" || activeSubId === "all-pub-gas") return pubProds;
      if (
        subNorm === "co2" ||
        subNorm.includes("carbon-dioxide") ||
        (subNorm.includes("co2") && !subNorm.includes("ring") && !subNorm.includes("oring"))
      ) {
        return pubProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("co2") &&
            !(p.subcategory || "").toLowerCase().includes("ring"),
        );
      }
      if (
        subNorm === "mixed-gas" ||
        (subNorm.includes("mixed") && !subNorm.includes("ring") && !subNorm.includes("oring"))
      ) {
        return pubProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("mixed gas") &&
            !(p.subcategory || "").toLowerCase().includes("ring"),
        );
      }
      if (subNorm === "spanner" || subNorm.includes("spanner")) {
        return pubProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("spanner") ||
            p.slug.includes("spanner"),
        );
      }
      if (
        subNorm === "mixed-oring" ||
        subNorm === "mixed-gas-o-ring" ||
        (subNorm.includes("mixed") && (subNorm.includes("ring") || subNorm.includes("oring")))
      ) {
        return pubProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("mixed gas o-ring") ||
            p.slug.includes("mixed-gas-o-ring"),
        );
      }
      if (
        subNorm === "co2-oring" ||
        subNorm === "co2-o-ring" ||
        (subNorm.includes("co2") && (subNorm.includes("ring") || subNorm.includes("oring")))
      ) {
        return pubProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("co2 o-ring") ||
            p.slug.includes("co2-o-ring"),
        );
      }
      return pubProds;
    }

    // 3. Air Liquide (Brand category)
    if (catIdNorm === "air-liquide") {
      const airProds = activeProducts.filter((p) => {
        const b = (p.brand || "").toLowerCase();
        return b === "air liquide" || b === "airliquide";
      });
      if (!activeSubId || activeSubId === "all" || activeSubId === "all-air-liquide") return airProds;
      if (subNorm === "co2" || subNorm.includes("carbon-dioxide") || (subNorm.includes("co2") && !subNorm.includes("ring"))) {
        return airProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("co2") ||
            p.name.toLowerCase().includes("carbon dioxide"),
        );
      }
      if (subNorm === "mixed-gas" || subNorm.includes("mixed")) {
        return airProds.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("mixed") ||
            p.name.toLowerCase().includes("mixed gas"),
        );
      }
      return airProds;
    }

    // BOC Gases (Brand category)
    if (catIdNorm === "boc-gases" || catIdNorm === "boc") {
      const bocProds = activeProducts.filter((p) => {
        const b = (p.brand || "").toLowerCase();
        const c = (p.category_slug || "").toLowerCase();
        return b.includes("boc") || c === "boc-gases" || c === "boc";
      });
      return bocProds;
    }

    // 4. Coal, Logs & Other Fuels
    if (catIdNorm === "coal-fuels" || catIdNorm === "coal-logs") {
      const fuels = activeProducts.filter((p) => {
        const c = (p.category_slug || "").toLowerCase();
        return c === "coal-fuels" || c === "coal-logs";
      });

      if (!activeSubId || activeSubId === "all") return fuels;
      if (subNorm === "smokeless-fuel" || subNorm === "smokeless") {
        return fuels.filter((p) => (p.subcategory || "").toLowerCase().includes("smokeless"));
      }
      if (subNorm === "kiln-dried-logs" || subNorm === "logs") {
        return fuels.filter((p) => (p.subcategory || "").toLowerCase().includes("kiln dried"));
      }
      if (subNorm === "kindling-heat-logs" || subNorm === "kindling") {
        return fuels.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("kindling") ||
            (p.subcategory || "").toLowerCase().includes("heat log"),
        );
      }
      if (subNorm === "charcoal" || subNorm === "charcoal-bbq" || subNorm === "bbq") {
        return fuels.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("charcoal") ||
            (p.subcategory || "").toLowerCase().includes("bbq"),
        );
      }
      if (subNorm === "firelighters" || subNorm === "liquid-fuel") {
        return fuels.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("liquid") ||
            p.name.toLowerCase().includes("fluid") ||
            p.name.toLowerCase().includes("firelog") ||
            p.name.toLowerCase().includes("twizlers"),
        );
      }
      if (subNorm === "barbecue" || subNorm === "bbq") {
        return fuels.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("barbecue") ||
            (p.subcategory || "").toLowerCase().includes("bbq"),
        );
      }
      return fuels;
    }

    // 5. Gas Appliances
    if (catIdNorm === "gas-appliances") {
      const appliances = activeProducts.filter(
        (p) => (p.category_slug || "").toLowerCase() === "gas-appliances",
      );
      if (!activeSubId || activeSubId === "all") return appliances;
      if (subNorm === "barbecues" || subNorm === "barbecue" || subNorm === "bbq") {
        return appliances.filter((p) => (p.subcategory || "").toLowerCase().includes("barbecue"));
      }
      if (subNorm === "mobile-heaters" || subNorm === "heaters") {
        return appliances.filter((p) => (p.subcategory || "").toLowerCase().includes("mobile heater"));
      }
      if (subNorm === "patio-heaters" || subNorm === "patio") {
        return appliances.filter((p) => (p.subcategory || "").toLowerCase().includes("patio heater"));
      }
      if (subNorm === "camping") {
        return appliances.filter((p) => (p.subcategory || "").toLowerCase().includes("camping"));
      }
      return appliances;
    }

    // 6. Gas Spares
    if (catIdNorm === "gas-spares") {
      const spares = activeProducts.filter(
        (p) => (p.category_slug || "").toLowerCase() === "gas-spares",
      );
      if (!activeSubId || activeSubId === "all") return spares;
      if (subNorm === "butane-regulators" || subNorm === "butane") {
        return spares.filter((p) => (p.subcategory || "").toLowerCase().includes("butane"));
      }
      if (subNorm === "propane-regulators" || subNorm === "propane") {
        return spares.filter((p) => (p.subcategory || "").toLowerCase().includes("propane"));
      }
      if (subNorm === "changeover-valves" || subNorm === "valves") {
        return spares.filter((p) => (p.subcategory || "").toLowerCase().includes("changeover"));
      }
      return spares;
    }

    // 7. Campingaz
    if (catIdNorm === "campingaz") {
      return activeProducts.filter((p) => {
        const c = (p.category_slug || "").toLowerCase();
        const b = (p.brand || "").toLowerCase();
        return c === "campingaz" || b === "campingaz";
      });
    }

    // 8. Animal Feed
    if (catIdNorm === "animal-feed") {
      const feed = activeProducts.filter(
        (p) => (p.category_slug || "").toLowerCase() === "animal-feed",
      );
      if (!activeSubId || activeSubId === "all") return feed;
      if (subNorm === "dog-food" || subNorm === "dog" || subNorm === "pet") {
        return feed.filter((p) => (p.subcategory || "").toLowerCase().includes("dog"));
      }
      if (subNorm === "wild-bird" || subNorm === "bird") {
        return feed.filter((p) => (p.subcategory || "").toLowerCase().includes("bird"));
      }
      if (subNorm === "poultry" || subNorm === "poultry-feed" || subNorm === "farm") {
        return feed.filter(
          (p) =>
            (p.subcategory || "").toLowerCase().includes("poultry") ||
            (p.subcategory || "").toLowerCase().includes("farm"),
        );
      }
      return feed;
    }

    // 9. Fishing Baits
    if (catIdNorm === "dynamite-baits" || catIdNorm === "fishing-baits") {
      const baits = activeProducts.filter((p) => {
        const c = (p.category_slug || "").toLowerCase();
        const b = (p.brand || "").toLowerCase();
        return c === "dynamite-baits" || c === "fishing-baits" || b === "dynamite baits";
      });
      if (!activeSubId || activeSubId === "all") return baits;
      if (subNorm === "groundbait") {
        return baits.filter((p) => (p.subcategory || "").toLowerCase().includes("groundbait"));
      }
      if (subNorm === "pellets") {
        return baits.filter((p) => (p.subcategory || "").toLowerCase().includes("pellet"));
      }
      return baits;
    }

    // 10. Garden
    if (catIdNorm === "garden") {
      return activeProducts.filter((p) => (p.category_slug || "").toLowerCase() === "garden");
    }

    // 11. Food
    if (catIdNorm === "food") {
      return activeProducts.filter((p) => (p.category_slug || "").toLowerCase() === "food");
    }

    // 12. CPL Products
    if (catIdNorm === "cpl-products") {
      const CPL_SLUGS = new Set([
        "brazier-10kg",
        "brazier-20kg",
        "homefire-twizlers-wood-wool-natural-firelighters",
        "taybrite-25kg",
        "homefire-25kg",
        "homefire-kiln-dried-logs-approx-8kg",
        "heat-log-blocks-pack-of-8",
      ]);
      return activeProducts.filter((p) => {
        const b = (p.brand || "").toLowerCase().trim();
        const s = (p.slug || "").toLowerCase().trim();
        const c = (p.category_slug || "").toLowerCase().trim();
        return (
          b === "cpl" ||
          b === "cpl products" ||
          c === "cpl-products" ||
          CPL_SLUGS.has(s)
        );
      });
    }

    // 13. Generic & Strict Brand categories
    const brandMatch = activeProducts.filter((p) => {
      const b = (p.brand || "").toLowerCase().trim();
      const c = (p.category_slug || "").toLowerCase().trim();
      const bSlug = b.replace(/[^a-z0-9]+/g, "-");

      return (
        c === catIdNorm ||
        bSlug === catIdNorm ||
        b === catIdNorm.replace(/-/g, " ") ||
        (catIdNorm === "char-broil" && (b === "char-broil" || b === "char broil")) ||
        (catIdNorm === "big-k" && (b === "big k" || b === "big-k")) ||
        (catIdNorm === "cpl-products" && (b === "cpl" || b === "cpl products")) ||
        (catIdNorm === "cleese-uk" && (b === "clesse" || b === "cleese uk")) ||
        (catIdNorm === "bonningtons" && b === "bonningtons") ||
        (catIdNorm === "bio-bean" && b === "bio-bean") ||
        (catIdNorm === "bar-be-quick" && (b === "bar-be-quick" || b === "bar be quick")) ||
        (catIdNorm === "beekind" && b === "beekind") ||
        (catIdNorm === "broil-king" && (b === "broil king" || b === "broil-king")) ||
        (catIdNorm === "c-rudrum-and-sons" && b.includes("rudrum")) ||
        (catIdNorm === "cadac" && b === "cadac") ||
        (catIdNorm === "cambrian" && b === "cambrian") ||
        (catIdNorm === "devon-bio-fuels" && b === "devon bio fuels") ||
        (catIdNorm === "forest-lighter" && b === "forest lighter") ||
        (catIdNorm === "homefire" && b === "homefire") ||
        (catIdNorm === "indesit" && b === "indesit") ||
        (catIdNorm === "kingfisher" && b === "kingfisher") ||
        (catIdNorm === "lifestyle-appliances" && (b === "lifestyle" || b === "lifestyle appliances")) ||
        (catIdNorm === "maxibrite" && b === "maxibrite") ||
        (catIdNorm === "national-coal" && b === "national coal") ||
        (catIdNorm === "new-world" && b === "new world") ||
        (catIdNorm === "renewable-wood-fuels" && b === "renewable wood fuels") ||
        (catIdNorm === "sahara" && b === "sahara") ||
        (catIdNorm === "sunngas" && (b === "sunngas" || b === "sungas")) ||
        (catIdNorm === "stayte-pub-gas" && b === "stayte pub gas") ||
        (catIdNorm === "swp" && b === "swp") ||
        (catIdNorm === "swf-scotland" && b === "swf scotland")
      );
    });

    return brandMatch;
  }, [dbProducts, activeCategoryId, activeSubId]);

  // Apply sorting
  const displayedProducts = useMemo(() => {
    return [...categoryProducts].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      return 0; // default order
    });
  }, [categoryProducts, sortBy]);

  // Handle URL query parameters and brand/hash routing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleUrlState = () => {
        const params = new URLSearchParams(window.location.search);
        const brandParam = params.get("brand");
        const categoryParam = params.get("category");

        if (brandParam) {
          const resolvedCat = resolveBrandToCategoryId(brandParam);
          setActiveCategoryId(resolvedCat);
          if (resolvedCat === "calor-gas") {
            setActiveSubId("patio-refill");
          } else if (resolvedCat === "gas-appliances") {
            setActiveSubId("barbecues");
          } else if (resolvedCat === "gas-spares") {
            setActiveSubId("butane-regulators");
          } else {
            setActiveSubId("all");
          }
          setExpandedCategories((prev) => ({ ...prev, [resolvedCat]: true }));
          onSelectCategoryChange?.(resolvedCat);

          const performScroll = () => {
            const mainEl = document.getElementById("gas-catalogue-main");
            if (mainEl) {
              mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          };
          setTimeout(performScroll, 50);
          setTimeout(performScroll, 200);
          setTimeout(performScroll, 500);
        } else if (categoryParam) {
          const match = mergedCategories.find((c) => c.id === categoryParam);
          if (match) {
            setActiveCategoryId(match.id as MainCategoryKey);
            setExpandedCategories((prev) => ({ ...prev, [match.id]: true }));
            onSelectCategoryChange?.(match.id);
            const performScroll = () => {
              const mainEl = document.getElementById("gas-catalogue-main");
              if (mainEl) {
                mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            };
            setTimeout(performScroll, 100);
          }
        }

        // Section Hash Routing (e.g. #garden, #food, #trailers, #workwear, #gas, #pub-gas)
        const rawHash = (window.location.hash || "").replace("#", "").toLowerCase().trim();
        const HASH_MAP: Record<string, MainCategoryKey> = {
          garden: "garden",
          food: "food",
          trailers: "trailers",
          workwear: "workwear",
          gas: "calor-gas",
          "calor-gas": "calor-gas",
          "pub-gas": "pub-gas",
          pubgas: "pub-gas",
          "air-liquide": "air-liquide",
          airliquide: "air-liquide",
          "boc-gases": "boc-gases",
          boc: "boc-gases",
          "coal-logs": "coal-fuels",
          "coal-fuels": "coal-fuels",
          coal: "coal-fuels",
          "fishing-baits": "dynamite-baits",
          "fishing-bait": "dynamite-baits",
          "dynamite-baits": "dynamite-baits",
          fishing: "dynamite-baits",
          "animal-feed": "animal-feed",
          animalfeed: "animal-feed",
          feed: "animal-feed",
          "gas-appliances": "gas-appliances",
          appliances: "gas-appliances",
          "gas-spares": "gas-spares",
          spares: "gas-spares",
        };

        const targetCat = HASH_MAP[rawHash] || (mergedCategories.some((c) => c.id === rawHash) ? (rawHash as MainCategoryKey) : null);

        if (targetCat) {
          setActiveCategoryId(targetCat);
          onSelectCategoryChange?.(targetCat);
          setExpandedCategories((prev) => ({ ...prev, [targetCat]: true }));

          const performScroll = () => {
            const targetEl =
              document.getElementById(rawHash) ||
              document.getElementById(targetCat) ||
              document.getElementById(`category-section-${targetCat}`) ||
              document.getElementById("gas-catalogue-main");
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          };
          setTimeout(performScroll, 60);
          setTimeout(performScroll, 250);
          return;
        }

        if (rawHash === "shop-by-brand") {
          const el = document.getElementById("shop-by-brand");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      };

      handleUrlState();
      window.addEventListener("popstate", handleUrlState);
      window.addEventListener("hashchange", handleUrlState);
      return () => {
        window.removeEventListener("popstate", handleUrlState);
        window.removeEventListener("hashchange", handleUrlState);
      };
    }
  }, []);

  // Active Calor Group object (dynamically resolves active subcategory)
  const activeCalorGroup = useMemo(() => {
    return (
      CALOR_GAS_GROUPS.find((g) => g.id === activeSubId || g.refillId === activeSubId) ||
      CALOR_GAS_GROUPS[0]
    );
  }, [activeSubId]);

  // Modals for Information & Contact
  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    open: false,
    title: "",
    content: null,
  });

  const { addToCart, wishlist, toggleWishlist } = useStore();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedProductForContact, setSelectedProductForContact] = useState<string>("");
  const [selectedProductForModal, setSelectedProductForModal] = useState<CatalogProductItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleCategoryClick = (cat: CategoryItem) => {
    setActiveCategoryId(cat.id);
    onSelectCategoryChange?.(cat.id);
    if (cat.id === "calor-gas") {
      setActiveSubId("patio-refill");
    } else if (cat.id === "gas-appliances") {
      setActiveSubId("barbecues");
    } else if (cat.id === "gas-spares") {
      setActiveSubId("butane-regulators");
    } else {
      setActiveSubId(cat.subs[0]?.id || "all");
    }
    toggleCategoryExpand(cat.id);
  };

  const handleSubCategoryClick = (catId: MainCategoryKey | string, subId: string) => {
    setActiveCategoryId(catId);
    setActiveSubId(subId);
  };

  const activeCategory =
    mergedCategories.find((c) => c.id === activeCategoryId) ||
    mergedCategories[0] ||
    CATEGORIES_DATA[0];

  const activeSubCategory = useMemo(() => {
    if (activeCategoryId === "calor-gas") {
      return { name: activeCalorGroup.name };
    }
    return activeCategory?.subs?.find((s: any) => s.id === activeSubId) || { name: "All" };
  }, [activeCategoryId, activeSubId, activeCalorGroup, activeCategory]);

  const handleInfoAction = (key: string) => {
    switch (key) {
      case "shop-by-brand": {
        const el = document.getElementById("shop-by-brand");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.replaceState(null, "", "#shop-by-brand");
        }
        break;
      }

      case "delivery-returns":
        setInfoModal({
          open: true,
          title: "Delivery & Returns",
          content: (
            <div className="space-y-4 text-left text-slate-700">
              {/* Header Intro */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-base sm:text-lg text-slate-900 font-display">
                  John Stayte Services Delivery days
                </h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  Please see below the delivery dates that we will be delivering in your area.
                </p>
              </div>

              {/* Processing Notice */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-amber-900 text-xs font-semibold">
                Please allow 72 hours from placing your order to when your order is processed.
              </div>

              {/* Delivery Days Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Monday to Friday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Monday to Friday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">Gloucester &amp; Cheltenham</p>
                </div>

                {/* 2. Monday & Friday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Monday &amp; Friday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">Swindon</p>
                </div>

                {/* 3. Monday & Wednesday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Monday &amp; Wednesday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">Bristol, Bath &amp; Chippenham</p>
                </div>

                {/* 4. Tuesday & Friday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Tuesday &amp; Friday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    Stroud Central <br />
                    <span className="text-xs text-slate-700 font-medium">Tewkesbury</span>
                  </p>
                </div>

                {/* 5. Monday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Monday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">North Cotswolds</p>
                </div>

                {/* 6. Tuesday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Tuesday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    North Stroud <br />
                    <span className="text-xs text-slate-700 font-medium">Malvern</span>
                  </p>
                </div>

                {/* 7. Wednesday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Wednesday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    Dursley, Frampton &amp; Wotton <br />
                    <span className="text-xs text-slate-700 font-medium">Calne, Devizes &amp; Westbury</span>
                  </p>
                </div>

                {/* 8. Thursday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Thursday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    Cirencester &amp; Swindon West <br />
                    <span className="text-xs text-slate-700 font-medium">Forest of Dean</span> <br />
                    <span className="text-xs text-slate-700 font-medium">Witney &amp; Oxford</span>
                  </p>
                </div>

                {/* 9. Friday */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-0.5 sm:col-span-2">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Friday
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    South Stroud <br />
                    <span className="text-xs text-slate-700 font-medium">Nailsworth &amp; Tetbury</span>
                  </p>
                </div>
              </div>

              {/* Disclaimer at Bottom */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] leading-relaxed text-slate-500 font-normal">
                &ldquo;The days above are a guide only and although we will do our utmost to deliver,
                sometimes due to circumstances beyond our control this cannot always be achieved, including
                (without limitation) any adverse weather conditions, traffic congestion, mechanical breakdown,
                obstruction of public or private highway or from any industrial action.&rdquo;
              </div>
            </div>
          ),
        });
        break;

      case "privacy-notice":
        setInfoModal({
          open: true,
          title: "Privacy Notice",
          content: (
            <div className="space-y-5 text-left text-slate-700 text-xs sm:text-sm leading-relaxed">
              {/* Section 1: Privacy Policy */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-base sm:text-lg text-slate-900 font-display">
                  Privacy Policy
                </h4>
                <p className="text-slate-600">
                  John Stayte Services (WSM) Limited (JSS/we/us) is committed to protecting your privacy.
                  We only use your personal information to provide any services you request and to
                  personalise the information we provide to you, with a view to improving communication
                  and accessibility for our customers.
                </p>
                <p className="text-slate-600">
                  By using our website, you grant us permission to collect, use and process both the direct
                  and indirect information you provide.
                </p>
              </div>

              {/* Section 2: What information do we collect? How do we use it? */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 font-display">
                  What information do we collect? How do we use it?
                </h4>
                <p className="text-slate-600">
                  We directly collect information from any forms, brochure requests or surveys you complete
                  on our website. This information is only collected when you choose to submit it to us,
                  and may include a postal address, email address, or telephone number.
                </p>
                <p className="text-slate-600">
                  Information taken from these response forms includes your IP (Internet Protocol) address
                  so that we can track unique visits to our site, for analytical purposes. We may also use
                  this information to provide particular products or information you request, and to
                  occasionally notify you about important functionality or content changes to the website,
                  new services and special offers.
                </p>
                <p className="text-slate-600">
                  Each time we contact you, you have the option to decline to receive further marketing
                  information relating to JSS.
                </p>
              </div>

              {/* Section 3: What About Third-Party Advertisers and Links to Other Websites? */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 font-display">
                  What About Third-Party Advertisers and Links to Other Websites?
                </h4>
                <p className="text-slate-600">
                  Our site may include third-party advertising and links to other Web sites. For more
                  information about third-party advertising at JSS please visit Your online choices.
                </p>
                <p className="text-slate-600">
                  We use a Yell pixel on our website which enables cookies to be dropped onto user&apos;s
                  machines. These cookies may be used to target those users on 3rd party websites within the
                  Yell network.
                </p>
                <p className="text-slate-600">
                  Our site may, from time to time, contain links to and from other websites. If you follow
                  a link to any of these websites, please note that these websites will have their own
                  privacy policies. Please check these policies before you submit any personal data to these
                  websites.
                </p>
              </div>
            </div>
          ),
        });
        break;

      case "conditions-of-use":
        setInfoModal({
          open: true,
          title: "Conditions of Use",
          content: <ConditionsOfUseContent />,
        });
        break;

      case "contact-us":
        navigate({ to: "/contact" });
        break;

      case "xmas-delivery-days":
        setInfoModal({
          open: true,
          title: "Xmas Delivery days",
          content: (
            <div className="space-y-4 text-left text-slate-700 text-xs sm:text-sm leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-extrabold text-base sm:text-lg text-slate-900 font-display">
                  John Stayte Services Xmas Delivery days
                </h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  Please see below the delivery dates that we will be delivering in your area
                </p>
              </div>

              {/* Order notice & limits */}
              <div className="space-y-2">
                <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-amber-950 text-xs leading-relaxed font-medium">
                  Please be mindful that there is a limit to how much gas we can take out so please try and order only what you need and in plenty of time. Please allow 72 hours from placing your order to when your order is processed
                </div>

                <div className="p-3 bg-red-50/80 border border-red-200/90 rounded-2xl text-red-950 text-xs leading-relaxed font-medium">
                  Please note messages left on the answer machine are not guaranteed and likewise with late email or on-line orders.
                </div>
              </div>

              {/* Schedule Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 1. Monday 22nd December */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-1">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Monday 22nd December
                  </span>
                  <ul className="text-xs font-bold text-slate-900 space-y-0.5">
                    <li>Gloucester &amp; Cheltenham</li>
                    <li className="font-normal text-slate-700">Cheltenham Outskirts (Cotswolds)</li>
                    <li className="font-normal text-slate-700">Swindon</li>
                    <li className="font-normal text-slate-700">Forest of Dean and Cirencester and Witney</li>
                  </ul>
                </div>

                {/* 2. Tuesday 23rd December */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-1">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Tuesday 23rd December
                  </span>
                  <ul className="text-xs font-bold text-slate-900 space-y-0.5">
                    <li>Gloucester &amp; Cheltenham</li>
                    <li className="font-normal text-slate-700">Stroud &amp; Tetbury</li>
                    <li className="font-normal text-slate-700">Tewkesbury</li>
                    <li className="font-normal text-slate-700">Bristol, Bath, Chippenham &amp; Devizes</li>
                  </ul>
                </div>

                {/* 3. Wednesday 24th December */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-1">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Wednesday 24th December
                  </span>
                  <ul className="text-xs font-bold text-slate-900 space-y-0.5">
                    <li>Cheltenham &amp; Gloucester</li>
                    <li className="font-normal text-slate-700">Frampton, Dursley Wotton &amp; Berkeley</li>
                  </ul>
                </div>

                {/* 4. Thursday 25th December */}
                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-slate-600 font-sans">
                    Thursday 25th December
                  </span>
                  <p className="text-xs font-black text-rose-700">CLOSED</p>
                </div>

                {/* 5. Friday 26th December */}
                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-slate-600 font-sans">
                    Friday 26th December
                  </span>
                  <p className="text-xs font-black text-rose-700">CLOSED</p>
                </div>

                {/* 6. Saturday 27th December */}
                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-slate-600 font-sans">
                    Saturday 27th December
                  </span>
                  <p className="text-xs font-black text-rose-700">CLOSED</p>
                </div>

                {/* 7. Monday 29th December */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-1">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Monday 29th December
                  </span>
                  <ul className="text-xs font-bold text-slate-900 space-y-0.5">
                    <li>Gloucester &amp; Cheltenham</li>
                    <li className="font-normal text-slate-700">Cheltenham Outskirts (Cotswolds)</li>
                    <li className="font-normal text-slate-700">Swindon</li>
                    <li className="font-normal text-slate-700">Forest of Dean</li>
                    <li className="font-normal text-slate-700">Cirencester &amp; Witney</li>
                  </ul>
                </div>

                {/* 8. Tuesday 30th December */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-1">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Tuesday 30th December
                  </span>
                  <ul className="text-xs font-bold text-slate-900 space-y-0.5">
                    <li>Gloucester &amp; Cheltenham</li>
                    <li className="font-normal text-slate-700">Stroud</li>
                    <li className="font-normal text-slate-700">Tewkesbury</li>
                    <li className="font-medium text-amber-800">Carried over deliveries from Monday</li>
                  </ul>
                </div>

                {/* 9. Wednesday 31st December */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-1">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Wednesday 31st December
                  </span>
                  <ul className="text-xs font-bold text-slate-900 space-y-0.5">
                    <li>Cheltenham &amp; Gloucester</li>
                    <li className="font-normal text-slate-700">Frampton, Dursley Wotton &amp; Berkeley</li>
                    <li className="font-normal text-slate-700">Bristol &amp; Devizes</li>
                    <li className="font-normal text-slate-700">Bristol, Chippenham, Trowbridge &amp; Devizes</li>
                  </ul>
                </div>

                {/* 10. Thursday 1st January */}
                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-0.5">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-slate-600 font-sans">
                    Thursday 1st January
                  </span>
                  <p className="text-xs font-black text-rose-700">CLOSED</p>
                </div>

                {/* 11. Friday 2nd January */}
                <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-1 sm:col-span-2">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-red-600 font-sans">
                    Friday 2nd January
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-bold text-slate-900">
                    <div>
                      <p>Gloucester &amp; Cheltenham</p>
                      <p className="font-normal text-slate-700">Stroud &amp; Tetbury</p>
                      <p className="font-normal text-slate-700">Tewkesbury</p>
                    </div>
                    <div>
                      <p className="font-normal text-slate-700">Swindon</p>
                      <p className="font-normal text-slate-700">Cirencester &amp; Witney</p>
                      <p className="font-normal text-slate-700">Forest Area</p>
                    </div>
                  </div>
                </div>

                {/* 12. Saturday 3rd January */}
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-0.5 sm:col-span-2">
                  <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-amber-800 font-sans">
                    Saturday 3rd January
                  </span>
                  <p className="text-xs font-bold text-slate-900">Carried over deliveries from Friday only</p>
                </div>
              </div>

              {/* Disclaimer at Bottom */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] leading-relaxed text-slate-500 font-normal">
                &ldquo;The days above are a guide only and although we will do our up most to deliver sometimes due to circumstances beyond our control this cannot always be achieved including (without limitation) any adverse weather conditions, traffic congestion, mechanical breakdown, obstruction of public or private highway or from any industrial action.&rdquo;
              </div>
            </div>
          ),
        });
        break;


      case "order-status":
        navigate({ to: "/account/orders" });
        break;

      case "site-map":
        navigate({ to: "/filling-stations" });
        break;

      case "newsletter-unsubscribe":
        toast.info("You can update your newsletter preferences in your Account settings.");
        break;

      default:
        break;
    }
  };

  /**
   * Reusable Category Navigation renderer:
   * Used for both Desktop sticky sidebar and Mobile responsive slide-over drawer.
   * Features clean semibold category typography and interactive hierarchy.
   */
  const renderCategoryNavigation = (isMobileDrawer = false) => {
    const handleItemClick = (cb: () => void) => {
      cb();
      if (isMobileDrawer) {
        setMobileCategoryDrawerOpen(false);
      }
    };

    return (
      <div className="space-y-5 text-left">
        {/* Section 1: PRODUCT CATEGORIES Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Layers className="h-4 w-4 text-red-600 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-display">
              Product Categories
            </h3>
          </div>

          {/* Categories Navigation */}
          <div className="space-y-0.5 pt-1">
            {mergedCategories.map((cat) => {
              const Icon = cat.icon;
              const isExpanded = !!expandedCategories[cat.id];
              const isCatActive = activeCategoryId === cat.id;

              return (
                <div key={cat.id} className="rounded-xl overflow-hidden transition-colors">
                  {/* Parent Category Row (Semibold, Crisp & Premium) */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCategoryClick(cat);
                      if (isMobileDrawer && (!cat.subs || cat.subs.length === 0)) {
                        setMobileCategoryDrawerOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 text-left transition-colors rounded-xl cursor-pointer",
                      isCatActive
                        ? "text-red-700 bg-red-50/80 font-bold border border-red-100/70 shadow-2xs"
                        : "text-slate-800 hover:bg-slate-50 hover:text-slate-950 font-semibold",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isCatActive ? "text-red-600" : "text-slate-400 group-hover:text-red-500",
                        )}
                      />
                      <span className="text-[13px] sm:text-[14px] truncate">{cat.name}</span>
                    </div>

                    {/* Expand/Collapse Chevron */}
                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </button>

                  {/* Subcategories (Shown when expanded) */}
                  {isExpanded && cat.subs && cat.subs.length > 0 && (
                    <div className="py-1 space-y-0.5">
                      {cat.id === "calor-gas" ? (
                        <div className="space-y-0.5">
                          {CALOR_GAS_GROUPS.map((group) => {
                            const isGroupActive =
                              activeCategoryId === "calor-gas" &&
                              (activeSubId === group.id || activeSubId === group.refillId);

                            if (isGroupActive) {
                              return (
                                <div
                                  key={group.id}
                                  className="bg-red-50/60 rounded-xl p-1.5 space-y-0.5 ml-2 border border-red-100/80"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleItemClick(() =>
                                        handleSubCategoryClick("calor-gas", group.id),
                                      )
                                    }
                                    className="w-full text-left text-[13px] font-bold text-red-600 px-2.5 py-1 rounded-lg flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                                    <span>{group.name}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleItemClick(() =>
                                        handleSubCategoryClick("calor-gas", group.refillId),
                                      )
                                    }
                                    className={cn(
                                      "w-full text-left text-[12.5px] pl-6 pr-2 py-0.5 flex items-center gap-1.5 cursor-pointer transition-colors",
                                      activeSubId === group.refillId
                                        ? "font-bold text-red-700/90"
                                        : "font-semibold text-slate-700 hover:text-red-700",
                                    )}
                                  >
                                    <span className="text-red-400">•</span>
                                    <span>{group.refillName}</span>
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() =>
                                  handleItemClick(() =>
                                    handleSubCategoryClick("calor-gas", group.refillId),
                                  )
                                }
                                className={cn(
                                  "w-full text-left text-[13px] pl-6 py-1 rounded-lg flex items-center gap-2 font-semibold cursor-pointer transition-colors",
                                  "text-slate-700 hover:text-red-600",
                                )}
                              >
                                <span className="text-slate-400">•</span>
                                <span>{group.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pl-4 pr-2 py-1 space-y-0.5">
                          {cat.subs.map((sub: any) => {
                            const isSubActive =
                              activeCategoryId === cat.id &&
                              (activeSubId === sub.id ||
                                (sub.id === "all" &&
                                  (!activeSubId ||
                                    activeSubId === "all" ||
                                    !cat.subs.some((s: any) => s.id === activeSubId))));

                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() =>
                                  handleItemClick(() =>
                                    handleSubCategoryClick(cat.id, sub.id),
                                  )
                                }
                                className={cn(
                                  "w-full text-left text-[12.5px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors",
                                  isSubActive
                                    ? "text-red-700 font-bold bg-red-50/90 border border-red-100/70"
                                    : "text-slate-700 hover:text-red-600 hover:bg-slate-50 font-semibold",
                                )}
                              >
                                <span className={isSubActive ? "text-red-600" : "text-slate-400"}>
                                  •
                                </span>
                                <span className="truncate">{sub.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: INFORMATION Header & Links */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Info className="h-4 w-4 text-slate-500 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-display">
              Information
            </h3>
          </div>

          <div className="space-y-0.5 pt-1">
            {[
              { id: "delivery-returns", name: "Delivery & Returns" },
              { id: "privacy-notice", name: "Privacy Notice" },
              { id: "conditions-of-use", name: "Conditions of Use" },
              { id: "contact-us", name: "Contact Us" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleItemClick(() => handleInfoAction(item.id))
                }
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-[13px] font-semibold text-slate-700 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <span>{item.name}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: MORE INFORMATION Header & Links */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <HelpCircle className="h-4 w-4 text-slate-500 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-display">
              More Information
            </h3>
          </div>

          <div className="space-y-0.5 pt-1">
            {[
              { id: "xmas-delivery-days", name: "Xmas Delivery days" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleItemClick(() => handleInfoAction(item.id))
                }
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-[13px] font-semibold text-slate-700 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <span>{item.name}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="gas-catalogue-main" className="pt-6 sm:pt-10 border-t border-slate-200/80 text-left font-sans scroll-mt-[165px]">
      {/* 2-COLUMN RESPONSIVE LAYOUT: DESKTOP (3/9) + TABLET (4/8) + MOBILE (DRAWER + 12) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 xl:gap-6">
        {/* ========================================================================= */}
        {/* 1. LEFT SIDEBAR: PRODUCT CATEGORIES (DESKTOP & TABLET ONLY) */}
        {/* ========================================================================= */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3 md:sticky md:top-[165px] md:self-start z-20 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-4.5 text-left max-h-[calc(100vh-12rem)] overflow-y-auto overscroll-contain no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {renderCategoryNavigation(false)}
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 2. MAIN CONTENT AREA: CATALOGUE PRODUCT LISTINGS */}
        {/* ========================================================================= */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9 space-y-4 sm:space-y-5 min-w-0">
          {/* Mobile Category Controller & Quick Filter Bar (Visible ONLY on Mobile < md) */}
          <div className="block md:hidden space-y-2.5 pb-2">
            {/* Category Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileCategoryDrawerOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-950 active:scale-[0.99] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <Layers className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-slate-400 font-medium shrink-0">Category:</span>
                <span className="text-white font-extrabold truncate">
                  {activeCategory.name}
                  {activeSubCategory?.name ? ` › ${activeSubCategory.name}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md shrink-0">
                <SlidersHorizontal className="h-3 w-3 text-red-400" />
                <span>All Categories</span>
              </div>
            </button>

            {/* Quick Category Filter Horizontal Scroll Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
              {mergedCategories.slice(0, 12).map((c) => {
                const isCatActive = activeCategoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryClick(c)}
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                      isCatActive
                        ? "bg-red-600 text-white border-red-600 shadow-2xs font-bold"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200/80",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Slide-Over Category Drawer Sheet */}
          {mobileCategoryDrawerOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
              {/* Dark Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
                onClick={() => setMobileCategoryDrawerOpen(false)}
                aria-hidden="true"
              />

              {/* Slide-over Drawer Pane */}
              <div className="relative mr-auto w-[85vw] max-w-sm h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-slate-50/90">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-red-600 shrink-0" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-display">
                      Product Categories
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileCategoryDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                    aria-label="Close categories"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable Navigation Body */}
                <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
                  {renderCategoryNavigation(true)}
                </div>

                {/* Footer */}
                <div className="p-3.5 border-t border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setMobileCategoryDrawerOpen(false)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs"
                  >
                    View Selected Products
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Section Anchor IDs for every Category */}
          <div className="relative pointer-events-none">
            <span id="gas" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="calor-gas" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="pub-gas" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="garden" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="food" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="trailers" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="workwear" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="coal-logs" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="coal-fuels" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="fishing-baits" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="dynamite-baits" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="animal-feed" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="gas-appliances" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="gas-spares" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="air-liquide" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
            <span id="boc-gases" className="absolute -top-[165px] pointer-events-none opacity-0 block" />
          </div>

          {/* Breadcrumb Navigation (Wrapped cleanly to prevent horizontal overflow) */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2 text-xs text-slate-500 font-medium break-words leading-relaxed">
            <span
              onClick={() => {
                setActiveCategoryId("calor-gas");
                setActiveSubId("patio-refill");
              }}
              className="hover:text-red-600 cursor-pointer transition-colors"
            >
              Order Gas
            </span>
            <span className="text-slate-400">&gt;</span>
            {activeCategoryId === "calor-gas" ? (
              <>
                <span className="hover:text-red-600 transition-colors">Calor Gas</span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">{activeCalorGroup.name}</span>
              </>
            ) : activeCategoryId === "air-liquide" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Air Liquide</span>
                {activeSubId && activeSubId !== "all" && (
                  <>
                    <span className="text-slate-400">&gt;</span>
                    <span className="font-bold text-slate-900">
                      {activeCategory?.subs?.find((s: any) => s.id === activeSubId)?.name || activeSubId}
                    </span>
                  </>
                )}
              </>
            ) : activeCategoryId === "boc-gases" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">BOC Gases</span>
                {activeSubId && activeSubId !== "all" && (
                  <>
                    <span className="text-slate-400">&gt;</span>
                    <span className="font-bold text-slate-900">
                      {activeCategory?.subs?.find((s: any) => s.id === activeSubId)?.name || activeSubId}
                    </span>
                  </>
                )}
              </>
            ) : activeCategoryId === "autarky" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Autarky</span>
              </>
            ) : activeCategoryId === "big-k" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Big K</span>
              </>
            ) : activeCategoryId === "bar-be-quick" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Bar-Be-Quick</span>
              </>
            ) : activeCategoryId === "beekind" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">BeeKind</span>
              </>
            ) : activeCategoryId === "bio-bean" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">bio-bean</span>
              </>
            ) : activeCategoryId === "bonningtons" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Bonningtons</span>
              </>
            ) : activeCategoryId === "broil-king" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Broil King</span>
              </>
            ) : activeCategoryId === "c-rudrum-and-sons" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">C. Rudrum &amp; Sons</span>
              </>
            ) : activeCategoryId === "cadac" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Cadac</span>
              </>
            ) : activeCategoryId === "cambrian" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Cambrian</span>
              </>
            ) : activeCategoryId === "campingaz" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Campingaz</span>
              </>
            ) : activeCategoryId === "char-broil" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Char-Broil</span>
              </>
            ) : activeCategoryId === "cleese-uk" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Cleese UK</span>
              </>
            ) : activeCategoryId === "cpl-products" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">CPL Products</span>
              </>
            ) : activeCategoryId === "devon-bio-fuels" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Devon Bio Fuels</span>
              </>
            ) : activeCategoryId === "forest-lighter" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Forest Lighter</span>
              </>
            ) : activeCategoryId === "homefire" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Homefire</span>
              </>
            ) : activeCategoryId === "indesit" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Indesit</span>
              </>
            ) : activeCategoryId === "kingfisher" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Kingfisher</span>
              </>
            ) : activeCategoryId === "lifestyle-appliances" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Lifestyle Appliances</span>
              </>
            ) : activeCategoryId === "maxibrite" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Maxibrite</span>
              </>
            ) : activeCategoryId === "national-coal" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">National Coal</span>
              </>
            ) : activeCategoryId === "new-world" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">New World</span>
              </>
            ) : activeCategoryId === "renewable-wood-fuels" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Renewable Wood Fuels Ltd</span>
              </>
            ) : activeCategoryId === "sahara" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">Sahara</span>
              </>
            ) : activeCategoryId === "swp" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">SWP</span>
              </>
            ) : activeCategoryId === "swf-scotland" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">SWF Scotland</span>
              </>
            ) : activeCategoryId === "sunngas" ? (
              <>
                <span
                  onClick={() => {
                    const el = document.getElementById("shop-by-brand");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="hover:text-red-600 cursor-pointer transition-colors"
                >
                  Shop by Brand
                </span>
                <span className="text-slate-400">&gt;</span>
                <span className="font-bold text-slate-900">SunGas</span>
              </>
            ) : (
              <>
                <span className="hover:text-red-600 transition-colors">{activeCategory?.name}</span>
                {activeCategory?.subs?.find((s: any) => s.id === activeSubId && s.id !== "all") && (
                  <>
                    <span className="text-slate-400">&gt;</span>
                    <span className="font-bold text-slate-900">
                      {activeCategory?.subs?.find((s: any) => s.id === activeSubId)?.name}
                    </span>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Category Section Wrapper with dynamic ID and Brief Highlight Effect */}
          <div
            id={`category-section-${activeCategoryId}`}
            className={cn(
              "space-y-4 transition-all duration-700 rounded-2xl scroll-mt-[165px]",
              highlightedCategoryId &&
              (highlightedCategoryId === activeCategoryId ||
                (highlightedCategoryId === "gas" && activeCategoryId === "calor-gas") ||
                (highlightedCategoryId === "coal-logs" && activeCategoryId === "coal-fuels") ||
                (highlightedCategoryId === "fishing-baits" && activeCategoryId === "dynamite-baits")) &&
              "ring-2 ring-primary/60 ring-offset-4 bg-red-50/20 p-2 sm:p-3 rounded-2xl shadow-xs animate-pulse",
            )}
          >
            {/* Heading & Description */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  {activeCategoryId === "calor-gas"
                    ? activeCalorGroup.refillName
                    : activeCategoryId === "air-liquide"
                      ? `Air Liquide – ${displayedProducts.length} Products`
                      : activeCategoryId === "autarky"
                        ? "Autarky"
                        : activeCategoryId === "big-k"
                          ? "Big K"
                          : activeCategoryId === "bar-be-quick"
                            ? "Bar-Be-Quick"
                            : activeCategoryId === "beekind"
                              ? "BeeKind"
                              : activeCategoryId === "bio-bean"
                                ? "bio-bean"
                                : activeCategoryId === "bonningtons"
                                  ? "Bonningtons"
                                  : activeCategoryId === "broil-king"
                                    ? "Broil King"
                                    : activeCategoryId === "c-rudrum-and-sons"
                                      ? "C. Rudrum & Sons"
                                      : activeCategoryId === "cadac"
                                        ? "Cadac"
                                        : activeCategoryId === "cambrian"
                                          ? "Cambrian"
                                          : activeCategoryId === "campingaz"
                                            ? "Campingaz"
                                            : activeCategoryId === "char-broil"
                                              ? "Char-Broil"
                                              : activeCategoryId === "cleese-uk"
                                                ? "Cleese UK"
                                                : activeCategoryId === "cpl-products"
                                                  ? "CPL Products"
                                                  : activeCategoryId === "devon-bio-fuels"
                                                    ? "Devon Bio Fuels"
                                                    : activeCategoryId === "forest-lighter"
                                                      ? "Forest Lighter"
                                                      : activeCategoryId === "homefire"
                                                        ? "Homefire"
                                                        : activeCategoryId === "indesit"
                                                          ? "Indesit"
                                                          : activeCategoryId === "kingfisher"
                                                            ? "Kingfisher"
                                                            : activeCategoryId === "lifestyle-appliances"
                                                              ? "Lifestyle Appliances"
                                                              : activeCategoryId === "maxibrite"
                                                                ? "Maxibrite"
                                                                : activeCategoryId === "national-coal"
                                                                  ? "National Coal"
                                                                  : activeCategoryId === "new-world"
                                                                    ? "New World"
                                                                    : activeCategoryId === "renewable-wood-fuels"
                                                                      ? "Renewable Wood Fuels Ltd"
                                                                      : activeCategoryId === "sahara"
                                                                        ? "Sahara"
                                                                        : activeCategoryId === "swp"
                                                                          ? "SWP"
                                                                          : activeCategoryId === "swf-scotland"
                                                                            ? "SWF Scotland"
                                                                            : activeCategoryId === "sunngas"
                                                                              ? "SunGas"
                                                                              : activeCategoryId === "pub-gas"
                                                                                ? `Pub Gas – ${displayedProducts.length} Products`
                                                                                : activeCategoryId === "coal-fuels" || activeCategoryId === "coal-logs"
                                                                                  ? `Coal & Other Fuels – ${displayedProducts.length} Products`
                                                                                  : activeCategoryId === "dynamite-baits"
                                                                                    ? (activeSubId === "pellets" ? "Pellets" : "Groundbait")
                                                                                    : activeCategoryId === "animal-feed"
                                                                                      ? `Animal Feed – ${displayedProducts.length} Products`
                                                                                      : activeCategoryId === "gas-spares"
                                                                                        ? (activeSubId === "propane-regulators"
                                                                                          ? "Propane Regulators"
                                                                                          : activeSubId === "changeover-valves"
                                                                                            ? "Changeover Valves"
                                                                                            : "Butane Regulators")
                                                                                        : activeCategoryId === "gas-appliances" && (activeSubId === "mobile-heaters" || activeSubId === "heaters")
                                                                                          ? "Mobile Heaters"
                                                                                          : activeCategoryId === "gas-appliances" && (activeSubId === "patio-heaters" || activeSubId === "patio")
                                                                                            ? "Patio Heaters"
                                                                                            : activeCategoryId === "gas-appliances" && activeSubId === "camping"
                                                                                              ? "Camping"
                                                                                              : activeCategoryId === "garden" || (activeCategoryId === "gas-appliances" && (activeSubId === "garden" || activeSubId === "gardening"))
                                                                                                ? "Garden"
                                                                                                : activeCategoryId === "food"
                                                                                                  ? "Food & Produce"
                                                                                                  : activeCategoryId === "trailers"
                                                                                                    ? "Trailers"
                                                                                                    : activeCategoryId === "workwear"
                                                                                                      ? "Workwear & Safety Gear"
                                                                                                      : activeCategory.name}
                </h1>
                {(activeCategoryId === "pub-gas" || activeCategoryId === "air-liquide") && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/80 w-fit">
                    (Pub customers only)
                  </span>
                )}
              </div>

              <div className="flex items-start gap-3 pt-1">
                <div className="h-10 w-8 shrink-0 flex items-center justify-center">
                  <img
                    src={
                      activeCategoryId === "calor-gas"
                        ? activeCalorGroup.image
                        : activeCategoryId === "air-liquide"
                          ? "/brands/air-liquide-official.png"
                          : activeCategoryId === "boc-gases"
                            ? "/brands/boc-logo.svg"
                            : activeCategoryId === "autarky"
                              ? "/brands/autarky.png"
                              : activeCategoryId === "big-k"
                                ? "/brands/big-k.png"
                                : activeCategoryId === "bar-be-quick"
                                  ? "/brands/bar-be-quick.png"
                                  : activeCategoryId === "beekind"
                                    ? "/brands/beekind.png"
                                    : activeCategoryId === "bio-bean"
                                      ? "/brands/bio-bean.png"
                                      : activeCategoryId === "bonningtons"
                                        ? "/brands/bonningtons.png"
                                        : activeCategoryId === "broil-king"
                                          ? "/brands/broil-king.png"
                                          : activeCategoryId === "c-rudrum-and-sons"
                                            ? "/brands/c-rudrum-and-sons.png"
                                            : activeCategoryId === "cadac"
                                              ? "/brands/cadac.png"
                                              : activeCategoryId === "cambrian"
                                                ? "/brands/cambrian.png"
                                                : activeCategoryId === "campingaz"
                                                  ? "/brands/campingaz.png"
                                                  : activeCategoryId === "char-broil"
                                                    ? "/brands/char-broil.png"
                                                    : activeCategoryId === "cleese-uk"
                                                      ? "/brands/cleese-uk.png"
                                                      : activeCategoryId === "cpl-products"
                                                        ? "/brands/cpl-products.png"
                                                        : activeCategoryId === "devon-bio-fuels"
                                                          ? "/brands/devon-bio-fuels.png"
                                                          : activeCategoryId === "forest-lighter"
                                                            ? "/brands/forest-lighter.png"
                                                            : activeCategoryId === "homefire"
                                                              ? "/brands/homefire.png"
                                                              : activeCategoryId === "indesit"
                                                                ? "/brands/indesit.png"
                                                                : activeCategoryId === "kingfisher"
                                                                  ? "/brands/kingfisher.png"
                                                                  : activeCategoryId === "lifestyle-appliances"
                                                                    ? "/brands/lifestyle-appliances.png"
                                                                    : activeCategoryId === "maxibrite"
                                                                      ? "/brands/maxibrite.png"
                                                                      : activeCategoryId === "national-coal"
                                                                        ? "/brands/national-coal.png"
                                                                        : activeCategoryId === "new-world"
                                                                          ? "/brands/new-world.png"
                                                                          : activeCategoryId === "renewable-wood-fuels"
                                                                            ? "/brands/renewable-wood-fuels.png"
                                                                            : activeCategoryId === "sahara"
                                                                              ? "/brands/sahara.png"
                                                                              : activeCategoryId === "swp"
                                                                                ? "/brands/swp.png"
                                                                                : activeCategoryId === "swf-scotland"
                                                                                  ? "/brands/swf-scotland.png"
                                                                                  : activeCategoryId === "sunngas"
                                                                                    ? "/brands/sunngas.png"
                                                                                    : activeCategoryId === "dynamite-baits"
                                                                                      ? (activeSubId === "pellets" ? "/bait-icon-pellets.png" : "/bait-icon-groundbait.png")
                                                                                      : activeCategoryId === "gas-spares"
                                                                                        ? (activeSubId === "propane-regulators"
                                                                                          ? "/spares-icon-propane-regulators.png"
                                                                                          : activeSubId === "changeover-valves"
                                                                                            ? "/spares-icon-changeover-valves.png"
                                                                                            : "/spares-icon-butane-regulators.png")
                                                                                        : activeCategoryId === "gas-appliances" && (activeSubId === "mobile-heaters" || activeSubId === "heaters")
                                                                                          ? "/heater-category-icon.png"
                                                                                          : activeCategoryId === "gas-appliances" && (activeSubId === "patio-heaters" || activeSubId === "patio")
                                                                                            ? "/patio-heater-category-icon.png"
                                                                                            : activeCategoryId === "gas-appliances" && activeSubId === "camping"
                                                                                              ? "/camping-category-icon.png"
                                                                                              : activeCategoryId === "garden" || (activeCategoryId === "gas-appliances" && (activeSubId === "garden" || activeSubId === "gardening"))
                                                                                                ? "/garden-cat.jpg"
                                                                                                : activeCategory.brandLogo || "/coal-logs.jpg"
                    }
                    alt={
                      activeCategoryId === "calor-gas"
                        ? activeCalorGroup.name
                        : activeCategoryId === "air-liquide"
                          ? "Air Liquide"
                          : activeCategoryId === "boc-gases"
                            ? "BOC Gases"
                            : activeCategoryId === "autarky"
                            ? "Autarky"
                            : activeCategoryId === "big-k"
                              ? "Big K"
                              : activeCategoryId === "bar-be-quick"
                                ? "Bar-Be-Quick"
                                : activeCategoryId === "beekind"
                                  ? "BeeKind"
                                  : activeCategoryId === "bio-bean"
                                    ? "bio-bean"
                                    : activeCategoryId === "bonningtons"
                                      ? "Bonningtons"
                                      : activeCategoryId === "broil-king"
                                        ? "Broil King"
                                        : activeCategoryId === "c-rudrum-and-sons"
                                          ? "C. Rudrum & Sons"
                                          : activeCategoryId === "cadac"
                                            ? "Cadac"
                                            : activeCategoryId === "cambrian"
                                              ? "Cambrian"
                                              : activeCategoryId === "campingaz"
                                                ? "Campingaz"
                                                : activeCategoryId === "char-broil"
                                                  ? "Char-Broil"
                                                  : activeCategoryId === "cleese-uk"
                                                    ? "Cleese UK"
                                                    : activeCategoryId === "cpl-products"
                                                      ? "CPL Products"
                                                      : activeCategoryId === "devon-bio-fuels"
                                                        ? "Devon Bio Fuels"
                                                        : activeCategoryId === "forest-lighter"
                                                          ? "Forest Lighter"
                                                          : activeCategoryId === "homefire"
                                                            ? "Homefire"
                                                            : activeCategoryId === "indesit"
                                                              ? "Indesit"
                                                              : activeCategoryId === "kingfisher"
                                                                ? "Kingfisher"
                                                                : activeCategoryId === "lifestyle-appliances"
                                                                  ? "Lifestyle Appliances"
                                                                  : activeCategoryId === "maxibrite"
                                                                    ? "Maxibrite"
                                                                    : activeCategoryId === "national-coal"
                                                                      ? "National Coal"
                                                                      : activeCategoryId === "new-world"
                                                                        ? "New World"
                                                                        : activeCategoryId === "renewable-wood-fuels"
                                                                          ? "Renewable Wood Fuels Ltd"
                                                                          : activeCategoryId === "sahara"
                                                                            ? "Sahara"
                                                                            : activeCategoryId === "swp"
                                                                              ? "SWP"
                                                                              : activeCategoryId === "swf-scotland"
                                                                                ? "SWF Scotland"
                                                                                : activeCategoryId === "sunngas"
                                                                                  ? "SunGas"
                                                                                  : activeCategoryId === "dynamite-baits"
                                                                                    ? (activeSubId === "pellets" ? PELLETS_DESCRIPTION : GROUNDBAIT_DESCRIPTION)
                                                                                    : activeCategoryId === "gas-spares"
                                                                                      ? (activeSubId === "propane-regulators"
                                                                                        ? "Propane Regulators"
                                                                                        : activeSubId === "changeover-valves"
                                                                                          ? "Changeover Valves"
                                                                                          : "Butane Regulators")
                                                                                      : activeCategoryId === "gas-appliances" && (activeSubId === "mobile-heaters" || activeSubId === "heaters")
                                                                                        ? "Mobile Heaters"
                                                                                        : activeCategoryId === "gas-appliances" && (activeSubId === "patio-heaters" || activeSubId === "patio")
                                                                                          ? "Patio Heaters"
                                                                                          : activeCategoryId === "gas-appliances" && activeSubId === "camping"
                                                                                            ? "Camping"
                                                                                            : activeCategory.name
                    }
                    className="max-h-full max-w-full object-contain drop-shadow-xs"
                  />
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {activeCategoryId === "calor-gas"
                    ? activeCalorGroup.description
                    : activeCategoryId === "air-liquide"
                      ? "Official Air Liquide dispense and cellar gases for hospitality, pub, restaurant and beverage operations. Requires empty cylinder return upon delivery."
                      : activeCategoryId === "autarky"
                        ? "Autarky naturally balanced, 100% natural canine nutrition crafted with delicious recipes for active and working dogs."
                        : activeCategoryId === "big-k"
                          ? "Big K restaurant-grade lumpwood charcoal, instant lighting firelogs, hollow heat logs and barbecue lighting essentials."
                          : activeCategoryId === "bar-be-quick"
                            ? "Bar-Be-Quick instant barbecues, fuels and outdoor lighting accessories."
                            : activeCategoryId === "beekind"
                              ? "BeeKind eco-friendly briquettes and sustainable clean wood fuels."
                              : activeCategoryId === "bio-bean"
                                ? "Coffee logs and sustainable clean biomass fuels."
                                : activeCategoryId === "bonningtons"
                                  ? "Outdoor patio heaters, barbecue fire pits, and garden smokers."
                                  : activeCategoryId === "broil-king"
                                    ? "High-performance gas and charcoal barbecues."
                                    : activeCategoryId === "c-rudrum-and-sons"
                                      ? "Solid fuels, logs, smokeless coal, and domestic heating supplies."
                                      : activeCategoryId === "cadac"
                                        ? "Modular portable gas barbecues and camping chef equipment."
                                        : activeCategoryId === "cambrian"
                                          ? "Coal and domestic heating fuel supplies."
                                          : activeCategoryId === "campingaz"
                                            ? "Lightweight, portable butane gas bottles and camping equipment exchangeable across Europe."
                                            : activeCategoryId === "char-broil"
                                              ? "America's favourite gas, charcoal and electric outdoor barbecues and modular outdoor kitchens."
                                              : activeCategoryId === "cleese-uk"
                                                ? "High performance LPG regulators, automatic changeover valves, and gas safety fittings."
                                                : activeCategoryId === "cpl-products"
                                                  ? "Smokeless solid fuels, coal, firelighters, and winter heating supplies."
                                                  : activeCategoryId === "devon-bio-fuels"
                                                    ? "Kiln-dried hardwood logs, kindling, and bio-heating."
                                                    : activeCategoryId === "forest-lighter"
                                                      ? "Natural wood firelighters and kiln dried kindling sticks."
                                                      : activeCategoryId === "homefire"
                                                        ? "Market-leading smokeless ovals, kiln dried logs, and fire supplies."
                                                        : activeCategoryId === "indesit"
                                                          ? "Domestic and commercial gas cookers and appliances."
                                                          : activeCategoryId === "kingfisher"
                                                            ? "Outdoor tools, garden accessories, and durable hardware."
                                                            : activeCategoryId === "lifestyle-appliances"
                                                              ? "Mobile cabinet heaters, patio heaters, and indoor flame heaters."
                                                              : activeCategoryId === "maxibrite"
                                                                ? "Clean burning, high heat smokeless ovals for open fires and stoves."
                                                                : activeCategoryId === "national-coal"
                                                                  ? "Traditional British coals, kiln dried kindling, and premium solid fuels."
                                                                  : activeCategoryId === "new-world"
                                                                    ? "Freestanding gas cookers, hobs, and domestic appliances."
                                                                    : activeCategoryId === "renewable-wood-fuels"
                                                                      ? "Sustainable hardwood logs and biomass energy solutions."
                                                                      : activeCategoryId === "sahara"
                                                                        ? "Premium gas barbecues and outdoor patio heating systems."
                                                                        : activeCategoryId === "swp"
                                                                          ? "Specialized welding products, regulators, torches, and gas fittings."
                                                                          : activeCategoryId === "swf-scotland"
                                                                            ? "Solid fuels, kiln dried logs, and domestic heating supplies from SWF Scotland."
                                                                            : activeCategoryId === "sunngas"
                                                                              ? "Camping cookers, portable gas stoves, and leisure accessories."
                                                                              : activeCategoryId === "dynamite-baits"
                                                                                ? (activeSubId === "pellets" ? PELLETS_DESCRIPTION : GROUNDBAIT_DESCRIPTION)
                                                                                : activeCategoryId === "gas-spares"
                                                                                  ? (activeSubId === "propane-regulators"
                                                                                    ? "Propane regulators for propane bottles"
                                                                                    : activeSubId === "changeover-valves"
                                                                                      ? "Used with propane gas bottles"
                                                                                      : "Butane regulators for butane bottles")
                                                                                  : activeCategoryId === "gas-appliances" && (activeSubId === "mobile-heaters" || activeSubId === "heaters")
                                                                                    ? "Pay as you Go Heating. Browse through our range of mobile heaters to find the perfect one for you."
                                                                                    : activeCategoryId === "gas-appliances" && (activeSubId === "patio-heaters" || activeSubId === "patio")
                                                                                      ? "Keep warm outdoors with our range of stylish, high-performance gas and electric patio heaters."
                                                                                      : activeCategoryId === "gas-appliances" && activeSubId === "camping"
                                                                                        ? "Portable camping stoves, lanterns and outdoor cooking appliances for camping and festivals."
                                                                                        : activeCategoryId === "garden" || (activeCategoryId === "gas-appliances" && (activeSubId === "garden" || activeSubId === "gardening"))
                                                                                          ? "Compost, soil, organic planters, decorative bark & everything you need for a thriving garden."
                                                                                          : activeCategory.description}
                </p>
              </div>
            </div>

            {/* Product Listing Controls Bar: Count + Sort Selector */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-600">
                {displayedProducts.length > 0
                  ? `Displaying 1 to ${displayedProducts.length} (of ${displayedProducts.length} Products)`
                  : "Displaying 0 to 0 (of 0 Products)"}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 w-28 bg-white text-xs font-semibold rounded-lg border-slate-200 shadow-2xs">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc">Name: A to Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DYNAMIC PRODUCT CARDS GRID (DATABASE SOURCE OF TRUTH) */}
            {displayedProducts.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                <p className="text-slate-800 text-base font-bold">
                  No products are currently available for this brand.
                </p>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Please check back later for new products.
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-4 sm:gap-5",
                  activeCategoryId === "pub-gas" ||
                    activeCategoryId === "coal-fuels" ||
                    activeCategoryId === "coal-logs"
                    ? "grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                    : activeCategoryId === "air-liquide"
                      ? "grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : activeCategoryId === "autarky" ||
                        activeCategoryId === "big-k" ||
                        activeCategoryId === "bonningtons" ||
                        activeCategoryId === "campingaz" ||
                        activeCategoryId === "char-broil" ||
                        activeCategoryId === "cleese-uk" ||
                        activeCategoryId === "cpl-products" ||
                        activeCategoryId === "homefire" ||
                        activeCategoryId === "kingfisher" ||
                        activeCategoryId === "lifestyle-appliances" ||
                        activeCategoryId === "national-coal" ||
                        activeCategoryId === "sahara" ||
                        activeCategoryId === "swp" ||
                        activeCategoryId === "sunngas"
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        : activeCategoryId === "gas-spares"
                          ? "grid-cols-1 sm:grid-cols-2 max-w-3xl"
                          : activeCategoryId === "garden" ||
                            (activeCategoryId === "gas-appliances" &&
                              (activeSubId === "mobile-heaters" ||
                                activeSubId === "heaters" ||
                                activeSubId === "patio-heaters" ||
                                activeSubId === "patio" ||
                                activeSubId === "camping" ||
                                activeSubId === "garden" ||
                                activeSubId === "gardening"))
                            ? "grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
                            : activeCategoryId === "dynamite-baits" ||
                              activeCategoryId === "animal-feed" ||
                              activeCategoryId === "gas-appliances"
                              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                              : "grid-cols-1 sm:grid-cols-2",
                )}
              >
                {displayedProducts.map((prod) => {
                  const isAirLiquideItem = activeCategoryId === "air-liquide";
                  const isPubItem = activeCategoryId === "pub-gas";
                  const isCoalItem =
                    activeCategoryId === "coal-fuels" ||
                    activeCategoryId === "coal-logs" ||
                    activeCategoryId === "big-k" ||
                    activeCategoryId === "cpl-products" ||
                    activeCategoryId === "homefire" ||
                    activeCategoryId === "national-coal";
                  const isBaitItem = activeCategoryId === "dynamite-baits";
                  const isFeedItem =
                    activeCategoryId === "animal-feed" || activeCategoryId === "autarky";
                  const isCampingazItem = activeCategoryId === "campingaz";
                  const isCharBroilItem = activeCategoryId === "char-broil";
                  const isCleeseItem = activeCategoryId === "cleese-uk";
                  const isSparesItem =
                    activeCategoryId === "gas-spares" ||
                    activeCategoryId === "cleese-uk" ||
                    activeCategoryId === "swp";
                  const isBbqItem =
                    activeCategoryId === "gas-appliances" ||
                    activeCategoryId === "char-broil" ||
                    activeCategoryId === "kingfisher";
                  const isHeaterItem =
                    (activeCategoryId === "gas-appliances" &&
                      (activeSubId === "mobile-heaters" || activeSubId === "heaters")) ||
                    activeCategoryId === "lifestyle-appliances";
                  const isPatioHeaterItem =
                    (activeCategoryId === "gas-appliances" &&
                      (activeSubId === "patio-heaters" || activeSubId === "patio")) ||
                    activeCategoryId === "sahara";
                  const isCampingItem =
                    (activeCategoryId === "gas-appliances" && activeSubId === "camping") ||
                    activeCategoryId === "sunngas";
                  const isGardenItem =
                    activeCategoryId === "garden" ||
                    (activeCategoryId === "gas-appliances" &&
                      (activeSubId === "garden" || activeSubId === "gardening"));
                  const isCompactGrid = isPubItem || isCoalItem || isAirLiquideItem;
                  const isRestricted =
                    prod.specs?.restricted_to ||
                    isAirLiquideItem ||
                    (isPubItem &&
                      !prod.name.toLowerCase().includes("spanner") &&
                      !prod.name.toLowerCase().includes("ring"));
                  const isWished = wishlist.includes(prod.slug);
                  const isOutOfStock = Number(prod.stock || 0) <= 0;

                  return (
                    <div
                      key={prod.id}
                      className={cn(
                        "bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group",
                        isCompactGrid || isBaitItem || isFeedItem || isCampingazItem || isSparesItem || isBbqItem || isHeaterItem || isPatioHeaterItem || isCampingItem || isGardenItem
                          ? "p-3 sm:p-3.5 text-center"
                          : "p-4 sm:p-5 text-left",
                      )}
                    >
                      {/* Controlled Compact Image Area with Floating Quick Actions */}
                      <div
                        className={cn(
                          "w-full flex items-center justify-center p-3 mb-2 rounded-xl overflow-hidden relative",
                          isSparesItem ? "bg-white" : "bg-slate-50/50",
                          isCompactGrid
                            ? "h-36 sm:h-40"
                            : isBaitItem || isFeedItem || isCampingazItem || isSparesItem || isBbqItem || isHeaterItem || isPatioHeaterItem || isCampingItem || isGardenItem
                              ? "h-44 sm:h-52"
                              : "h-40 sm:h-48",
                        )}
                      >
                        {/* TOP-LEFT: Wishlist Quick Action Icon */}
                        <button
                          type="button"
                          aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(prod.slug);
                            toast(
                              isWished
                                ? `Removed ${prod.name} from wishlist`
                                : `Added ${prod.name} to wishlist`,
                            );
                          }}
                          className="absolute top-2 left-2 z-10 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/80 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer group/fav"
                        >
                          <Heart
                            className={cn(
                              "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors",
                              isWished
                                ? "fill-red-600 text-red-600"
                                : "text-slate-400 group-hover/fav:text-red-600",
                            )}
                          />
                        </button>

                        {/* TOP-RIGHT: Cart / Add to Cart Quick Action Icon */}
                        <button
                          type="button"
                          aria-label="Add to cart"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isLpgCylinder =
                              prod.category_slug === "calor-gas" || activeCategoryId === "calor-gas";

                            if (isLpgCylinder) {
                              // Guided LPG cylinder workflow requires usage/refill choice
                              setSelectedProductForModal(prod);
                              setModalQuantity(1);
                            } else if (prod.specs?.call_for_price || isRestricted) {
                              setSelectedProductForContact(prod.name);
                              setContactModalOpen(true);
                            } else if (isOutOfStock) {
                              toast.error(`${prod.name} is currently out of stock`);
                            } else {
                              addToCart(prod.slug, 1);
                              toast.success(`Added ${prod.name} to cart`);
                            }
                          }}
                          className="absolute top-2 right-2 z-10 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/80 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center text-slate-700 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer group/cart"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors" />
                        </button>

                        <img
                          src={prod.image_url || "/coal-logs.jpg"}
                          alt={prod.name}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-103 drop-shadow-xs"
                        />
                      </div>

                      {/* Product Name & Details */}
                      <div className="space-y-2 pt-1 flex-1 flex flex-col justify-between">
                        <div>
                          <h2
                            className={cn(
                              "font-black text-slate-900 leading-snug group-hover:text-red-600 transition-colors font-display",
                              isCompactGrid || isBaitItem || isFeedItem || isCampingazItem || isSparesItem || isBbqItem || isHeaterItem || isPatioHeaterItem || isCampingItem || isGardenItem
                                ? "text-xs sm:text-[13px] line-clamp-2 min-h-[2.2rem]"
                                : "text-sm sm:text-base",
                            )}
                          >
                            {prod.name}
                          </h2>
                          {isRestricted && (
                            <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                              (Pub customers only)
                            </p>
                          )}
                          {prod.specs?.max_quantity && !isPatioHeaterItem && !isHeaterItem && !isCampingItem && !isGardenItem && !isSparesItem && (
                            <p className="text-[10.5px] text-amber-700 font-bold mt-0.5">
                              Max: {prod.specs.max_quantity}
                            </p>
                          )}
                        </div>

                        {/* Real Database Price or Call for Price Badge */}
                        {prod.price > 0 && !prod.specs?.call_for_price ? (
                          <div
                            className={cn(
                              "font-black text-slate-900 font-display",
                              isCompactGrid || isBaitItem || isFeedItem || isCampingazItem || isSparesItem || isBbqItem || isHeaterItem || isPatioHeaterItem || isCampingItem || isGardenItem
                                ? "text-base sm:text-lg my-1"
                                : "text-xl sm:text-2xl",
                            )}
                          >
                            {gbp(prod.price)}
                          </div>
                        ) : (
                          <div className="my-1 flex items-center justify-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-md text-[11px] font-black tracking-wide uppercase shadow-2xs">
                              <Phone className="h-3 w-3 text-cyan-400" />
                              <span>Call for Price</span>
                            </div>
                          </div>
                        )}

                        {/* Unified Customer Action CTA: View details & select → */}
                        <div className="pt-2.5 border-t border-slate-100 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForModal(prod);
                              setModalQuantity(1);
                            }}
                            className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-black rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer group/btn"
                          >
                            <span>View details &amp; select</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* SHOP BY BRAND SECTION (IN-PAGE ANCHOR) */}
      <div id="shop-by-brand" className="scroll-mt-[165px] pt-4 sm:pt-6 border-t border-slate-200/80">
        <ShopByBrandSection
          onSelectBrand={(brand) => {
            const targetCat = resolveBrandToCategoryId(brand.id || brand.slug || brand.name);
            setActiveCategoryId(targetCat);
            if (targetCat === "calor-gas") {
              setActiveSubId("patio-refill");
            } else if (targetCat === "gas-appliances") {
              setActiveSubId("barbecues");
            } else if (targetCat === "gas-spares") {
              setActiveSubId("butane-regulators");
            } else {
              setActiveSubId("all");
            }
            setExpandedCategories((prev) => ({ ...prev, [targetCat]: true }));
            onSelectCategoryChange?.(targetCat);

            const performScroll = () => {
              const el = document.getElementById("gas-catalogue-main");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                window.scrollTo({ top: 400, behavior: "smooth" });
              }
            };
            performScroll();
            setTimeout(performScroll, 60);
            setTimeout(performScroll, 200);
          }}
        />
      </div>

      {/* PRODUCT DETAILS & SELECTION MODAL (UNIVERSAL ACROSS ALL CATEGORIES) */}
      <ProductDetailsModal
        isOpen={!!selectedProductForModal}
        product={selectedProductForModal}
        categoryName={activeCategory.name}
        categorySlug={activeCategoryId}
        onClose={() => {
          setSelectedProductForModal(null);
          setModalQuantity(1);
        }}
        onSelectAndContinue={(prod, qty) => {
          const selectedQty = qty || modalQuantity || 1;
          const usage: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS" =
            activeCategoryId === "pub-gas" ||
              activeCategoryId === "air-liquide" ||
              prod.brand === "Air Liquide"
              ? "COMMERCIAL"
              : prod.usage_type || "DOMESTIC";

          if (onSelectGasProduct) {
            onSelectGasProduct(prod.id, usage, prod, selectedQty);
            setSelectedProductForModal(null);
            setModalQuantity(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
            toast.success(`Selected ${prod.name}`);
          } else {
            const isLpgCylinder =
              prod.category_slug === "calor-gas" ||
              activeCategoryId === "calor-gas" ||
              prod.category_slug === "campingaz" ||
              activeCategoryId === "campingaz" ||
              prod.category_slug === "pub-gas" ||
              activeCategoryId === "pub-gas" ||
              activeCategoryId === "air-liquide" ||
              prod.brand === "Air Liquide" ||
              Boolean(prod.cylinder_size) ||
              Boolean(prod.gas_type) ||
              prod.category === "LPG Gas" ||
              Boolean(prod.is_refill);

            if (isLpgCylinder) {
              navigate({ to: "/order-gas" });
            } else if (prod.price > 0 && !prod.specs?.call_for_price) {
              // Add to real store cart
              addToCart(prod.slug, selectedQty);
              toast.success(`Added ${selectedQty} × ${prod.name} to cart`);
            } else {
              // Call for price / Trade restricted
              setSelectedProductForContact(prod.name);
              setContactModalOpen(true);
            }
            setSelectedProductForModal(null);
            setModalQuantity(1);
          }
        }}
        onContact={(productName) => {
          setSelectedProductForContact(productName);
          setSelectedProductForModal(null);
          setContactModalOpen(true);
        }}
      />

      {/* QUICK CONTACT / ENQUIRY MODAL */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 text-xs font-black uppercase tracking-wider">
              <Mail className="h-4 w-4" />
              <span>
                {activeCategoryId === "calor-gas"
                  ? `${activeCalorGroup.name} Refill Enquiry`
                  : `${activeCategory.name} Enquiry`}
              </span>
            </div>
            <DialogTitle className="font-black text-xl text-slate-900 text-left">
              Contact Us Regarding{" "}
              {selectedProductForContact ||
                (activeCategoryId === "calor-gas"
                  ? `${activeCalorGroup.name} Gas Refills`
                  : activeCategory.name)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs text-left text-slate-600">
            <p>
              Have a question regarding cylinder exchange eligibility, local depot collection, or
              scheduled forecourt delivery across Gloucestershire?
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <p className="font-bold text-slate-900">John Stayte Services Customer Hub</p>
              <p className="text-slate-600">
                📞 Phone: <strong>+44 (0)1453 822859</strong>
              </p>
              <p className="text-slate-600">
                ✉ Email: <strong>info@johnstayteservices.co.uk</strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                Depots in Whitminster, Eastington &amp; Stonehouse
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setContactModalOpen(false);
                  navigate({ to: "/contact" });
                }}
                className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs h-10 cursor-pointer"
              >
                Go to Contact Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* INFORMATION MODAL */}
      <Dialog
        open={infoModal.open}
        onOpenChange={(open) => !open && setInfoModal({ open: false, title: "", content: null })}
      >
        <DialogContent className="w-[95vw] max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl p-6 sm:p-8 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="font-black text-xl sm:text-2xl text-slate-900 text-left font-display">
              {infoModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2 space-y-4">{infoModal.content}</div>
          <div className="pt-3 flex justify-end border-t border-slate-100 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInfoModal({ open: false, title: "", content: null })}
              className="rounded-full px-8 py-2 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer"
            >
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
