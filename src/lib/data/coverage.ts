export type LatLng = { lat: number; lng: number };

/** Zona de cobertura tal como la expone la base de datos. */
export type CoverageZone = {
  id: string;
  name: string;
  cityName: string;
  color: string;
  polygon: LatLng[];
};

/** Centro por defecto del mapa: suroccidente de Bogotá. */
export const MAP_CENTER: LatLng = { lat: 4.625, lng: -74.15 };

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

export function findZone(coords: LatLng, zones: CoverageZone[]) {
  return zones.find((z) => z.polygon.length >= 3 && isPointInPolygon(coords, z.polygon));
}

export function zoneNames(zones: CoverageZone[]): string {
  const names = zones.map((z) => z.name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}

export function checkCoverageByCoords(
  coords: LatLng,
  zones: CoverageZone[]
): { covered: boolean; message: string; detail?: string } {
  const zone = findZone(coords, zones);
  if (zone) {
    return {
      covered: true,
      message: `¡Sí hay cobertura en ${zone.name}!`,
      detail: "Programa tu entrega desde el día siguiente. Coordinamos la logística por ti.",
    };
  }

  return {
    covered: false,
    message: "Aún no cubrimos esta zona",
    detail: zones.length
      ? `Hoy cubrimos ${zoneNames(zones)}. Pronto llegamos hasta donde estás.`
      : "Pronto llegamos hasta donde estás.",
  };
}
