import { NextRequest, NextResponse } from "next/server";

/** Esri World Geocoding: gratis, sin API key, muy preciso con Calle/Carrera en Bogotá. */
const ESRI =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
const PHOTON = "https://photon.komoot.io/api";

const BOGOTA = {
  location: "-74.09,4.72",
  searchExtent: "-74.22,4.48,-73.98,4.90",
};

type Place = {
  lat: number;
  lng: number;
  label: string;
  name: string;
};

function normalizeAddress(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\bcll?\b\.?/gi, "Calle")
    .replace(/\b(cra|kr|crd)\b\.?/gi, "Carrera")
    .replace(/\b(av)\b\.?/gi, "Avenida")
    .replace(/\b(tv|trans)\b\.?/gi, "Transversal")
    .replace(/\b(dg|diag)\b\.?/gi, "Diagonal")
    .replace(/#/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function esriForward(q: string, maxLocations: number): Promise<Place[]> {
  const params = new URLSearchParams({
    f: "json",
    singleLine: q,
    maxLocations: String(maxLocations),
    countryCode: "COL",
    sourceCountry: "COL",
    langCode: "es",
    location: BOGOTA.location,
    searchExtent: BOGOTA.searchExtent,
    outFields: "Addr_type,PlaceName,StAddr,City,District,Region",
  });

  const res = await fetch(`${ESRI}/findAddressCandidates?${params}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    candidates?: Array<{
      address: string;
      score: number;
      location: { x: number; y: number };
      attributes?: Record<string, string>;
    }>;
  };

  const seen = new Set<string>();
  const places: Place[] = [];

  for (const item of data.candidates ?? []) {
    if (!item.location || item.score < 50) continue;
    const lat = item.location.y;
    const lng = item.location.x;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const attrs = item.attributes ?? {};
    const name =
      attrs.PlaceName ||
      attrs.StAddr ||
      item.address.split(",")[0] ||
      item.address;

    places.push({
      lat,
      lng,
      label: item.address,
      name,
    });
  }

  return places;
}

async function photonForward(q: string, limit: number): Promise<Place[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    lang: "es",
    lat: "4.72",
    lon: "-74.09",
  });

  const res = await fetch(`${PHOTON}?${params}`, {
    headers: { "User-Agent": "FRESKO-coverage/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: Record<string, string>;
    }>;
  };

  return (data.features ?? [])
    .map((f) => {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      const p = f.properties ?? {};
      const name = p.name || p.street || "Lugar";
      const label = [name, p.district, p.city, p.country]
        .filter(Boolean)
        .join(", ");
      return { lat, lng, label, name };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

async function esriReverse(lat: string, lng: string) {
  const params = new URLSearchParams({
    f: "json",
    langCode: "es",
    location: `${lng},${lat}`,
  });
  const res = await fetch(`${ESRI}/reverseGeocode?${params}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    address?: { LongLabel?: string; Match_addr?: string };
    location?: { x: number; y: number };
  };
  if (!data.location) return null;
  return {
    lat: data.location.y,
    lng: data.location.x,
    label: data.address?.LongLabel || data.address?.Match_addr,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  try {
    if (lat && lng) {
      const reverse = await esriReverse(lat, lng);
      if (!reverse) {
        return NextResponse.json({ error: "reverse_failed" }, { status: 502 });
      }
      return NextResponse.json(reverse);
    }

    if (!q || q.length < 3) {
      return NextResponse.json({ error: "query_too_short" }, { status: 400 });
    }

    const suggest = searchParams.get("suggest") === "1";
    const limit = suggest ? 7 : 5;
    const query = normalizeAddress(q);
    const withCity = /bogot[aá]/i.test(query) ? query : `${query}, Bogotá`;

    let places = await esriForward(withCity, limit);
    if (places.length === 0) {
      places = await photonForward(withCity, limit);
    }

    if (!places[0]) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (suggest) {
      return NextResponse.json({ results: places });
    }

    return NextResponse.json(places[0]);
  } catch {
    return NextResponse.json({ error: "geocode_error" }, { status: 500 });
  }
}
