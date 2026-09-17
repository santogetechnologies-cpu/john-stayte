export interface CanonicalCategoryItem {
  slug: string;
  name: string;
  icon: string;
  subcategories: string[];
  description: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface CanonicalProductItem {
  slug: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  image_url: string;
  category_slug: string;
  subcategory: string;
  description: string;
  deposit_price?: number;
  refill_price?: number;
  gas_type?: string;
  cylinder_size?: string;
  usage_type?: string;
  images?: string[];
  features?: string[];
  suitable_for?: string[];
}

export const CANONICAL_CATEGORIES: CanonicalCategoryItem[] = [
  {
    "slug": "calor-gas",
    "name": "Calor Gas",
    "icon": "Flame",
    "subcategories": [
      "Patio Gas",
      "Patio Gas Refill (cylinder exchange)",
      "Butane",
      "Butane Refill (cylinder exchange)",
      "Propane",
      "Propane Refill (cylinder exchange)"
    ],
    "description": "Calor Patio Gas & LPG Refill cylinders. You must have an empty bottle to return when ordering a gas refill.",
    "image_url": null,
    "display_order": 1,
    "is_active": true
  },
  {
    "slug": "air-liquide",
    "name": "Air Liquide",
    "icon": "Flame",
    "subcategories": [
      "All Air Liquide",
      "CO2 / Carbon Dioxide",
      "Mixed Gas"
    ],
    "description": "Official Air Liquide dispense and cellar gases for hospitality, pub, restaurant and beverage operations.",
    "image_url": null,
    "display_order": 2,
    "is_active": true
  },
  {
    "slug": "autarky",
    "name": "Autarky",
    "icon": "Dog",
    "subcategories": [
      "All Autarky"
    ],
    "description": "Autarky naturally balanced, 100% natural canine nutrition crafted with delicious recipes for active and working dogs.",
    "image_url": null,
    "display_order": 3,
    "is_active": true
  },
  {
    "slug": "big-k",
    "name": "Big K",
    "icon": "Flame",
    "subcategories": [
      "All Big K"
    ],
    "description": "Restaurant-grade lumpwood charcoal, instant lighting firelogs, hollow heat logs, disposable barbecues and lighter fluid.",
    "image_url": null,
    "display_order": 4,
    "is_active": true
  },
  {
    "slug": "bar-be-quick",
    "name": "Bar-Be-Quick",
    "icon": "CookingPot",
    "subcategories": [
      "All Bar-Be-Quick"
    ],
    "description": "Instant barbecues, lighting fluid and outdoor cooking accessories.",
    "image_url": null,
    "display_order": 5,
    "is_active": true
  },
  {
    "slug": "beekind",
    "name": "BeeKind",
    "icon": "Logs",
    "subcategories": [
      "All BeeKind"
    ],
    "description": "Eco-friendly wood briquettes and sustainable clean heating fuels.",
    "image_url": null,
    "display_order": 6,
    "is_active": true
  },
  {
    "slug": "bio-bean",
    "name": "bio-bean",
    "icon": "Logs",
    "subcategories": [
      "All bio-bean"
    ],
    "description": "Coffee logs and sustainable clean biomass fuels.",
    "image_url": null,
    "display_order": 7,
    "is_active": true
  },
  {
    "slug": "bonningtons",
    "name": "Bonningtons",
    "icon": "CookingPot",
    "subcategories": [
      "All Bonningtons"
    ],
    "description": "Outdoor patio heaters, barbecue fire pits, and garden smokers.",
    "image_url": null,
    "display_order": 8,
    "is_active": true
  },
  {
    "slug": "broil-king",
    "name": "Broil King",
    "icon": "Flame",
    "subcategories": [
      "All Broil King"
    ],
    "description": "High-performance gas and charcoal barbecues.",
    "image_url": null,
    "display_order": 9,
    "is_active": true
  },
  {
    "slug": "c-rudrum-and-sons",
    "name": "C. Rudrum & Sons",
    "icon": "Logs",
    "subcategories": [
      "All C. Rudrum & Sons"
    ],
    "description": "Solid fuels, logs, smokeless coal, and domestic heating supplies.",
    "image_url": null,
    "display_order": 10,
    "is_active": true
  },
  {
    "slug": "cadac",
    "name": "Cadac",
    "icon": "CookingPot",
    "subcategories": [
      "All Cadac"
    ],
    "description": "Modular portable gas barbecues and camping chef equipment.",
    "image_url": null,
    "display_order": 11,
    "is_active": true
  },
  {
    "slug": "cambrian",
    "name": "Cambrian",
    "icon": "Flame",
    "subcategories": [
      "All Cambrian"
    ],
    "description": "Coal and domestic heating fuel supplies.",
    "image_url": null,
    "display_order": 12,
    "is_active": true
  },
  {
    "slug": "char-broil",
    "name": "Char-Broil",
    "icon": "Flame",
    "subcategories": [
      "All Char-Broil"
    ],
    "description": "America's favourite gas, charcoal and electric outdoor barbecues and modular outdoor kitchens.",
    "image_url": null,
    "display_order": 13,
    "is_active": true
  },
  {
    "slug": "cleese-uk",
    "name": "Cleese UK",
    "icon": "Settings",
    "subcategories": [
      "All Cleese UK"
    ],
    "description": "High performance LPG regulators, automatic changeover valves, and gas safety fittings.",
    "image_url": null,
    "display_order": 14,
    "is_active": true
  },
  {
    "slug": "cpl-products",
    "name": "CPL Products",
    "icon": "Flame",
    "subcategories": [
      "All CPL Products"
    ],
    "description": "Smokeless solid fuels, coal, firelighters, and winter heating supplies.",
    "image_url": null,
    "display_order": 15,
    "is_active": true
  },
  {
    "slug": "devon-bio-fuels",
    "name": "Devon Bio Fuels",
    "icon": "Flame",
    "subcategories": [
      "All Devon Bio Fuels"
    ],
    "description": "Kiln-dried hardwood logs, kindling, and bio-heating.",
    "image_url": null,
    "display_order": 16,
    "is_active": true
  },
  {
    "slug": "forest-lighter",
    "name": "Forest Lighter",
    "icon": "Flame",
    "subcategories": [
      "All Forest Lighter"
    ],
    "description": "Natural wood firelighters and kiln dried kindling sticks.",
    "image_url": null,
    "display_order": 17,
    "is_active": true
  },
  {
    "slug": "homefire",
    "name": "Homefire",
    "icon": "Flame",
    "subcategories": [
      "All Homefire"
    ],
    "description": "Market-leading smokeless ovals, kiln dried logs, and fire supplies.",
    "image_url": null,
    "display_order": 18,
    "is_active": true
  },
  {
    "slug": "indesit",
    "name": "Indesit",
    "icon": "Flame",
    "subcategories": [
      "All Indesit"
    ],
    "description": "Domestic and commercial gas cookers and appliances.",
    "image_url": null,
    "display_order": 19,
    "is_active": true
  },
  {
    "slug": "kingfisher",
    "name": "Kingfisher",
    "icon": "Flame",
    "subcategories": [
      "All Kingfisher"
    ],
    "description": "Outdoor tools, garden accessories, and durable hardware.",
    "image_url": null,
    "display_order": 20,
    "is_active": true
  },
  {
    "slug": "lifestyle-appliances",
    "name": "Lifestyle Appliances",
    "icon": "Flame",
    "subcategories": [
      "All Lifestyle Appliances"
    ],
    "description": "Mobile cabinet heaters, patio heaters, and indoor flame heaters.",
    "image_url": null,
    "display_order": 21,
    "is_active": true
  },
  {
    "slug": "maxibrite",
    "name": "Maxibrite",
    "icon": "Flame",
    "subcategories": [
      "All Maxibrite"
    ],
    "description": "Clean burning, high heat smokeless ovals for open fires and stoves.",
    "image_url": null,
    "display_order": 22,
    "is_active": true
  },
  {
    "slug": "national-coal",
    "name": "National Coal",
    "icon": "Flame",
    "subcategories": [
      "All National Coal"
    ],
    "description": "Traditional British coals, kiln dried kindling, and premium solid fuels.",
    "image_url": null,
    "display_order": 23,
    "is_active": true
  },
  {
    "slug": "new-world",
    "name": "New World",
    "icon": "Flame",
    "subcategories": [
      "All New World"
    ],
    "description": "Freestanding gas cookers, hobs, and domestic appliances.",
    "image_url": null,
    "display_order": 24,
    "is_active": true
  },
  {
    "slug": "renewable-wood-fuels",
    "name": "Renewable Wood Fuels Ltd",
    "icon": "Flame",
    "subcategories": [
      "All Renewable Wood Fuels Ltd"
    ],
    "description": "Sustainable hardwood logs and biomass energy solutions.",
    "image_url": null,
    "display_order": 25,
    "is_active": true
  },
  {
    "slug": "sahara",
    "name": "Sahara",
    "icon": "Flame",
    "subcategories": [
      "All Sahara"
    ],
    "description": "Premium gas barbecues and outdoor patio heating systems.",
    "image_url": null,
    "display_order": 26,
    "is_active": true
  },
  {
    "slug": "swp",
    "name": "SWP",
    "icon": "Flame",
    "subcategories": [
      "All SWP"
    ],
    "description": "Specialized welding products, regulators, torches, and gas fittings.",
    "image_url": null,
    "display_order": 27,
    "is_active": true
  },
  {
    "slug": "swf-scotland",
    "name": "SWF Scotland",
    "icon": "Flame",
    "subcategories": [
      "All SWF Scotland"
    ],
    "description": "Solid fuels, premium coals, and heating supplies.",
    "image_url": null,
    "display_order": 28,
    "is_active": true
  },
  {
    "slug": "sunngas",
    "name": "SunGas",
    "icon": "Flame",
    "subcategories": [
      "All SunGas"
    ],
    "description": "Camping cookers, portable gas stoves, and leisure accessories.",
    "image_url": null,
    "display_order": 29,
    "is_active": true
  },
  {
    "slug": "pub-gas",
    "name": "Pub Gas",
    "icon": "UtensilsCrossed",
    "subcategories": [
      "All Pub Gas",
      "CO2 / Carbon Dioxide",
      "Mixed Gas",
      "Pub Gas Spanner",
      "Mixed Gas O-ring",
      "CO2 O-ring"
    ],
    "description": "Food-grade dispense gases and cellar accessories for pubs, bars, restaurants and breweries across Gloucestershire. (Pub customers only for cellar cylinders).",
    "image_url": null,
    "display_order": 30,
    "is_active": true
  },
  {
    "slug": "coal-fuels",
    "name": "Coal & Other Fuels",
    "icon": "Logs",
    "subcategories": [
      "All",
      "Smokeless Fuel",
      "Kiln Dried Logs",
      "Kindling & Heat Logs",
      "Charcoal",
      "Firelighters",
      "Barbecue"
    ],
    "description": "HETAS and Defra approved Ready-to-Burn domestic fuels, smokeless coal ovals, and kiln-dried ash logs.",
    "image_url": null,
    "display_order": 31,
    "is_active": true
  },
  {
    "slug": "dynamite-baits",
    "name": "Dynamite Fishing Baits",
    "icon": "Fish",
    "subcategories": [
      "Groundbait",
      "Pellets"
    ],
    "description": "Premium carp, coarse and predator fishing baits, groundbait, and pellets.",
    "image_url": null,
    "display_order": 32,
    "is_active": true
  },
  {
    "slug": "animal-feed",
    "name": "Animal Feed",
    "icon": "Dog",
    "subcategories": [
      "All",
      "Wild Bird Food",
      "Dog Food",
      "Poultry & Farm Feed"
    ],
    "description": "Nutritious wild bird seed, complete dog food, equine feeds, and farm supplements.",
    "image_url": null,
    "display_order": 33,
    "is_active": true
  },
  {
    "slug": "campingaz",
    "name": "Campingaz",
    "icon": "Tent",
    "subcategories": [],
    "description": "Lightweight, portable butane gas bottles and camping equipment exchangeable across Europe.",
    "image_url": null,
    "display_order": 34,
    "is_active": true
  },
  {
    "slug": "gas-appliances",
    "name": "Gas Appliances",
    "icon": "CookingPot",
    "subcategories": [
      "Barbecues",
      "Mobile Heaters",
      "Patio Heaters",
      "Camping"
    ],
    "description": "Gas appliances for all your heating, barbecue and camping needs.",
    "image_url": null,
    "display_order": 35,
    "is_active": true
  },
  {
    "slug": "garden",
    "name": "Garden",
    "icon": "Sprout",
    "subcategories": [],
    "description": "Compost, soil, organic planters, decorative bark & everything you need for a thriving garden.",
    "image_url": null,
    "display_order": 36,
    "is_active": true
  },
  {
    "slug": "food",
    "name": "Food",
    "icon": "Utensils",
    "subcategories": [
      "Local Forecourt Produce",
      "Wild Bird Seed & Treats"
    ],
    "description": "Forecourt pantry goods, local honey, snacks, and wild bird feeds available at our service stations.",
    "image_url": null,
    "display_order": 37,
    "is_active": true
  },
  {
    "slug": "gas-spares",
    "name": "Gas Spares",
    "icon": "Wrench",
    "subcategories": [
      "Butane Regulators",
      "Propane Regulators",
      "Changeover Valves"
    ],
    "description": "BS certified low-pressure gas regulators, clip-on cylinder fittings, and automatic changeover valves.",
    "image_url": null,
    "display_order": 38,
    "is_active": true
  },
  {
    "slug": "trailers",
    "name": "Trailers",
    "icon": "Truck",
    "subcategories": [],
    "description": "Single axle & heavy-duty haulage trailers for domestic & commercial use, trailer servicing and accessories.",
    "image_url": null,
    "display_order": 39,
    "is_active": true
  },
  {
    "slug": "workwear",
    "name": "Workwear",
    "icon": "Shirt",
    "subcategories": [],
    "description": "High-visibility waterproof jackets, heavy-duty trousers, safety boots & PPE for trade and agricultural work.",
    "image_url": null,
    "display_order": 40,
    "is_active": true
  },
  {
    "slug": "boc-gases",
    "name": "BOC Gases",
    "icon": "Flame",
    "subcategories": [
      "All BOC Gases"
    ],
    "description": "Industrial, medical and specialty gases from BOC, A Linde company.",
    "image_url": null,
    "display_order": 41,
    "is_active": true
  }
];

/**
 * Universal category ↔ product relationship resolver matching Shop & Order Gas catalog rules.
 * Supports direct category_slug, brand relationships, category hierarchies, and product ranges.
 */
export function getProductsForCategory(categorySlug: string, allProducts: any[]): any[] {
  if (!categorySlug || !Array.isArray(allProducts)) return [];
  const slug = categorySlug.toLowerCase().trim();

  return allProducts.filter((p) => {
    if (!p) return false;
    const pCatSlug = (p.category_slug || "").toLowerCase().trim();
    const pBrand = (p.brand || "").toLowerCase().trim();
    const pSubcat = (p.subcategory || "").toLowerCase().trim();
    const pName = (p.name || "").toLowerCase().trim();
    const pSlug = (p.slug || "").toLowerCase().trim();

    // BOC Gases
    if (slug === "boc-gases" || slug === "boc") {
      return (
        pBrand.includes("boc") ||
        pCatSlug === "boc-gases" ||
        pCatSlug === "boc" ||
        pName.toLowerCase().includes("boc") ||
        pSlug.includes("boc")
      );
    }

    // 1. Calor Gas
    if (slug === "calor-gas" || slug === "gas" || slug === "bottled-gas") {
      return (
        pBrand.includes("calor") ||
        pCatSlug === "calor-gas" ||
        pCatSlug === "gas" ||
        pCatSlug === "bottled-gas" ||
        pName.includes("calor") ||
        pSlug.includes("calor")
      );
    }

    // 2. Air Liquide
    if (slug === "air-liquide") {
      return (
        pBrand.includes("air liquide") ||
        pBrand.includes("airliquide") ||
        pCatSlug === "air-liquide" ||
        pName.includes("carbon dioxide") ||
        pName.includes("mixed gas") ||
        pName.includes("co2") ||
        pSlug.includes("carbon-dioxide") ||
        pSlug.includes("mixed-gas") ||
        pSlug.includes("co2-o-ring") ||
        pSlug.includes("mixed-gas-o-ring") ||
        pSlug.includes("pub-gas-spanner")
      );
    }

    // 3. Pub Gas
    if (slug === "pub-gas") {
      return (
        pCatSlug === "pub-gas" ||
        pBrand.includes("air liquide") ||
        pBrand.includes("stayte pub gas") ||
        pName.includes("carbon dioxide") ||
        pName.includes("mixed gas") ||
        pName.includes("pub gas") ||
        pName.includes("o-ring") ||
        pName.includes("spanner") ||
        pSlug.includes("pub-gas") ||
        pSlug.includes("carbon-dioxide") ||
        pSlug.includes("mixed-gas")
      );
    }

    // 4. Brand-based categories in Shop & Order Gas
    if (slug === "autarky") return pBrand === "autarky" || pCatSlug === "autarky";
    if (slug === "big-k") return pBrand === "big k" || pBrand === "big-k" || pCatSlug === "big-k";
    if (slug === "bar-be-quick") return pBrand === "bar-be-quick" || pBrand === "bar be quick" || pCatSlug === "bar-be-quick";
    if (slug === "beekind") return pBrand === "beekind" || pCatSlug === "beekind";
    if (slug === "bio-bean") return pBrand === "bio-bean" || pBrand === "bio bean" || pCatSlug === "bio-bean";
    if (slug === "bonningtons") return pBrand === "bonningtons" || pCatSlug === "bonningtons";
    if (slug === "broil-king") return pBrand === "broil king" || pBrand === "broil-king" || pCatSlug === "broil-king";
    if (slug === "c-rudrum-and-sons") return pBrand.includes("rudrum") || pCatSlug === "c-rudrum-and-sons";
    if (slug === "cadac") return pBrand === "cadac" || pCatSlug === "cadac";
    if (slug === "cambrian") return pBrand === "cambrian" || pCatSlug === "cambrian";
    if (slug === "char-broil") return pBrand === "char-broil" || pBrand === "char broil" || pCatSlug === "char-broil";
    if (slug === "cleese-uk") return pBrand === "clesse" || pBrand === "cleese uk" || pBrand === "cleese-uk" || pCatSlug === "cleese-uk";
    if (slug === "cpl-products") {
      const CPL_SLUGS = new Set([
        "brazier-10kg",
        "brazier-20kg",
        "homefire-twizlers-wood-wool-natural-firelighters",
        "taybrite-25kg",
        "homefire-25kg",
        "homefire-kiln-dried-logs-approx-8kg",
        "heat-log-blocks-pack-of-8",
      ]);
      return (
        pBrand === "cpl" ||
        pBrand === "cpl products" ||
        pCatSlug === "cpl-products" ||
        CPL_SLUGS.has(pSlug)
      );
    }
    if (slug === "devon-bio-fuels") return pBrand.includes("devon") || pCatSlug === "devon-bio-fuels";
    if (slug === "forest-lighter") return pBrand.includes("forest") || pCatSlug === "forest-lighter";
    if (slug === "homefire") return pBrand === "homefire" || pCatSlug === "homefire";
    if (slug === "indesit") return pBrand === "indesit" || pCatSlug === "indesit";
    if (slug === "kingfisher") return pBrand === "kingfisher" || pCatSlug === "kingfisher";
    if (slug === "lifestyle-appliances") return pBrand === "lifestyle" || pBrand === "lifestyle appliances" || pCatSlug === "lifestyle-appliances";
    if (slug === "maxibrite") return pBrand === "maxibrite" || pCatSlug === "maxibrite";
    if (slug === "national-coal") return pBrand === "national coal" || pCatSlug === "national-coal";
    if (slug === "new-world") return pBrand === "new world" || pCatSlug === "new-world";
    if (slug === "renewable-wood-fuels") return pBrand.includes("renewable wood") || pCatSlug === "renewable-wood-fuels";
    if (slug === "sahara") return pBrand === "sahara" || pCatSlug === "sahara";
    if (slug === "swp") return pBrand === "swp" || pCatSlug === "swp";
    if (slug === "swf-scotland") return pBrand === "swf scotland" || pCatSlug === "swf-scotland";
    if (slug === "sunngas") return pBrand === "sunngas" || pBrand === "sungas" || pCatSlug === "sunngas";
    if (slug === "stayte-pub-gas") return pBrand === "stayte pub gas" || pCatSlug === "stayte-pub-gas";

    // 5. Product-type / General Categories
    if (slug === "coal-fuels" || slug === "coal-logs") {
      return (
        pCatSlug === "coal-fuels" ||
        pCatSlug === "coal-logs" ||
        pBrand.includes("homefire") ||
        pBrand.includes("big k") ||
        pBrand.includes("brazier") ||
        pBrand.includes("taybrite") ||
        pBrand.includes("national coal") ||
        pBrand.includes("stayte fuels") ||
        pBrand.includes("barrettine") ||
        pSubcat.includes("coal") ||
        pSubcat.includes("smokeless") ||
        pSubcat.includes("logs") ||
        pSubcat.includes("kindling")
      );
    }

    if (slug === "dynamite-baits" || slug === "fishing-baits") {
      return (
        pBrand.includes("dynamite") ||
        pCatSlug === "dynamite-baits" ||
        pCatSlug === "fishing-baits" ||
        pSubcat.includes("groundbait") ||
        pSubcat.includes("pellet")
      );
    }

    if (slug === "animal-feed") {
      return (
        pCatSlug === "animal-feed" ||
        pBrand.includes("autarky") ||
        pBrand.includes("countrywide") ||
        pSubcat.includes("dog food") ||
        pSubcat.includes("wild bird")
      );
    }

    if (slug === "campingaz") {
      return (
        pBrand.includes("campingaz") ||
        pCatSlug === "campingaz" ||
        pName.includes("camping") ||
        pSlug.includes("907") ||
        pSlug.includes("904")
      );
    }

    if (slug === "gas-appliances") {
      return (
        pCatSlug === "gas-appliances" ||
        pCatSlug === "char-broil" ||
        pCatSlug === "lifestyle-appliances" ||
        pCatSlug === "sahara" ||
        pBrand.includes("char-broil") ||
        pBrand.includes("lifestyle") ||
        pBrand.includes("universal") ||
        pBrand.includes("phoenix") ||
        pBrand.includes("superheat") ||
        pBrand.includes("bonningtons") ||
        pSubcat.includes("heater") ||
        pSubcat.includes("barbecue") ||
        pSubcat.includes("grill")
      );
    }

    if (slug === "garden") {
      return pCatSlug === "garden" || pBrand.includes("melcourt") || pSubcat.includes("bark") || pSubcat.includes("planter") || pSubcat.includes("compost");
    }

    if (slug === "food") {
      return pCatSlug === "food" || pBrand.includes("local produce") || pName.includes("honey") || pName.includes("eggs");
    }

    if (slug === "gas-spares") {
      return (
        pCatSlug === "gas-spares" ||
        pBrand.includes("clesse") ||
        pSubcat.includes("regulator") ||
        pSubcat.includes("valve") ||
        pSubcat.includes("fitting")
      );
    }

    if (slug === "trailers") return pCatSlug === "trailers" || pSubcat.includes("trailer");
    if (slug === "workwear") return pCatSlug === "workwear" || pSubcat.includes("workwear") || pSubcat.includes("ppe");

    // Direct match fallback
    return pCatSlug === slug;
  });
}

export function getCategoryProductCount(categorySlug: string, allProducts: any[]): number {
  return getProductsForCategory(categorySlug, allProducts).length;
}

export const CANONICAL_PRODUCTS: CanonicalProductItem[] = [
  {
    "slug": "calor-gas-propane-13kg-refill",
    "name": "Calor Gas Propane - 13kg Refill",
    "brand": "Calor",
    "price": 50,
    "stock": 30,
    "image_url": "/calor-propane-13kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Propane",
    "description": "13kg Propane gas cylinder refill with standard POL screw connection for whole-home heating, cooking and light commercial use. Requires an empty cylinder exchange on delivery.",
    "usage_type": "DOMESTIC",
    "gas_type": "Propane",
    "cylinder_size": "13kg",
    "deposit_price": 39.99,
    "refill_price": 50,
    "features": [
      "Standard POL screw fitting (Female 5/8 inch LH)",
      "High off-take rate suitable for whole-home continuous demand",
      "Reliable sub-zero outdoor vaporisation performance",
      "Compatible with automatic 2-cylinder & 4-cylinder changeover valves"
    ],
    "suitable_for": [
      "Home Central Heating",
      "Gas Hobs & Cookers",
      "Domestic Water Heating",
      "Workshop Space Heaters"
    ],
    "images": [
      "/calor-propane-13kg.png"
    ]
  },
  {
    "slug": "calor-gas-butane-15kg-refill",
    "name": "Calor Gas Butane - 15kg Refill",
    "brand": "Calor",
    "price": 58.25,
    "stock": 35,
    "image_url": "/calor-butane-15kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Butane",
    "description": "15kg Butane gas cylinder refill for indoor portable room heaters and domestic gas appliances. Requires an empty cylinder exchange on delivery.",
    "usage_type": "DOMESTIC",
    "gas_type": "Butane",
    "cylinder_size": "15kg",
    "deposit_price": 39.99,
    "refill_price": 58.25,
    "features": [
      "21mm Easy-clip valve connection",
      "High-output clean-burning indoor room heating",
      "Standard UK cabinet heater cavity compatibility",
      "Long-lasting 15kg capacity for cold winter periods"
    ],
    "suitable_for": [
      "Portable Cabinet Heaters",
      "Living Room Mobile Heating",
      "Indoor Domestic Cookers"
    ],
    "images": [
      "/calor-butane-15kg.png"
    ]
  },
  {
    "slug": "calor-gas-butane-7kg-refill",
    "name": "Calor Gas Butane - 7kg Refill",
    "brand": "Calor",
    "price": 37,
    "stock": 28,
    "image_url": "/calor-butane-7kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Butane",
    "description": "7kg Butane gas cylinder refill for small portable heaters, camping stoves and indoor appliances. Requires an empty cylinder exchange on delivery.",
    "usage_type": "DOMESTIC",
    "gas_type": "Butane",
    "cylinder_size": "7kg",
    "deposit_price": 34.99,
    "refill_price": 37,
    "features": [
      "21mm Easy-clip valve connection",
      "Compact size for easy movement and smaller cabinet heaters",
      "Clean burning indoor butane flame"
    ],
    "suitable_for": [
      "Small Mobile Heaters",
      "Camping Stoves & Caravans",
      "Indoor Heating"
    ],
    "images": [
      "/calor-butane-7kg.png"
    ]
  },
  {
    "slug": "calor-patio-gas-13kg-refill",
    "name": "Calor Patio Gas - 13kg Refill",
    "brand": "Calor",
    "price": 52.5,
    "stock": 30,
    "image_url": "/calor-patio-13kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Patio Gas",
    "description": "Equipped with easy 27mm clip-on connector and built-in Gas Trac indicator for domestic BBQs and garden patio warmers.",
    "usage_type": "DOMESTIC",
    "gas_type": "Patio Gas",
    "cylinder_size": "13kg",
    "deposit_price": 44.99,
    "refill_price": 52.5,
    "features": [
      "27mm Quick clip-on regulator fitting",
      "Calor built-in Gas Trac level indicator to monitor fuel reserve",
      "Specially formulated propane for consistent flame in any weather",
      "Large capacity designed for multi-burner outdoor kitchens"
    ],
    "suitable_for": [
      "4-Burner+ Gas Barbecues",
      "Patio Tower Heaters",
      "Garden Fire Pits",
      "Outdoor Hospitality"
    ],
    "images": [
      "/calor-patio-13kg.png"
    ]
  },
  {
    "slug": "calor-patio-gas-5kg-refill",
    "name": "Calor Patio Gas - 5kg Refill",
    "brand": "Calor",
    "price": 23.25,
    "stock": 25,
    "image_url": "/calor-patio-5kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Patio Gas",
    "description": "Compact domestic patio gas cylinder for tabletop barbecues, small terrace warmers, and weekend garden cookouts.",
    "usage_type": "DOMESTIC",
    "gas_type": "Patio Gas",
    "cylinder_size": "5kg",
    "deposit_price": 34.99,
    "refill_price": 23.25,
    "features": [
      "27mm Quick clip-on regulator fitting",
      "Ultra-compact lightweight design for easy moving",
      "Calor Gas Trac gauge included",
      "Ideal for compact gardens, balconies, and tabletop grills"
    ],
    "suitable_for": [
      "Tabletop Barbecues",
      "Compact Patio Heaters",
      "Picnics & Garden Parties"
    ],
    "images": [
      "/calor-patio-5kg.png"
    ]
  },
  {
    "slug": "calor-gas-propane-6kg-refill",
    "name": "Calor Gas Propane - 6kg Refill",
    "brand": "Calor",
    "price": 32.9,
    "stock": 25,
    "image_url": "/calor-propane-6kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Propane",
    "description": "6kg Propane gas cylinder refill with standard POL screw connection for caravans, campervans and outdoor catering. Requires an empty cylinder exchange on delivery.",
    "usage_type": "DOMESTIC",
    "gas_type": "Propane",
    "cylinder_size": "6kg",
    "deposit_price": 34.99,
    "refill_price": 32.9,
    "features": [
      "Standard POL screw valve connection",
      "Lightweight steel casing for easy caravan locker loading",
      "All-weather sub-zero propane performance",
      "Compatible with caravan bulkhead regulators"
    ],
    "suitable_for": [
      "Touring Caravans",
      "Motorhomes & Campervans",
      "Camping Stoves",
      "Blowtorches"
    ],
    "images": [
      "/calor-propane-6kg.png"
    ]
  },
  {
    "slug": "904-refill",
    "name": "904 Refill",
    "brand": "Campingaz",
    "price": 39.95,
    "stock": 50,
    "image_url": "/campingaz-904-refill.png",
    "category_slug": "campingaz",
    "subcategory": "Refill",
    "description": "Campingaz 904 refillable butane gas cylinder (1.81kg) – compact and widely available across the UK and Europe for camping stoves and small barbecues.",
    "usage_type": "DOMESTIC",
    "gas_type": "Butane",
    "cylinder_size": "1.81kg",
    "deposit_price": 35,
    "refill_price": 39.95,
    "features": [
      "Standard Campingaz M16x1.5 internal valve",
      "Refillable exchange cylinder across UK & Europe",
      "Ultra-compact footprint for small camping setups and barbecues",
      "Safety self-sealing valve when disconnected"
    ],
    "suitable_for": [
      "Camping Stoves",
      "Small Barbecues",
      "Portable Outdoor Cooking"
    ],
    "images": [
      "/campingaz-904-refill.png"
    ]
  },
  {
    "slug": "907-refill",
    "name": "907 Refill",
    "brand": "Campingaz",
    "price": 44.25,
    "stock": 50,
    "image_url": "/campingaz-907-refill.png",
    "category_slug": "campingaz",
    "subcategory": "Refill",
    "description": "Campingaz 907 refillable butane gas cylinder (2.72kg) – popular high-capacity cylinder for camping, campervans, and portable gas appliances.",
    "usage_type": "DOMESTIC",
    "gas_type": "Butane",
    "cylinder_size": "2.72kg",
    "deposit_price": 35,
    "refill_price": 44.25,
    "features": [
      "Standard Campingaz M16x1.5 internal valve",
      "Refillable exchange cylinder across UK & Europe",
      "High capacity for extended camping trips and campervans",
      "Safety self-sealing valve when disconnected"
    ],
    "suitable_for": [
      "Camping Stoves",
      "Campervan Conversions",
      "Marine & Boating",
      "Portable Outdoor Cooking"
    ],
    "images": [
      "/campingaz-907-refill.png"
    ]
  },
  {
    "slug": "camping-gaz-party-grill-400",
    "name": "Camping Gaz Party Grill 400",
    "brand": "Campingaz",
    "price": 79.95,
    "stock": 25,
    "image_url": "/campingaz-party-grill-400.png",
    "category_slug": "campingaz",
    "subcategory": "Grill",
    "description": "Camping Gaz Party Grill 400 – essential camping companion offering stove, grill, griddle, and plancha cooking options with piezo ignition.",
    "usage_type": "DOMESTIC",
    "gas_type": "Appliance",
    "cylinder_size": "Multi-cooker Stove",
    "deposit_price": 0,
    "refill_price": 79.95,
    "features": [
      "Multi-cooking options: stove, grill, griddle and plancha",
      "Integrated piezo ignition for matchless lighting",
      "Runs on Campingaz 904 and 907 refillable cylinders",
      "Detachable legs and lockable lid for easy transport"
    ],
    "suitable_for": [
      "Camping & Caravanning",
      "Garden Picnics",
      "Outdoor Barbecues"
    ],
    "images": [
      "/campingaz-party-grill-400.png"
    ]
  },
  {
    "slug": "cp250-4-pack",
    "name": "CP250 4 Pack",
    "brand": "Campingaz",
    "price": 8.15,
    "stock": 100,
    "image_url": "/campingaz-cp250-4pack.png",
    "category_slug": "campingaz",
    "subcategory": "Gas Cartridges",
    "description": "Campingaz CP250 4 Pack – high-performance isobutane gas cartridges designed for Bistro stoves and Camp'Bistro portable cookers.",
    "usage_type": "DOMESTIC",
    "gas_type": "Isobutane",
    "cylinder_size": "4 x 220g Cartridges",
    "deposit_price": 0,
    "refill_price": 8.15,
    "features": [
      "4 x 220g isobutane gas cartridges",
      "Self-sealing safety valve for easy connection and disconnection",
      "Compatible with Campingaz Bistro, Festivio and Bistro 300 stoves"
    ],
    "suitable_for": [
      "Tabletop Stoves",
      "Camping Bistro Cookers",
      "Picnics & Day Trips"
    ],
    "images": [
      "/campingaz-cp250-4pack.png"
    ]
  },
  {
    "slug": "calor-gas-propane-47kg-refill",
    "name": "Calor Gas Propane - 47kg Refill",
    "brand": "Calor",
    "price": 113.5,
    "stock": 15,
    "image_url": "/calor-propane-47kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Propane",
    "description": "47kg Propane gas cylinder refill with standard POL screw connection for central heating packs, drying kilns and large commercial installations. Requires an empty cylinder exchange on delivery.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Propane",
    "cylinder_size": "47kg",
    "deposit_price": 69.99,
    "refill_price": 113.5,
    "features": [
      "Standard POL screw fitting (Female 5/8 inch LH)",
      "Largest cylinder in the Calor cylinder range",
      "High vaporisation rate for demanding commercial cooking & heating",
      "Ideal for multi-cylinder automatic changeover manifolds"
    ],
    "suitable_for": [
      "Whole-Home Off-Grid Heating",
      "Commercial Kitchens & Restaurants",
      "Holiday Parks & Lodges",
      "Agricultural Grain Dryers"
    ],
    "images": [
      "/calor-propane-47kg.png"
    ]
  },
  {
    "slug": "calor-gas-propane-19kg-refill",
    "name": "Calor Gas Propane - 19kg Refill",
    "brand": "Calor",
    "price": 62,
    "stock": 20,
    "image_url": "/calor-propane-19kg.png",
    "category_slug": "calor-gas",
    "subcategory": "Propane",
    "description": "19kg Propane gas cylinder refill with standard POL screw connection for commercial kitchens, catering trailers and space heaters. Requires an empty cylinder exchange on delivery.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Propane",
    "cylinder_size": "19kg",
    "deposit_price": 49.99,
    "refill_price": 62,
    "features": [
      "Standard POL screw fitting",
      "Versatile mid-capacity commercial format",
      "Heavy-duty commercial propane for high-heat equipment",
      "Mobile catering health & safety compliant"
    ],
    "suitable_for": [
      "Mobile Catering Trailers",
      "Bitumen & Roofing Boilers",
      "Site Blow Heaters",
      "Agricultural Sheds"
    ],
    "images": [
      "/calor-propane-19kg.png"
    ]
  },
  {
    "slug": "calor-18kg-flt-forklift-gas",
    "name": "Calor 18kg FLT Forklift Truck Gas",
    "brand": "Calor",
    "price": 62,
    "stock": 35,
    "image_url": "/safety_upright_v3.jpg",
    "category_slug": "calor-gas",
    "subcategory": "Propane",
    "description": "Liquid withdrawal FLT cylinder engineered specifically for industrial forklift trucks.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Forklift Gas",
    "cylinder_size": "18kg",
    "deposit_price": 49.99,
    "refill_price": 62,
    "features": [
      "Liquid withdrawal internal dip-tube design",
      "Standard quick-release FLT fitting",
      "Dedicated engine-grade LPG formulation",
      "Prevents cold engine stalling and regulator freezing"
    ],
    "suitable_for": [
      "Industrial Forklift Trucks",
      "Warehouse Material Handling",
      "Yard FLT Fleets"
    ],
    "images": [
      "/safety_upright_v3.jpg"
    ]
  },
  {
    "slug": "6-35kg-carbon-dioxide",
    "name": "6.35kg Carbon Dioxide",
    "brand": "Air Liquide",
    "price": 28.8,
    "stock": 25,
    "image_url": "/pub-gas-co2-0-35kg.png",
    "category_slug": "air-liquide",
    "subcategory": "CO2 / Carbon Dioxide",
    "description": "6.35kg food-grade Carbon Dioxide (CO2) cylinder for draught beer, cider and soft drinks dispense. Restricted to pub and licensed hospitality customers.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Pub Gas",
    "cylinder_size": "6.35kg",
    "deposit_price": 25,
    "refill_price": 28.8,
    "features": [
      "100% beverage grade Carbon Dioxide (CO2)",
      "Standard BS 341 No. 8 outlet connection",
      "Restricted to licensed hospitality & pub accounts",
      "Empty cylinder exchange required on delivery"
    ],
    "suitable_for": [
      "Pubs & Bars",
      "Draught Soft Drinks",
      "Craft Beer Dispense"
    ],
    "images": [
      "/pub-gas-co2-0-35kg.png"
    ]
  },
  {
    "slug": "10l-30-70-mixed-gas",
    "name": "10L 30/70 Mixed Gas",
    "brand": "Air Liquide",
    "price": 25.2,
    "stock": 30,
    "image_url": "/pub-gas-mixed-10l-30-70.png",
    "category_slug": "air-liquide",
    "subcategory": "Mixed Gas",
    "description": "10L 30% CO2 / 70% Nitrogen dispense gas mixture for creamy stouts, smooth ales and draught bitters. Restricted to pub and licensed hospitality customers.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Pub Gas",
    "cylinder_size": "10L",
    "deposit_price": 35,
    "refill_price": 25.2,
    "features": [
      "30% CO2 / 70% Nitrogen certified food-grade blend",
      "BS 341 No. 3 cellar valve standard",
      "Produces dense, creamy head on stouts and smooth beers",
      "Empty cylinder exchange required on delivery"
    ],
    "suitable_for": [
      "Guinness & Draught Stouts",
      "Smooth Creamflow Ales",
      "Pub Cellars"
    ],
    "images": [
      "/pub-gas-mixed-10l-30-70.png"
    ]
  },
  {
    "slug": "10l-50-50-mixed-gas",
    "name": "10L 50/50 Mixed Gas",
    "brand": "Air Liquide",
    "price": 27,
    "stock": 20,
    "image_url": "/pub-gas-mixed-10l-50-50.png",
    "category_slug": "air-liquide",
    "subcategory": "Mixed Gas",
    "description": "10L 50% CO2 / 50% Nitrogen dispense gas mixture for craft beers, ales and designated draught lines. Restricted to pub and licensed hospitality customers.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Pub Gas",
    "cylinder_size": "10L",
    "deposit_price": 35,
    "refill_price": 27,
    "features": [
      "50% CO2 / 50% Nitrogen certified beverage mixture",
      "BS 341 No. 3 cellar valve standard",
      "Optimised carbonation level for traditional and craft draught beers",
      "Empty cylinder exchange required on delivery"
    ],
    "suitable_for": [
      "Craft Breweries",
      "Draught Ales & Bitters",
      "Hotel & Restaurant Cellars"
    ],
    "images": [
      "/pub-gas-mixed-10l-50-50.png"
    ]
  },
  {
    "slug": "10l-60-40-mixed-gas",
    "name": "10L 60/40 Mixed Gas",
    "brand": "Air Liquide",
    "price": 28.8,
    "stock": 35,
    "image_url": "/pub-gas-mixed-10l-60-40.png",
    "category_slug": "air-liquide",
    "subcategory": "Mixed Gas",
    "description": "10L 60% CO2 / 40% Nitrogen dispense gas mixture for lagers, ciders and highly carbonated draught drinks. Restricted to pub and licensed hospitality customers.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Pub Gas",
    "cylinder_size": "10L",
    "deposit_price": 35,
    "refill_price": 28.8,
    "features": [
      "60% CO2 / 40% Nitrogen certified food-grade blend",
      "BS 341 No. 3 cellar valve standard",
      "Prevents fobbing and maintains crisp, lively carbonation on lagers",
      "Empty cylinder exchange required on delivery"
    ],
    "suitable_for": [
      "Draught Lagers",
      "Draught Ciders",
      "Pub & Nightclub Cellars"
    ],
    "images": [
      "/pub-gas-mixed-10l-60-40.png"
    ]
  },
  {
    "slug": "47l-30-70-mixed-gas",
    "name": "47L 30/70 Mixed Gas",
    "brand": "Air Liquide",
    "price": 68.4,
    "stock": 15,
    "image_url": "/pub-gas-mixed-47l-30-70.png",
    "category_slug": "air-liquide",
    "subcategory": "Mixed Gas",
    "description": "High-capacity 47L 30% CO2 / 70% Nitrogen dispense cylinder for busy pub cellars and high-turnover draught venues. Restricted to pub and licensed hospitality customers.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Pub Gas",
    "cylinder_size": "47L",
    "deposit_price": 55,
    "refill_price": 68.4,
    "features": [
      "High-capacity 47L vessel for multi-tap dispense systems",
      "30% CO2 / 70% Nitrogen certified blend",
      "Fewer cylinder changes during peak trading times",
      "Empty cylinder exchange required on delivery"
    ],
    "suitable_for": [
      "High-Volume Pubs & Stadiums",
      "Brewery Taprooms",
      "Event Venues"
    ],
    "images": [
      "/pub-gas-mixed-47l-30-70.png"
    ]
  },
  {
    "slug": "pub-gas-spanner-co2-and-mixed",
    "name": "Pub Gas Spanner (CO2 and Mixed)",
    "brand": "Stayte Pub Gas",
    "price": 5.95,
    "stock": 50,
    "image_url": "/pub-gas-spanner.png",
    "category_slug": "pub-gas",
    "subcategory": "Accessories",
    "description": "Heavy-duty dual-ended combination spanner designed for tightening and changing both CO2 and Mixed Gas cylinder regulator connections securely.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Hardware & Adapter",
    "cylinder_size": "Universal Tool",
    "deposit_price": 0,
    "refill_price": 5.95,
    "features": [
      "Dual-ended combination head for BS 341 No. 8 & No. 3 fittings",
      "Drop-forged industrial steel construction",
      "Prevents rounded regulator nuts and gas line leaks"
    ],
    "suitable_for": [
      "Cellar Technicians",
      "Pub Managers & Bar Staff",
      "Cellar Gas Maintenance"
    ],
    "images": [
      "/pub-gas-spanner.png"
    ]
  },
  {
    "slug": "mixed-gas-o-ring",
    "name": "Mixed Gas O-ring",
    "brand": "Stayte Pub Gas",
    "price": 1.5,
    "stock": 100,
    "image_url": "/pub-gas-mixed-oring.png",
    "category_slug": "pub-gas",
    "subcategory": "Accessories",
    "description": "Replacement sealing O-rings for Mixed Gas bottle valves and secondary regulators. Prevents cellar gas leaks and maintains optimal line pressure.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Hardware & Adapter",
    "cylinder_size": "Mixed Gas Seal",
    "deposit_price": 0,
    "refill_price": 1.5,
    "features": [
      "Heavy-duty nitrile rubber pressure-rated seal",
      "Direct fit for all 30/70, 50/50 and 60/40 mixed gas valves",
      "Essential preventative maintenance item for cellars"
    ],
    "suitable_for": [
      "Cellar Regulators",
      "Mixed Gas Cylinder Valves",
      "Gas Line Seals"
    ],
    "images": [
      "/pub-gas-mixed-oring.png"
    ]
  },
  {
    "slug": "co2-o-ring",
    "name": "CO2 O-ring",
    "brand": "Stayte Pub Gas",
    "price": 1.5,
    "stock": 100,
    "image_url": "/pub-gas-co2-oring.png",
    "category_slug": "pub-gas",
    "subcategory": "Accessories",
    "description": "High-durability sealing O-rings specifically sized for CO2 Carbon Dioxide cylinder valves and cellar regulators.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Hardware & Adapter",
    "cylinder_size": "CO2 Seal",
    "deposit_price": 0,
    "refill_price": 1.5,
    "features": [
      "Precision-machined high-durometer sealing ring",
      "Tight seal for high-pressure CO2 connections",
      "Eliminates audible hissing and bottle pressure drop"
    ],
    "suitable_for": [
      "CO2 Regulators",
      "Soft Drink Carbonators",
      "Cellar Gas Manifolds"
    ],
    "images": [
      "/pub-gas-co2-oring.png"
    ]
  },
  {
    "slug": "22-6kg-carbon-dioxide",
    "name": "22.6kg Carbon Dioxide",
    "brand": "Air Liquide",
    "price": 69,
    "stock": 20,
    "image_url": "/pub-gas-co2-22-6kg.png",
    "category_slug": "air-liquide",
    "subcategory": "CO2 / Carbon Dioxide",
    "description": "22.6kg food-grade Carbon Dioxide (CO2) cellar cylinder for high-volume soft drinks and draught beer dispense. Restricted to pub and licensed hospitality customers.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Pub Gas",
    "cylinder_size": "22.6kg",
    "deposit_price": 55,
    "refill_price": 69,
    "features": [
      "Food and beverage grade high-purity CO2",
      "BS 341 No. 8 connection standard",
      "Restricted to licensed hospitality & pub accounts",
      "Empty cylinder exchange required on delivery"
    ],
    "suitable_for": [
      "Multi-tap Pubs",
      "Post-mix Soda Fountains",
      "Busy Hotel Bars"
    ],
    "images": [
      "/pub-gas-co2-22-6kg.png"
    ]
  },
  {
    "slug": "34kg-carbon-dioxide",
    "name": "34kg Carbon Dioxide",
    "brand": "Air Liquide",
    "price": 97.2,
    "stock": 15,
    "image_url": "/pub-gas-co2-34kg.png",
    "category_slug": "air-liquide",
    "subcategory": "CO2 / Carbon Dioxide",
    "description": "Large 34kg industrial/commercial food-grade Carbon Dioxide cylinder for multi-line pub cellars, clubs and brewery taprooms. Restricted to pub and licensed hospitality customers.",
    "usage_type": "COMMERCIAL",
    "gas_type": "Pub Gas",
    "cylinder_size": "34kg",
    "deposit_price": 65,
    "refill_price": 97.2,
    "features": [
      "Maximum capacity beverage grade CO2 supply",
      "Standard BS 341 No. 8 valve connection",
      "Restricted to licensed hospitality & pub accounts",
      "Empty cylinder exchange required on delivery"
    ],
    "suitable_for": [
      "Large Nightclubs & Venues",
      "Breweries & Taprooms",
      "High-Volume Draught Systems"
    ],
    "images": [
      "/pub-gas-co2-34kg.png"
    ]
  },
  {
    "slug": "brazier-10kg",
    "name": "Brazier - 10kg",
    "brand": "Brazier",
    "price": 6.5,
    "stock": 50,
    "image_url": "/fuel-brazier-10kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Smokeless Fuel",
    "description": "Brazier smokeless fuel (10kg) – value for money smokeless fuel for open fires and multi-fuel stoves.",
    "usage_type": "DOMESTIC",
    "gas_type": "Solid Fuel",
    "cylinder_size": "10kg",
    "deposit_price": 0,
    "refill_price": 6.5,
    "features": [
      "Value for money smokeless fuel",
      "Ideal for open fires and stoves",
      "Clean burning & consistent heat"
    ],
    "suitable_for": [
      "Open Fires",
      "Multi-Fuel Stoves",
      "Room Heaters"
    ],
    "images": [
      "/fuel-brazier-10kg.png"
    ]
  },
  {
    "slug": "brazier-20kg",
    "name": "Brazier - 20kg",
    "brand": "Brazier",
    "price": 12.75,
    "stock": 45,
    "image_url": "/fuel-brazier-20kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Smokeless Fuel",
    "description": "Brazier smokeless fuel (20kg) – 24% hotter and produces up to 80% less smoke. Suitable for open fires and multi-fuel stoves.",
    "usage_type": "DOMESTIC",
    "gas_type": "Solid Fuel",
    "cylinder_size": "20kg",
    "deposit_price": 0,
    "refill_price": 12.75,
    "features": [
      "24% hotter output",
      "Produces up to 80% less smoke",
      "Long burning economy fuel"
    ],
    "suitable_for": [
      "Open Fires",
      "Multi-Fuel Stoves",
      "Closed Appliances"
    ],
    "images": [
      "/fuel-brazier-20kg.png"
    ]
  },
  {
    "slug": "coffee-bricks-7kg",
    "name": "Coffee Bricks - 7kg",
    "brand": "Homefire",
    "price": 7.75,
    "stock": 35,
    "image_url": "/fuel-coffee-bricks-7kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kindling & Heat Logs",
    "description": "Homefire Coffee Bricks (7kg) – eco-friendly briquettes made from recycled coffee grounds for open fires, chimineas and stoves.",
    "usage_type": "DOMESTIC",
    "gas_type": "Solid Fuel",
    "cylinder_size": "7kg",
    "deposit_price": 0,
    "refill_price": 7.75,
    "features": [
      "Made from recycled coffee grounds",
      "High heat output with pleasant aroma",
      "Eco-friendly sustainable alternative"
    ],
    "suitable_for": [
      "Open Fires",
      "Chimineas",
      "Multi-Fuel Stoves"
    ],
    "images": [
      "/fuel-coffee-bricks-7kg.png"
    ]
  },
  {
    "slug": "homefire-twizlers-wood-wool-natural-firelighters",
    "name": "Homefire Twizlers (Wood Wool) Natural Firelighters",
    "brand": "Homefire",
    "price": 2.3,
    "stock": 100,
    "image_url": "/fuel-homefire-twizlers.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kindling & Heat Logs",
    "description": "Homefire Twizlers wood wool firelighters – 100% natural, odorless and quick to light for open fires and multi-fuel stoves.",
    "usage_type": "DOMESTIC",
    "gas_type": "Firelighting",
    "cylinder_size": "",
    "deposit_price": 0,
    "refill_price": 2.3,
    "features": [
      "100% natural wood wool & wax",
      "Odourless & easy to light",
      "Reliable ignition for all solid fuels"
    ],
    "suitable_for": [
      "Fireplaces",
      "Log Burners",
      "BBQs & Firepits"
    ],
    "images": [
      "/fuel-homefire-twizlers.png"
    ]
  },
  {
    "slug": "kiln-dried-kindling",
    "name": "Kiln Dried Kindling",
    "brand": "Stayte Fuels",
    "price": 4,
    "stock": 80,
    "image_url": "/fuel-kiln-dried-kindling.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kindling & Heat Logs",
    "description": "Premium kiln dried kindling wood – ideal starter fuel for open fires, log burners and chimineas.",
    "usage_type": "DOMESTIC",
    "gas_type": "Kindling",
    "cylinder_size": "",
    "deposit_price": 0,
    "refill_price": 4,
    "features": [
      "Moisture content below 12%",
      "Fast ignition & clean burn",
      "Standard bag for convenient storage"
    ],
    "suitable_for": [
      "Open Fires",
      "Log Burners",
      "Chimineas & Pizza Ovens"
    ],
    "images": [
      "/fuel-kiln-dried-kindling.png"
    ]
  },
  {
    "slug": "stoveflame-original-25kg",
    "name": "Stoveflame Original 25kg",
    "brand": "National Coal",
    "price": 18.25,
    "stock": 40,
    "image_url": "/fuel-stoveflame-25kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Smokeless Fuel",
    "description": "Stoveflame Original 25kg smokeless fuel ovoids for multi-fuel stoves, roomheaters and boilers.",
    "usage_type": "DOMESTIC",
    "gas_type": "Solid Fuel",
    "cylinder_size": "25kg",
    "deposit_price": 0,
    "refill_price": 18.25,
    "features": [
      "Authorised smokeless fuel",
      "High radiant heat & low ash",
      "Consistent ovoid size"
    ],
    "suitable_for": [
      "Multi-Fuel Stoves",
      "Roomheaters",
      "Domestic Boilers"
    ],
    "images": [
      "/fuel-stoveflame-25kg.png"
    ]
  },
  {
    "slug": "taybrite-25kg",
    "name": "Taybrite - 25kg",
    "brand": "Taybrite",
    "price": 18.75,
    "stock": 40,
    "image_url": "/fuel-taybrite-25kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Smokeless Fuel",
    "description": "Taybrite 25kg multi-purpose economy smokeless fuel for room heaters, boilers and multi-fuel stoves.",
    "usage_type": "DOMESTIC",
    "gas_type": "Solid Fuel",
    "cylinder_size": "25kg",
    "deposit_price": 0,
    "refill_price": 18.75,
    "features": [
      "Multi-purpose economy briquette",
      "Long slumbering burn time",
      "Low residual ash content"
    ],
    "suitable_for": [
      "Multi-Fuel Stoves",
      "Room Heaters",
      "Gravity Feed Boilers"
    ],
    "images": [
      "/fuel-taybrite-25kg.png"
    ]
  },
  {
    "slug": "homefire-25kg",
    "name": "Homefire - 25kg",
    "brand": "Homefire",
    "price": 21.15,
    "stock": 50,
    "image_url": "/fuel-homefire-25kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Smokeless Fuel",
    "description": "Homefire 25kg premier smokeless coal for open fires and multi-fuel stoves. Up to 33% more heat and burns for up to 9 hours.",
    "usage_type": "DOMESTIC",
    "gas_type": "Solid Fuel",
    "cylinder_size": "25kg",
    "deposit_price": 0,
    "refill_price": 21.15,
    "features": [
      "Up to 33% more heat than ordinary coal",
      "Lasts up to 9 hours",
      "Attractive flame picture on open fires"
    ],
    "suitable_for": [
      "Open Fires",
      "Multi-Fuel Stoves",
      "Rayburns & Cookers"
    ],
    "images": [
      "/fuel-homefire-25kg.png"
    ]
  },
  {
    "slug": "net-of-logs-approx-10kg",
    "name": "Net of Logs - Approx 10kg",
    "brand": "Stayte Fuels",
    "price": 5.25,
    "stock": 60,
    "image_url": "/fuel-net-of-logs-10kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kiln Dried Logs",
    "description": "Net bag of seasoned hardwood logs (approx 10kg) for open fireplaces and wood-burning stoves.",
    "usage_type": "DOMESTIC",
    "gas_type": "Firewood",
    "cylinder_size": "approx 10kg",
    "deposit_price": 0,
    "refill_price": 5.25,
    "features": [
      "Seasoned premium hardwood",
      "Convenient net bag packaging",
      "Ready to burn certified"
    ],
    "suitable_for": [
      "Open Fireplaces",
      "Wood-burning Stoves",
      "Fire Pits"
    ],
    "images": [
      "/fuel-net-of-logs-10kg.png"
    ]
  },
  {
    "slug": "homefire-kiln-dried-logs-approx-8kg",
    "name": "Homefire Kiln Dried Logs - Approx 8kg",
    "brand": "Homefire",
    "price": 8,
    "stock": 45,
    "image_url": "/fuel-homefire-kiln-dried-logs-8kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kiln Dried Logs",
    "description": "Homefire premium kiln dried hardwood logs (approx 8kg) – Ready to Burn certified with moisture content under 20%.",
    "usage_type": "DOMESTIC",
    "gas_type": "Firewood",
    "cylinder_size": "approx 8kg",
    "deposit_price": 0,
    "refill_price": 8,
    "features": [
      "100% FSC certified kiln dried hardwood",
      "Moisture below 20%",
      "Maximum heat output with minimal smoke"
    ],
    "suitable_for": [
      "Modern Woodstoves",
      "Open Grates",
      "Pizza Ovens"
    ],
    "images": [
      "/fuel-homefire-kiln-dried-logs-8kg.png"
    ]
  },
  {
    "slug": "pre-packed-paraffin-4l",
    "name": "Pre-packed Paraffin 4L",
    "brand": "Barrettine",
    "price": 10,
    "stock": 30,
    "image_url": "/fuel-pre-packed-paraffin-4l.png",
    "category_slug": "coal-fuels",
    "subcategory": "Liquid Fuel",
    "description": "Barrettine premium pre-packed paraffin (4 Litres) for greenhouse heaters, domestic paraffin heaters and lamps.",
    "usage_type": "DOMESTIC",
    "gas_type": "Liquid Fuel",
    "cylinder_size": "4L",
    "deposit_price": 0,
    "refill_price": 10,
    "features": [
      "High grade clean-burning paraffin",
      "Child-safe sealed container",
      "Ideal for horticulture and mobile heating"
    ],
    "suitable_for": [
      "Greenhouse Heaters",
      "Paraffin Stoves",
      "Pressure Lamps"
    ],
    "images": [
      "/fuel-pre-packed-paraffin-4l.png"
    ]
  },
  {
    "slug": "instant-lighting-firelog-single",
    "name": "Instant Lighting Firelog - Single",
    "brand": "Big K",
    "price": 2,
    "stock": 75,
    "image_url": "/fuel-instant-lighting-firelog.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kindling & Heat Logs",
    "description": "Big K instant lighting firelog (single) – just light the wrapper for up to 2 hours of warm ambient fire.",
    "usage_type": "DOMESTIC",
    "gas_type": "Firelog",
    "cylinder_size": "",
    "deposit_price": 0,
    "refill_price": 2,
    "features": [
      "Single wrapper lighting",
      "Burns for up to 2 hours",
      "No mess & no kindling needed"
    ],
    "suitable_for": [
      "Open Hearth Fires",
      "Chimineas",
      "Outdoor Fire Pits"
    ],
    "images": [
      "/fuel-instant-lighting-firelog.png"
    ]
  },
  {
    "slug": "heat-logs-hollow-wrapped-pack-of-12",
    "name": "Heat Logs Hollow - wrapped pack of 12",
    "brand": "Big K",
    "price": 7.35,
    "stock": 50,
    "image_url": "/fuel-heat-logs-hollow-12.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kindling & Heat Logs",
    "description": "Hollow heat logs (wrapped pack of 12) – high-density compressed sawdust logs. Maximum 10 packs per order.",
    "usage_type": "DOMESTIC",
    "gas_type": "Heat Logs",
    "cylinder_size": "Pack of 12",
    "deposit_price": 0,
    "refill_price": 7.35,
    "features": [
      "100% recycled high-density sawdust",
      "Hollow core for optimal airflow",
      "Max order limit: 10 packs"
    ],
    "suitable_for": [
      "Stoves",
      "Log Burners",
      "Open Grates"
    ],
    "images": [
      "/fuel-heat-logs-hollow-12.png"
    ]
  },
  {
    "slug": "net-of-kindling-approx-5kg",
    "name": "Net of Kindling - Approx 5kg",
    "brand": "Stayte Fuels",
    "price": 4.45,
    "stock": 60,
    "image_url": "/fuel-net-of-kindling-5kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kindling & Heat Logs",
    "description": "Net bag of dry kindling sticks (approx 5kg) for lighting log fires and stoves effortlessly.",
    "usage_type": "DOMESTIC",
    "gas_type": "Kindling",
    "cylinder_size": "approx 5kg",
    "deposit_price": 0,
    "refill_price": 4.45,
    "features": [
      "Large approx 5kg economical net",
      "Kiln dried for rapid ignition",
      "Clean uniform sticks"
    ],
    "suitable_for": [
      "Fireplaces",
      "Woodstoves",
      "Campfires"
    ],
    "images": [
      "/fuel-net-of-kindling-5kg.png"
    ]
  },
  {
    "slug": "instant-lighting-charcoal-2kg",
    "name": "Instant Lighting Charcoal - 2kg",
    "brand": "Big K",
    "price": 4.5,
    "stock": 45,
    "image_url": "/fuel-instant-lighting-charcoal-2kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Charcoal & BBQ",
    "description": "Big K instant lighting charcoal (2kg pack) – ready to cook in 20 minutes with no firelighters required.",
    "usage_type": "DOMESTIC",
    "gas_type": "BBQ Fuel",
    "cylinder_size": "2kg",
    "deposit_price": 0,
    "refill_price": 4.5,
    "features": [
      "No lighter fluid needed",
      "Ready in 20 minutes",
      "Includes two 1kg inner bags"
    ],
    "suitable_for": [
      "Kettle BBQs",
      "Charcoal Grills",
      "Picnic BBQs"
    ],
    "images": [
      "/fuel-instant-lighting-charcoal-2kg.png"
    ]
  },
  {
    "slug": "heat-log-blocks-pack-of-8",
    "name": "Heat Log Blocks - Pack of 8",
    "brand": "CPL",
    "price": 3.85,
    "stock": 40,
    "image_url": "/fuel-heat-log-blocks-8.png",
    "category_slug": "coal-fuels",
    "subcategory": "Kindling & Heat Logs",
    "description": "CPL high energy ultra dry heat log blocks (pack of 8) for open fires, chimineas and multi-fuel stoves.",
    "usage_type": "DOMESTIC",
    "gas_type": "Heat Logs",
    "cylinder_size": "Pack of 8",
    "deposit_price": 0,
    "refill_price": 3.85,
    "features": [
      "High energy compressed wood briquettes",
      "Ultra low moisture content",
      "Minimal ash output"
    ],
    "suitable_for": [
      "Open Fires",
      "Multi-Fuel Stoves",
      "Chimineas"
    ],
    "images": [
      "/fuel-heat-log-blocks-8.png"
    ]
  },
  {
    "slug": "lumpwood-charcoal-4kg",
    "name": "Lumpwood Charcoal - 4kg",
    "brand": "Homefire",
    "price": 5.6,
    "stock": 50,
    "image_url": "/fuel-lumpwood-charcoal-4kg.png",
    "category_slug": "coal-fuels",
    "subcategory": "Charcoal & BBQ",
    "description": "Homefire 100% natural lumpwood charcoal (4kg) – fast lighting, high heat for authentic barbecue flavor.",
    "usage_type": "DOMESTIC",
    "gas_type": "BBQ Fuel",
    "cylinder_size": "4kg",
    "deposit_price": 0,
    "refill_price": 5.6,
    "features": [
      "100% natural lumpwood charcoal",
      "High cooking temperatures",
      "Imparts rich smoky BBQ flavor"
    ],
    "suitable_for": [
      "Barbecues",
      "Smokers",
      "Ceramic Grills"
    ],
    "images": [
      "/fuel-lumpwood-charcoal-4kg.png"
    ]
  },
  {
    "slug": "small-instant-barbecue",
    "name": "Small Instant Barbecue",
    "brand": "Kingfisher",
    "price": 3,
    "stock": 40,
    "image_url": "/fuel-small-instant-bbq.png",
    "category_slug": "coal-fuels",
    "subcategory": "Charcoal & BBQ",
    "description": "Kingfisher instant disposable barbecue – all in one pack, easy to light, ready in 20 minutes, burns for up to 1.5 hours.",
    "usage_type": "DOMESTIC",
    "gas_type": "BBQ Fuel",
    "cylinder_size": "",
    "deposit_price": 0,
    "refill_price": 3,
    "features": [
      "All-in-one single use barbecue tray",
      "Stand included",
      "Cooks for up to 1.5 hours"
    ],
    "suitable_for": [
      "Camping",
      "Picnics",
      "Day Trips & Festivals"
    ],
    "images": [
      "/fuel-small-instant-bbq.png"
    ]
  },
  {
    "slug": "large-party-barbecue",
    "name": "Large Party Barbecue",
    "brand": "Big K",
    "price": 7.15,
    "stock": 35,
    "image_url": "/fuel-large-party-bbq.png",
    "category_slug": "coal-fuels",
    "subcategory": "Charcoal & BBQ",
    "description": "Big K party size disposable instant BBQ – extra-large cooking surface for family gatherings and outdoor parties.",
    "usage_type": "DOMESTIC",
    "gas_type": "BBQ Fuel",
    "cylinder_size": "",
    "deposit_price": 0,
    "refill_price": 7.15,
    "features": [
      "Extra-large grill surface",
      "Quick lighting formula",
      "Burns hotter and longer for party crowds"
    ],
    "suitable_for": [
      "Garden Parties",
      "Family Gatherings",
      "Outdoor Events"
    ],
    "images": [
      "/fuel-large-party-bbq.png"
    ]
  },
  {
    "slug": "bbq-lighter-fluid-1l",
    "name": "BBQ Lighter Fluid 1L",
    "brand": "Big K",
    "price": 4,
    "stock": 60,
    "image_url": "/fuel-bbq-lighter-fluid-1l.png",
    "category_slug": "coal-fuels",
    "subcategory": "Charcoal & BBQ",
    "description": "Big K premium barbecue lighting fluid (1 Litre bottle) with safety cap for charcoal barbecues.",
    "usage_type": "DOMESTIC",
    "gas_type": "Firelighting",
    "cylinder_size": "1L",
    "deposit_price": 0,
    "refill_price": 4,
    "features": [
      "Clean lighting formula",
      "Child-resistant safety cap",
      "Directional nozzle for precise application"
    ],
    "suitable_for": [
      "Charcoal Grills",
      "BBQ Chimneys",
      "Outdoor Firepits"
    ],
    "images": [
      "/fuel-bbq-lighter-fluid-1l.png"
    ]
  },
  {
    "slug": "marine-halibut-groundbait-1kg",
    "name": "Marine Halibut Groundbait 1kg",
    "brand": "Dynamite Baits",
    "price": 5,
    "stock": 50,
    "image_url": "/bait-marine-halibut-groundbait-1kg.png",
    "category_slug": "dynamite-baits",
    "subcategory": "Groundbait",
    "description": "High energy marine halibut groundbait (1kg) – specially formulated with marine halibut attractants for coarse and match angling.",
    "usage_type": "DOMESTIC",
    "gas_type": "Fishing Bait",
    "cylinder_size": "1kg",
    "deposit_price": 0,
    "refill_price": 5,
    "features": [
      "High energy marine halibut formula",
      "Packed with attractants and amino acids",
      "Ideal for method feeder and balling in"
    ],
    "suitable_for": [
      "Carp & Coarse Fishing",
      "Method Feeders",
      "Match Angling"
    ],
    "images": [
      "/bait-marine-halibut-groundbait-1kg.png"
    ]
  },
  {
    "slug": "marine-halibut-method-mix-2kg",
    "name": "Marine Halibut Method Mix - 2kg",
    "brand": "Dynamite Baits",
    "price": 7.3,
    "stock": 50,
    "image_url": "/bait-marine-halibut-method-mix-2kg.png",
    "category_slug": "dynamite-baits",
    "subcategory": "Groundbait",
    "description": "High energy marine halibut method mix (2kg) – big carp range with proven attraction and binding properties for method feeders.",
    "usage_type": "DOMESTIC",
    "gas_type": "Fishing Bait",
    "cylinder_size": "2kg",
    "deposit_price": 0,
    "refill_price": 7.3,
    "features": [
      "Specially designed for method and open-end feeders",
      "Fast breakdown releasing attractive scent trail",
      "High protein marine halibut recipe"
    ],
    "suitable_for": [
      "Big Carp Fishing",
      "Commercial Fisheries",
      "Feeder Work"
    ],
    "images": [
      "/bait-marine-halibut-method-mix-2kg.png"
    ]
  },
  {
    "slug": "swim-stim-carp-groundbait-amino-black-900g",
    "name": "Swim Stim Carp Groundbait - Amino Black - 900g",
    "brand": "Dynamite Baits",
    "price": 4.25,
    "stock": 50,
    "image_url": "/bait-swim-stim-carp-groundbait-amino-black-900g.png",
    "category_slug": "dynamite-baits",
    "subcategory": "Groundbait",
    "description": "Swim Stim carp groundbait amino black (900g) – advanced koi technology groundbait with amino acids and dark finish for wary fish.",
    "usage_type": "DOMESTIC",
    "gas_type": "Fishing Bait",
    "cylinder_size": "900g",
    "deposit_price": 0,
    "refill_price": 4.25,
    "features": [
      "Advanced Koi feed technology & amino blend",
      "Dark black color for clear waters and pressured fish",
      "Versatile groundbait, paste or method mix"
    ],
    "suitable_for": [
      "Clear Water Angling",
      "Pressured Carp",
      "Match & Pole Fishing"
    ],
    "images": [
      "/bait-swim-stim-carp-groundbait-amino-black-900g.png"
    ]
  },
  {
    "slug": "no-mess-wild-bird-seed-20kg",
    "name": "No Mess Wild Bird Seed 20kg",
    "brand": "Countrywide",
    "price": 28.25,
    "stock": 50,
    "image_url": "/feed-no-mess-wild-bird-seed-20kg.png",
    "category_slug": "animal-feed",
    "subcategory": "Wild Bird Food",
    "description": "Countrywide No Mess Wild Bird Seed (20kg) – husk-free premium seed mix to attract wild birds without garden waste.",
    "usage_type": "DOMESTIC",
    "gas_type": "Animal Feed",
    "cylinder_size": "20kg",
    "deposit_price": 0,
    "refill_price": 28.25,
    "features": [
      "100% edible husk-free formulation",
      "Prevents lawn debris and seed growth under feeders",
      "High protein energy blend for garden songbirds"
    ],
    "suitable_for": [
      "Wild Birds",
      "Garden Bird Feeders",
      "Ground Feeding"
    ],
    "images": [
      "/feed-no-mess-wild-bird-seed-20kg.png"
    ]
  },
  {
    "slug": "summer-wild-bird-20kg",
    "name": "Summer Wild Bird 20kg",
    "brand": "Countrywide",
    "price": 13.7,
    "stock": 50,
    "image_url": "/feed-summer-wild-bird-20kg.png",
    "category_slug": "animal-feed",
    "subcategory": "Wild Bird Food",
    "description": "Countrywide Summer Season Wild Bird Food (20kg) – specially formulated high-energy blend for garden birds during warm breeding months.",
    "usage_type": "DOMESTIC",
    "gas_type": "Animal Feed",
    "cylinder_size": "20kg",
    "deposit_price": 0,
    "refill_price": 13.7,
    "features": [
      "Balanced summer maintenance seed blend",
      "Essential nutrients for breeding adults & fledglings",
      "Suitable for bird tables, tubes and ground trays"
    ],
    "suitable_for": [
      "Wild Birds",
      "Bird Tables",
      "Garden Feeders"
    ],
    "images": [
      "/feed-summer-wild-bird-20kg.png"
    ]
  },
  {
    "slug": "autarky-mature-lite-chicken-12kg",
    "name": "Autarky Mature Lite - Chicken 12kg",
    "brand": "Autarky",
    "price": 25.2,
    "stock": 50,
    "image_url": "/feed-autarky-mature-lite-chicken-12kg.png",
    "category_slug": "animal-feed",
    "subcategory": "Dog Food",
    "description": "Autarky Mature Lite Complete Dog Food with Delicious Chicken (12kg) – 100% natural goodness with added herbs for senior and weight-conscious dogs.",
    "usage_type": "DOMESTIC",
    "gas_type": "Animal Feed",
    "cylinder_size": "12kg",
    "deposit_price": 0,
    "refill_price": 25.2,
    "features": [
      "Natural joint care package (glucosamine & herbs)",
      "Reduced calorie formula for senior dogs",
      "Wheat-gluten free recipe"
    ],
    "suitable_for": [
      "Senior Dogs",
      "Weight Control",
      "Mature Working Dogs"
    ],
    "images": [
      "/feed-autarky-mature-lite-chicken-12kg.png"
    ]
  },
  {
    "slug": "autarky-puppy-junior-chicken-12kg",
    "name": "Autarky Puppy/Junior - Chicken 12kg",
    "brand": "Autarky",
    "price": 29.3,
    "stock": 50,
    "image_url": "/feed-autarky-puppy-junior-chicken-12kg.png",
    "category_slug": "animal-feed",
    "subcategory": "Dog Food",
    "description": "Autarky Puppy/Junior Complete Dog Food with Delicious Chicken (12kg) – hypoallergenic recipe with prebiotics and minerals for healthy puppy development.",
    "usage_type": "DOMESTIC",
    "gas_type": "Animal Feed",
    "cylinder_size": "12kg",
    "deposit_price": 0,
    "refill_price": 29.3,
    "features": [
      "Optimum calcium-to-phosphorus ratio for bone growth",
      "Prebiotics for healthy gut digestion",
      "Smaller bite-sized kibble"
    ],
    "suitable_for": [
      "Puppies (2-12 Months)",
      "Junior Working Dogs",
      "Nursing Mothers"
    ],
    "images": [
      "/feed-autarky-puppy-junior-chicken-12kg.png"
    ]
  },
  {
    "slug": "autarky-adult-salmon-12kg",
    "name": "Autarky Adult - Salmon 12kg",
    "brand": "Autarky",
    "price": 26,
    "stock": 50,
    "image_url": "/feed-autarky-adult-salmon-12kg.png",
    "category_slug": "animal-feed",
    "subcategory": "Dog Food",
    "description": "Autarky Adult Complete Dog Food with Succulent Salmon (12kg) – rich in Omega 3 fatty acids, wheat-gluten free for active adult working dogs.",
    "usage_type": "DOMESTIC",
    "gas_type": "Animal Feed",
    "cylinder_size": "12kg",
    "deposit_price": 0,
    "refill_price": 26,
    "features": [
      "Rich in Omega 3 fatty acids for healthy skin & glossy coat",
      "Natural antioxidants and prebiotics",
      "Hypoallergenic wheat-gluten free blend"
    ],
    "suitable_for": [
      "Adult Working Dogs",
      "Sensitive Skin & Stomachs",
      "Active Sporting Breeds"
    ],
    "images": [
      "/feed-autarky-adult-salmon-12kg.png"
    ]
  },
  {
    "slug": "bulk-lpg-tank-fill-agricultural",
    "name": "Bulk LPG Tank Fill (Commercial / Agricultural)",
    "brand": "Stayte Bulk LPG",
    "price": 780,
    "stock": 50,
    "image_url": "/own_vehicle_fleet_truck_1787408938768.jpg",
    "category_slug": "bulk-gas",
    "subcategory": "Bulk Tank Supply",
    "description": "Bulk road tanker metered delivery directly into on-site bulk storage vessels across Gloucestershire.",
    "usage_type": "BULK",
    "gas_type": "Bulk Propane",
    "cylinder_size": "1,000L - 4,000L Vessel",
    "deposit_price": 0,
    "refill_price": 780,
    "features": [
      "Direct metered bulk road tanker pump delivery",
      "On-site bulk vessel replenishment across Gloucestershire",
      "Telemetry tank monitoring & automatic top-ups available",
      "Lowest cost per litre for high-volume commercial users"
    ],
    "suitable_for": [
      "Poultry & Livestock Rearing",
      "Crop & Grain Drying",
      "Commercial Glasshouses",
      "Large Rural Estates"
    ],
    "images": [
      "/own_vehicle_fleet_truck_1787408938768.jpg",
      "/photorealistic_lpg_truck_hero_1787400698764.jpg"
    ]
  },
  {
    "slug": "bulk-autogas-tanker-supply",
    "name": "Bulk Autogas Forecourt Tanker Supply",
    "brand": "Stayte Bulk LPG",
    "price": 1450,
    "stock": 30,
    "image_url": "/photorealistic_lpg_truck_hero_1787400698764.jpg",
    "category_slug": "bulk-gas",
    "subcategory": "Bulk Autogas",
    "description": "Scheduled road tanker delivery for commercial fleet depots and forecourt autogas dispensers.",
    "usage_type": "BULK",
    "gas_type": "Autogas",
    "cylinder_size": "5,000L Vessel",
    "deposit_price": 0,
    "refill_price": 1450,
    "features": [
      "High-flow metered tanker transfer",
      "Automotive grade EN 589 certified LPG fuel",
      "Commercial fleet bunkering & depot tanks",
      "Scheduled contracted deliveries with emergency backup"
    ],
    "suitable_for": [
      "Forecourt Fuel Stations",
      "Commercial Fleet Depots",
      "Taxi & Van Operators",
      "Local Authority Vehicles"
    ],
    "images": [
      "/photorealistic_lpg_truck_hero_1787400698764.jpg"
    ]
  },
  {
    "slug": "forecourt-vehicle-autogas-refuelling",
    "name": "Forecourt Vehicle Autogas Refuelling (Per Litre)",
    "brand": "John Stayte Services",
    "price": 0.89,
    "stock": 5000,
    "image_url": "/photorealistic_lpg_truck_hero_1787400698764.jpg",
    "category_slug": "vehicle-lpg-autogas",
    "subcategory": "Forecourt Autogas Refuelling",
    "description": "Direct pump-dispensed Automotive LPG fuel for bi-fuel and dedicated LPG cars, taxis, and vans at our Gloucestershire service stations.",
    "usage_type": "AUTOGAS",
    "gas_type": "Autogas (Automotive LPG)",
    "cylinder_size": "Per Litre Forecourt Dispensed",
    "deposit_price": 0,
    "refill_price": 0.89,
    "features": [
      "EN 589 compliant automotive grade LPG fuel",
      "High octane 105+ for smooth engine performance and low emissions",
      "Available at Fromebridge and Wild Goose Garage forecourts",
      "Compatible with all UK bayonet filler nozzles"
    ],
    "suitable_for": [
      "LPG Cars & Taxis",
      "Bi-fuel Vans & Light Commercials",
      "Motorhomes & Campervan Refillable Autogas Tanks"
    ],
    "images": [
      "/photorealistic_lpg_truck_hero_1787400698764.jpg"
    ]
  },
  {
    "slug": "commercial-fleet-autogas-account",
    "name": "Commercial Fleet Vehicle Autogas Account (Metered Keycard)",
    "brand": "John Stayte Services",
    "price": 0.84,
    "stock": 10000,
    "image_url": "/station.jpg",
    "category_slug": "vehicle-lpg-autogas",
    "subcategory": "Commercial Fleet LPG Refuelling",
    "description": "Commercial fleet autogas account for local businesses, delivery fleets, and taxi operators with weekly itemised invoicing and keycard pump access.",
    "usage_type": "AUTOGAS",
    "gas_type": "Autogas (Automotive LPG)",
    "cylinder_size": "Per Litre Fleet Account",
    "deposit_price": 0,
    "refill_price": 0.84,
    "features": [
      "Dedicated fleet driver RFID keycard access",
      "Discounted commercial fleet tariff per litre",
      "Weekly consolidated VAT invoicing",
      "24/7 automated forecourt refuelling authorization"
    ],
    "suitable_for": [
      "Commercial Van Fleets",
      "Taxi & Private Hire Operators",
      "Municipal & Utility Vehicles"
    ],
    "images": [
      "/station.jpg"
    ]
  },
  {
    "slug": "uk-bayonet-to-euro-autogas-adapter-kit",
    "name": "UK Bayonet to Euro Dish & ACME Autogas Adapter Kit",
    "brand": "John Stayte Services",
    "price": 24.99,
    "stock": 60,
    "image_url": "/service_bulk_supply.jpg",
    "category_slug": "vehicle-lpg-autogas",
    "subcategory": "Autogas Adapters & Connectors",
    "description": "Solid brass precision-machined vehicle LPG refuelling adapter kit for travelling between the UK and Continental Europe.",
    "usage_type": "AUTOGAS",
    "gas_type": "Hardware & Adapter",
    "cylinder_size": "Standard Fitting Kit",
    "deposit_price": 0,
    "refill_price": 24.99,
    "features": [
      "High-grade solid brass construction with leak-proof seals",
      "Converts UK W21.8 bayonet filler to European Dish & ACME",
      "Protective storage pouch included",
      "Tested to 30 bar pressure rating"
    ],
    "suitable_for": [
      "European Touring Vehicles",
      "Motorhomes & Campervans",
      "Imported LPG Vehicles"
    ],
    "images": [
      "/service_bulk_supply.jpg"
    ]
  },
  {
    "slug": "compact-double-burner-stove",
    "name": "Compact Double Burner Stove",
    "brand": "SunnGas",
    "price": 20,
    "stock": 1,
    "image_url": "/camping-compact-double-burner.png",
    "category_slug": "gas-appliances",
    "subcategory": "Camping",
    "description": "Compact Double Burner Stove, compact size and high performance. Quality construction that works from butane or propane.",
    "usage_type": "DOMESTIC",
    "gas_type": "Butane or Propane",
    "cylinder_size": "Portable Appliance",
    "deposit_price": 0,
    "refill_price": 20,
    "features": [
      "Compact Double Burner Stove, compact size and high performance",
      "Quality construction that works from butane or propane",
      "Model: CCKE210",
      "Manufactured by SunnGas"
    ],
    "suitable_for": [
      "Camping & Caravanning",
      "Outdoor Cooking",
      "Picnics & Festivals"
    ],
    "images": [
      "/camping-compact-double-burner.png"
    ]
  },
  {
    "slug": "free-standing-patio-heater",
    "name": "Free Standing Patio Heater",
    "brand": "Bonningtons",
    "price": 60.95,
    "stock": 20,
    "image_url": "/patio-heater-free-standing.png",
    "category_slug": "gas-appliances",
    "subcategory": "Patio Heaters",
    "description": "Free Standing Patio Heater – versatile infrared quartz electric garden heater with 3 heat settings, adjustable pole height, and heavy stable base.",
    "deposit_price": 0,
    "refill_price": 60.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/patio-heater-free-standing.png"
    ]
  },
  {
    "slug": "outdoor-bbq-fire-pit-heater",
    "name": "Outdoor BBQ Fire Pit Heater",
    "brand": "Bonningtons",
    "price": 69.65,
    "stock": 25,
    "image_url": "/bbq-outdoor-fire-pit-heater.png",
    "category_slug": "gas-appliances",
    "subcategory": "Barbecues",
    "description": "Outdoor BBQ Fire Pit Heater – dual-purpose garden fire pit with stainless steel outer ring, safety spark mesh guard, and barbecue cooking grate.",
    "deposit_price": 0,
    "refill_price": 69.65,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-outdoor-fire-pit-heater.png"
    ]
  },
  {
    "slug": "patio-heater-outdoor-fire-pit",
    "name": "OUTDOOR BBQ FIRE PIT HEATER",
    "brand": "Bonningtons",
    "price": 69.65,
    "stock": 25,
    "image_url": "/patio-heater-outdoor-fire-pit.png",
    "category_slug": "gas-appliances",
    "subcategory": "Patio Heaters",
    "description": "OUTDOOR BBQ FIRE PIT HEATER – dual-purpose circular garden fire pit and barbecue with spark mesh guard, chrome cooking grill, and heat-resistant finish.",
    "deposit_price": 0,
    "refill_price": 69.65,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/patio-heater-outdoor-fire-pit.png"
    ]
  },
  {
    "slug": "outdoor-gas-patio-heater",
    "name": "Outdoor Gas Patio Heater",
    "brand": "Bonningtons",
    "price": 162,
    "stock": 12,
    "image_url": "/patio-heater-outdoor-gas-tall.png",
    "category_slug": "gas-appliances",
    "subcategory": "Patio Heaters",
    "description": "Outdoor Gas Patio Heater – classic tall outdoor mushroom heater with powder-coated green finish, integrated cylinder enclosure, and electronic ignition.",
    "deposit_price": 0,
    "refill_price": 162,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/patio-heater-outdoor-gas-tall.png"
    ]
  },
  {
    "slug": "outdoor-table-top-patio-heater",
    "name": "Outdoor Table Top Patio Heater",
    "brand": "Bonningtons",
    "price": 74,
    "stock": 16,
    "image_url": "/patio-heater-table-top.png",
    "category_slug": "gas-appliances",
    "subcategory": "Patio Heaters",
    "description": "Outdoor Table Top Patio Heater – compact garden dining table heater with stainless steel burner, safety guard, and anti-tilt mechanism.",
    "deposit_price": 0,
    "refill_price": 74,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/patio-heater-table-top.png"
    ]
  },
  {
    "slug": "smoker-bbq",
    "name": "Smoker BBQ",
    "brand": "Bonningtons",
    "price": 149,
    "stock": 20,
    "image_url": "/bbq-smoker.png",
    "category_slug": "gas-appliances",
    "subcategory": "Barbecues",
    "description": "Smoker BBQ – premium offset smoker and charcoal barbecue with front access door, chimney damper, and spacious lower storage shelf.",
    "deposit_price": 0,
    "refill_price": 149,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-smoker.png"
    ]
  },
  {
    "slug": "camping-206l",
    "name": "Camping 206L",
    "brand": "Campingaz",
    "price": 12,
    "stock": 20,
    "image_url": "/camping-206l.png",
    "category_slug": "campingaz",
    "subcategory": "Camping",
    "description": "Campingaz Camping 206L – high-power 80W portable camping gas lantern with globe protection guard and integrated carry handle.",
    "deposit_price": 0,
    "refill_price": 12,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/camping-206l.png"
    ]
  },
  {
    "slug": "camping-206s",
    "name": "Camping 206S",
    "brand": "Campingaz",
    "price": 10,
    "stock": 25,
    "image_url": "/camping-206s.png",
    "category_slug": "campingaz",
    "subcategory": "Camping",
    "description": "Campingaz Camping 206S – compact 1250W single burner portable camping stove with wide pan supports and stable cartridge base.",
    "deposit_price": 0,
    "refill_price": 10,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/camping-206s.png"
    ]
  },
  {
    "slug": "camp-bistro-3-camping-gas-stove",
    "name": "Camp Bistro 3 Camping Gas Stove",
    "brand": "Campingaz",
    "price": 20.5,
    "stock": 30,
    "image_url": "/camping-camp-bistro-3.png",
    "category_slug": "campingaz",
    "subcategory": "Camping",
    "description": "Campingaz Camp Bistro 3 Camping Gas Stove – classic tabletop portable gas cooker with automatic piezo ignition and durable carry case included.",
    "deposit_price": 0,
    "refill_price": 20.5,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/camping-camp-bistro-3.png"
    ]
  },
  {
    "slug": "instaflam-stove",
    "name": "Instaflam Stove",
    "brand": "Campingaz",
    "price": 3.5,
    "stock": 40,
    "image_url": "/camping-instaflam-stove.png",
    "category_slug": "campingaz",
    "subcategory": "Camping",
    "description": "Instaflam Stove – ultra-compact lightweight backpacking gas stove with fold-out pan supports and fine flame control knob.",
    "deposit_price": 0,
    "refill_price": 3.5,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/camping-instaflam-stove.png"
    ]
  },
  {
    "slug": "camping-chef-cv-gas-stove",
    "name": "Camping Chef CV Gas Stove",
    "brand": "Campingaz",
    "price": 44.95,
    "stock": 15,
    "image_url": "/camping-chef-cv.png",
    "category_slug": "campingaz",
    "subcategory": "Camping",
    "description": "Campingaz Camping Chef CV Gas Stove – powerful double burner camping cooker with central downward radiant toaster grill.",
    "deposit_price": 0,
    "refill_price": 44.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/camping-chef-cv.png"
    ]
  },
  {
    "slug": "ultimate-entertainment",
    "name": "Ultimate Entertainment",
    "brand": "Char-Broil",
    "price": 1300,
    "stock": 8,
    "image_url": "/bbq-ultimate-entertainment.png",
    "category_slug": "char-broil",
    "subcategory": "Outdoor Kitchen",
    "description": "Char-Broil Ultimate Entertainment Module – outdoor kitchen preparation station featuring running-water sink faucet, integrated ice bucket / cooler, and storage drawers.",
    "deposit_price": 0,
    "refill_price": 1300,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-ultimate-entertainment.png"
    ]
  },
  {
    "slug": "ultimate-3200",
    "name": "Ultimate 3200",
    "brand": "Char-Broil",
    "price": 1300,
    "stock": 6,
    "image_url": "/bbq-ultimate-3200.png",
    "category_slug": "char-broil",
    "subcategory": "Outdoor Kitchen",
    "description": "Char-Broil Ultimate 3200 – premium 3-burner outdoor kitchen barbecue island crafted from marine-grade 304 stainless steel with granite-look countertop.",
    "deposit_price": 0,
    "refill_price": 1300,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-ultimate-3200.png"
    ]
  },
  {
    "slug": "ultimate-bbq-package",
    "name": "Ultimate BBQ Package",
    "brand": "Char-Broil",
    "price": 3100,
    "stock": 4,
    "image_url": "/bbq-ultimate-package.png",
    "category_slug": "char-broil",
    "subcategory": "Outdoor Kitchen",
    "description": "Char-Broil Ultimate BBQ Package – complete L-shaped luxury modular outdoor kitchen including Ultimate 3200 Grill, Entertainment Sink Module, and Corner Unit.",
    "deposit_price": 0,
    "refill_price": 3100,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-ultimate-package.png"
    ]
  },
  {
    "slug": "ultimate-corner-module",
    "name": "Ultimate Corner Module",
    "brand": "Char-Broil",
    "price": 565,
    "stock": 10,
    "image_url": "/bbq-ultimate-corner-module.png",
    "category_slug": "char-broil",
    "subcategory": "Outdoor Kitchen",
    "description": "Char-Broil Ultimate Corner Module – 90-degree connecting corner unit with granite worktop and double-door storage cabinet for custom outdoor kitchen layouts.",
    "deposit_price": 0,
    "refill_price": 565,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-ultimate-corner-module.png"
    ]
  },
  {
    "slug": "performance-pro-s-3",
    "name": "Performance Pro S 3",
    "brand": "Char-Broil",
    "price": 0,
    "stock": 10,
    "image_url": "/bbq-performance-pro-s-3.png",
    "category_slug": "char-broil",
    "subcategory": "Barbecues",
    "description": "Char-Broil Performance Pro S 3 – 3-burner TRU-Infrared gas barbecue with stainless steel hood, side burner, and cast iron grates.",
    "deposit_price": 0,
    "refill_price": 0,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-performance-pro-s-3.png"
    ]
  },
  {
    "slug": "professional-core-b-3",
    "name": "Professional Core B 3",
    "brand": "Char-Broil",
    "price": 0,
    "stock": 10,
    "image_url": "/bbq-professional-core-b-3.png",
    "category_slug": "char-broil",
    "subcategory": "Barbecues",
    "description": "Char-Broil Professional Core B 3 – premium 3-burner black finish gas barbecue with TRU-Infrared cooking system and electronic SureFire ignition.",
    "deposit_price": 0,
    "refill_price": 0,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-professional-core-b-3.png"
    ]
  },
  {
    "slug": "professional-core-b-4",
    "name": "Professional Core B 4",
    "brand": "Char-Broil",
    "price": 0,
    "stock": 8,
    "image_url": "/bbq-professional-core-b-4.png",
    "category_slug": "char-broil",
    "subcategory": "Barbecues",
    "description": "Char-Broil Professional Core B 4 – extra-large 4-burner gas barbecue with side burner, cast iron grates, and high-heat sear burner.",
    "deposit_price": 0,
    "refill_price": 0,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-professional-core-b-4.png"
    ]
  },
  {
    "slug": "professional-pro-s-2",
    "name": "Professional Pro S 2",
    "brand": "Char-Broil",
    "price": 459,
    "stock": 15,
    "image_url": "/bbq-professional-pro-s-2.png",
    "category_slug": "char-broil",
    "subcategory": "Barbecues",
    "description": "Char-Broil Professional Pro S 2 – compact 2-burner stainless steel barbecue featuring patented TRU-Infrared cooking system for 50% juicier food.",
    "deposit_price": 0,
    "refill_price": 459,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-professional-pro-s-2.png"
    ]
  },
  {
    "slug": "professional-pro-s-3",
    "name": "Professional Pro S 3",
    "brand": "Char-Broil",
    "price": 665,
    "stock": 12,
    "image_url": "/bbq-professional-pro-s-3.png",
    "category_slug": "char-broil",
    "subcategory": "Barbecues",
    "description": "Char-Broil Professional Pro S 3 – 3-burner stainless steel gas barbecue with high-power sear burner, LED illuminated control knobs, and TRU-Infrared technology.",
    "deposit_price": 0,
    "refill_price": 665,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-professional-pro-s-3.png"
    ]
  },
  {
    "slug": "smart-e",
    "name": "Smart-E",
    "brand": "Char-Broil",
    "price": 599,
    "stock": 15,
    "image_url": "/bbq-smart-e.png",
    "category_slug": "char-broil",
    "subcategory": "Electric Grills",
    "description": "Char-Broil SMART-E – 100% electric barbecue delivering true grill performance without gas or charcoal. SMART PRECISION temperature control from 90°C to 370°C.",
    "deposit_price": 0,
    "refill_price": 599,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-smart-e.png"
    ]
  },
  {
    "slug": "oil-drum-charcoal-bbq",
    "name": "Oil Drum Charcoal BBQ",
    "brand": "Kingfisher",
    "price": 72,
    "stock": 20,
    "image_url": "/bbq-oil-drum-charcoal.png",
    "category_slug": "kingfisher",
    "subcategory": "Barbecues",
    "description": "Kingfisher classic oil drum style charcoal barbecue with wide grilling area and warming rack.",
    "deposit_price": 0,
    "refill_price": 72,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/bbq-oil-drum-charcoal.png"
    ]
  },
  {
    "slug": "lifestyle-catalytic",
    "name": "Lifestyle Catalytic",
    "brand": "Lifestyle Appliances",
    "price": 142.95,
    "stock": 15,
    "image_url": "/heater-lifestyle-catalytic.png",
    "category_slug": "lifestyle-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Lifestyle Catalytic portable gas heater (Made in EU) with catalytic panel for clean, odourless, gentle radiant heat.",
    "deposit_price": 0,
    "refill_price": 142.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-lifestyle-catalytic.png"
    ]
  },
  {
    "slug": "lifestyle-mini-black",
    "name": "Lifestyle Mini Black",
    "brand": "Lifestyle Appliances",
    "price": 99.95,
    "stock": 20,
    "image_url": "/heater-lifestyle-mini-black.png",
    "category_slug": "lifestyle-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Lifestyle Mini Black portable radiant cabinet heater featuring 3 heat settings, piezo ignition and robust castor wheels.",
    "deposit_price": 0,
    "refill_price": 99.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-lifestyle-mini-black.png"
    ]
  },
  {
    "slug": "lifestyle-mini-red",
    "name": "Lifestyle Mini Red",
    "brand": "Lifestyle Appliances",
    "price": 99.95,
    "stock": 20,
    "image_url": "/heater-lifestyle-mini-red.png",
    "category_slug": "lifestyle-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Lifestyle Mini Red portable radiant cabinet heater in striking gloss red with ODS safety protection and castors.",
    "deposit_price": 0,
    "refill_price": 99.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-lifestyle-mini-red.png"
    ]
  },
  {
    "slug": "13kw-heat-focus-patio-heater-charcoal",
    "name": "13kW Heat Focus Patio Heater Charcoal",
    "brand": "Sahara",
    "price": 199.99,
    "stock": 12,
    "image_url": "/patio-heater-13kw-charcoal.png",
    "category_slug": "sahara",
    "subcategory": "Patio Heaters",
    "description": "Sahara 13kW Heat Focus patio heater in sleek charcoal finish featuring revolutionary adjustable reflector to direct heat exactly where needed.",
    "deposit_price": 0,
    "refill_price": 199.99,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/patio-heater-13kw-charcoal.png"
    ]
  },
  {
    "slug": "15kw-heat-focus-patio-heater-white",
    "name": "15kW Heat Focus Patio Heater White",
    "brand": "Sahara",
    "price": 319.99,
    "stock": 8,
    "image_url": "/patio-heater-15kw-white.png",
    "category_slug": "sahara",
    "subcategory": "Patio Heaters",
    "description": "Sahara 15kW heavy duty Heat Focus patio heater in gloss white with weighted base, wheels and focusable heat reflector.",
    "deposit_price": 0,
    "refill_price": 319.99,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/patio-heater-15kw-white.png"
    ]
  },
  {
    "slug": "lifestyle-catalytic-mobile-heater",
    "name": "Lifestyle Catalytic",
    "brand": "Lifestyle",
    "price": 142.95,
    "stock": 12,
    "image_url": "/heater-lifestyle-catalytic.png",
    "category_slug": "gas-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Lifestyle Catalytic Mobile Gas Heater – clean-burning catalytic heating with 3.0 kW heat output, integrated piezo ignition, and oxygen depletion safety system.",
    "deposit_price": 0,
    "refill_price": 142.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-lifestyle-catalytic.png"
    ]
  },
  {
    "slug": "lifestyle-mini-black-mobile-heater",
    "name": "Lifestyle Mini Black",
    "brand": "Lifestyle",
    "price": 99.95,
    "stock": 15,
    "image_url": "/heater-lifestyle-mini-black.png",
    "category_slug": "gas-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Lifestyle Mini Black Mobile Gas Heater – compact portable cabinet heater with 3 heat settings up to 4.2 kW, castors for easy mobility, and safety flame failure device.",
    "deposit_price": 0,
    "refill_price": 99.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-lifestyle-mini-black.png"
    ]
  },
  {
    "slug": "lifestyle-mini-red-mobile-heater",
    "name": "Lifestyle Mini Red",
    "brand": "Lifestyle",
    "price": 99.95,
    "stock": 15,
    "image_url": "/heater-lifestyle-mini-red.png",
    "category_slug": "gas-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Lifestyle Mini Red Mobile Gas Heater – stylish compact red cabinet heater with variable heat settings, ODS safety cut-off, and easy cylinder loading.",
    "deposit_price": 0,
    "refill_price": 99.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-lifestyle-mini-red.png"
    ]
  },
  {
    "slug": "manhatten-living-flame-mobile-heater",
    "name": "Manhatten Living Flame",
    "brand": "Universal Innovations",
    "price": 269.99,
    "stock": 8,
    "image_url": "/heater-manhatten-living-flame.png",
    "category_slug": "gas-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Manhatten Living Flame Mobile Gas Heater – contemporary living flame stove design with real dancing flames, coals effect, 3.4 kW heat output, and safety shut-off.",
    "deposit_price": 0,
    "refill_price": 269.99,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-manhatten-living-flame.png"
    ]
  },
  {
    "slug": "phoenix-cabinet-heater",
    "name": "Phoenix Cabinet Heater",
    "brand": "Phoenix",
    "price": 99.99,
    "stock": 14,
    "image_url": "/heater-phoenix-cabinet.png",
    "category_slug": "gas-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Phoenix Cabinet Heater – dependable high-efficiency 4.2 kW portable infrared gas heater with 3 heat settings, ergonomic handles, and swivel castors.",
    "deposit_price": 0,
    "refill_price": 99.99,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-phoenix-cabinet.png"
    ]
  },
  {
    "slug": "provence-flame-effect-heater",
    "name": "Provence Flame Effect Heater",
    "brand": "Universal Innovations",
    "price": 340,
    "stock": 6,
    "image_url": "/heater-provence-flame-effect.png",
    "category_slug": "gas-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Provence Flame Effect Heater – traditional rustic cast iron style gas stove heater with genuine living flame effect, 3.0 kW max heat output, and no chimney required.",
    "deposit_price": 0,
    "refill_price": 340,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-provence-flame-effect.png"
    ]
  },
  {
    "slug": "superheat-model-h46-mobile-heater",
    "name": "Superheat Model H46",
    "brand": "Superheat",
    "price": 129.95,
    "stock": 10,
    "image_url": "/heater-superheat-model-h46.png",
    "category_slug": "gas-appliances",
    "subcategory": "Mobile Heaters",
    "description": "Superheat Model H46 Portable Gas Heater – heavy-duty 4.2 kW ceramic radiant heater with rotary control, oxygen depletion sensor, and robust steel body.",
    "deposit_price": 0,
    "refill_price": 129.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/heater-superheat-model-h46.png"
    ]
  },
  {
    "slug": "bleuet-cv270l",
    "name": "Bleuet CV270L",
    "brand": "Campingaz",
    "price": 10,
    "stock": 18,
    "image_url": "/camping-bleuet-cv270l.png",
    "category_slug": "gas-appliances",
    "subcategory": "Camping",
    "description": "Campingaz Bleuet CV270L – reliable outdoor gas lantern with frosted globe for soft diffused campsite illumination, using Easy Clic Plus connection.",
    "deposit_price": 0,
    "refill_price": 10,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/camping-bleuet-cv270l.png"
    ]
  },
  {
    "slug": "bleuet-cv270s",
    "name": "Bleuet CV270S",
    "brand": "Campingaz",
    "price": 7,
    "stock": 22,
    "image_url": "/camping-bleuet-cv270s.png",
    "category_slug": "gas-appliances",
    "subcategory": "Camping",
    "description": "Campingaz Bleuet CV270S – 1200W pocket-sized camping gas burner with Easy Clic cartridge connection and rugged serrated pan support arms.",
    "deposit_price": 0,
    "refill_price": 7,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/camping-bleuet-cv270s.png"
    ]
  },
  {
    "slug": "sylvagrow-multi-purpose-compost-15l",
    "name": "SylvaGrow® Multi-Purpose Compost 15L",
    "brand": "Melcourt",
    "price": 2.5,
    "stock": 50,
    "image_url": "/garden-sylvagrow-15l.png",
    "category_slug": "garden",
    "subcategory": "Compost",
    "description": "Melcourt SylvaGrow® Multi-Purpose Compost (15L) – 100% peat-free professional quality compost ideal for potting, containers, hanging baskets, and garden planting.",
    "deposit_price": 0,
    "refill_price": 2.5,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/garden-sylvagrow-15l.png"
    ]
  },
  {
    "slug": "sylvagrow-multi-purpose-compost-40l",
    "name": "SylvaGrow® Multi-Purpose Compost 40L",
    "brand": "Melcourt",
    "price": 6.5,
    "stock": 60,
    "image_url": "/garden-sylvagrow-40l.png",
    "category_slug": "garden",
    "subcategory": "Compost",
    "description": "Melcourt SylvaGrow® Multi-Purpose Compost (40L) – premium 100% peat-free growing medium endorsed by the RHS for seed sowing, pricking out, potting, and bed planting.",
    "deposit_price": 0,
    "refill_price": 6.5,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/garden-sylvagrow-40l.png"
    ]
  },
  {
    "slug": "sylvagrow-organic-planter",
    "name": "SylvaGrow Organic Planter",
    "brand": "Melcourt",
    "price": 5.25,
    "stock": 35,
    "image_url": "/garden-sylvagrow-planter.png",
    "category_slug": "garden",
    "subcategory": "Planters",
    "description": "Melcourt SylvaGrow® Organic Planter – 100% peat-free deep grow bag planter enriched with balanced organic nutrients, ideal for tomatoes, peppers, cucumbers, and salad crops.",
    "deposit_price": 0,
    "refill_price": 5.25,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/garden-sylvagrow-planter.png"
    ]
  },
  {
    "slug": "melcourt-decorative-bark-large-nuggets-mulch-60l",
    "name": "Melcourt Decorative Bark Large Nuggets Mulch 60L",
    "brand": "Melcourt",
    "price": 10.3,
    "stock": 45,
    "image_url": "/garden-melcourt-bark-60l.png",
    "category_slug": "garden",
    "subcategory": "Bark & Mulch",
    "description": "Melcourt Decorative Bark Large Nuggets Mulch (60L) – long-lasting British chunky pine bark mulch for decorative borders, moisture retention, weed suppression, and garden landscape paths.",
    "deposit_price": 0,
    "refill_price": 10.3,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/garden-melcourt-bark-60l.png"
    ]
  },
  {
    "slug": "free-range-eggs",
    "name": "Free Range Eggs",
    "brand": "Local Produce",
    "price": 1.95,
    "stock": 10,
    "image_url": "/food-free-range-eggs.png",
    "category_slug": "food",
    "subcategory": "Local Forecourt Produce",
    "description": "Free range eggs - half a dozen.",
    "deposit_price": 0,
    "refill_price": 1.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/food-free-range-eggs.png"
    ]
  },
  {
    "slug": "low-pressure-butane-regulator",
    "name": "Low Pressure Butane Regulator",
    "brand": "Clesse",
    "price": 8.99,
    "stock": 50,
    "image_url": "/spares-butane-regulator-low-pressure.png",
    "category_slug": "gas-spares",
    "subcategory": "Butane Regulators",
    "description": "Low pressure butane gas regulator with screw fitting for standard UK butane cylinders.",
    "deposit_price": 0,
    "refill_price": 8.99,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/spares-butane-regulator-low-pressure.png"
    ]
  },
  {
    "slug": "low-pressure-clip-on-regulator-21mm",
    "name": "Low Pressure Clip-On Regulator 21mm",
    "brand": "Clesse",
    "price": 8.99,
    "stock": 50,
    "image_url": "/spares-butane-clip-on-21mm.png",
    "category_slug": "gas-spares",
    "subcategory": "Butane Regulators",
    "description": "Low pressure 21mm clip-on butane gas regulator for Calor and standard 21mm butane cylinders.",
    "deposit_price": 0,
    "refill_price": 8.99,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/spares-butane-clip-on-21mm.png"
    ]
  },
  {
    "slug": "low-pressure-propane-regulator",
    "name": "Low Pressure Propane Regulator",
    "brand": "Clesse",
    "price": 8.99,
    "stock": 50,
    "image_url": "/spares-propane-regulator-low-pressure.png",
    "category_slug": "gas-spares",
    "subcategory": "Propane Regulators",
    "description": "Low pressure propane gas regulator with POL male screw fitting for domestic and light commercial propane bottles.",
    "deposit_price": 0,
    "refill_price": 8.99,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/spares-propane-regulator-low-pressure.png"
    ]
  },
  {
    "slug": "low-pressure-propane-clip-on-regulator-27mm",
    "name": "Low Pressure Propane Clip-On Regulator 27mm",
    "brand": "Clesse",
    "price": 10.5,
    "stock": 50,
    "image_url": "/spares-propane-clip-on-27mm.png",
    "category_slug": "gas-spares",
    "subcategory": "Propane Regulators",
    "description": "Low pressure 27mm clip-on propane gas regulator specifically engineered for Patio Gas cylinders and BBQs.",
    "deposit_price": 0,
    "refill_price": 10.5,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/spares-propane-clip-on-27mm.png"
    ]
  },
  {
    "slug": "compact-800-acov-opso-2-pack",
    "name": "Compact 800 Acov (OPSO) - 2 Pack",
    "brand": "Clesse",
    "price": 140,
    "stock": 20,
    "image_url": "/spares-compact-800-acov-2pack.png",
    "category_slug": "gas-spares",
    "subcategory": "Changeover Valves",
    "description": "Compact 800 automatic changeover valve (OPSO) 2-cylinder pack with pigtail hoses and bracket for off-grid propane systems.",
    "deposit_price": 0,
    "refill_price": 140,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/spares-compact-800-acov-2pack.png"
    ]
  },
  {
    "slug": "compact-800-acov-opso-4-pack",
    "name": "Compact 800 Acov (OPSO) - 4 Pack",
    "brand": "Clesse",
    "price": 199.95,
    "stock": 15,
    "image_url": "/spares-compact-800-acov-4pack.png",
    "category_slug": "gas-spares",
    "subcategory": "Changeover Valves",
    "description": "Compact 800 automatic changeover valve (OPSO) 4-cylinder pack with multi-bottle pigtail manifolds for whole-house propane heating.",
    "deposit_price": 0,
    "refill_price": 199.95,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/spares-compact-800-acov-4pack.png"
    ]
  },
  {
    "slug": "single-axle-unbraked-box-trailer",
    "name": "Single Axle Unbraked Box Trailer",
    "brand": "John Stayte Trailers",
    "price": 895,
    "stock": 5,
    "image_url": "/trailers-cat.jpg",
    "category_slug": "trailers",
    "subcategory": "Domestic Trailers",
    "description": "",
    "deposit_price": 0,
    "refill_price": 895,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/trailers-cat.jpg"
    ]
  },
  {
    "slug": "heavy-duty-twin-axle-commercial-trailer",
    "name": "Heavy-Duty Twin-Axle Commercial Trailer",
    "brand": "John Stayte Trailers",
    "price": 1850,
    "stock": 3,
    "image_url": "/trailers-cat.jpg",
    "category_slug": "trailers",
    "subcategory": "Commercial Trailers",
    "description": "",
    "deposit_price": 0,
    "refill_price": 1850,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/trailers-cat.jpg"
    ]
  },
  {
    "slug": "hi-vis-waterproof-traffic-jacket",
    "name": "Hi-Vis Waterproof Traffic Jacket",
    "brand": "Stayte Workwear",
    "price": 39.5,
    "stock": 40,
    "image_url": "/workwear-cat.jpg",
    "category_slug": "workwear",
    "subcategory": "High-Visibility Outerwear",
    "description": "",
    "deposit_price": 0,
    "refill_price": 39.5,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/workwear-cat.jpg"
    ]
  },
  {
    "slug": "steel-toe-cap-dealer-work-boots",
    "name": "Steel Toe Cap Dealer Work Boots",
    "brand": "Stayte Workwear",
    "price": 48,
    "stock": 35,
    "image_url": "/workwear-cat.jpg",
    "category_slug": "workwear",
    "subcategory": "Safety Footwear & PPE",
    "description": "",
    "deposit_price": 0,
    "refill_price": 48,
    "gas_type": "Propane",
    "cylinder_size": "",
    "usage_type": "DOMESTIC",
    "features": [],
    "suitable_for": [],
    "images": [
      "/workwear-cat.jpg"
    ]
  }
];

export async function syncFullCatalogToSupabase(supabaseClient: any): Promise<{
  categoriesSynced: number;
  productsSynced: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let categoriesSynced = 0;
  let productsSynced = 0;

  try {
    // 1. Upsert Categories
    for (const cat of CANONICAL_CATEGORIES) {
      try {
        const { error } = await supabaseClient.from("categories").upsert(
          {
            slug: cat.slug,
            name: cat.name,
            icon: cat.icon || "Flame",
            subcategories: cat.subcategories || [],
            description: cat.description || "",
            image_url: cat.image_url,
            display_order: cat.display_order,
            is_active: cat.is_active !== false,
          },
          { onConflict: "slug" }
        );
        if (error) {
          errors.push(`Category ${cat.name}: ${error.message}`);
        } else {
          categoriesSynced++;
        }
      } catch (err: any) {
        errors.push(`Category ${cat.name}: ${err.message}`);
      }
    }

    // 2. Fetch all category records to map category_id
    const { data: dbCats } = await supabaseClient.from("categories").select("id, slug");
    const catMap = new Map<string, string>();
    if (dbCats) {
      dbCats.forEach((c: any) => catMap.set(c.slug, c.id));
    }

    // 3. Upsert Products
    for (const prod of CANONICAL_PRODUCTS) {
      try {
        const categoryId = catMap.get(prod.category_slug) || null;
        const isGas =
          prod.category_slug === "gas" ||
          prod.category_slug === "pub-gas" ||
          prod.category_slug === "bulk-gas" ||
          prod.category_slug === "vehicle-lpg-autogas" ||
          prod.category_slug === "campingaz" ||
          Boolean(prod.gas_type);

        const specsPayload = {
          usage_type: prod.usage_type || "DOMESTIC",
          gas_type: prod.gas_type || (isGas ? "Propane" : "General"),
          cylinder_size: prod.cylinder_size || "",
          deposit_price: Number(prod.deposit_price ?? 0),
          refill_price: Number(prod.refill_price ?? prod.price),
          delivery_charge: 0,
          is_gas_product: isGas,
          is_active: true,
          images: prod.images && prod.images.length > 0 ? prod.images : [prod.image_url],
          features: prod.features || [],
          suitable_for: prod.suitable_for || [],
        };

        const { error } = await supabaseClient.from("products").upsert(
          {
            slug: prod.slug,
            name: prod.name,
            brand: prod.brand || "Calor",
            category_id: categoryId,
            category_slug: prod.category_slug || "gas",
            subcategory: prod.subcategory || "General",
            price: Number(prod.price),
            stock: Number(prod.stock || 25),
            image_url: prod.image_url,
            description: prod.description || "",
            specs: specsPayload,
          },
          { onConflict: "slug" }
        );

        if (error) {
          errors.push(`Product ${prod.name}: ${error.message}`);
        } else {
          productsSynced++;
        }
      } catch (err: any) {
        errors.push(`Product ${prod.name}: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`General sync error: ${err.message}`);
  }

  return { categoriesSynced, productsSynced, errors };
}

