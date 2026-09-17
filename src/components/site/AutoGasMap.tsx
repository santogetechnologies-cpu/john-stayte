import { useEffect, useRef, useState } from "react";
import type { AutoGasStation } from "@/lib/auto-gas-service";
import "leaflet/dist/leaflet.css";

interface AutoGasMapProps {
  stations: AutoGasStation[];
}

export function AutoGasMap({ stations }: AutoGasMapProps) {
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

      // Initialize map instance once
      if (!mapInstanceRef.current) {
        const map = L.map(container, {
          scrollWheelZoom: false,
          zoomControl: true,
          doubleClickZoom: true,
          touchZoom: true,
          boxZoom: true,
          dragging: true,
        }).setView([51.65, -2.4], 10);

        mapInstanceRef.current = map;

        // OpenStreetMap Tile Layer
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

      // Premium Black / Dark Station Pin Marker (matching standard JSS station map style)
      const stationDarkPinIcon = L.divIcon({
        className: "custom-autogas-dark-pin",
        html: `
          <div style="position: relative; width: 38px; height: 38px; overflow: visible;">
            <!-- Outer Dark Pulsing Ring Glow -->
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: rgba(15, 23, 42, 0.25);
              animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>

            <!-- Crisp Black/Dark Pin Head with White Outline & Shadow -->
            <div style="
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
              box-shadow: 0 4px 14px rgba(15, 23, 42, 0.45);
              border: 2.5px solid #ffffff;
              cursor: pointer;
              transition: transform 0.2s ease;
            ">
              <span style="
                transform: rotate(45deg);
                color: #ffffff;
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

      // Add verified markers for the 4 Auto Gas stations
      stations.forEach((s) => {
        if (!s.latitude || !s.longitude) return;

        validLatLngs.push([s.latitude, s.longitude]);

        const phoneClean = s.telephone.replace(/[^0-9+]/g, "");
        const phoneTel = phoneClean.startsWith("0")
          ? `+44${phoneClean.slice(1)}`
          : phoneClean.startsWith("+")
            ? phoneClean
            : `+44${phoneClean}`;

        const googleMapsUrl =
          s.maps_url ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${s.name}, ${s.address}, ${s.postcode}`,
          )}`;

        const popupHtml = `
          <div style="font-family: inherit; width: 250px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">
                ${s.station_number}
              </span>
              <span style="display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px;">
                <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #10b981;"></span> ${s.badge || "Auto Gas Available"}
              </span>
            </div>

            <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 14px; font-weight: 900; line-height: 1.25;">
              ${s.name}
            </h4>

            <p style="margin: 0 0 4px 0; color: #475569; font-size: 12px; font-weight: 500; display: flex; align-items: flex-start; gap: 4px; line-height: 1.35;">
              📍 <span>${s.address}${s.town ? `, ${s.town}` : ""}, <strong>${s.postcode}</strong></span>
            </p>

            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 11px; font-weight: 600;">
              📞 <a href="tel:${phoneTel}" style="color: #dc2626; text-decoration: none; font-weight: 700;">${s.telephone}</a>
            </p>

            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="
              display: block;
              text-align: center;
              background-color: #dc2626;
              color: #ffffff;
              padding: 7px 12px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 800;
              text-decoration: none;
              box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
            ">
              Get Directions &rarr;
            </a>
          </div>
        `;

        const marker = L.marker([s.latitude, s.longitude], { icon: stationDarkPinIcon }).bindPopup(
          popupHtml,
          {
            maxWidth: 280,
            className: "station-leaflet-popup",
          },
        );

        if (markersLayer) {
          markersLayer.addLayer(marker);
        } else {
          marker.addTo(map);
        }
      });

      // Fit bounds to show all 4 verified stations with clean padding
      if (validLatLngs.length > 1) {
        map.fitBounds(validLatLngs, {
          padding: [50, 50],
          maxZoom: 13,
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
    <div className="w-full">
      {/* Full-Width Interactive Auto Gas Map Container */}
      <div className="w-full h-[460px] sm:h-[520px] lg:h-[580px] rounded-2xl sm:rounded-3xl lg:rounded-[32px] overflow-hidden border border-slate-200/90 shadow-2xs relative bg-slate-100">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0 select-none"
        />
        {!mounted && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-sm">
            Loading Auto Gas location map…
          </div>
        )}
      </div>
    </div>
  );
}
