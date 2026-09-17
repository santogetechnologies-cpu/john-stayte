import React, { useState, useEffect } from "react";
import {
  Flame,
  Scale,
  Wrench,
  Home,
  Building2,
  ShieldCheck,
  Truck,
  RotateCcw,
  FileText,
  Package,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  Mail,
  Phone,
  Sparkles,
  Utensils,
  CheckCircle2,
  XCircle,
  X,
  Download,
  ExternalLink,
  Info,
  Layers,
  Trees,
  Fish,
  Dog,
  CookingPot,
  Tent,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gbp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ProductDetailsModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectAndContinue?: (product: any, quantity: number) => void;
  onContact?: (productName: string) => void;
  categoryName?: string;
  categorySlug?: string;
}

interface DetailIconItem {
  icon: React.ElementType;
  label: string;
  value: string;
}

interface SuitableForItem {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onSelectAndContinue,
  onContact,
  categoryName,
  categorySlug,
}: ProductDetailsModalProps) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>("delivery");

  // Reset states when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setActiveImageIndex(0);
      setExpandedAccordion("delivery");
    }
  }, [product?.id, product?.slug]);

  const isWishlisted = Boolean(product && wishlist.includes(product.slug || product.id));

  // Determine images gallery
  const productImages: string[] = React.useMemo(() => {
    if (!product) return ["/calor-cylinders-studio.jpg"];
    const explicitGallery =
      (Array.isArray(product.images) && product.images.length > 0 && product.images) ||
      (Array.isArray(product.specs?.images) && product.specs.images.length > 0 && product.specs.images);

    if (explicitGallery) {
      const mainImg = product.image_url || product.image;
      if (mainImg && !explicitGallery.includes(mainImg)) {
        return [mainImg, ...explicitGallery];
      }
      return explicitGallery;
    }

    const mainImg = product.image_url || product.image || "/calor-cylinders-studio.jpg";
    // For gas cylinders, provide contextual gallery images if only 1 image exists
    const nameLower = (product.name || "").toLowerCase();
    if (nameLower.includes("patio")) {
      return [
        mainImg,
        "/domestic_kitchen_cylinder.jpg",
        "/commercial_kitchen_cylinders.jpg",
        "/calor-cylinders-studio.jpg",
      ];
    }
    if (nameLower.includes("butane")) {
      return [
        mainImg,
        "/domestic_kitchen_cylinder.jpg",
        "/calor-cylinders-studio.jpg",
      ];
    }
    if (nameLower.includes("propane")) {
      return [
        mainImg,
        "/service_bulk_supply.jpg",
        "/commercial_kitchen_cylinders.jpg",
        "/calor-cylinders-studio.jpg",
      ];
    }
    if (nameLower.includes("regulator") || nameLower.includes("valve")) {
      return [
        mainImg,
        "/calor-cylinders-studio.jpg",
      ];
    }
    return [mainImg];
  }, [product]);

  const activeImage = productImages[activeImageIndex] || productImages[0];

  // Derive contextual metadata
  const richData = React.useMemo(() => {
    if (!product) {
      return {
        brand: "JOHN STAYTE",
        categoryBadge: "PRODUCT",
        detailsRow: [],
        features: [],
        suitableFor: [],
      };
    }
    const nameLower = (product.name || "").toLowerCase();
    const catSlug = (product.category_slug || categorySlug || "").toLowerCase();
    const specs = product.specs || {};

    // Brand & category badge
    const brand =
      product.brand ||
      specs.brand ||
      (nameLower.includes("calor")
        ? "CALOR"
        : nameLower.includes("dynamite")
        ? "DYNAMITE BAITS"
        : nameLower.includes("cavagna")
        ? "CAVAGNA"
        : nameLower.includes("char-broil")
        ? "CHAR-BROIL"
        : "JOHN STAYTE");

    let categoryBadge = (product.subcategory || product.category_name || "PRODUCT").toUpperCase();
    if (catSlug.includes("calor") || nameLower.includes("patio") || nameLower.includes("butane") || nameLower.includes("propane") || nameLower.includes("refill") || product.gas_type || specs.gas_type) {
      categoryBadge = "LPG GAS CYLINDER";
    } else if (catSlug.includes("pub-gas") || nameLower.includes("co2") || nameLower.includes("mixed gas")) {
      categoryBadge = "CELLAR DISPENSE GAS";
    } else if (catSlug.includes("spares") || nameLower.includes("regulator") || nameLower.includes("valve")) {
      categoryBadge = "GAS REGULATOR & FITTING";
    } else if (catSlug.includes("coal") || catSlug.includes("fuel") || nameLower.includes("log") || nameLower.includes("coal")) {
      categoryBadge = "SMOKELESS SOLID FUEL";
    } else if (catSlug.includes("bait") || nameLower.includes("pellet") || nameLower.includes("groundbait")) {
      categoryBadge = "ANGLING FISHING BAIT";
    } else if (catSlug.includes("animal") || catSlug.includes("feed") || nameLower.includes("dog") || nameLower.includes("poultry")) {
      categoryBadge = "ANIMAL & PET NUTRITION";
    } else if (catSlug.includes("garden") || nameLower.includes("compost") || nameLower.includes("bark")) {
      categoryBadge = "GARDEN & HORTICULTURE";
    }

    // Key Details Icons Row (4 items)
    const detailsRow: DetailIconItem[] = [];

    const rawGasType = product.gas_type || specs.gas_type;
    const rawCylinderSize = product.cylinder_size || specs.cylinder_size || specs.size || specs.weight;

    if (rawGasType || rawCylinderSize || nameLower.includes("patio") || nameLower.includes("butane") || nameLower.includes("propane") || nameLower.includes("co2") || nameLower.includes("mixed gas")) {
      const gasType = rawGasType || (nameLower.includes("patio") ? "Propane" : nameLower.includes("butane") ? "Butane" : nameLower.includes("propane") ? "Propane" : nameLower.includes("co2") ? "CO2" : "Mixed Gas");
      detailsRow.push({ icon: Flame, label: "Gas Type", value: gasType });

      const size = rawCylinderSize || (nameLower.includes("13kg") ? "13kg" : nameLower.includes("15kg") ? "15kg" : nameLower.includes("7kg") ? "7kg" : nameLower.includes("5kg") ? "5kg" : nameLower.includes("19kg") ? "19kg" : nameLower.includes("47kg") ? "47kg" : nameLower.includes("6kg") ? "6kg" : nameLower.includes("3.9kg") ? "3.9kg" : "Cylinder");
      detailsRow.push({ icon: Scale, label: "Cylinder Size", value: size });

      const regulator = specs.regulator || (nameLower.includes("patio") ? "27mm Clip-on" : nameLower.includes("butane") ? "21mm Clip-on" : nameLower.includes("co2") ? "BS 341 No. 8" : "Standard POL");
      detailsRow.push({ icon: Wrench, label: "Regulator", value: regulator });

      const usage = specs.usage_type || (nameLower.includes("patio") ? "Outdoor" : nameLower.includes("butane") ? "Indoor / Portable" : nameLower.includes("pub") ? "Cellar Dispense" : "Whole-home");
      detailsRow.push({ icon: Home, label: "Usage Type", value: usage });
    } else if (catSlug.includes("spares") || nameLower.includes("regulator") || nameLower.includes("valve")) {
      detailsRow.push({ icon: Wrench, label: "Fitting", value: specs.fitting || (nameLower.includes("21mm") ? "21mm Clip-on" : nameLower.includes("27mm") ? "27mm Clip-on" : nameLower.includes("acov") ? "OPSO ACOV" : "Standard POL") });
      detailsRow.push({ icon: Flame, label: "Gas Compatible", value: specs.gas_type || (nameLower.includes("butane") ? "Butane" : nameLower.includes("propane") ? "Propane" : "LPG Propane") });
      detailsRow.push({ icon: ShieldCheck, label: "Certification", value: specs.certification || "BS EN 16129" });
      detailsRow.push({ icon: Home, label: "Operating Pressure", value: specs.pressure || (nameLower.includes("butane") ? "28 mbar" : "37 mbar") });
    } else if (catSlug.includes("coal") || catSlug.includes("fuel") || nameLower.includes("log") || nameLower.includes("coal")) {
      detailsRow.push({ icon: Flame, label: "Fuel Type", value: specs.fuel_type || (nameLower.includes("log") ? "Hardwood Ash" : "Smokeless Ovals") });
      detailsRow.push({ icon: Scale, label: "Bag Weight", value: specs.weight || (nameLower.includes("25kg") ? "25kg" : nameLower.includes("20kg") ? "20kg" : nameLower.includes("10kg") ? "10kg" : "Bagged Fuel") });
      detailsRow.push({ icon: ShieldCheck, label: "Defra Standard", value: specs.standard || "Ready to Burn" });
      detailsRow.push({ icon: Home, label: "Appliance", value: specs.appliance || "Stoves & Fires" });
    } else if (catSlug.includes("bait") || nameLower.includes("pellet")) {
      detailsRow.push({ icon: Fish, label: "Bait Type", value: specs.bait_type || "Match Pellets" });
      detailsRow.push({ icon: Scale, label: "Pack Size", value: specs.weight || "900g / 1kg" });
      detailsRow.push({ icon: Sparkles, label: "Attractant", value: specs.attractant || "Amino Fishmeal" });
      detailsRow.push({ icon: Trees, label: "Water Type", value: specs.water_type || "Lakes & Rivers" });
    } else if (catSlug.includes("animal") || catSlug.includes("feed")) {
      detailsRow.push({ icon: Dog, label: "Feed Grade", value: specs.grade || "Complete Diet" });
      detailsRow.push({ icon: Scale, label: "Pack Weight", value: specs.weight || (nameLower.includes("15kg") ? "15kg" : nameLower.includes("20kg") ? "20kg" : "Bagged Feed") });
      detailsRow.push({ icon: ShieldCheck, label: "Quality", value: specs.quality || "100% Natural" });
      detailsRow.push({ icon: Home, label: "Target Species", value: specs.species || (nameLower.includes("dog") ? "Canine / Dog" : nameLower.includes("poultry") ? "Poultry" : "Wild Birds") });
    } else {
      detailsRow.push({ icon: Package, label: "Brand", value: brand });
      detailsRow.push({ icon: Sparkles, label: "Condition", value: specs.condition || "Brand New" });
      detailsRow.push({ icon: ShieldCheck, label: "Warranty", value: specs.warranty || "Manufacturer Approved" });
      detailsRow.push({ icon: Truck, label: "Supply", value: "Local Depot Stock" });
    }

    // Key Features Bullets (3 to 5 bullets)
    let features: string[] = [];
    const dbFeatures =
      (Array.isArray(product.features) && product.features.length > 0 && product.features) ||
      (Array.isArray(specs.features) && specs.features.length > 0 && specs.features);

    if (dbFeatures) {
      features = dbFeatures;
    } else if (nameLower.includes("patio")) {
      features = [
        "High-quality Calor propane gas for reliable heating",
        "Easy 27mm clip-on connector for tool-free bottle changes",
        "Perfect for outdoor patio heaters, BBQs and garden appliances",
        "Empty cylinder exchange policy (zero deposit on exchange)",
      ];
    } else if (nameLower.includes("butane")) {
      features = [
        "Clean-burning, high heat output for indoor mobile heaters",
        "Standard 21mm clip-on valve connection",
        "Direct fit for domestic cabinet heaters and portable stoves",
        "Refill exchange option available on delivery",
      ];
    } else if (nameLower.includes("propane")) {
      features = [
        "Sub-zero outdoor vaporisation performance in winter",
        "Standard POL screw fitting (Female 5/8\" LH thread)",
        "High off-take rate suitable for continuous heating demand",
        "Compatible with multi-bottle automatic changeover valves",
      ];
    } else if (nameLower.includes("regulator") || nameLower.includes("valve")) {
      features = [
        "BS EN 16129 and CE certified for safe pressure regulation",
        "Built-in excess flow shut-off and safety relief valve",
        "Precision brass and zinc alloy durable construction",
        "Supplied with factory leak-tested gas seal washer",
      ];
    } else if (catSlug.includes("coal") || catSlug.includes("fuel")) {
      features = [
        "Defra & HETAS approved for Smoke Control Areas (Ready to Burn)",
        "High heat output with low ash residue and clean glass burn",
        "Sustained long-duration burn time for maximum efficiency",
        "Moisture tested under 15% for optimal thermal performance",
      ];
    } else if (catSlug.includes("bait")) {
      features = [
        "Formulated by champion match anglers for high attraction",
        "High protein fishmeal release in all water conditions",
        "Rapid scent dispersal to trigger competitive feeding",
        "Fresh sealed depot stock for maximum freshness",
      ];
    } else if (catSlug.includes("feed")) {
      features = [
        "100% natural ingredients with no artificial preservatives",
        "Balanced essential fatty acids, minerals and vitamins",
        "Highly digestible formula for optimum animal health",
        "Fresh local forecourt supply across Gloucestershire",
      ];
    } else {
      features = [
        "Premium commercial quality certified by John Stayte Services",
        "Sourced from official authorized UK distributors",
        "Full manufacturer warranty and customer support included",
        "Fast dispatch and next-day delivery across Gloucestershire",
      ];
    }

    // Suitable For Items (4 icons with labels)
    let suitableFor: SuitableForItem[] = [];
    const dbSuitable =
      (Array.isArray(product.suitable_for) && product.suitable_for.length > 0 && product.suitable_for) ||
      (Array.isArray(specs.suitable_for) && specs.suitable_for.length > 0 && specs.suitable_for);

    if (dbSuitable) {
      suitableFor = dbSuitable.map((item: any) => {
        if (typeof item === "string") {
          return { icon: Sparkles, title: item };
        }
        return {
          icon: item.icon || Sparkles,
          title: item.title || item.name || String(item),
          subtitle: item.subtitle,
        };
      });
    } else if (nameLower.includes("patio")) {
      suitableFor = [
        { icon: Utensils, title: "Large BBQs", subtitle: "(4 burners or more)" },
        { icon: Flame, title: "Patio heaters", subtitle: "Mushroom & Pyramid" },
        { icon: Sparkles, title: "Flame towers", subtitle: "Outdoor Living" },
        { icon: Tent, title: "Garden & events", subtitle: "Marquees & Patios" },
      ];
    } else if (nameLower.includes("butane")) {
      suitableFor = [
        { icon: Home, title: "Mobile heaters", subtitle: "Cabinet Room Heating" },
        { icon: Utensils, title: "Indoor cookers", subtitle: "Domestic Hobs" },
        { icon: Tent, title: "Caravans & vans", subtitle: "Summer Touring" },
        { icon: Sparkles, title: "Emergency heat", subtitle: "Power Outages" },
      ];
    } else if (nameLower.includes("propane")) {
      suitableFor = [
        { icon: Home, title: "Central heating", subtitle: "Whole Home LPG" },
        { icon: CookingPot, title: "Catering hobs", subtitle: "Commercial Kitchens" },
        { icon: Wrench, title: "Blowtorches", subtitle: "Roofing & Plumbing" },
        { icon: Building2, title: "Space heaters", subtitle: "Workshops & Barns" },
      ];
    } else if (nameLower.includes("regulator") || nameLower.includes("valve")) {
      suitableFor = [
        { icon: Utensils, title: "Gas barbecues", subtitle: "Clip-on & Screw" },
        { icon: Home, title: "Cabinet heaters", subtitle: "Indoor Heaters" },
        { icon: Tent, title: "Caravans", subtitle: "Park Homes & Touring" },
        { icon: Building2, title: "Dual tanks", subtitle: "Automatic ACOV" },
      ];
    } else if (catSlug.includes("coal") || catSlug.includes("fuel")) {
      suitableFor = [
        { icon: Flame, title: "Wood stoves", subtitle: "Clean Burning" },
        { icon: Home, title: "Multi-fuel fires", subtitle: "Closed Appliances" },
        { icon: Sparkles, title: "Open hearths", subtitle: "Traditional Fireplaces" },
        { icon: CookingPot, title: "Pizza ovens", subtitle: "High Temperature" },
      ];
    } else if (catSlug.includes("bait")) {
      suitableFor = [
        { icon: Fish, title: "Carp lakes", subtitle: "Specimen Angling" },
        { icon: Trees, title: "Commercials", subtitle: "Match Fishing" },
        { icon: Sparkles, title: "Method feeders", subtitle: "Groundbait Feeder" },
        { icon: Tent, title: "Rivers & canals", subtitle: "Coarse Species" },
      ];
    } else if (catSlug.includes("feed")) {
      suitableFor = [
        { icon: Dog, title: "Working dogs", subtitle: "High Energy" },
        { icon: Trees, title: "Wild birds", subtitle: "Feeder Stations" },
        { icon: Home, title: "Laying hens", subtitle: "Poultry Coops" },
        { icon: Sparkles, title: "Smallholdings", subtitle: "Farm Animals" },
      ];
    } else {
      suitableFor = [
        { icon: Home, title: "Domestic use", subtitle: "Home & Garden" },
        { icon: Building2, title: "Trade & pubs", subtitle: "Commercial Supply" },
        { icon: Sparkles, title: "Depot pickup", subtitle: "Forecourt Collection" },
        { icon: Truck, title: "Gloucestershire", subtitle: "Scheduled Delivery" },
      ];
    }

    return { brand, categoryBadge, detailsRow, features, suitableFor };
  }, [product, categorySlug]);

  const toggleAccordion = (id: string) => {
    setExpandedAccordion((prev) => (prev === id ? null : id));
  };

  const isLpgCylinder = Boolean(
    product &&
      (product.category_slug === "calor-gas" ||
        categorySlug === "calor-gas" ||
        product.category_slug === "pub-gas" ||
        categorySlug === "pub-gas" ||
        Boolean(product.cylinder_size) ||
        Boolean(product.gas_type) ||
        Boolean(product.is_refill))
  );

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-x-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        {/* TOP BAR / CLOSE BUTTON */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: IMAGES GALLERY & ACCORDIONS */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-50/90 to-slate-100/50 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col justify-between space-y-5">
            {/* Top Main Image with floating Wishlist & Cart buttons and Prev/Next Carousel arrows */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex items-center justify-center p-6 group">
                {/* Floating Wishlist Icon (Top Left) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product.slug || product.id);
                    toast.success(
                      isWishlisted
                        ? `Removed ${product.name} from wishlist`
                        : `Saved ${product.name} to wishlist`,
                    );
                  }}
                  aria-label="Save to wishlist"
                  className={cn(
                    "absolute top-3 left-3 z-10 h-8 w-8 rounded-full bg-white/95 backdrop-blur-xs border flex items-center justify-center shadow-xs transition-all cursor-pointer",
                    isWishlisted
                      ? "border-red-300 text-red-600 bg-red-50/90 scale-105"
                      : "border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200",
                  )}
                >
                  <Heart className={cn("h-4 w-4", isWishlisted && "fill-red-600")} />
                </button>

                {/* Floating Cart Icon (Top Right) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product.slug || product.id, quantity);
                    toast.success(`Added ${quantity} × ${product.name} to cart`);
                  }}
                  aria-label="Add to cart"
                  className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                >
                  <ShoppingCart className="h-4 w-4" />
                </button>

                {/* Carousel Prev Arrow */}
                {productImages.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((i) =>
                        i === 0 ? productImages.length - 1 : i - 1,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs opacity-80 hover:opacity-100 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                {/* Main Product Image */}
                <img
                  src={activeImage}
                  alt={product.name}
                  className="max-h-56 sm:max-h-64 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-xs"
                />

                {/* Carousel Next Arrow */}
                {productImages.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((i) =>
                        i === productImages.length - 1 ? 0 : i + 1,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs opacity-80 hover:opacity-100 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Thumbnails Row */}
              {productImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 px-0.5">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={cn(
                        "h-12 w-12 rounded-xl border-2 p-1 bg-white shrink-0 transition-all cursor-pointer",
                        activeImageIndex === idx
                          ? "border-red-600 shadow-2xs ring-1 ring-red-600/30 scale-102"
                          : "border-slate-200/90 hover:border-slate-300 opacity-75 hover:opacity-100",
                      )}
                    >
                      <img
                        src={img}
                        alt={`View ${idx + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Sections (Accordion) */}
            <div className="space-y-2 pt-2 border-t border-slate-200/70 text-left">
              {/* Delivery Information Accordion */}
              <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleAccordion("delivery")}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-extrabold text-xs text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    <span>Delivery Information</span>
                  </span>
                  {expandedAccordion === "delivery" ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
                {expandedAccordion === "delivery" && (
                  <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-600 border-t border-slate-100 space-y-1 leading-relaxed">
                    <p>
                      <strong>Gloucestershire Depot Delivery:</strong> Next-day scheduled forecourt
                      delivery across Stroud, Gloucester, Cheltenham, Cirencester, Tewkesbury, and
                      Forest of Dean.
                    </p>
                    <p className="text-slate-500">
                      Standard delivery slots available Mon–Fri (Morning, Afternoon, Evening).
                    </p>
                  </div>
                )}
              </div>

              {/* Safety Information Accordion */}
              <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleAccordion("safety")}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-extrabold text-xs text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Safety Information</span>
                  </span>
                  {expandedAccordion === "safety" ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
                {expandedAccordion === "safety" && (
                  <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-600 border-t border-slate-100 space-y-1 leading-relaxed">
                    <p>
                      Store upright in well-ventilated areas away from direct heat and ignition sources.
                      UKLPG / BS 5482 safety standard certified.
                    </p>
                  </div>
                )}
              </div>

              {/* Returns & Exchanges Accordion */}
              <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleAccordion("returns")}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-extrabold text-xs text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                    <span>Returns &amp; Exchanges</span>
                  </span>
                  {expandedAccordion === "returns" ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
                {expandedAccordion === "returns" && (
                  <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-600 border-t border-slate-100 space-y-1 leading-relaxed">
                    <p>
                      <strong>Zero Deposit Exchange:</strong> Return an empty Calor cylinder of
                      matching group on delivery for instant exchange with £0 deposit charge.
                    </p>
                  </div>
                )}
              </div>

              {/* Product Documents Accordion */}
              <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleAccordion("documents")}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-extrabold text-xs text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    <span>Product Documents</span>
                  </span>
                  {expandedAccordion === "documents" ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
                {expandedAccordion === "documents" && (
                  <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-600 border-t border-slate-100 space-y-1.5 leading-relaxed">
                    <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700">Safety Data Sheet (SDS)</span>
                      <span className="text-[10px] text-red-600 font-bold">PDF</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700">User Operating Guide</span>
                      <span className="text-[10px] text-red-600 font-bold">PDF</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Related Products Accordion */}
              <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleAccordion("related")}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-extrabold text-xs text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-purple-600" />
                    <span>Related Products</span>
                  </span>
                  {expandedAccordion === "related" ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
                {expandedAccordion === "related" && (
                  <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-600 border-t border-slate-100 space-y-1 leading-relaxed">
                    <p>
                      Compatible low-pressure regulators, clip-on fittings, changeover valves and gas
                      spanners in stock at all local depots.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: INFORMATION, DETAILS, FEATURES, SUITABLE FOR & ACTIONS */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between space-y-5 text-left">
            <div className="space-y-4">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Brand Badge */}
                <span className="px-2.5 py-0.5 rounded-md bg-[#c8102e] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                  {richData.brand}
                </span>

                {/* Category Badge */}
                <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                  {richData.categoryBadge}
                </span>

                {/* Stock Status Badge */}
                {product.stock > 0 || product.stock === undefined ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>In Stock</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                    <XCircle className="h-3 w-3 text-rose-600" />
                    <span>Out of Stock</span>
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight font-display leading-tight">
                {product.name}
              </h2>

              {/* Price Row */}
              <div className="flex items-baseline gap-2 pt-0.5 pb-1 border-b border-slate-100">
                {product.price > 0 && !product.specs?.call_for_price ? (
                  <>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                      {gbp(product.price)}
                    </div>
                    <span className="text-xs font-bold text-slate-400">inc. VAT</span>
                  </>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-black tracking-wide uppercase">
                    <Phone className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Call for Trade Price</span>
                  </div>
                )}
              </div>

              {/* Short Description */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {product.description ||
                  "Premium quality supply from John Stayte Services. Fully certified and stocked locally at our Gloucestershire forecourt depots."}
              </p>

              {/* Key Details (Icons Row) */}
              {richData.detailsRow.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {richData.detailsRow.map((det, idx) => {
                    const Icon = det.icon;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center gap-2.5"
                      >
                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs text-[#c8102e]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 block leading-none">
                            {det.label}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 truncate block mt-0.5">
                            {det.value}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Key Features Box */}
              {richData.features.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-red-50/30 border border-red-100 space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Key Features
                  </h4>
                  <ul className="space-y-1.5">
                    {richData.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="h-3.5 w-3.5 text-[#c8102e] shrink-0 mt-0.5 stroke-[3]" />
                        <span className="font-medium leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suitable For Box */}
              {richData.suitableFor.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Suitable for
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {richData.suitableFor.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border border-slate-200/90 bg-white text-center flex flex-col items-center justify-center space-y-1 shadow-2xs"
                        >
                          <div className="h-7 w-7 rounded-full bg-red-50 text-[#c8102e] flex items-center justify-center">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-900 leading-tight">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-[9px] font-medium text-slate-400 leading-tight">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Quantity Selector, CTA & Contact */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              {/* Quantity Selector */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-extrabold text-slate-700">Order Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-30 cursor-pointer transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-9 text-center text-xs font-black text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= (product.stock || 99)}
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-8 w-8 flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-30 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons: Back & Select Product & Continue */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-3 h-11 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  Back
                </button>

                <Button
                  type="button"
                  onClick={() => {
                    if (onSelectAndContinue) {
                      onSelectAndContinue(product, quantity);
                    } else if (isLpgCylinder) {
                      // Navigate to order gas
                      toast.success(`Selected ${product.name}`);
                    } else {
                      addToCart(product.slug || product.id, quantity);
                      toast.success(`Added ${quantity} × ${product.name} to cart`);
                    }
                    onClose();
                  }}
                  className="flex-1 h-11 rounded-full bg-[#c8102e] hover:bg-[#a50d24] text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>Select Product &amp; Continue</span>
                  <ChevronRight className="h-4 w-4 stroke-[3]" />
                </Button>
              </div>

              {/* Help / Support Link */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onContact) {
                      onContact(product.name);
                    }
                    onClose();
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-red-600 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-red-500" />
                  <span>Have a question about this product? Contact JSS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
