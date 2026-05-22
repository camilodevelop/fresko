/** Mock coverage zones in Bogotá */
export const COVERAGE_ZONES = [
  "chapinero",
  "usaquén",
  "usaquen",
  "rosales",
  "chicó",
  "chico",
  "zona t",
  "zona g",
  "parque 93",
  "cedritos",
  "santa bárbara",
  "santa barbara",
  "niza",
  "calle 127",
  "calle 100",
  "bogotá",
  "bogota",
];

export function checkCoverage(address: string): {
  covered: boolean;
  message: string;
  eta?: string;
} {
  const normalized = address.toLowerCase().trim();

  if (normalized.length < 5) {
    return {
      covered: false,
      message: "Ingresa una dirección más completa para verificar.",
    };
  }

  const covered = COVERAGE_ZONES.some((zone) => normalized.includes(zone));

  if (covered) {
    return {
      covered: true,
      message: "¡Excelente! Entregamos en tu zona.",
      eta: "45–60 min",
    };
  }

  return {
    covered: false,
    message:
      "Aún no cubrimos esta zona. Déjanos tu dirección y te avisamos cuando lleguemos.",
  };
}
