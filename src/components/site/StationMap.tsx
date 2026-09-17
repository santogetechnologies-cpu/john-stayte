import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface StationMapProps {
  stations: Array<{
    name: string;
    address: string;
    phone?: string;
    hours?: string;
    image?: string;
    images?: string[];
    image_url?: string;
    latitude?: number;
    longitude?: number;
    maps_link?: string;
    autogas_available?: boolean;
    services?: string[] | string;
  }>;
}

function getPrimaryStationImage(s: {
  name: string;
  image?: string;
  images?: string[];
  image_url?: string;
}): string {
  if (s.image && typeof s.image === "string" && s.image.trim()) {
    return s.image.trim();
  }
  if (
    Array.isArray(s.images) &&
    s.images.length > 0 &&
    typeof s.images[0] === "string" &&
    s.images[0].trim()
  ) {
    return s.images[0].trim();
  }
  if (s.image_url && typeof s.image_url === "string" && s.image_url.trim()) {
    return s.image_url.trim();
  }

  const name = (s.name || "").toLowerCase();
  if (name.includes("wild goose") || name.includes("dursley") || name.includes("cambridge")) {
    return "/wild-goose-garage-1.jpg";
  }
  if (name.includes("fromebridge") || name.includes("whitminster")) {
    return "/fromebridge-service-station-1.jpg";
  }
  if (name.includes("bridge") || name.includes("stonehouse") || name.includes("frampton")) {
    return "/bridge-station-forecourt.jpg";
  }
  return "/fromebridge-service-station-1.jpg";
}

export function StationMap({ stations }: StationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    let isSubscribed = true;

    import("leaflet").then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      const container = mapContainerRef.current;

      // Initialize map once if not created
      if (!mapInstanceRef.current) {
        const map = L.map(container, {
          scrollWheelZoom: false,
          zoomControl: true,
          doubleClickZoom: true,
          touchZoom: true,
          boxZoom: true,
          dragging: true,
        }).setView([51.74, -2.32], 12);

        mapInstanceRef.current = map;

        // Add high quality OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
      }

      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;

      if (markersLayer) {
        markersLayer.clearLayers();
      }

      // Custom Black Pin Marker Icon with smooth pulsing highlight for John Stayte Services
      const stationPinIcon = L.divIcon({
        className: "custom-station-pin",
        html: `
          <div style="position: relative; width: 38px; height: 38px; overflow: visible;">
            <!-- Smooth Pulsing Ring & Aura (Centered on Pin Head) -->
            <div class="station-pin-aura"></div>
            <div class="station-pin-ring"></div>

            <!-- Crisp Black Pin Design -->
            <div class="station-pin-head" style="
              position: relative;
              z-index: 2;
              background: #0f172a;
              width: 38px;
              height: 38px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(15, 23, 42, 0.5);
              border: 2.5px solid #ffffff;
              cursor: pointer;
              transition: transform 0.2s ease;
            ">
              <span style="
                transform: rotate(45deg);
                color: white;
                font-size: 16px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
              ">⛽</span>
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
      });

      const validLatLngs: [number, number][] = [];

      // Add markers for all stations with coordinates
      stations.forEach((s) => {
        if (!s.latitude || !s.longitude) return;

        validLatLngs.push([s.latitude, s.longitude]);

        const stationImg = getPrimaryStationImage(s);
        const mapsUrl =
          s.maps_link ||
          `https://maps.google.com/?q=${encodeURIComponent(s.name + " " + s.address)}`;

        const hasAutogas =
          s.autogas_available ||
          (Array.isArray(s.services) &&
            s.services.some((svc) => String(svc).toLowerCase().includes("autogas"))) ||
          (typeof s.services === "string" && s.services.toLowerCase().includes("autogas"));

        const autogasBadgeHtml = hasAutogas
          ? `<div style="display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; margin-top: 4px; margin-bottom: 5px;">
               <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span> Autogas Available
             </div>`
          : "";

        const popupHtml = `
          <div style="font-family: inherit; width: 240px; padding: 2px;">
            <div style="width: 100%; height: 115px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
              <img src="${stationImg}" alt="${s.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${stationImg}'" />
            </div>
            <h4 style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 800; line-height: 1.25; text-transform: uppercase;">
              ${s.name}
            </h4>
            ${autogasBadgeHtml}
            <p style="margin: ${hasAutogas ? "2px" : "5px"} 0 3px 0; color: #475569; font-size: 12px; font-weight: 500; display: flex; align-items: flex-start; gap: 4px;">
              📍 <span>${s.address}</span>
            </p>
            ${
              s.phone
                ? `<p style="margin: 2px 0 6px 0; color: #64748b; font-size: 11px;">
                     📞 <a href="tel:${s.phone.replace(/\s/g, "")}" style="color: #dc2626; text-decoration: none; font-weight: 600;">${s.phone}</a>
                   </p>`
                : ""
            }
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="
              display: block;
              text-align: center;
              background-color: #dc2626;
              color: #ffffff;
              padding: 7px 12px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 700;
              text-decoration: none;
              margin-top: 6px;
              box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
            ">
              Get directions &rarr;
            </a>
          </div>
        `;

        const marker = L.marker([s.latitude, s.longitude], { icon: stationPinIcon }).bindPopup(
          popupHtml,
          {
            maxWidth: 270,
            className: "station-leaflet-popup",
          },
        );

        if (markersLayer) {
          markersLayer.addLayer(marker);
        } else {
          marker.addTo(map);
        }
      });

      // Fit bounds if we have multiple valid markers
      if (validLatLngs.length > 1) {
        map.fitBounds(validLatLngs, {
          padding: [50, 50],
          maxZoom: 14,
        });
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [mounted, stations]);

  // Complete cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[450px] sm:h-[480px] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 select-none"
      />
      {!mounted && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-sm">
          Loading filling stations map...
        </div>
      )}
    </div>
  );
}
