const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://wttchknauwvbfjatdscc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

const client = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting CMS Real Data Seeding...");

  // 1. Seed Filling Stations
  const stations = [
    {
      id: "7820a232-c5ee-449e-ba63-5eb774a3407a",
      name: "Wild Goose Garage",
      address: "27 Kingshill Road, Dursley, Gloucestershire, GL11 4BJ",
      town: "Dursley",
      postcode: "GL11 4BJ",
      phone: "01453 545696",
      hours: "Mon–Sat 7:00–19:00 • Sun 9:00–17:00",
      autogas_available: true,
      services: ["Fuel", "Autogas", "Shop", "Air", "AdBlue", "Cylinder Exchange"],
      latitude: 51.6885,
      longitude: -2.3547,
      maps_link: "https://maps.google.com/?q=Wild+Goose+Garage+27+Kingshill+Road+Dursley+GL11+4BJ",
      image_url: "/wild-goose-garage-1.jpg",
      display_order: 1,
      is_active: true
    },
    {
      id: "a3dbfe97-a7dc-4cb4-8a4f-a2e6f47796d1",
      name: "Fromebridge Service Station",
      address: "Bristol Road, Whitminster, Gloucestershire, GL2 7PG",
      town: "Whitminster",
      postcode: "GL2 7PG",
      phone: "01452 740753",
      hours: "Mon–Sat 7:00–20:00 • Sun 8:00–18:00",
      autogas_available: true,
      services: ["Fuel", "Autogas", "Shop", "Air", "AdBlue", "Cylinder Exchange"],
      latitude: 51.7694,
      longitude: -2.3486,
      maps_link: "https://maps.google.com/?q=Fromebridge+Service+Station+Bristol+Road+Whitminster+GL2+7PG",
      image_url: "/fromebridge-service-station-1.jpg",
      display_order: 2,
      is_active: true
    },
    {
      id: "44243b91-4e78-4ea7-9097-9e7c5c0c99a3",
      name: "Bridge Service Station",
      address: "Gloucester Road, Stonehouse, Gloucestershire, GL10 2PB",
      town: "Stonehouse",
      postcode: "GL10 2PB",
      phone: "01453 821005",
      hours: "Mon–Fri 6:30–20:00 • Sat–Sun 8:00–18:00",
      autogas_available: true,
      services: [
        "Texaco Fuel",
        "Autogas",
        "HGV High-Flow Pumps",
        "Car Wash & Jet Wash",
        "Air Pressure Pumps",
        "Wash.ME 24/7 Laundry",
        "Londis Shop & Costa",
        "Calor Gas Cylinders",
        "Solid Fuels & Logs",
        "AdBlue"
      ],
      latitude: 51.7482,
      longitude: -2.2870,
      maps_link: "https://maps.google.com/?q=Bridge+Service+Station+Gloucester+Road+Stonehouse+GL10+2PB",
      image_url: "/bridge-station-forecourt.jpg",
      display_order: 3,
      is_active: true
    }
  ];

  for (const s of stations) {
    const { error } = await client.from("filling_stations").upsert(s, { onConflict: "id" });
    if (error) console.warn("Filling station upsert error:", error.message);
  }
  console.log("✓ Filling stations seeded");

  // 2. Seed Station Images (Galleries)
  const stationImages = [
    { station_id: "7820a232-c5ee-449e-ba63-5eb774a3407a", image_url: "/wild-goose-garage-1.jpg", caption: "Forecourt Canopy & Pumps", display_order: 1, is_primary: true },
    { station_id: "7820a232-c5ee-449e-ba63-5eb774a3407a", image_url: "/wild-goose-garage-2.jpg", caption: "Convenience Store Entrance", display_order: 2, is_primary: false },
    { station_id: "7820a232-c5ee-449e-ba63-5eb774a3407a", image_url: "/wild-goose-garage-3.jpg", caption: "LPG Autogas Dispenser", display_order: 3, is_primary: false },
    { station_id: "7820a232-c5ee-449e-ba63-5eb774a3407a", image_url: "/wild-goose-garage-4.jpg", caption: "Gas Cylinder Cage", display_order: 4, is_primary: false },
    { station_id: "7820a232-c5ee-449e-ba63-5eb774a3407a", image_url: "/wild-goose-garage-5.jpg", caption: "Air & Water Tower", display_order: 5, is_primary: false },

    { station_id: "a3dbfe97-a7dc-4cb4-8a4f-a2e6f47796d1", image_url: "/fromebridge-service-station-1.jpg", caption: "Main Forecourt Overview", display_order: 1, is_primary: true },
    { station_id: "a3dbfe97-a7dc-4cb4-8a4f-a2e6f47796d1", image_url: "/fromebridge-service-station-2.jpg", caption: "Shop & Facilities", display_order: 2, is_primary: false },
    { station_id: "a3dbfe97-a7dc-4cb4-8a4f-a2e6f47796d1", image_url: "/fromebridge-service-station-3.jpg", caption: "Autogas Dispenser Lane", display_order: 3, is_primary: false },

    { station_id: "44243b91-4e78-4ea7-9097-9e7c5c0c99a3", image_url: "/bridge-station-forecourt.jpg", caption: "Texaco Forecourt & Canopy", display_order: 1, is_primary: true },
    { station_id: "44243b91-4e78-4ea7-9097-9e7c5c0c99a3", image_url: "/bridge-station-canopy-londis.jpg", caption: "Londis Convenience Store", display_order: 2, is_primary: false },
    { station_id: "44243b91-4e78-4ea7-9097-9e7c5c0c99a3", image_url: "/bridge-station-wide-facilities.jpg", caption: "Wash.ME Laundry & Air Towers", display_order: 3, is_primary: false }
  ];

  for (const img of stationImages) {
    const { error } = await client.from("station_images").insert(img);
    if (error && !error.message.includes("duplicate")) console.warn("Station image insert notice:", error.message);
  }
  console.log("✓ Station images seeded");

  // 3. Seed Services
  const services = [
    {
      title: "Gas Delivery",
      description: "Next-day cylinder delivery across Gloucestershire to homes, farms and commercial premises.",
      icon: "Truck",
      image_url: "/service_gas_delivery.jpg",
      cta_label: "Order Gas Online",
      cta_url: "/order-gas",
      display_order: 1,
      is_active: true
    },
    {
      title: "Bulk LPG Supply",
      description: "Scheduled bulk LPG for farms and large estates with automated telemetry monitoring.",
      icon: "Flame",
      image_url: "/service_bulk_supply.jpg",
      cta_label: "Bulk LPG Enquiry",
      cta_url: "/contact",
      display_order: 2,
      is_active: true
    },
    {
      title: "Commercial & Pub Gas",
      description: "Pub, hospitality and industrial catering gas contracts with scheduled replenishment and 30-day invoicing.",
      icon: "Building2",
      image_url: "/service_commercial_gas.jpg",
      cta_label: "Commercial Gas",
      cta_url: "/order-gas",
      display_order: 3,
      is_active: true
    },
    {
      title: "Domestic Heating & Patio",
      description: "Home heating, cooking and barbecue patio gas with prompt doorstep empty cylinder swap.",
      icon: "Home",
      image_url: "/service_domestic_supply.jpg",
      cta_label: "Domestic Gas",
      cta_url: "/order-gas",
      display_order: 4,
      is_active: true
    },
    {
      title: "Cylinder Exchange",
      description: "Swap empty bottles instantly at any of our three forecourt depots in Fromebridge, Cambridge and Frampton.",
      icon: "RefreshCw",
      image_url: "/service_cylinder_exchange.jpg",
      cta_label: "Depot Locations",
      cta_url: "/filling-stations",
      display_order: 5,
      is_active: true
    },
    {
      title: "Emergency Delivery",
      description: "Same-day emergency fuel runs when your tank or heating runs dry during cold snaps.",
      icon: "Siren",
      image_url: "/service_emergency_delivery.jpg",
      cta_label: "Call Support",
      cta_url: "/contact",
      display_order: 6,
      is_active: true
    }
  ];

  for (const srv of services) {
    const { error } = await client.from("services").upsert(srv, { onConflict: "title" });
    if (error) console.warn("Service upsert notice:", error.message);
  }
  console.log("✓ Services seeded");

  // 4. Seed Offers
  const offers = [
    {
      title: "Free Gloucestershire Delivery",
      description: "Free delivery on all cylinder and solid fuel orders over £75 across our 40-mile service radius.",
      badge: "DELIVERY PROMOTION",
      discount_code: "FREEDEL75",
      discount_pct: 0,
      image_url: "/hero-delivery.jpg",
      cta_link: "/order-gas",
      display_order: 1,
      is_active: true
    },
    {
      title: "Winter Fuel Bundle Savings",
      description: "Save 10% when you order 5+ bags of smokeless coal or kiln-dried logs together with any cylinder refill.",
      badge: "SEASONAL SAVER",
      discount_code: "WINTERWARM10",
      discount_pct: 10,
      image_url: "/coal-logs.jpg",
      cta_link: "/order-gas",
      display_order: 2,
      is_active: true
    }
  ];

  for (const off of offers) {
    const { error } = await client.from("offers").upsert(off, { onConflict: "title" });
    if (error) console.warn("Offers upsert notice:", error.message);
  }
  console.log("✓ Offers seeded");

  // 5. Seed Site Content (Home, About, NIZA, Texaco, Contact)
  const siteContent = [
    // HOME PAGE
    { page: "home", section: "hero", key: "eyebrow", content_value: "Family run since 1972" },
    { page: "home", section: "hero", key: "heading", content_value: "Order your gas delivery with us today." },
    { page: "home", section: "hero", key: "subtitle", content_value: "Calor cylinders, coal, logs, fishing baits, animal feed and appliances — supplied and delivered across Gloucestershire by a team you can actually call." },
    { page: "home", section: "hero", key: "badge", content_value: "Next-Day Local Delivery Available" },
    { page: "home", section: "hero", key: "cta_primary_text", content_value: "Order Gas Online" },
    { page: "home", section: "hero", key: "cta_primary_link", content_value: "/order-gas" },
    { page: "home", section: "hero", key: "cta_secondary_text", content_value: "Browse Full Shop" },
    { page: "home", section: "hero", key: "cta_secondary_link", content_value: "/products" },

    // ABOUT PAGE - NIZA SECTION
    { page: "about", section: "niza_announcement", key: "badge", content_value: "COMPANY NEWS" },
    { page: "about", section: "niza_announcement", key: "heading_part1", content_value: "JOHN STAYTE SERVICES" },
    { page: "about", section: "niza_announcement", key: "heading_part2", content_value: "PROUDLY JOINS" },
    { page: "about", section: "niza_announcement", key: "heading_part3", content_value: "NIZA GROUP" },
    { page: "about", section: "niza_announcement", key: "supporting_line", content_value: "A stronger future for our customers, communities and colleagues." },
    { page: "about", section: "niza_announcement", key: "article_title", content_value: "Niza Group Expands with the Acquisition of John Stayte Services" },
    { page: "about", section: "niza_announcement", key: "article_p1", content_value: "John Stayte Services has officially become part of NIZA Group as of 1st July 2026. Customers can expect the same reliable fuel, gas, heating, and retail services, backed by NIZA Group's modern infrastructure, extended supply partnerships, and continuous investment." },
    { page: "about", section: "niza_announcement", key: "article_p2", content_value: "Today marks a significant milestone in the continued growth of Niza Group, as we are delighted to announce the acquisition of John Stayte Services. For over half a century, John Stayte Services has been a pillar of dependability across Gloucestershire — supplying essential energy, LPG cylinders, solid fuels, forecourt services and local convenience to thousands of domestic and commercial clients." },
    { page: "about", section: "niza_announcement", key: "quote_text", content_value: "“Our priority remains unchanged: delivering dependable energy and warm, personal local service to every single household and business across Gloucestershire.”" },
    { page: "about", section: "niza_announcement", key: "cta_button_text", content_value: "Visit NIZA Group" },
    { page: "about", section: "niza_announcement", key: "cta_button_url", content_value: "https://nizagroup.uk" },
    { page: "about", section: "niza_announcement", key: "executive_name", content_value: "Chandran Manoharan" },
    { page: "about", section: "niza_announcement", key: "executive_title", content_value: "Managing Director of Office" },
    { page: "about", section: "niza_announcement", key: "executive_quote", content_value: "“We are delighted to welcome John Stayte Services into the Niza Group family. Together, we are committed to preserving the company’s cherished heritage while investing in forward-thinking energy solutions.”" },

    // ABOUT PAGE - TEXACO MILESTONE
    { page: "about", section: "texaco_milestone", key: "eyebrow", content_value: "LATEST MILESTONE" },
    { page: "about", section: "texaco_milestone", key: "heading", content_value: "TEXACO BRIDGNORTH SERVICE STATION" },
    { page: "about", section: "texaco_milestone", key: "subtitle", content_value: "Quality fuel. Great value. A local stop you can rely on." },
    { page: "about", section: "texaco_milestone", key: "date", content_value: "19 March 2026" },
    { page: "about", section: "texaco_milestone", key: "description", content_value: "We are delighted to announce the acquisition of Texaco Bridgnorth Service Station on 19 March 2026, marking another important milestone in our continued growth as one of the UK’s leading independent forecourt operators." },
    { page: "about", section: "texaco_milestone", key: "station_name", content_value: "Texaco Bridgnorth Service Station" },
    { page: "about", section: "texaco_milestone", key: "station_address", content_value: "Wyken, Bridgnorth, WV15 5NR" },
    { page: "about", section: "texaco_milestone", key: "station_phone", content_value: "01902 965364" },
    { page: "about", section: "texaco_milestone", key: "image_url", content_value: "/texaco-bridgnorth-station.jpg" },
    { page: "about", section: "texaco_milestone", key: "cta_text", content_value: "Learn More About Our Locations" },
    { page: "about", section: "texaco_milestone", key: "cta_url", content_value: "/filling-stations" },

    // CONTACT SETTINGS
    { page: "contact", section: "info", key: "phone", content_value: "01452 741234" },
    { page: "contact", section: "info", key: "email", content_value: "sales@johnstayte.co.uk" },
    { page: "contact", section: "info", key: "head_office", content_value: "John Stayte Services, Eastington Depot, Stonehouse, Gloucestershire, GL10 3SQ" },
    { page: "contact", section: "info", key: "hours", content_value: "Mon–Fri: 8:00am – 5:00pm • Sat: 8:30am – 12:30pm" },
    { page: "contact", section: "info", key: "emergency_phone", content_value: "01452 740753" }
  ];

  for (const item of siteContent) {
    const { error } = await client.from("site_content").upsert(item, {
      onConflict: "page,section,key"
    });
    if (error) console.warn("Site content upsert notice:", error.message);
  }
  console.log("✓ Site content seeded");

  console.log("ALL REAL CMS DATA SEEDED SUCCESSFULLY!");
}

seed();
