"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapRoute = {
  id: string;
  color: string;
  /** Trazado por las calles; si no hay, se une con líneas rectas de referencia. */
  path?: [number, number][];
  stops: { lat: number; lng: number; position: number; code: string; done?: boolean }[];
};

const pin = (label: string, color: string, done = false) =>
  L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:9999px;background:${done ? "#9CA3AF" : color};color:#fff;font:700 12px/1 system-ui;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)">${label}</span>`,
  });

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [30, 30] });
    else if (points.length === 1) map.setView(points[0], 15);
  }, [map, points]);
  return null;
}

/** Mapa de la ruta: cocina, paradas numeradas y el recorrido (por las calles si viene de Google). */
export function RouteMap({ kitchen, routes, height = 320 }: { kitchen: { lat: number; lng: number; name: string }; routes: MapRoute[]; height?: number }) {
  const depot: [number, number] = [kitchen.lat, kitchen.lng];
  const points: [number, number][] = [depot, ...routes.flatMap((r) => r.stops.map((s) => [s.lat, s.lng] as [number, number]))];
  return (
    <MapContainer center={depot} zoom={13} style={{ height }} className="w-full rounded-2xl" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Fit points={points} />
      <Marker position={depot} icon={pin("C", "#1F4D36")}>
        <Tooltip>{kitchen.name}</Tooltip>
      </Marker>
      {routes.map((r) => (
        <Polyline
          key={r.id}
          positions={r.path?.length ? r.path : [depot, ...r.stops.map((s) => [s.lat, s.lng] as [number, number]), depot]}
          pathOptions={r.path?.length ? { color: r.color, weight: 4, opacity: 0.8 } : { color: r.color, weight: 3, opacity: 0.7, dashArray: "6 6" }}
        />
      ))}
      {routes.flatMap((r) =>
        r.stops.map((s) => (
          <Marker key={`${r.id}-${s.position}`} position={[s.lat, s.lng]} icon={pin(String(s.position), r.color, s.done)}>
            <Tooltip>
              Parada {s.position} · {s.code}
            </Tooltip>
          </Marker>
        ))
      )}
    </MapContainer>
  );
}
