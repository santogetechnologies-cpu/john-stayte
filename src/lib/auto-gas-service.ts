import { supabase } from "./supabase";

export interface AutoGasStation {
  id: string;
  station_number: string;
  name: string;
  slug: string;
  address: string;
  town?: string | null;
  county?: string | null;
  postcode: string;
  telephone: string;
  opening_hours?: string | null;
  service?: string | null;
  badge?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  maps_url?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const INITIAL_AUTO_GAS_STATIONS: AutoGasStation[] = [
  {
    id: "a1111111-1111-4111-a111-111111111101",
    station_number: "LOCATION 01",
    name: "John Stayte Services – Cirencester",
    slug: "cirencester",
    address: "82 Chesterton Lane",
    town: "Cirencester",
    county: "Gloucestershire",
    postcode: "GL7 1YD",
    telephone: "01285 654614",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
    service: "Auto Gas",
    badge: "Auto Gas Available",
    latitude: 51.7061,
    longitude: -1.9702,
    maps_url: "https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+82+Chesterton+Lane+Cirencester+GL7+1YD",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1111111-1111-4111-a111-111111111102",
    station_number: "LOCATION 02",
    name: "John Stayte Services – Gloucester",
    slug: "gloucester",
    address: "1A Kingsholm Road",
    town: "Gloucester",
    county: "Gloucestershire",
    postcode: "GL1 3AX",
    telephone: "01452 525692",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
    service: "Auto Gas",
    badge: "Auto Gas Available",
    latitude: 51.8719,
    longitude: -2.2435,
    maps_url: "https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+1A+Kingsholm+Road+Gloucester+GL1+3AX",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1111111-1111-4111-a111-111111111103",
    station_number: "LOCATION 03",
    name: "John Stayte Services – Stroud",
    slug: "stroud",
    address: "Dr Newton’s Way, Fromeside",
    town: "Stroud",
    county: "Gloucestershire",
    postcode: "GL5 3JX",
    telephone: "01453 762541",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
    service: "Auto Gas",
    badge: "Auto Gas Available",
    latitude: 51.7456,
    longitude: -2.2215,
    maps_url: "https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+Dr+Newtons+Way+Fromeside+Stroud+GL5+3JX",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1111111-1111-4111-a111-111111111104",
    station_number: "LOCATION 04",
    name: "John Stayte Services – Weston Super Mare",
    slug: "weston-super-mare",
    address: "Searle Crescent",
    town: "Weston-Super-Mare",
    county: "North Somerset",
    postcode: "BS23 3YX",
    telephone: "01934 621375",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
    service: "Auto Gas",
    badge: "Auto Gas Available",
    latitude: 51.3412,
    longitude: -2.9567,
    maps_url: "https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+Searle+Crescent+Weston-Super-Mare+BS23+3YX",
    display_order: 4,
    is_active: true,
  },
];

/**
 * Loads all active Auto Gas stations from Supabase.
 * Respects RLS and orders by display_order ascending.
 */
export async function fetchPublicAutoGasStations(): Promise<AutoGasStation[]> {
  try {
    const [{ data: tableStations, error: tableErr }, { data: blockData, error: blockErr }] =
      await Promise.all([
        supabase
          .from("auto_gas_stations")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "auto_gas_stations_data")
          .maybeSingle(),
      ]);

    if (!tableErr && tableStations && tableStations.length > 0) {
      return tableStations as AutoGasStation[];
    }

    if (!blockErr && blockData?.content) {
      try {
        const parsed = JSON.parse(blockData.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((s: AutoGasStation) => s.is_active !== false);
        }
      } catch {}
    }

    return INITIAL_AUTO_GAS_STATIONS;
  } catch (err) {
    console.warn("fetchPublicAutoGasStations error:", err);
    return INITIAL_AUTO_GAS_STATIONS;
  }
}

/**
 * Loads all Auto Gas stations (including inactive ones) for the Admin portal.
 */
export async function fetchAdminAutoGasStations(): Promise<AutoGasStation[]> {
  try {
    const [{ data: tableStations, error: tableErr }, { data: blockData, error: blockErr }] =
      await Promise.all([
        supabase
          .from("auto_gas_stations")
          .select("*")
          .order("display_order", { ascending: true }),
        supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "auto_gas_stations_data")
          .maybeSingle(),
      ]);

    if (!tableErr && tableStations && tableStations.length > 0) {
      return tableStations as AutoGasStation[];
    }

    if (!blockErr && blockData?.content) {
      try {
        const parsed = JSON.parse(blockData.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }

    return INITIAL_AUTO_GAS_STATIONS;
  } catch (err) {
    console.warn("fetchAdminAutoGasStations error:", err);
    return INITIAL_AUTO_GAS_STATIONS;
  }
}

/**
 * Saves or updates a station directly in the Supabase production database.
 */
export async function saveAutoGasStation(
  station: AutoGasStation,
  allStations: AutoGasStation[],
): Promise<{ success: boolean; data?: AutoGasStation; error?: string }> {
  try {
    const updatedList = allStations.map((s) => (s.id === station.id ? station : s));
    if (!allStations.some((s) => s.id === station.id)) {
      updatedList.push(station);
    }

    // 1. Direct Table Upsert
    const { error: tableError } = await supabase
      .from("auto_gas_stations")
      .upsert({
        id: station.id,
        station_number: station.station_number,
        name: station.name,
        slug: station.slug || station.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        address: station.address,
        town: station.town || null,
        county: station.county || null,
        postcode: station.postcode,
        telephone: station.telephone,
        opening_hours: station.opening_hours || null,
        service: station.service || "Auto Gas",
        badge: station.badge || "Auto Gas Available",
        latitude: station.latitude || null,
        longitude: station.longitude || null,
        maps_url: station.maps_url || null,
        image_url: station.image_url || null,
        display_order: station.display_order,
        is_active: station.is_active,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    // 2. CMS Content Blocks Synchronization (Ensures instant fallback sync)
    const { error: blockError } = await supabase
      .from("cms_content_blocks")
      .upsert(
        {
          section_key: "auto_gas_stations_data",
          title: "Auto Gas Filling Stations Directory",
          content: JSON.stringify(updatedList),
        },
        { onConflict: "section_key" },
      );

    if (tableError && blockError) {
      return { success: false, error: tableError.message || blockError.message };
    }

    // Notify listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auto_gas_stations_updated"));
    }

    return { success: true, data: station };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update Auto Gas station." };
  }
}

export interface EastingtonFacilityHighlight {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  supportingText?: string;
  image_url: string;
  is_active: boolean;
}

export const DEFAULT_EASTINGTON_HIGHLIGHT: EastingtonFacilityHighlight = {
  eyebrow: "EASTINGTON GAS FACILITY",
  title: "Our Gas Tank in Eastington",
  description: "This is the gas tank in Eastington.",
  supportingText: "A dedicated visual highlight of our Eastington gas facility.",
  image_url: "/eastington_gas_tank.jpg",
  is_active: true,
};

/**
 * Loads the Eastington Gas Facility Highlight content from Supabase.
 */
export async function fetchEastingtonHighlight(): Promise<EastingtonFacilityHighlight> {
  try {
    const { data, error } = await supabase
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", "eastington_facility_highlight")
      .maybeSingle();

    if (!error && data?.content) {
      try {
        const parsed = JSON.parse(data.content);
        if (parsed && typeof parsed === "object") {
          return {
            ...DEFAULT_EASTINGTON_HIGHLIGHT,
            ...parsed,
          };
        }
      } catch {}
    }

    return DEFAULT_EASTINGTON_HIGHLIGHT;
  } catch (err) {
    console.warn("fetchEastingtonHighlight notice:", err);
    return DEFAULT_EASTINGTON_HIGHLIGHT;
  }
}

/**
 * Saves or updates the Eastington Gas Facility Highlight content in Supabase.
 */
export async function saveEastingtonHighlight(
  highlight: EastingtonFacilityHighlight,
): Promise<{ success: boolean; data?: EastingtonFacilityHighlight; error?: string }> {
  try {
    const { error } = await supabase.from("cms_content_blocks").upsert(
      {
        section_key: "eastington_facility_highlight",
        title: "Eastington Gas Facility Highlight",
        content: JSON.stringify(highlight),
      },
      { onConflict: "section_key" },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("eastington_highlight_updated"));
      window.dispatchEvent(new CustomEvent("auto_gas_stations_updated"));
    }

    return { success: true, data: highlight };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save Eastington highlight." };
  }
}

/**
 * Realtime subscription listener for Auto Gas stations & Eastington facility highlight.
 */
export function subscribeToAutoGasChanges(callback: () => void): () => void {
  const channel = supabase
    .channel("auto_gas_stations_channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "auto_gas_stations" },
      () => callback(),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cms_content_blocks",
      },
      () => callback(),
    )
    .subscribe();

  const handleUpdate = () => callback();
  if (typeof window !== "undefined") {
    window.addEventListener("auto_gas_stations_updated", handleUpdate);
    window.addEventListener("eastington_highlight_updated", handleUpdate);
  }

  return () => {
    supabase.removeChannel(channel);
    if (typeof window !== "undefined") {
      window.removeEventListener("auto_gas_stations_updated", handleUpdate);
      window.removeEventListener("eastington_highlight_updated", handleUpdate);
    }
  };
}

