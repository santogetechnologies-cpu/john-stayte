import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface StationMapProps {
  stations: Array<{
    name: string;
    address: string;
    phone?: string;
    hours?: string;
    image?: string;
    latitude?: number;
    longitude?: number;
    maps_link?: string;
  }>;
}

export function StationMap({ stations }: StationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainerRef.current || mapInstanceRef.current) return;

    let isSubscribed = true;

    let cleanupListeners: (() => void) | null = null;

    import("leaflet").then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      const container = mapContainerRef.current;

      // Prevent duplicate initialization
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Center around Gloucestershire (approx 51.76, -2.36)
      // Enable independent scrollWheelZoom on map only
      const map = L.map(container, {
        scrollWheelZoom: true,
        wheelDebounceTime: 40,
        wheelPxPerZoomLevel: 60,
        zoomControl: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
      }).setView([51.758, -2.365], 12);

      mapInstanceRef.current = map;

      // Disable scroll propagation to parent document
      L.DomEvent.disableScrollPropagation(container);

      // Prevent wheel/trackpad gestures from triggering full-browser page zoom
      const handleWheel = (e: WheelEvent) => {
        e.stopPropagation();
        if (e.ctrlKey) {
          e.preventDefault();
        }
      };

      const handleGesture = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };

      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("gesturestart", handleGesture, { passive: false });
      container.addEventListener("gesturechange", handleGesture, { passive: false });

      cleanupListeners = () => {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("gesturestart", handleGesture);
        container.removeEventListener("gesturechange", handleGesture);
      };

      // Add high quality OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Red Pin Marker Icon with smooth pulsing highlight for John Stayte Services
      const stationPinIcon = L.divIcon({
        className: "custom-station-pin",
        html: `
          <div style="position: relative; width: 38px; height: 38px; overflow: visible;">
            <!-- Smooth Pulsing Ring & Aura (Centered on Pin Head) -->
            <div class="station-pin-aura"></div>
            <div class="station-pin-ring"></div>

            <!-- Existing Red Pin Design (Unchanged) -->
            <div class="station-pin-head" style="
              position: relative;
              z-index: 2;
              background: #dc2626;
              width: 38px;
              height: 38px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(220, 38, 38, 0.45);
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

        const mapsUrl =
          s.maps_link ||
          `https://maps.google.com/?q=${encodeURIComponent(s.name + " " + s.address)}`;

        const popupHtml = `
          <div style="font-family: inherit; width: 240px; padding: 2px;">
            ${
              s.image
                ? `<div style="width: 100%; height: 115px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
                     <img src="${s.image}" alt="${s.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/station.jpg'" />
                   </div>`
                : ""
            }
            <h4 style="margin: 0; color: #dc2626; font-size: 15px; font-weight: 800; line-height: 1.25; text-transform: uppercase;">
              ${s.name}
            </h4>
            <p style="margin: 5px 0 3px 0; color: #475569; font-size: 12px; font-weight: 500; display: flex; align-items: flex-start; gap: 4px;">
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

        L.marker([s.latitude, s.longitude], { icon: stationPinIcon })
          .addTo(map)
          .bindPopup(popupHtml, {
            maxWidth: 270,
            className: "station-leaflet-popup",
          });
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
      if (cleanupListeners) {
        cleanupListeners();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, stations]);

  return (
    <div className="relative w-full h-[450px] sm:h-[480px] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 overscroll-contain select-none"
        style={{ overscrollBehavior: "contain" }}
      />
      {!mounted && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-sm">
          Loading filling stations map...
        </div>
      )}
    </div>
  );
}
