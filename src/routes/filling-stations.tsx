import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  MapPin,
  Navigation,
  Phone,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Leaf,
  ShoppingBag,
  CircleDot,
  Droplet,
  Flame,
  Sparkles,
  ArrowRight,
  Truck,
  Gauge,
  Car,
  Zap,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { StationMap } from "@/components/site/StationMap";

const DEFAULT_STATIONS = [
  {
    id: "st-1",
    name: "Wild Goose Garage",
    address: "Bristol Road, Cambridge, Gloucestershire GL2 7AL",
    town: "Gloucester",
    postcode: "GL2 7AL",
    phone: "01453 890123",
    hours: "Mon–Sat 7:00–19:00 • Sun 9:00–17:00",
    autogas_available: true,
    maps_link: "https://maps.google.com/?q=Wild+Goose+Garage+Gloucester",
    services: ["Fuel", "Autogas", "Shop", "Air", "AdBlue"],
    images: [
      "/wild-goose-garage-1.jpg",
      "/wild-goose-garage-2.jpg",
      "/wild-goose-garage-3.jpg",
      "/wild-goose-garage-4.jpg",
      "/wild-goose-garage-5.jpg",
    ],
    latitude: 51.7389,
    longitude: -2.3842,
  },
  {
    id: "st-2",
    name: "Fromebridge Service Station",
    address: "Fromebridge, Whitminster, Gloucestershire GL2 7PD",
    town: "Gloucester",
    postcode: "GL2 7PD",
    phone: "01452 741234",
    hours: "Mon–Sat 7:00–20:00 • Sun 8:00–18:00",
    autogas_available: true,
    maps_link: "https://maps.google.com/?q=Fromebridge+Service+Station+Whitminster",
    services: [
      "Fuel Pumps",
      "HGV / Large Vehicle Pumps",
      "Car Wash",
      "Air Pressure & Tyre Inflation",
      "Convenience Store & Shop",
      "Autogas LPG & Cylinder Exchange",
      "Easy Vehicle Access",
      "Forecourt & Customer Parking",
      "AdBlue Dispenser",
    ],
    images: [
      "/fromebridge-service-station-1.jpg",
      "/fromebridge-service-station-2.jpg",
      "/fromebridge-service-station-new-1.jpg",
      "/fromebridge-service-station-new-2.jpg",
    ],
    latitude: 51.7694,
    longitude: -2.3486,
  },
  {
    id: "st-3",
    name: "Bridge Service Station",
    address: "Bridge Road, Frampton on Severn, Gloucestershire GL2 7EP",
    town: "Gloucester",
    postcode: "GL2 7EP",
    phone: "01452 740567",
    hours: "Mon–Fri 6:30–20:00 • Sat–Sun 8:00–18:00",
    autogas_available: false,
    maps_link: "https://maps.google.com/?q=Bridge+Service+Station+Frampton+on+Severn",
    services: [
      "Texaco Supreme Fuel",
      "NETAVOLT Rapid EV Charging",
      "Car Wash & Jet Wash",
      "Air Pressure & Screen Wash",
      "Stonehouse Autoparts & Londis",
      "Calor Gas Cylinders",
      "Coal & Solid Fuel Logs",
      "HGV High-Flow Pumps",
      "Wash.ME 24/7 Laundry",
    ],
    images: [
      "/bridge-station-ev-totem.jpg",
      "/bridge-station-forecourt-lanes.jpg",
      "/bridge-station-netavolt-ev-charger.jpg",
    ],
    latitude: 51.7719,
    longitude: -2.3681,
  },
];

const normalizeServices = (services: any): string[] => {
  if (Array.isArray(services)) {
    return services.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof services === "string") {
    return services.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return ["Fuel", "Autogas", "Shop", "Air", "AdBlue"];
};

const getStationImages = (s: any): string[] => {
  const name = (s.name || "").toLowerCase();
  if (name.includes("wild goose") || name.includes("cambridge")) {
    return [
      "/wild-goose-garage-1.jpg",
      "/wild-goose-garage-2.jpg",
      "/wild-goose-garage-3.jpg",
      "/wild-goose-garage-4.jpg",
      "/wild-goose-garage-5.jpg",
    ];
  }
  if (name.includes("fromebridge") || name.includes("whitminster")) {
    return [
      "/fromebridge-service-station-1.jpg",
      "/fromebridge-service-station-2.jpg",
      "/fromebridge-service-station-new-1.jpg",
      "/fromebridge-service-station-new-2.jpg",
    ];
  }
  if (name.includes("bridge") || name.includes("frampton")) {
    return [
      "/bridge-station-ev-totem.jpg",
      "/bridge-station-forecourt-lanes.jpg",
      "/bridge-station-netavolt-ev-charger.jpg",
    ];
  }
  if (Array.isArray(s.images) && s.images.length > 0) {
    return s.images;
  }
  if (s.image_url) return [s.image_url];
  if (s.image) return [s.image];
  return ["/bridge-station-ev-totem.jpg"];
};

const getStationCoordinates = (station: any): { lat: number; lng: number } => {
  if (station.latitude && station.longitude) {
    return { lat: Number(station.latitude), lng: Number(station.longitude) };
  }
  const name = (station.name || "").toLowerCase();
  if (name.includes("wild goose") || name.includes("cambridge")) return { lat: 51.7389, lng: -2.3842 };
  if (name.includes("fromebridge")) return { lat: 51.7694, lng: -2.3486 };
  if (name.includes("bridge") || name.includes("frampton")) return { lat: 51.7719, lng: -2.3681 };
  return { lat: 51.76, lng: -2.36 };
};

function ServiceChip({ name }: { name: string }) {
  const n = name.toLowerCase();
  let icon = <Fuel className="h-3.5 w-3.5 text-primary shrink-0" />;

  if (n.includes("ev") || n.includes("electric") || n.includes("charging") || n.includes("netavolt")) {
    icon = <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20 shrink-0" />;
  } else if (n.includes("hgv") || n.includes("large vehicle") || n.includes("truck")) {
    icon = <Truck className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
  } else if (n.includes("air") || n.includes("pressure") || n.includes("tyre") || n.includes("inflation") || n.includes("screen wash")) {
    icon = <Gauge className="h-3.5 w-3.5 text-cyan-600 shrink-0" />;
  } else if (n.includes("wash") || n.includes("laundry") || n.includes("clean")) {
    icon = <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />;
  } else if (n.includes("parking")) {
    icon = <CircleDot className="h-3.5 w-3.5 text-slate-600 shrink-0" />;
  } else if (n.includes("access")) {
    icon = <Navigation className="h-3.5 w-3.5 text-rose-600 shrink-0" />;
  } else if (n.includes("autogas") || n.includes("lpg")) {
    icon = <Leaf className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
  } else if (n.includes("shop") || n.includes("store") || n.includes("coffee") || n.includes("londis") || n.includes("costa") || n.includes("convenience") || n.includes("autoparts")) {
    icon = <ShoppingBag className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
  } else if (n.includes("adblue")) {
    icon = <Droplet className="h-3.5 w-3.5 text-sky-600 shrink-0" />;
  } else if (n.includes("cylinder") || n.includes("solid") || n.includes("gas") || n.includes("coal") || n.includes("logs")) {
    icon = <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  }

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs sm:text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors">
      {icon}
      <span>{name}</span>
    </div>
  );
}

/**
 * Station Section Card matching Services Page Typography Scale & Hierarchy
 */
function StationSectionBlock({ station, index }: { station: any; index: number }) {
  const images = getStationImages(station);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [prevImgIdx, setPrevImgIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImgIdx((curr) => {
        setPrevImgIdx(curr);
        return (curr + 1) % images.length;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [images.length]);

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((curr) => {
      setPrevImgIdx(curr);
      return (curr + 1) % images.length;
    });
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((curr) => {
      setPrevImgIdx(curr);
      return (curr - 1 + images.length) % images.length;
    });
  };

  const services = normalizeServices(station.services);
  const mapsLink =
    station.maps_link ||
    station.maps_url ||
    `https://maps.google.com/?q=${encodeURIComponent(station.name + " " + station.address)}`;

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all duration-300 overflow-hidden p-5 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-center">
        {/* LEFT SIDE: Station Information matching Services Page Typography */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs sm:text-[13px] font-extrabold uppercase tracking-[0.16em] text-primary font-display">
                LOCATION {String(index + 1).padStart(2, "0")}
              </span>
              {station.autogas_available && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Autogas Available
                </span>
              )}
            </div>

            {/* Station Title matching Services card title font-display font-black */}
            <h2 className="text-xl sm:text-2xl lg:text-[28px] font-black text-primary font-display tracking-tight leading-snug">
              {station.name}
            </h2>
            <div className="w-10 h-1 bg-primary rounded-full mt-2 mb-4" />
          </div>

          {/* Details Rows matching Services page body typography */}
          <div className="space-y-3 pt-0.5">
            {/* Address */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</div>
                <div className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed">{station.address}</div>
              </div>
            </div>

            {/* Telephone */}
            {station.phone && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telephone</div>
                  <a
                    href={`tel:${station.phone.replace(/\s/g, "")}`}
                    className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-primary transition-colors"
                  >
                    {station.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Opening Hours */}
            {station.hours && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opening Hours</div>
                  <div className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed">{station.hours}</div>
                </div>
              </div>
            )}
          </div>

          {/* Service Chips */}
          {services.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Available Services
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <ServiceChip key={svc} name={svc} />
                ))}
              </div>
            </div>
          )}

          {/* Button matching Services page CTA typography */}
          <div className="pt-2">
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm py-2.5 px-5 w-full sm:w-72 transition-colors shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 fill-white text-white rotate-45" />
                <span>Get directions</span>
              </div>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </a>
          </div>
        </div>

        {/* RIGHT SIDE: Station Image Slideshow */}
        <div className="lg:col-span-7">
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative w-full rounded-none overflow-hidden shadow-md bg-slate-100 h-[340px] sm:h-[380px] lg:h-[410px] border border-slate-200/80 group"
          >
            {/* Smooth Cross-Fade Image Slideshow (Fixed Container, Zero Movement) */}
            <div className="relative w-full h-full overflow-hidden">
              {images.map((img, idx) => {
                const isCurrent = idx === currentImgIdx;
                const isPrevious = idx === prevImgIdx;

                return (
                  <img
                    key={img}
                    src={img}
                    alt={`${station.name} view ${idx + 1}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    style={{ willChange: "opacity" }}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out select-none pointer-events-none ${isCurrent
                        ? "opacity-100 z-10"
                        : isPrevious
                          ? "opacity-0 z-5"
                          : "opacity-0 z-0"
                      }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = images[0] || "/wild-goose-garage-1.jpg";
                    }}
                  />
                );
              })}
            </div>

            {/* Arrow Controls */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImg}
                  aria-label={`Previous ${station.name} photo`}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-10 cursor-pointer border border-slate-100 opacity-80 group-hover:opacity-100"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-800 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={nextImg}
                  aria-label={`Next ${station.name} photo`}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-10 cursor-pointer border border-slate-100 opacity-80 group-hover:opacity-100"
                >
                  <ChevronRight className="h-4 w-4 text-slate-800 stroke-[2.5]" />
                </button>
              </>
            )}

            {/* Pagination Dots - Positioned at Bottom Center with White Active Pill */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md z-10 border border-white/20">
                {images.map((_, dotIdx) => (
                  <button
                    type="button"
                    key={dotIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImgIdx((curr) => {
                        setPrevImgIdx(curr);
                        return dotIdx;
                      });
                    }}
                    aria-label={`Go to ${station.name} photo ${dotIdx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${dotIdx === currentImgIdx
                        ? "bg-white w-5.5 shadow-xs"
                        : "bg-white/50 hover:bg-white/80 w-2"
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export const Route = createFileRoute("/filling-stations")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Filling Stations | John Stayte Services Gloucestershire" },
      {
        name: "description",
        content:
          "Visit Wild Goose Garage, Fromebridge Service Station, or Bridge Service Station for fuel, autogas and cylinder exchange.",
      },
      { property: "og:title", content: "Our Filling Stations | John Stayte Services" },
      { property: "og:description", content: "Three Gloucestershire forecourts for fuel, gas and cylinder exchange." },
    ],
  }),
  component: Stations,
});

function Stations() {
  const [stationList, setStationList] = useState<any[]>(DEFAULT_STATIONS);

  useEffect(() => {
    async function loadStations() {
      try {
        const { data: dbStations } = await supabase
          .from("stations")
          .select("*")
          .order("name", { ascending: true });

        const { data: block } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "stations_data")
          .maybeSingle();

        let parsedBlock: any[] = [];
        if (block?.content) {
          try {
            parsedBlock = JSON.parse(block.content);
          } catch { }
        }

        const stationMap = new Map<string, any>();
        DEFAULT_STATIONS.forEach((s) => stationMap.set(s.name.toLowerCase(), s));

        if (Array.isArray(parsedBlock) && parsedBlock.length > 0) {
          parsedBlock.forEach((s) => {
            const key = (s.name || "").toLowerCase();
            stationMap.set(key, { ...stationMap.get(key), ...s });
          });
        }

        if (Array.isArray(dbStations) && dbStations.length > 0) {
          dbStations.forEach((s) => {
            const key = (s.name || "").toLowerCase();
            stationMap.set(key, { ...stationMap.get(key), ...s });
          });
        }

        const merged = Array.from(stationMap.values()).map((s) => {
          const coords = getStationCoordinates(s);
          const formattedAddress = s.address.includes(s.postcode || "")
            ? s.address
            : s.address + (s.postcode ? `, ${s.postcode}` : "");

          return {
            ...s,
            address: formattedAddress,
            phone: s.phone || "01453 890123",
            hours: s.hours || "Mon–Sat 7:00–19:00 • Sun 9:00–17:00",
            images: getStationImages(s),
            latitude: coords.lat,
            longitude: coords.lng,
            maps_link:
              s.maps_link ||
              s.maps_url ||
              `https://maps.google.com/?q=${encodeURIComponent(s.name + " " + formattedAddress)}`,
          };
        });

        // Exact Vertical Order:
        // 1. Wild Goose Garage
        // 2. Fromebridge Service Station
        // 3. Bridge Service Station
        const orderWeight = (name: string) => {
          const n = (name || "").toLowerCase();
          if (n.includes("wild goose") || n.includes("cambridge")) return 1;
          if (n.includes("fromebridge") || n.includes("whitminster")) return 2;
          if (n.includes("bridge") || n.includes("frampton")) return 3;
          return 4;
        };

        merged.sort((a, b) => orderWeight(a.name) - orderWeight(b.name));

        setStationList(merged);
      } catch (err) {
        console.error("Stations load error:", err);
      }
    }

    loadStations();

    const handleUpdate = () => loadStations();
    window.addEventListener("cms_stations_updated", handleUpdate);
    return () => window.removeEventListener("cms_stations_updated", handleUpdate);
  }, []);

  return (
    <SiteLayout>
      <div className="bg-[#fcfdfe] min-h-[85vh] py-8 sm:py-10 lg:py-12 border-b border-slate-200/60">
        <div className="container-page max-w-[88rem] px-2 sm:px-3.5 lg:px-4 space-y-8 sm:space-y-10">
          {/* Header matching Services page heading size, font weights & spacing */}
          <div className="space-y-2 mb-8 sm:mb-10 text-left">
            <p className="text-xs sm:text-[13px] font-extrabold uppercase tracking-[0.16em] text-primary font-display">
              LOCATIONS
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-[1.1] font-display">
              Our <span className="text-primary">filling stations</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-2xl">
              Three Gloucestershire forecourts for fuel, autogas, cylinder exchange and shop essentials.
            </p>
          </div>

          {/* VERTICAL SHOWCASE: 3 STATIONS WITH EXACT SERVICES PAGE DESIGN LANGUAGE */}
          <div className="space-y-6 sm:space-y-8">
            {stationList.map((station, index) => (
              <StationSectionBlock
                key={station.id || station.name}
                station={station}
                index={index}
              />
            ))}
          </div>

          {/* 3-FEATURE HIGHLIGHT BANNER matching Services card style */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Feature 1: Quality Fuel */}
            <div className="flex items-center gap-3.5 pt-3 md:pt-0 first:pt-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0">
                <Fuel className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-display leading-snug">
                  Quality Fuel
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed mt-0.5">
                  High quality fuels to keep you moving
                </p>
              </div>
            </div>

            {/* Feature 2: Forecourt Shop */}
            <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-display leading-snug">
                  Forecourt Shop
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed mt-0.5">
                  Snacks, drinks and essentials on the go
                </p>
              </div>
            </div>

            {/* Feature 3: Cylinder Exchange */}
            <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-display leading-snug">
                  Cylinder Exchange
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed mt-0.5">
                  Easy swap for gas cylinders and accessories
                </p>
              </div>
            </div>
          </div>

          {/* FORECOURT LOCATIONS MAP */}
          <div className="space-y-3 pt-2">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-display tracking-tight flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary stroke-[2]" /> Forecourt Locations Map
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                  Interactive map of our Gloucestershire forecourts. Click any pin for station address and directions.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" /> 3 Forecourts Active
              </div>
            </div>

            <StationMap stations={stationList} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
