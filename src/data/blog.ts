import guideSafeStorage from "@/assets/guide-safe-storage.jpg";
import guidePropaneVsButane from "@/assets/guide-propane-vs-butane.jpg";
import guideSmokelessFuel from "@/assets/guide-smokeless-fuel.jpg";
import bbqPro3 from "@/assets/char_broil_professionalpro3_1.jpg";
import calorCylindersStudio from "@/assets/calor-cylinders-studio.jpg";
import heroImg from "@/assets/hero-delivery.jpg";
import safetyKeepFlammableAway from "@/assets/safety-keep-flammable-away.png";
import safetyCylinderUpright from "@/assets/safety-cylinder-upright.png";
import safetyMeasuresInfographic from "@/assets/safety-measures-infographic.png";
import gasCylinderSafetyPhoto from "@/assets/gas-cylinder-safety-measures.jpg";

export {
  safetyKeepFlammableAway,
  safetyCylinderUpright,
  safetyMeasuresInfographic,
  gasCylinderSafetyPhoto,
};

export type BlogSection = {
  id: string;
  title: string;
  content: string;
  bullets?: string[];
  callout?: {
    type: "info" | "warning" | "tip" | "danger";
    title: string;
    message: string;
  };
  table?: {
    headers: string[];
    rows: string[][];
  };
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type VisualSafetyTip = {
  title: string;
  explanation: string;
  image: string;
  alt: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  aliases?: string[];
  title: string;
  date: string;
  updatedAt?: string;
  tag: string;
  category: "Safety" | "Tips" | "News" | "Guides" | "Regulations";
  readingTime: string;
  author: {
    name: string;
    role: string;
  };
  excerpt: string;
  heroImage: string;
  summary: string;
  quickRules?: string[];
  storageChecklist?: string[];
  visualTips?: VisualSafetyTip[];
  whatNotToDo?: string[];
  ifYouSmellGas?: string[];
  disclaimer?: string;
  sections: BlogSection[];
  checklist?: {
    title: string;
    items: string[];
  };
  faqs?: BlogFaq[];
  relatedSlugs?: string[];
};

export const blogArticles: BlogPost[] = [
  {
    id: "post-1",
    slug: "safe-cylinder-storage",
    aliases: ["how-to-store-gas-cylinders-safely-at-home", "gas-cylinder-safety-measures"],
    title: "Gas Cylinder Safety Measures",
    date: "2026-06-14",
    updatedAt: "2026-07-01",
    tag: "Safety Guide",
    category: "Safety",
    readingTime: "4 min read",
    author: {
      name: "John Stayte Safety Team",
      role: "Certified LPG Specialists",
    },
    excerpt:
      "Essential UK safety rules for storing propane, butane and patio gas cylinders safely outdoors, upright and well-ventilated.",
    heroImage: gasCylinderSafetyPhoto,
    summary:
      "Safe storage of LPG cylinders helps protect your home, family and neighbours. Follow these simple guidelines when storing propane and butane cylinders.",
    quickRules: [
      "Keep cylinders upright at all times",
      "Store cylinders outdoors or in a well-ventilated area",
      "Keep cylinders away from flames, sparks and heat sources",
      "Never store cylinders in enclosed living spaces",
      "Keep children and pets away from cylinders",
      "Check hoses, regulators and connections regularly",
      "Never smoke near LPG cylinders",
      "Close the cylinder valve when not in use",
    ],
    storageChecklist: [
      "Upright and stable",
      "Well ventilated",
      "Away from ignition sources",
      "Away from combustible materials",
      "Valve protected",
      "Hose and regulator checked",
      "No visible leaks or damage",
    ],
    visualTips: [
      {
        title: "Keep LPG Cylinders Away From Flammable Materials",
        explanation:
          "Keep cylinders clear of flames, sparks, combustible materials, oil, paint, and potential heat sources to prevent fire hazards.",
        image: safetyKeepFlammableAway,
        alt: "Keep flammable objects away from your LPG cylinder safety rule graphic",
      },
      {
        title: "Always Keep Your Cylinder Upright",
        explanation:
          "LPG cylinders must always stand vertically with the valve at the top. Never store or operate a bottle on its side.",
        image: safetyCylinderUpright,
        alt: "Always keep your cylinder upright safety graphic showing correct vertical position vs incorrect horizontal position",
      },
      {
        title: "Gas Cylinder Safety Measures Checklist",
        explanation:
          "Follow proper handling, early detection protocols, regular hose inspections, child safety, and emergency ventilation procedures.",
        image: safetyMeasuresInfographic,
        alt: "Gas cylinder safety measures visual infographic checklist",
      },
    ],
    whatNotToDo: [
      "Never smoke near a cylinder",
      "Never store LPG beside open flames",
      "Never keep cylinders in poorly ventilated rooms",
      "Never attempt to repair a damaged cylinder yourself",
      "Never ignore the smell of gas",
    ],
    ifYouSmellGas: [
      "Do not switch electrical switches on or off",
      "Extinguish flames if safe to do so",
      "Close the cylinder valve if it is safe",
      "Move to fresh air",
      "Contact the appropriate emergency/service provider",
    ],
    disclaimer:
      "Always follow the safety instructions supplied with your cylinder and applicable local regulations. If you are unsure about safe storage or detect a damaged cylinder, contact a qualified professional.",
    sections: [
      {
        id: "why-safe-storage-matters",
        title: "1. Why safe storage matters",
        content:
          "Liquefied Petroleum Gas (LPG) such as propane and butane is stored under pressure. While modern cylinders are engineered to rigorous British and European safety standards, improper storage can lead to valve damage, gas accumulation, or fire hazards. Practising straightforward storage routines ensures maximum longevity of your equipment and total peace of mind.",
        callout: {
          type: "warning",
          title: "Crucial Rule: Always Store Outdoors",
          message:
            "Never store propane gas cylinders inside residential properties, basements, or enclosed garages. LPG vapour is heavier than air and will pool at floor level if a leak occurs.",
        },
      },
      {
        id: "location-and-ventilation",
        title: "2. Optimal location & ventilation requirements",
        content:
          "Always position cylinders in an outdoor location with natural, free-flowing air circulation. Cylinders must stand on a firm, level, non-combustible base (such as concrete paving or gravel) at ground level.",
        bullets: [
          "Keep at least 2 metres away from untrapped drains, cellar grates, gullies, and inspection pits.",
          "Keep at least 1 metre away from doors, openable windows, air vents, and flue outlets.",
          "Keep at least 3 metres away from sources of ignition, open flames, bonfires, and barbecue grills.",
          "Never store cylinders in unventilated sheds, under stairs, or near combustible garden waste.",
        ],
      },
      {
        id: "upright-positioning",
        title: "3. Upright positioning and restraint",
        content:
          "Gas cylinders must ALWAYS be stored and transported in an upright, vertical position with the valve facing upwards. Cylinders are designed with an internal vapour space above the liquid fuel; keeping them upright ensures that pressure relief valves can release vapour rather than liquid in the event of over-pressurisation.",
        callout: {
          type: "danger",
          title: "Never Lay Cylinders on Their Side",
          message:
            "Storing or operating a cylinder horizontally allows liquid LPG to reach the regulator and burner, creating an immediate fire and explosion hazard.",
        },
      },
      {
        id: "connections-and-maintenance",
        title: "4. Checking valves, regulators and hoses",
        content:
          "Perform regular visual checks on your gas hardware to ensure fittings remain gas-tight and weather-resistant throughout the seasons.",
        bullets: [
          "Check high-pressure rubber hoses (BS 3212 / BS EN 1763) annually for cracking, brittleness, or UV wear.",
          "Replace rubber gas hoses every 5 years or immediately if signs of wear are observed.",
          "Ensure regulator O-rings and rubber bullnose washers are intact before screwing into the valve.",
          "Always close cylinder valves tightly and fit protective dust caps when cylinders are disconnected or empty.",
        ],
        callout: {
          type: "tip",
          title: "The Soapy Water Leak Test",
          message:
            "Brush a 50/50 mix of washing-up liquid and water around the valve and regulator joint. If growing bubbles appear, tighten the fitting or shut the cylinder and call our Gloucestershire team.",
        },
      },
    ],
    faqs: [
      {
        question: "Can I store a patio gas cylinder under a barbecue cover?",
        answer:
          "Yes, provided the cylinder is disconnected or the valve is firmly closed, and the cover allows bottom ventilation without trapping potential gas leaks.",
      },
      {
        question: "Can I store an empty cylinder indoors?",
        answer:
          "No. 'Empty' cylinders still contain residual LPG vapour under pressure and must always be treated with the same safety precautions as full bottles.",
      },
      {
        question: "Do I need a security cage for domestic cylinders?",
        answer:
          "While not legally mandatory for small domestic setups, a ventilated metal cage is strongly recommended to protect bottles from tipping, accidental damage, and theft.",
      },
    ],
    relatedSlugs: ["propane-vs-butane", "smokeless-fuel-rules", "bbq-first-burn"],
  },
  {
    id: "post-2",
    slug: "propane-vs-butane",
    aliases: ["propane-vs-butane-which-cylinder-do-you-need"],
    title: "Propane vs butane: which cylinder do you need?",
    date: "2026-05-02",
    updatedAt: "2026-06-10",
    tag: "Guides",
    category: "Guides",
    readingTime: "5 min read",
    author: {
      name: "John Stayte Technical Team",
      role: "LPG Engineering & Delivery",
    },
    excerpt:
      "Understand the key differences between red propane and blue butane cylinders, including boiling points, operating temperatures and ideal appliances.",
    heroImage: guidePropaneVsButane,
    summary:
      "Choosing between red propane and blue butane is one of the most common questions our customers ask. While both are clean-burning LPG fuels, their distinct chemical properties dictate where and when each should be used.",
    sections: [
      {
        id: "overview",
        title: "1. Propane vs butane overview",
        content:
          "Both propane (C3H8) and butane (C4H10) are hydrocarbon gases derived from natural gas processing and petroleum refining. When compressed into steel cylinders, they liquify for convenient storage and transport. The critical distinction lies in their boiling points — the temperature at which liquid converts into usable gaseous fuel.",
      },
      {
        id: "comparison-specs",
        title: "2. Key technical specifications comparison",
        content:
          "Review the direct technical comparison below to identify the right fuel for your heating or cooking requirement:",
        table: {
          headers: ["Feature / Spec", "Propane (Red / Green Patio)", "Butane (Blue)"],
          rows: [
            [
              "Boiling Point",
              "-42°C (All-weather performance)",
              "-0.5°C (Freezes in cold weather)",
            ],
            ["Calor Cylinder Color", "Red (Propane) / Green (Patio Gas)", "Blue (Standard Butane)"],
            ["Operating Pressure", "37 mbar (UK standard)", "28 mbar (UK standard)"],
            [
              "Best Environment",
              "Outdoors all year round (Winter ready)",
              "Indoors or warm summer outdoors",
            ],
            [
              "Typical Uses",
              "BBQs, Patio Heaters, Caravans, Roofing, Farms",
              "Cabinet Room Heaters, Indoor Cookers",
            ],
            [
              "Regulator Type",
              "Screw-on POL or 27mm Clip-on (Patio)",
              "21mm Clip-on (UK blue cylinders)",
            ],
          ],
        },
      },
    ],
    faqs: [
      {
        question: "Can I use a propane regulator on a butane bottle?",
        answer:
          "No. Propane regulators operate at 37 mbar while butane operates at 28 mbar. Furthermore, the physical valve connectors (screw-on POL vs 21mm clip-on) are mechanically incompatible for safety.",
      },
    ],
    relatedSlugs: ["safe-cylinder-storage", "bbq-first-burn", "smokeless-fuel-rules"],
  },
  {
    id: "post-3",
    slug: "smokeless-fuel-rules",
    aliases: ["smokeless-fuel-rules-2026"],
    title: "Smokeless fuel rules for 2026",
    date: "2026-04-19",
    updatedAt: "2026-05-15",
    tag: "Regulations",
    category: "Regulations",
    readingTime: "4 min read",
    author: {
      name: "John Stayte Fuel Specialist",
      role: "Solid Fuel & Clean Air Compliance",
    },
    excerpt:
      "What the latest UK Air Quality and Defra 'Ready to Burn' solid fuel regulations mean for your open fire, multi-fuel stove and log burner.",
    heroImage: guideSmokelessFuel,
    summary:
      "Domestic burning regulations have evolved significantly to improve local air quality across the UK. Here is everything Gloucestershire homeowners need to know about Defra-approved smokeless fuels, kiln-dried logs, and compliant stove operation in 2026.",
    sections: [
      {
        id: "what-is-smokeless-fuel",
        title: "1. What is smokeless fuel?",
        content:
          "Smokeless fuel encompasses manufactured solid fuel ovals, anthracite coals, and dry hardwood logs that produce less than 5 grams of smoke per hour when burned in approved appliances.",
      },
    ],
    faqs: [
      {
        question: "Are multi-fuel stoves being banned in the UK?",
        answer: "No. Modern Ecodesign stoves and compliant multi-fuel burners are fully permitted.",
      },
    ],
    relatedSlugs: ["safe-cylinder-storage", "propane-vs-butane", "bbq-first-burn"],
  },
  {
    id: "post-4",
    slug: "bbq-first-burn",
    aliases: ["getting-the-best-from-your-first-bbq-burn"],
    title: "Getting the best from your first BBQ burn",
    date: "2026-03-30",
    updatedAt: "2026-04-10",
    tag: "Tips",
    category: "Tips",
    readingTime: "3 min read",
    author: {
      name: "John Stayte Outdoor Living",
      role: "Barbecue & Gas Appliances",
    },
    excerpt:
      "Season your cast iron grates, set your temperature zones and perform essential leak checks before your inaugural spring cookout.",
    heroImage: bbqPro3,
    summary:
      "Whether you just purchased a new Char-Broil gas grill or are uncovering your barbecue for the summer season, performing a proper initial burn and seasoning routine ensures exceptional flavour.",
    sections: [
      {
        id: "pre-cook-burn",
        title: "1. The initial burn-off & seasoning",
        content:
          "New barbecue appliances often retain manufacturing oils and protective coatings on their burners and fireboxes.",
      },
    ],
    faqs: [
      {
        question: "Can I use standard red propane on my barbecue?",
        answer: "Yes, provided you have the appropriate screw-on POL regulator.",
      },
    ],
    relatedSlugs: ["propane-vs-butane", "safe-cylinder-storage", "smokeless-fuel-rules"],
  },
  {
    id: "post-5",
    slug: "winter-heating-efficiency",
    aliases: ["winter-heating-efficiency-lpg-solid-fuel"],
    title: "Maximising winter heating efficiency with LPG & solid fuel",
    date: "2026-02-15",
    updatedAt: "2026-03-01",
    tag: "Guides",
    category: "Guides",
    readingTime: "5 min read",
    author: {
      name: "John Stayte Heating Team",
      role: "Domestic Energy Advisors",
    },
    excerpt:
      "Optimise your central heating, cabinet room heaters and multi-fuel stoves to cut fuel consumption during peak winter.",
    heroImage: calorCylindersStudio,
    summary:
      "Managing domestic energy costs during cold UK winter months requires smart fuel pairing and thermal efficiency. Discover practical tips from our Gloucestershire heating advisors.",
    sections: [
      {
        id: "efficiency-basics",
        title: "1. Smart zone heating",
        content:
          "Only heat the rooms you are using during daytime hours using portable butane cabinet heaters or a multi-fuel stove, saving central heating for full-house evening warming.",
      },
    ],
    faqs: [
      {
        question: "How long does a 13kg butane cylinder last on a room heater?",
        answer:
          "On a standard 4.2kW portable room heater used for 4 hours a day on medium setting, a 13kg butane bottle lasts approximately 3 to 4 weeks.",
      },
    ],
    relatedSlugs: ["propane-vs-butane", "smokeless-fuel-rules"],
  },
  {
    id: "post-6",
    slug: "commercial-gas-compliance",
    aliases: ["commercial-gas-safety-standards"],
    title: "Commercial gas safety standards & trade cylinder compliance",
    date: "2026-01-20",
    updatedAt: "2026-02-10",
    tag: "Regulations",
    category: "Regulations",
    readingTime: "6 min read",
    author: {
      name: "John Stayte Commercial Team",
      role: "Commercial LPG Accounts",
    },
    excerpt:
      "Essential safety protocols for catering businesses, farms, pub cellar gas and roofing contractors operating heavy-duty LPG equipment.",
    heroImage: heroImg,
    summary:
      "Commercial and trade users of Calor gas must adhere to strict HSE and UK LPG Code of Practice guidelines. Learn about bulk cylinder storage, automatic changeover valves, and scheduled safety inspections.",
    sections: [
      {
        id: "commercial-storage",
        title: "1. Commercial cylinder bank installation",
        content:
          "Multi-cylinder banks (47kg propane cylinders) powering commercial kitchens, grain dryers, or cellars must be secured in lockable, ventilated cages with automatic changeover manifolds.",
      },
    ],
    faqs: [
      {
        question: "Do trade accounts get scheduled cylinder deliveries?",
        answer:
          "Yes. John Stayte Services provides scheduled automatic replenishment for commercial customers across Gloucestershire.",
      },
    ],
    relatedSlugs: ["safe-cylinder-storage", "smokeless-fuel-rules"],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  const normalised = slug.toLowerCase().trim();
  return blogArticles.find(
    (p) => p.slug === normalised || (p.aliases && p.aliases.includes(normalised)),
  );
}

export function getRelatedBlogPosts(slug: string, count: number = 3): BlogPost[] {
  const current = getBlogPostBySlug(slug);
  if (!current) return blogArticles.slice(0, count);

  const related = blogArticles.filter((p) => p.slug !== current.slug);
  if (current.relatedSlugs && current.relatedSlugs.length > 0) {
    const priority = related.filter((p) => current.relatedSlugs?.includes(p.slug));
    const remainder = related.filter((p) => !current.relatedSlugs?.includes(p.slug));
    return [...priority, ...remainder].slice(0, count);
  }
  return related.slice(0, count);
}
