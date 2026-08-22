export type LatLng = { lat: number; lng: number };

/** Centro de Suba */
export const MAP_CENTER: LatLng = { lat: 4.72, lng: -74.09 };

/**
 * Cobertura Suba. El borde derecho sigue la Autopista Norte
 * (Calle 100 → Calle 183). No cruza a Usaquén.
 */
export const SUBA_POLYGON: LatLng[] = [
  // Autopista Norte, de sur a norte
  { lat: 4.685, lng: -74.057 }, // Calle 100
  { lat: 4.691, lng: -74.056 }, // Calle 106
  { lat: 4.698, lng: -74.055 }, // Pepe Sierra / 116
  { lat: 4.707, lng: -74.054 }, // Prado / 127
  { lat: 4.714, lng: -74.053 }, // Alcalá / 134
  { lat: 4.721, lng: -74.052 }, // Calle 142
  { lat: 4.734, lng: -74.051 }, // Mazurén / 153
  { lat: 4.748, lng: -74.049 }, // Toberín
  { lat: 4.754, lng: -74.048 }, // Portal Norte / 170
  { lat: 4.762, lng: -74.046 }, // Calle 183
  // Norte (Calle 183) hacia el oeste y cierre por Suba
  { lat: 4.762, lng: -74.125 },
  { lat: 4.735, lng: -74.132 },
  { lat: 4.700, lng: -74.105 },
  { lat: 4.685, lng: -74.080 },
];

export const COVERAGE_POLYGONS = [SUBA_POLYGON];

export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

export function checkCoverageByCoords(coords: LatLng): {
  covered: boolean;
  message: string;
  detail?: string;
} {
  if (isPointInPolygon(coords, SUBA_POLYGON)) {
    return {
      covered: true,
      message: "¡Sí hay cobertura en Suba!",
      detail:
        "Programa tu entrega y el envío siempre es gratis. Coordinamos la logística por ti.",
    };
  }

  return {
    covered: false,
    message: "Aún no cubrimos esta zona",
    detail:
      "Hoy cubrimos Suba y parte de Usaquén. Pronto llegamos hasta donde estás: déjanos tu dirección y te avisamos.",
  };
}

export function checkCoverageByAddress(address: string): {
  covered: boolean;
  message: string;
  detail?: string;
} {
  const normalized = address.toLowerCase().trim();

  if (normalized.length < 4) {
    return {
      covered: false,
      message: "Ingresa una dirección más completa para verificar.",
    };
  }

  const inSuba = [
    "suba",
    "niza",
    "colina",
    "britania",
    "lisboa",
    "bilbao",
    "costa azul",
    "prado veraniego",
  ].some((z) => normalized.includes(z));

  if (inSuba) {
    return {
      covered: true,
      message: "¡Sí hay cobertura en Suba!",
      detail:
        "Programa tu entrega y el envío siempre es gratis. Coordinamos la logística por ti.",
    };
  }

  return {
    covered: false,
    message: "Aún no cubrimos esta zona",
    detail:
      "Hoy cubrimos Suba y parte de Usaquén. Pronto llegamos hasta donde estás: déjanos tu dirección y te avisamos.",
  };
}
