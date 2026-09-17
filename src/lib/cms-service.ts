import { supabase } from "@/lib/supabase";

// ============================================================================
// 1. HOME CMS TYPES & DEFAULTS
// ============================================================================
export interface HomeWhyChooseCard {
  id: string;
  title: string;
  desc: string;
  badge?: string;
}

export interface HomeCmsData {
  // Hero
  heroEyebrow: string;
  heroHeading: string;
  heroSubtitle: string;
  deliveryBadge: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  // Trust Stats
  statsYears: string;
  statsStations: string;
  statsCylinders: string;
  statsOnTime: string;
  // Section Headings
  categoryTitle: string;
  categorySubtitle: string;
  brandTitle: string;
  brandSubtitle: string;
  servicesTitle: string;
  servicesSubtitle: string;
  whyUsTitle: string;
  whyUsSubtitle: string;
  whyUsGuarantees: HomeWhyChooseCard[];
  forecourtsTitle: string;
  forecourtsSubtitle: string;
  reviewsTitle: string;
  reviewsSubtitle: string;
  safetyCtaTitle: string;
  safetyCtaSubtitle: string;
  supportCtaTitle: string;
  supportCtaSubtitle: string;
  supportCtaPhone: string;
  supportCtaButtonText: string;
  supportCtaButtonLink: string;
}

export const DEFAULT_HOME_CMS: HomeCmsData = {
  heroEyebrow: "Family run since 1972",
  heroHeading: "Order your gas delivery with us today.",
  heroSubtitle:
    "Calor cylinders, coal, logs, fishing baits, animal feed and appliances — supplied and delivered across Gloucestershire by a team you can actually call.",
  deliveryBadge: "Next-Day Local Delivery Available",
  primaryCtaText: "Order Gas Online",
  primaryCtaLink: "/order-gas",
  secondaryCtaText: "Browse Full Shop",
  secondaryCtaLink: "/products",
  statsYears: "50+",
  statsStations: "3",
  statsCylinders: "15k+",
  statsOnTime: "99.8%",
  categoryTitle: "Shop by Category",
  categorySubtitle:
    "From bottled gas and winter fuels to outdoor barbecues, feeds and tackle — everything you need for home, trade and country life.",
  brandTitle: "Shop by Brand",
  brandSubtitle:
    "Official partner stockist for the UK's leading gas, solid fuel, outdoor living, and animal feed manufacturers.",
  servicesTitle: "Our Gas & Fuel Services",
  servicesSubtitle:
    "From next-day cylinder drops to commercial contracts and 24/7 forecourt exchanges, discover how we keep Gloucestershire moving and warm.",
  whyUsTitle: "Why Gloucestershire Chooses John Stayte Services",
  whyUsSubtitle:
    "Five decades of local knowledge, dependable stock, and genuine customer care that corporate suppliers simply cannot match.",
  whyUsGuarantees: [
    {
      id: "guarantee-1",
      title: "Guaranteed Next-Day Delivery",
      desc: "Order before 2pm on weekdays for guaranteed next-working-day delivery direct to your property across Gloucestershire.",
      badge: "Local Fleet",
    },
    {
      id: "guarantee-2",
      title: "Fair Transparent Pricing",
      desc: "Clear cylinder refill prices, deposit clarity with zero hidden surcharges or surprise administrative fees.",
      badge: "Best Value",
    },
    {
      id: "guarantee-3",
      title: "Full PSSR & Gas Safe Compliance",
      desc: "All cylinder connections, regulators and manifold installations adhere strictly to UK pressure system safety regulations.",
      badge: "Certified",
    },
    {
      id: "guarantee-4",
      title: "Personal Human Support",
      desc: "Speak to knowledgeable local staff in Whitminster who understand your heating, catering and trade gas requirements.",
      badge: "Local Depot",
    },
  ],
  forecourtsTitle: "Forecourt Filling Stations & Depots",
  forecourtsSubtitle:
    "Three convenient roadside forecourt locations across Gloucestershire for vehicle Autogas refuelling, cylinder exchanges and country store essentials.",
  reviewsTitle: "What Our Customers Say",
  reviewsSubtitle:
    "Trusted by thousands of domestic homeowners, pubs, restaurants, and commercial trade accounts across the county.",
  safetyCtaTitle: "Gas Safety & Storage Guidance",
  safetyCtaSubtitle:
    "Read our essential safety tips on cylinder storage, ventilation, leak detection, and regulator changeovers.",
  supportCtaTitle: "Need advice or a custom delivery schedule?",
  supportCtaSubtitle:
    "Our depot dispatchers in Whitminster are on hand to help with cylinder sizing, appliance compatibility, and bulk orders.",
  supportCtaPhone: "+44 (0)1453 822859",
  supportCtaButtonText: "Call Our Depot",
  supportCtaButtonLink: "tel:+441453822859",
};

// ============================================================================
// 2. ABOUT CMS TYPES & DEFAULTS
// ============================================================================
export interface AboutTimelineItem {
  year: string;
  title: string;
  desc: string;
}

export interface AboutValueItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface AboutProofItem {
  id: string;
  title: string;
  desc: string;
}

export interface AboutCmsData {
  heroEyebrow: string;
  heroHeading: string;
  heroSubtitle: string;
  statYears: string;
  statForecourts: string;
  statDeliveries: string;
  statRating: string;
  heritageTitle: string;
  heritageSubtitle: string;
  heritageParagraph1: string;
  heritageParagraph2: string;
  heritageImage: string;
  timeline: AboutTimelineItem[];
  missionTitle: string;
  missionStatement: string;
  visionStatement: string;
  values: AboutValueItem[];
  whyChooseTitle: string;
  whyChooseSubtitle: string;
  whyChooseList: AboutProofItem[];
  teamTitle: string;
  teamSubtitle: string;
  teamCommitment: string;
  nizaTitle: string;
  nizaSubtitle: string;
  nizaDescription: string;
  safetyTitle: string;
  safetyDescription: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  ctaButtonLink: string;
}

export const DEFAULT_ABOUT_CMS: AboutCmsData = {
  heroEyebrow: "ABOUT JOHN STAYTE SERVICES",
  heroHeading: "Keeping Gloucestershire moving, warm and well-equipped since 1972.",
  heroSubtitle:
    "More than 50 years of dependable fuel delivery, bottled gas, solid fuels, animal feed, country essentials and forecourt services from a family business that puts customer service first.",
  statYears: "50+",
  statForecourts: "3",
  statDeliveries: "15,000+",
  statRating: "4.9 / 5",
  heritageTitle: "A family business built on local trust since 1972",
  heritageSubtitle: "Over half a century of dependable service across Gloucestershire",
  heritageParagraph1:
    "From a single delivery lorry in Whitminster in 1972 to a modern multi-vehicle logistics fleet and three forecourt operations, John Stayte Services has grown alongside Gloucestershire's homes, farms, pubs and rural businesses.",
  heritageParagraph2:
    "Today, our team remains committed to the same core founding principles: reliable supply, personal telephone advice, honest pricing, and prompt delivery right to your door or gas cage.",
  heritageImage: "/hero-delivery.jpg",
  timeline: [
    {
      year: "1972",
      title: "Founding in Whitminster",
      desc: "John Stayte begins local bottled gas and coal deliveries with a single commercial vehicle.",
    },
    {
      year: "1985",
      title: "Depot & Fleet Expansion",
      desc: "Expanded delivery routes to cover all of Stroud, Dursley, Gloucester and the Severn Vale.",
    },
    {
      year: "2002",
      title: "Forecourt Retail Stations",
      desc: "Acquisition of three key roadside forecourt locations with vehicle LPG Autogas dispense.",
    },
    {
      year: "2018",
      title: "Modern Logistics & Digital Ordering",
      desc: "Investment in computerised routing, safety compliance systems, and customer portal ordering.",
    },
    {
      year: "Today",
      title: "Gloucestershire's Trusted Gas Partner",
      desc: "Serving thousands of homes, commercial kitchens, and industrial accounts with dependable daily energy.",
    },
  ],
  missionTitle: "Our Mission & Purpose",
  missionStatement:
    "To deliver reliable, safe, and cost-effective gas, fuel, and country supplies across Gloucestershire with exceptional personal service and local accountability.",
  visionStatement:
    "To be the premier independent energy and country supplies partner in the South West, recognized for reliability, sustainability, and community dedication.",
  values: [
    {
      id: "val-1",
      title: "Family Values & Trust",
      desc: "We treat every customer with respect, integrity, and genuine personal care.",
      icon: "HeartHandshake",
    },
    {
      id: "val-2",
      title: "Uncompromising Safety",
      desc: "Strict compliance with UK Pressure Systems regulations (PSSR 2000) on all cylinder logistics.",
      icon: "ShieldCheck",
    },
    {
      id: "val-3",
      title: "Reliable Local Supply",
      desc: "Deep local stockholdings ensuring you never run cold during harsh winter periods.",
      icon: "Truck",
    },
    {
      id: "val-4",
      title: "Community Commitment",
      desc: "Supporting Gloucestershire charities, sports clubs, rural events and local trade.",
      icon: "Users",
    },
  ],
  whyChooseTitle: "Why Gloucestershire Relies on John Stayte Services",
  whyChooseSubtitle: "Practical benefits that set our local service apart",
  whyChooseList: [
    {
      id: "why-1",
      title: "Dedicated Local Drivers",
      desc: "Our delivery personnel know Gloucestershire's lanes, farms, and rural addresses intimately.",
    },
    {
      id: "why-2",
      title: "Flexible Account Terms",
      desc: "30-day commercial invoicing for hospitality, agriculture, and high-volume trade clients.",
    },
    {
      id: "why-3",
      title: "Same-Day Emergency Response",
      desc: "Priority dispatch when heating systems or commercial kitchen supplies run unexpectedly low.",
    },
    {
      id: "why-4",
      title: "Comprehensive Country Catalog",
      desc: "Combine bottled gas, smokeless fuels, animal feed, and fishing tackle in a single delivery drop.",
    },
  ],
  teamTitle: "Leadership & Dedicated Logistics Team",
  teamSubtitle: "Real people you can speak to directly",
  teamCommitment:
    "Our dispatch office in Whitminster is staffed by friendly, experienced personnel ready to assist with sizing, technical specifications, and delivery coordination.",
  nizaTitle: "Strategic Partnership & Infrastructure Investment",
  nizaSubtitle: "Strengthening our supply chain for the future",
  nizaDescription:
    "Backed by major logistics investment, John Stayte Services continues to enhance depot safety standards, digital ordering technology, and fleet efficiency while preserving our cherished local heritage.",
  safetyTitle: "Certified Safety Compliance & Gas Safe Standards",
  safetyDescription:
    "All cylinders are inspected, pressure-tested, and handled by trained ADR certified drivers in compliance with UK PSSR 2000 and the Gas Safety (Installation and Use) Regulations 1998.",
  ctaTitle: "Ready to set up your gas delivery?",
  ctaSubtitle: "Order online in minutes or contact our Whitminster depot team for assistance.",
  ctaButtonText: "Order Gas Online",
  ctaButtonLink: "/order-gas",
};

// ============================================================================
// 3. SERVICES CMS TYPES & DEFAULTS
// ============================================================================
export interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  status: "Active" | "Inactive";
}

export interface ServicesCmsData {
  heroEyebrow: string;
  heroHeading: string;
  heroSubtitle: string;
  emergencyTitle: string;
  emergencyText: string;
  emergencyPhone: string;
  services: ServiceItem[];
  ctaHeading: string;
  ctaDescription: string;
  ctaButtonText: string;
  ctaButtonLink: string;
}

export const DEFAULT_SERVICES_CMS: ServicesCmsData = {
  heroEyebrow: "WHAT WE DO",
  heroHeading: "Comprehensive Gas, Fuel & Country Supplies",
  heroSubtitle:
    "From next-day doorstep cylinder drops and bulk storage replenishment to commercial kitchen contracts and 24/7 forecourt exchanges.",
  emergencyTitle: "Same-Day Emergency Delivery Available",
  emergencyText:
    "Run out of heating gas or commercial supplies? Our emergency response team prioritises urgent fuel deliveries across Gloucestershire.",
  emergencyPhone: "01452 740378",
  services: [
    {
      id: "srv-1",
      title: "Gas Delivery",
      desc: "Next-day cylinder delivery across Gloucestershire to homes, farms and commercial premises.",
      icon: "Truck",
      image: "/service_gas_delivery.jpg",
      ctaText: "Order Gas",
      ctaLink: "/order-gas",
      status: "Active",
    },
    {
      id: "srv-2",
      title: "Bulk Supply",
      desc: "Scheduled bulk LPG for farms and large estates with automated telemetry monitoring.",
      icon: "Container",
      image: "/service_bulk_supply.jpg",
      ctaText: "Enquire Now",
      ctaLink: "/contact",
      status: "Active",
    },
    {
      id: "srv-3",
      title: "Commercial Gas",
      desc: "Pub, hospitality and industrial catering gas contracts with scheduled replenishment and 30-day invoicing.",
      icon: "Building2",
      image: "/service_commercial_gas.jpg",
      ctaText: "Trade Accounts",
      ctaLink: "/account/application",
      status: "Active",
    },
    {
      id: "srv-4",
      title: "Domestic Supply",
      desc: "Home heating, cooking and barbecue patio gas with prompt doorstep empty cylinder swap.",
      icon: "Home",
      image: "/service_domestic_supply.jpg",
      ctaText: "Shop Cylinders",
      ctaLink: "/order-gas",
      status: "Active",
    },
    {
      id: "srv-5",
      title: "Cylinder Exchange",
      desc: "Swap empty bottles instantly at any of our three forecourt depots in Dursley, Whitminster, and Stonehouse.",
      icon: "RefreshCw",
      image: "/service_cylinder_exchange.jpg",
      ctaText: "View Stations",
      ctaLink: "/filling-stations",
      status: "Active",
    },
    {
      id: "srv-6",
      title: "Emergency Delivery",
      desc: "Same-day emergency fuel runs when your tank or heating runs dry during cold snaps.",
      icon: "Siren",
      image: "/service_emergency_delivery.jpg",
      ctaText: "Call Dispatch",
      ctaLink: "tel:+441453822859",
      status: "Active",
    },
  ],
  ctaHeading: "Need a tailored commercial supply arrangement?",
  ctaDescription:
    "We supply pubs, hotels, agricultural estates, caravan parks and roofing contractors with competitive trade pricing and scheduled deliveries.",
  ctaButtonText: "Apply for Trade Account",
  ctaButtonLink: "/account/application",
};

// ============================================================================
// 4. SHOP & ORDER GAS CMS TYPES & DEFAULTS
// ============================================================================
export interface ShopOrderGasCmsData {
  heroEyebrow: string;
  heroHeading: string;
  heroSubtitle: string;
  announcementActive: boolean;
  announcementTitle: string;
  announcementText: string;
  safetyHeading: string;
  safetyText: string;
  refillExchangeNotice: string;
}

export const DEFAULT_SHOP_ORDER_GAS_CMS: ShopOrderGasCmsData = {
  heroEyebrow: "Official Calor Gas Distributor",
  heroHeading: "Shop & Order Gas Cylinders",
  heroSubtitle:
    "Select your required cylinder sizes, exchange empty bottles, or order new cylinders with next-day local delivery across Gloucestershire.",
  announcementActive: true,
  announcementTitle: "Next-Day Delivery Cutoff: 2:00 PM",
  announcementText:
    "Orders placed before 2:00 PM Monday through Friday are scheduled for next working day delivery.",
  safetyHeading: "PSSR 2000 Regulatory Compliance",
  safetyText:
    "All gas installations and cylinder connections must comply with UK Pressure Systems Safety Regulations 2000. Our drivers provide safe placement on site.",
  refillExchangeNotice:
    "Have an empty bottle to exchange? Select 'Refill Only' at checkout to save on new cylinder bottle deposit charges.",
};

// ============================================================================
// 5. FILLING STATIONS CMS TYPES & DEFAULTS
// ============================================================================
export interface ForecourtStationItem {
  id: string;
  name: string;
  address: string;
  town: string;
  postcode: string;
  phone: string;
  hours: string;
  services: string[];
  maps_link: string;
  images: string[];
  autogas_available: boolean;
}

export interface StationsCmsData {
  heroEyebrow: string;
  heroHeading: string;
  heroSubtitle: string;
  amenitiesHeading: string;
  amenitiesText: string;
  stations: ForecourtStationItem[];
}

export const DEFAULT_STATIONS_CMS: StationsCmsData = {
  heroEyebrow: "FORECOURT NETWORK",
  heroHeading: "Filling Stations & Forecourt Depots",
  heroSubtitle:
    "Three full-service forecourt stations across Gloucestershire offering vehicle Autogas refuelling, bottle exchanges, Costa Coffee and convenience store essentials.",
  amenitiesHeading: "Forecourt Facilities & Services",
  amenitiesText:
    "All three stations feature modern multi-fuel pumps, high-flow commercial diesel, 24/7 Wash.ME laundry revolution machines, air & water towers, and fully stocked country stores.",
  stations: [
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
      services: ["Fuel", "Autogas", "Shop", "Air", "AdBlue", "Cylinder Exchange", "Costa Express"],
      images: [
        "/wild-goose-garage-1.jpg",
        "/wild-goose-garage-2.jpg",
        "/wild-goose-garage-3.jpg",
        "/wild-goose-garage-4.jpg",
      ],
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
      maps_link:
        "https://maps.google.com/?q=Fromebridge+Service+Station+Bristol+Road+Whitminster+GL2+7PG",
      services: [
        "Fuel",
        "Autogas",
        "Shop",
        "Air",
        "AdBlue",
        "Cylinder Exchange",
        "Coal & Logs",
      ],
      images: [
        "/fromebridge-service-station-1.jpg",
        "/fromebridge-service-station-2.jpg",
        "/fromebridge-service-station-3.jpg",
        "/fromebridge-service-station-4.jpg",
      ],
    },
    {
      id: "st-3",
      name: "Bridge Service Station",
      address: "Gloucester Road, Stonehouse, Gloucestershire, GL10 2PB",
      town: "Stonehouse",
      postcode: "GL10 2PB",
      phone: "01453 821005",
      hours: "Mon–Fri 6:30–20:00 • Sat–Sun 8:00–18:00",
      autogas_available: true,
      maps_link:
        "https://maps.google.com/?q=Bridge+Service+Station+Gloucester+Road+Stonehouse+GL10+2PB",
      services: [
        "Texaco Fuel",
        "Autogas",
        "HGV High-Flow",
        "Car Wash & Jet Wash",
        "Wash.ME 24/7 Laundry",
        "Londis Shop & Costa",
        "Calor Gas Cylinders",
        "Solid Fuels & Logs",
        "AdBlue",
      ],
      images: [
        "/bridge-station-forecourt.jpg",
        "/bridge-station-canopy-londis.jpg",
        "/bridge-station-wide-facilities.jpg",
        "/bridge-station-ev-totem.jpg",
      ],
    },
  ],
};

// ============================================================================
// 6. OFFERS CMS TYPES & DEFAULTS
// ============================================================================
export interface PromoOfferItem {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  banner_url?: string;
  is_active: boolean;
  ends_at?: string;
  cta_text?: string;
  cta_link?: string;
}

export interface OffersCmsData {
  heroEyebrow: string;
  heroHeading: string;
  heroSubtitle: string;
  offers: PromoOfferItem[];
}

export const DEFAULT_OFFERS_CMS: OffersCmsData = {
  heroEyebrow: "SPECIAL PROMOTIONS",
  heroHeading: "Latest Deals, Bundles & Seasonal Offers",
  heroSubtitle: "Save on cylinder refills, winter heating fuel packs, and outdoor living equipment.",
  offers: [
    {
      id: "off-1",
      title: "Winter Fuel Bundle Saver",
      description:
        "Save 15% when ordering 3 or more bags of kiln-dried hardwood logs with any smokeless fuel pack.",
      discount_percentage: 15,
      banner_url: "/coal-logs.jpg",
      is_active: true,
      ends_at: "2026-12-31",
      cta_text: "Shop Winter Fuels",
      cta_link: "/products",
    },
    {
      id: "off-2",
      title: "Patio Gas & BBQ Cylinder Offer",
      description:
        "Special seasonal discount on 13kg & 5kg green Patio Gas bottles with free regulator check.",
      discount_percentage: 10,
      banner_url: "/char_broil_professionalpro3_1.jpg",
      is_active: true,
      ends_at: "2026-11-30",
      cta_text: "Order Patio Gas",
      cta_link: "/order-gas",
    },
  ],
};

// ============================================================================
// 7. CONTACT & FAQS CMS TYPES & DEFAULTS
// ============================================================================
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  is_active: boolean;
}

export interface ContactFaqsCmsData {
  heroEyebrow: string;
  heroHeading: string;
  heroSubtitle: string;
  headOfficeAddress: string;
  headOfficeTown: string;
  headOfficePostcode: string;
  phonePrimary: string;
  phoneSecondary: string;
  emailPrimary: string;
  emailAccounts: string;
  hoursWeekday: string;
  hoursSaturday: string;
  hoursSunday: string;
  enquiryHeading: string;
  enquirySubtitle: string;
  enquirySla: string;
  faqs: FaqItem[];
}

export const DEFAULT_CONTACT_FAQS_CMS: ContactFaqsCmsData = {
  heroEyebrow: "GET IN TOUCH",
  heroHeading: "Contact Our Gloucestershire Depot",
  heroSubtitle:
    "Speak with our Whitminster dispatch team about bottled gas orders, trade supplies, delivery schedules, or forecourt services.",
  headOfficeAddress: "Puddlesworth Lane",
  headOfficeTown: "Eastington, Stonehouse, Gloucestershire",
  headOfficePostcode: "GL10 3AH",
  phonePrimary: "+44 (0)1453 822859",
  phoneSecondary: "01453 821005",
  emailPrimary: "info@johnstayteservices.co.uk",
  emailAccounts: "accounts@johnstayteservices.co.uk",
  hoursWeekday: "Monday – Friday: 08:00 – 17:30",
  hoursSaturday: "Saturday: 08:30 – 16:00",
  hoursSunday: "Sunday: Closed (Forecourts Open)",
  enquiryHeading: "Send a Direct Customer Message",
  enquirySubtitle: "Fill in the details below and our team will get back to you promptly.",
  enquirySla: "We respond to all online enquiries within 2-4 business hours.",
  faqs: [
    {
      id: "faq-1",
      question: "How fast can you deliver my gas cylinder in Gloucestershire?",
      answer:
        "Orders placed before 2:00 PM on weekdays are scheduled for guaranteed next-working-day delivery across Gloucestershire. Emergency same-day delivery is also available for heating run-outs.",
      category: "Delivery",
      is_active: true,
    },
    {
      id: "faq-2",
      question: "Do I have to return an empty gas cylinder?",
      answer:
        "If you have an empty Calor bottle of the same group size, you only pay for the gas refill. If you do not have an empty cylinder, a standard refundable bottle security deposit applies.",
      category: "Cylinders",
      is_active: true,
    },
    {
      id: "faq-3",
      question: "Can I swap my empty cylinder at your forecourts?",
      answer:
        "Yes! All three of our forecourts (Dursley, Whitminster, and Stonehouse) offer instant empty bottle exchanges during operational forecourt hours.",
      category: "Forecourts",
      is_active: true,
    },
    {
      id: "faq-4",
      question: "What is the difference between Propane and Butane?",
      answer:
        "Propane (red bottle, 37mbar) operates efficiently in freezing winter temperatures and is best for outdoor heating, cooking, and caravans. Butane (blue bottle, 28mbar) is ideal for indoor portable mobile room heaters.",
      category: "Technical",
      is_active: true,
    },
    {
      id: "faq-5",
      question: "How do I open a commercial or hospitality trade account?",
      answer:
        "Complete our quick online Gas Customer Application at /account/application. Our accounts team will activate your 30-day billing terms and schedule regular replenishment.",
      category: "Trade",
      is_active: true,
    },
  ],
};

// ============================================================================
// 8. FOOTER & GLOBAL CMS TYPES & DEFAULTS
// ============================================================================
export interface FooterCmsData {
  // Global Notification Banner
  bannerActive: boolean;
  bannerBadge: string;
  bannerText: string;
  bannerLinkText: string;
  bannerLinkUrl: string;
  // Footer Content
  bio: string;
  phone: string;
  email: string;
  address: string;
  weekdayHours: string;
  weekendHours: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  copyrightText: string;
  legalNotice: string;
}

export const DEFAULT_FOOTER_CMS: FooterCmsData = {
  bannerActive: false,
  bannerBadge: "Operational Notice",
  bannerText: "Next-day gas cylinder deliveries operating on normal schedule across Gloucestershire.",
  bannerLinkText: "Order Now",
  bannerLinkUrl: "/order-gas",
  bio: "Official Calor Gas main dealer, fuel merchant, and country store stockist serving Gloucestershire homes, farms, pubs and businesses since 1972.",
  phone: "+44 (0)1453 822859",
  email: "info@johnstayteservices.co.uk",
  address: "Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom",
  weekdayHours: "Mon–Fri: 08:00 – 17:30",
  weekendHours: "Sat: 08:30 – 16:00 • Sun: Forecourts Open",
  facebookUrl: "https://facebook.com/johnstayteservices",
  instagramUrl: "https://instagram.com/johnstayteservices",
  youtubeUrl: "https://youtube.com/@johnstayteservices",
  copyrightText: "© 1972 – 2026 John Stayte Services Limited. All rights reserved.",
  legalNotice:
    "Registered in England & Wales. Official Calor Gas Authorised Distributor. VAT Reg No: GB 275 8891 23.",
};

// ============================================================================
// 9. HELPER METHODS FOR CMS FETCH & SAVE
// ============================================================================

/**
 * Fetch a CMS content block from Supabase with fallback to local defaults.
 */
export async function fetchCmsBlock<T>(sectionKey: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", sectionKey)
      .maybeSingle();

    if (error || !data?.content) {
      return fallback;
    }

    const parsed = JSON.parse(data.content);

    // Section specific normalization to support both legacy array schema & new structured object schema
    if (sectionKey === "services_data") {
      if (Array.isArray(parsed)) {
        return {
          ...DEFAULT_SERVICES_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          services: parsed.length > 0 ? parsed : DEFAULT_SERVICES_CMS.services,
        } as T;
      }
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_SERVICES_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          ...parsed,
          services: Array.isArray(parsed.services)
            ? parsed.services
            : DEFAULT_SERVICES_CMS.services,
        } as T;
      }
    }

    if (sectionKey === "stations_data") {
      if (Array.isArray(parsed)) {
        return {
          ...DEFAULT_STATIONS_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          stations: parsed.length > 0 ? parsed : DEFAULT_STATIONS_CMS.stations,
        } as T;
      }
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_STATIONS_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          ...parsed,
          stations: Array.isArray(parsed.stations)
            ? parsed.stations
            : DEFAULT_STATIONS_CMS.stations,
        } as T;
      }
    }

    if (sectionKey === "offers_data") {
      if (Array.isArray(parsed)) {
        return {
          ...DEFAULT_OFFERS_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          offers: parsed.length > 0 ? parsed : DEFAULT_OFFERS_CMS.offers,
        } as T;
      }
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_OFFERS_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          ...parsed,
          offers: Array.isArray(parsed.offers)
            ? parsed.offers
            : DEFAULT_OFFERS_CMS.offers,
        } as T;
      }
    }

    if (sectionKey === "contact_faqs_data" || sectionKey === "faqs_data") {
      if (Array.isArray(parsed)) {
        return {
          ...DEFAULT_CONTACT_FAQS_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          faqs: parsed.length > 0 ? parsed : DEFAULT_CONTACT_FAQS_CMS.faqs,
        } as T;
      }
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_CONTACT_FAQS_CMS,
          ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
          ...parsed,
          faqs: Array.isArray(parsed.faqs)
            ? parsed.faqs
            : DEFAULT_CONTACT_FAQS_CMS.faqs,
        } as T;
      }
    }

    if (sectionKey === "about_data" && parsed && typeof parsed === "object") {
      return {
        ...DEFAULT_ABOUT_CMS,
        ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
        ...parsed,
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline : DEFAULT_ABOUT_CMS.timeline,
        values: Array.isArray(parsed.values) ? parsed.values : DEFAULT_ABOUT_CMS.values,
        whyChooseList: Array.isArray(parsed.whyChooseList) ? parsed.whyChooseList : DEFAULT_ABOUT_CMS.whyChooseList,
      } as T;
    }

    if (sectionKey === "home_data" && parsed && typeof parsed === "object") {
      return {
        ...DEFAULT_HOME_CMS,
        ...(fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {}),
        ...parsed,
        whyUsGuarantees: Array.isArray(parsed.whyUsGuarantees) ? parsed.whyUsGuarantees : DEFAULT_HOME_CMS.whyUsGuarantees,
      } as T;
    }

    if (sectionKey === "testimonials_data") {
      if (Array.isArray(parsed)) {
        return (parsed.length > 0 ? parsed : fallback) as T;
      }
      if (parsed?.reviews && Array.isArray(parsed.reviews)) {
        return (parsed.reviews.length > 0 ? parsed.reviews : fallback) as T;
      }
    }

    if (typeof parsed === "object" && !Array.isArray(parsed) && typeof fallback === "object" && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed };
    }
    return parsed as T;
  } catch (err) {
    console.warn(`[CMS] Failed to parse block '${sectionKey}', using fallback:`, err);
    return fallback;
  }
}

/**
 * Save a CMS content block to Supabase and trigger live UI updates.
 */
export async function saveCmsBlock<T>(
  sectionKey: string,
  title: string,
  content: T,
): Promise<boolean> {
  const jsonContent = JSON.stringify(content);
  const { error } = await supabase.from("cms_content_blocks").upsert(
    {
      section_key: sectionKey,
      title,
      content: jsonContent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "section_key" },
  );

  if (error) {
    console.error(`[CMS] Failed to save block '${sectionKey}':`, error);
    throw new Error(error.message || `Failed to save ${title}`);
  }

  // Dispatch custom browser event for instant same-tab reactive update
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cms_block_updated", {
        detail: { sectionKey, content },
      }),
    );
    // Legacy event dispatchers
    if (sectionKey === "home_data") window.dispatchEvent(new CustomEvent("cms_home_updated", { detail: content }));
    if (sectionKey === "about_data") window.dispatchEvent(new CustomEvent("cms_about_updated", { detail: content }));
    if (sectionKey === "services_data") window.dispatchEvent(new CustomEvent("cms_services_updated", { detail: content }));
    if (sectionKey === "stations_data") window.dispatchEvent(new CustomEvent("cms_stations_updated", { detail: content }));
    if (sectionKey === "offers_data") window.dispatchEvent(new CustomEvent("cms_offers_updated", { detail: content }));
    if (sectionKey === "contact_faqs_data" || sectionKey === "faqs_data") window.dispatchEvent(new CustomEvent("cms_faqs_updated", { detail: content }));
    if (sectionKey === "testimonials_data") window.dispatchEvent(new CustomEvent("cms_testimonials_updated", { detail: content }));
  }

  return true;
}

/**
 * Upload an image file directly to Supabase Storage 'cms_media' bucket and return the public URL.
 */
export async function uploadCmsImage(file: File, folder = "general"): Promise<string> {
  if (!file) throw new Error("No file provided for upload");

  const ext = file.name.split(".").pop() || "jpg";
  const cleanName = file.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${folder}/${Date.now()}_${cleanName}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from("cms_media").upload(fileName, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (uploadErr) {
    // If bucket doesn't exist, fallback to general upload or report error
    console.error("[CMS Media Upload Error]:", uploadErr);
    throw new Error(uploadErr.message || "Failed to upload image to Supabase Storage");
  }

  const { data: publicData } = supabase.storage.from("cms_media").getPublicUrl(fileName);
  return publicData.publicUrl;
}
