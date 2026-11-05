"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_CENTER, type LatLng } from "@/lib/data/coverage";

export type ReferenceZone = { id: string; name: string; polygon: LatLng[] };

type Props = {
  points: LatLng[];
  color: string;
  others: ReferenceZone[];
  onChange: (points: LatLng[]) => void;
};

const vertexIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:#fff;border:3px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,.35);margin:-7px 0 0 -7px"></div>`,
    iconSize: [0, 0],
  });

function ClickToAdd({ onAdd }: { onAdd: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitOnLoad({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 3) {
      map.fitBounds(points.map((p) => [p.lat, p.lng] as [number, number]), { padding: [30, 30] });
    }
    // Solo al montar: no re-encuadrar mientras se edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

export function ZoneMapEditor({ points, color, others, onChange }: Props) {
  const icon = useMemo(() => vertexIcon(color), [color]);

  return (
    <MapContainer
      center={[MAP_CENTER.lat, MAP_CENTER.lng]}
      zoom={12}
      className="h-[460px] w-full rounded-2xl"
      scrollWheelZoom
      doubleClickZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {others.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.polygon.map((p) => [p.lat, p.lng] as [number, number])}
          interactive={false}
          pathOptions={{ color: "#9E9E9E", weight: 1, fillOpacity: 0.12, dashArray: "4 4" }}
        />
      ))}
      {points.length >= 2 && (
        <Polygon
          positions={points.map((p) => [p.lat, p.lng] as [number, number])}
          interactive={false}
          pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.25 }}
        />
      )}
      {points.map((p, index) => (
        <Marker
          key={index}
          position={[p.lat, p.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onChange(points.map((q, i) => (i === index ? { lat, lng } : q)));
            },
            // Doble clic sobre un punto lo elimina.
            dblclick: () => onChange(points.filter((_, i) => i !== index)),
          }}
        />
      ))}
      <ClickToAdd onAdd={(p) => onChange([...points, p])} />
      <FitOnLoad points={points} />
    </MapContainer>
  );
}
