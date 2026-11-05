/**
 * Planeación de rutas de entrega.
 *  1. Se reparten los pedidos entre los domiciliarios de la franja (barrido por ángulo
 *     alrededor de la cocina, en grupos parejos: cada uno toma una "tajada" del mapa).
 *  2. Cada ruta se ordena con Google (Directions API, optimize:true) y, si no se puede,
 *     con el algoritmo propio (vecino más cercano + mejora 2-opt), que es gratis.
 * Las rutas salen de la cocina y vuelven a ella (el domiciliario regresa por la siguiente franja).
 */

export type LatLng = { lat: number; lng: number };
export type Stop = LatLng & { id: string };
export type PlannedRoute = {
  courierId: string | null;
  method: "google" | "local";
  stops: { id: string; legSeconds: number; legMeters: number }[];
  distanceMeters: number;
  durationSeconds: number;
  /** Trazado por las calles (polilínea codificada de Google), si se calculó con Google. */
  polyline?: string;
};

const R = 6371000;
const rad = (x: number) => (x * Math.PI) / 180;

/** Distancia en línea recta (m). */
export function haversine(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Estimación local: calles ~1.35 veces la línea recta, moto a ~22 km/h en ciudad.
const ROAD_FACTOR = 1.35;
const SPEED_MS = 22 / 3.6;
const legEstimate = (a: LatLng, b: LatLng) => {
  const meters = haversine(a, b) * ROAD_FACTOR;
  return { meters: Math.round(meters), seconds: Math.round(meters / SPEED_MS) };
};

/** Reparte las paradas entre `n` domiciliarios: barrido angular alrededor de la cocina. */
export function splitStops(depot: LatLng, stops: Stop[], n: number): Stop[][] {
  if (n <= 1 || stops.length <= 1) return [stops];
  const sorted = [...stops].sort(
    (a, b) => Math.atan2(a.lat - depot.lat, a.lng - depot.lng) - Math.atan2(b.lat - depot.lat, b.lng - depot.lng)
  );
  const groups: Stop[][] = Array.from({ length: Math.min(n, sorted.length) }, () => []);
  const size = Math.ceil(sorted.length / groups.length);
  sorted.forEach((s, i) => groups[Math.min(groups.length - 1, Math.floor(i / size))].push(s));
  return groups.filter((g) => g.length > 0);
}

/** Recorrido cerrado cocina → paradas → cocina: vecino más cercano y luego 2-opt. */
export function orderLocally(depot: LatLng, stops: Stop[]): Stop[] {
  const left = [...stops];
  const tour: Stop[] = [];
  let current: LatLng = depot;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (haversine(current, left[i]) < haversine(current, left[best])) best = i;
    current = left.splice(best, 1)[0];
    tour.push(current as Stop);
  }
  // 2-opt sobre el recorrido completo (con la cocina al inicio y al final).
  const path = (t: Stop[]) => [depot, ...t, depot];
  const length = (t: Stop[]) => {
    const p = path(t);
    let d = 0;
    for (let i = 0; i < p.length - 1; i++) d += haversine(p[i], p[i + 1]);
    return d;
  };
  let improved = true;
  let best = tour;
  let bestLen = length(best);
  for (let guard = 0; improved && guard < 50; guard++) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const len = length(candidate);
        if (len + 1 < bestLen) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
}

function localRoute(depot: LatLng, stops: Stop[], courierId: string | null): PlannedRoute {
  const ordered = orderLocally(depot, stops);
  let prev: LatLng = depot;
  const legs = ordered.map((s) => {
    const e = legEstimate(prev, s);
    prev = s;
    return { id: s.id, legSeconds: e.seconds, legMeters: e.meters };
  });
  const back = legEstimate(prev, depot);
  return {
    courierId,
    method: "local",
    stops: legs,
    distanceMeters: legs.reduce((s, l) => s + l.legMeters, 0) + back.meters,
    durationSeconds: legs.reduce((s, l) => s + l.legSeconds, 0) + back.seconds,
  };
}

type DirectionsResponse = {
  status: string;
  routes?: {
    waypoint_order: number[];
    overview_polyline?: { points: string };
    legs: { distance: { value: number }; duration: { value: number } }[];
  }[];
};

/** Google Directions API con optimize:true (máx. 25 paradas por ruta). */
async function googleRoute(depot: LatLng, stops: Stop[], courierId: string | null, key: string): Promise<PlannedRoute | null> {
  if (stops.length === 0 || stops.length > 25) return null;
  const point = (p: LatLng) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({
    origin: point(depot),
    destination: point(depot),
    waypoints: `optimize:true|${stops.map(point).join("|")}`,
    mode: "driving",
    language: "es",
    region: "co",
    key,
  });
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as DirectionsResponse;
    const route = data.routes?.[0];
    if (data.status !== "OK" || !route) return null;
    const ordered = route.waypoint_order.map((i) => stops[i]);
    const legs = ordered.map((s, i) => ({ id: s.id, legSeconds: route.legs[i].duration.value, legMeters: route.legs[i].distance.value }));
    return {
      courierId,
      method: "google",
      stops: legs,
      distanceMeters: route.legs.reduce((s, l) => s + l.distance.value, 0),
      durationSeconds: route.legs.reduce((s, l) => s + l.duration.value, 0),
      polyline: route.overview_polyline?.points,
    };
  } catch {
    return null;
  }
}

/** Tiempo por parada por defecto (el real sale de Configuración → Operación: minutos de espera). */
export const SERVICE_SECONDS = 5 * 60;
// Tiempo por parada del cálculo en curso. Todos los cálculos leen el mismo ajuste de la base,
// así que dos cálculos simultáneos usan el mismo valor.
let service = SERVICE_SECONDS;

export type MinimalPlan = {
  routes: PlannedRoute[];
  /** Segundos desde la salida hasta llegar a la última parada, por canasta. */
  finishSeconds: number[];
  /** Factor aplicado a la estimación propia tras compararla con Google (1 = sin ajuste). */
  calibration: number;
  /** Proporción medida en este cálculo (tiempos de Google / estimación), si hubo Google. */
  measured: number | null;
};

/** Segundos desde la salida hasta llegar a la última parada (trayectos + entregas anteriores). */
export const finishOf = (r: PlannedRoute) =>
  r.stops.reduce((t, s, i) => t + s.legSeconds + (i > 0 ? service : 0), 0);

/**
 * Corta un recorrido en el menor número de tramos consecutivos que quepan en la ventana
 * (programación dinámica; a igual número de canastas, el de menor tiempo total).
 * Cada tramo sale de la cocina; la ventana se mide hasta llegar a su última parada.
 */
export function splitTour(depot: LatLng, tour: Stop[], windowSeconds: number, factor = 1): Stop[][] {
  const n = tour.length;
  if (n === 0) return [];
  const leg = (a: LatLng, b: LatLng) => legEstimate(a, b).seconds * factor;
  const best: { routes: number; time: number; from: number }[] = Array.from({ length: n + 1 }, () => ({ routes: Infinity, time: Infinity, from: -1 }));
  best[0] = { routes: 0, time: 0, from: -1 };
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(best[i].routes)) continue;
    let t = leg(depot, tour[i]);
    for (let j = i; j < n; j++) {
      if (j > i) t += service + leg(tour[j - 1], tour[j]);
      // Un pedido solo siempre forma canasta, aunque no alcance a llegar a tiempo.
      if (t > windowSeconds && j > i) break;
      const cand = { routes: best[i].routes + 1, time: best[i].time + t, from: i };
      const cur = best[j + 1];
      if (cand.routes < cur.routes || (cand.routes === cur.routes && cand.time < cur.time)) best[j + 1] = cand;
    }
  }
  const groups: Stop[][] = [];
  for (let j = n; j > 0; j = best[j].from) groups.unshift(tour.slice(best[j].from, j));
  return groups;
}

/** Ordena un grupo como recorrido abierto (cocina → paradas): la vuelta no cuenta para la franja. */
function openOrder(depot: LatLng, stops: Stop[]): Stop[] {
  const tour = orderLocally(depot, stops);
  // orderLocally optimiza el circuito cerrado; probamos también el sentido inverso y nos quedamos con el que termina antes.
  const finish = (t: Stop[]) => {
    let prev: LatLng = depot;
    return t.reduce((acc, s, i) => {
      const v = acc + legEstimate(prev, s).seconds + (i > 0 ? service : 0);
      prev = s;
      return v;
    }, 0);
  };
  const rev = [...tour].reverse();
  return finish(rev) < finish(tour) ? rev : tour;
}

/** Colchón por imprevistos (tráfico, portería, cliente que no baja): la última entrega debe llegar 10 min antes del fin. */
export const SAFETY_SECONDS = 10 * 60;

/** Llegada a la última parada (estimación propia, con factor de calibración). */
function finishEst(depot: LatLng, g: Stop[], factor: number) {
  let prev: LatLng = depot;
  let t = 0;
  g.forEach((s, i) => {
    t += legEstimate(prev, s).seconds * factor + (i > 0 ? service : 0);
    prev = s;
  });
  return t;
}

/** Mejor corte probando el recorrido desde distintos puntos y en ambos sentidos. */
function bestSplit(depot: LatLng, tour: Stop[], windowSeconds: number, factor: number): Stop[][] {
  let best: Stop[][] = [];
  let bestScore = [Infinity, Infinity];
  const step = Math.max(1, Math.floor(tour.length / 40));
  for (const dir of [tour, [...tour].reverse()]) {
    for (let r = 0; r < dir.length; r += step) {
      const rotated = [...dir.slice(r), ...dir.slice(0, r)];
      const groups = splitTour(depot, rotated, windowSeconds, factor);
      const total = groups.reduce((t, g) => t + finishEst(depot, g, factor), 0);
      if (groups.length < bestScore[0] || (groups.length === bestScore[0] && total < bestScore[1])) {
        best = groups;
        bestScore = [groups.length, total];
      }
    }
  }
  return best;
}

/**
 * Intenta vaciar las canastas más pequeñas metiendo sus pedidos en las demás (inserción más
 * barata que no se pase de la ventana). Si todos caben, esa canasta desaparece.
 */
function eliminateRoutes(depot: LatLng, groups: Stop[][], windowSeconds: number, factor: number): Stop[][] {
  let current = groups.map((g) => [...g]);
  let changed = true;
  while (changed && current.length > 1) {
    changed = false;
    const bySize = current.map((g, i) => ({ g, i })).sort((x, y) => x.g.length - y.g.length);
    for (const { i } of bySize) {
      const trial = current.map((g) => [...g]);
      const victim = trial[i];
      let ok = true;
      for (const stop of victim) {
        let best: { gi: number; pos: number; cost: number } | null = null;
        trial.forEach((g, gi) => {
          if (gi === i) return;
          const base = finishEst(depot, g, factor);
          for (let pos = 0; pos <= g.length; pos++) {
            const cand = [...g.slice(0, pos), stop, ...g.slice(pos)];
            const f = finishEst(depot, cand, factor);
            if (f <= windowSeconds && (!best || f - base < best.cost)) best = { gi, pos, cost: f - base };
          }
        });
        if (!best) {
          ok = false;
          break;
        }
        const { gi, pos } = best as { gi: number; pos: number };
        trial[gi].splice(pos, 0, stop);
      }
      if (ok) {
        trial.splice(i, 1);
        current = trial.map((g) => {
          const re = openOrder(depot, g);
          return finishEst(depot, re, factor) < finishEst(depot, g, factor) ? re : g;
        });
        changed = true;
        break;
      }
    }
  }
  return current;
}

/**
 * Crea solo las canastas necesarias para entregar todo dentro de la franja.
 *  1. Recorrido único óptimo con todos los pedidos (vecino más cercano + 2-opt).
 *  2. Se corta en el mínimo de tramos que quepan en la ventana (trayecto + 5 min por entrega),
 *     probando el corte desde distintos puntos; luego se intenta vaciar las canastas pequeñas.
 *  3. Cada canasta se ordena con Google (si hay llave) y se revisa con sus tiempos reales;
 *     si Google es más lento que la estimación, se ajusta la velocidad y se repite.
 *     Una canasta que aún se pase se divide en dos.
 * La ventana que recibe ya debe descontar el colchón (SAFETY_SECONDS).
 */
export async function planMinimalRoutes(
  depot: LatLng,
  stops: Stop[],
  windowSeconds: number,
  googleKey?: string,
  /** Factor aprendido en cálculos anteriores (tiempos reales de Google / estimación propia). */
  learnedFactor = 1,
  /** Segundos por parada (minutos de espera configurados). */
  serviceSeconds = SERVICE_SECONDS
): Promise<MinimalPlan> {
  service = serviceSeconds;
  if (stops.length === 0) return { routes: [], finishSeconds: [], calibration: learnedFactor, measured: null };
  const tour = orderLocally(depot, stops);
  const byId = new Map(stops.map((x) => [x.id, x]));
  const route = async (g: Stop[]) => (googleKey ? await googleRoute(depot, g, null, googleKey) : null) ?? localRoute(depot, openOrder(depot, g), null);
  const plan = (factor: number) => eliminateRoutes(depot, bestSplit(depot, tour, windowSeconds, factor), windowSeconds, factor);
  /** Proporción tiempos de Google / estimación propia sobre todas las canastas calculadas con Google. */
  const ratio = (rs: PlannedRoute[]) => {
    let real = 0;
    let est = 0;
    for (const r of rs.filter((x) => x.method === "google")) {
      let prev: LatLng = depot;
      for (const s of r.stops) {
        const p = byId.get(s.id)!;
        real += s.legSeconds;
        est += legEstimate(prev, p).seconds;
        prev = p;
      }
    }
    return est > 0 ? real / est : null;
  };

  let factor = learnedFactor;
  let groups = plan(factor);
  let routes = await Promise.all(groups.map(route));
  const measured = ratio(routes);
  if (measured && Math.abs(measured - factor) / factor > 0.1) {
    // La estimación no se parece a Google: se recalcula con la velocidad real de la ciudad.
    factor = measured;
    groups = plan(factor);
    routes = await Promise.all(groups.map(route));
  }

  // Canastas que con tiempos reales se pasan: sus últimas paradas se pasan a otras canastas si caben;
  // si no, forman una canasta nueva. Se repite con los tiempos de Google hasta que todas entren;
  // en la última vuelta no se mezcla (mejor una canasta más que pasarse de la franja).
  for (let round = 0; round < 4; round++) {
    const over = routes.filter((r) => r.stops.length > 1 && finishOf(r) > windowSeconds);
    if (!over.length) break;
    const keep: Stop[][] = routes.filter((r) => !over.includes(r)).map((r) => r.stops.map((s) => byId.get(s.id)!));
    const spill: Stop[] = [];
    for (const r of over) {
      const ordered = r.stops.map((s) => byId.get(s.id)!);
      // Recorta desde el final hasta que lo que queda quepa con los tiempos reales.
      let t = 0;
      let cut = ordered.length;
      r.stops.forEach((s, i) => {
        t += s.legSeconds + (i > 0 ? service : 0);
        if (t > windowSeconds && cut === ordered.length) cut = Math.max(1, i);
      });
      keep.push(ordered.slice(0, cut));
      spill.push(...ordered.slice(cut));
    }
    // Más prudente en cada vuelta: la estimación se vuelve más lenta para no volver a pasarse.
    const f = factor * (1 + 0.1 * (round + 1));
    const extra = splitTour(depot, openOrder(depot, spill), windowSeconds, f);
    const groups = round < 3 ? eliminateRoutes(depot, [...keep, ...extra], windowSeconds, f) : [...keep, ...extra];
    routes = await Promise.all(groups.map(route));
  }
  // Consolidación con tiempos reales: si los pedidos de la canasta más pequeña caben en las demás
  // (llegada real + lo que se alarga), se reparten y se confirma con Google que todas siguen a tiempo.
  for (let attempt = 0; attempt < 4 && routes.length > 1; attempt++) {
    const sorted = [...routes].sort((x, y) => x.stops.length - y.stops.length);
    let merged = false;
    for (const victim of sorted.slice(0, 2)) {
      const others = routes.filter((r) => r !== victim).map((r) => ({ r, stops: r.stops.map((x) => byId.get(x.id)!), slack: windowSeconds - finishOf(r) }));
      let ok = true;
      for (const st of victim.stops.map((x) => byId.get(x.id)!)) {
        let best: { o: (typeof others)[number]; pos: number; cost: number } | null = null;
        for (const o of others) {
          const base = finishEst(depot, o.stops, factor);
          for (let pos = 0; pos <= o.stops.length; pos++) {
            const cost = finishEst(depot, [...o.stops.slice(0, pos), st, ...o.stops.slice(pos)], factor) - base;
            if (cost <= o.slack && (!best || cost < best.cost)) best = { o, pos, cost };
          }
        }
        if (!best) {
          ok = false;
          break;
        }
        best.o.stops.splice(best.pos, 0, st);
        best.o.slack -= best.cost;
      }
      if (!ok) continue;
      const changed = others.filter((o) => o.stops.length !== o.r.stops.length);
      const rebuilt = await Promise.all(changed.map((o) => route(o.stops)));
      if (rebuilt.some((r) => finishOf(r) > windowSeconds)) continue;
      routes = [...others.filter((o) => !changed.includes(o)).map((o) => o.r), ...rebuilt];
      merged = true;
      break;
    }
    if (!merged) break;
  }

  return { routes, finishSeconds: routes.map(finishOf), calibration: factor, measured };
}

/** Planea las rutas de una franja: reparte y ordena (Google si hay llave, si no local). */
export async function planRoutes(depot: LatLng, stops: Stop[], couriers: (string | null)[], googleKey?: string): Promise<PlannedRoute[]> {
  const list = couriers.length ? couriers : [null];
  const groups = splitStops(depot, stops, list.length);
  return Promise.all(
    groups.map(async (group, i) => {
      const courier = list[i] ?? null;
      const viaGoogle = googleKey ? await googleRoute(depot, group, courier, googleKey) : null;
      return viaGoogle ?? localRoute(depot, group, courier);
    })
  );
}
