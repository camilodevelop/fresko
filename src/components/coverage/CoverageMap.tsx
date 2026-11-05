"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  MAP_CENTER,
  type CoverageZone,
  type LatLng,
} from "@/lib/data/coverage";

export type MapSuggestion = LatLng & { label: string; name?: string };

type CoverageMapProps = {
  zones: CoverageZone[];
  marker: LatLng | null;
  covered: boolean | null;
  suggestions?: MapSuggestion[];
  highlightedIndex?: number;
  onMapClick?: (coords: LatLng) => void;
  onSuggestionClick?: (place: MapSuggestion) => void;
};

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (coords: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

function FitSuggestions({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo([points[0].lat, points[0].lng], 14, { duration: 0.45 });
      return;
    }
    const bounds = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.flyToBounds(bounds, { padding: [36, 36], duration: 0.45, maxZoom: 15 });
  }, [points, map]);
  return null;
}

export function CoverageMap({
  zones,
  marker,
  covered,
  suggestions = [],
  highlightedIndex = -1,
  onMapClick,
  onSuggestionClick,
}: CoverageMapProps) {
  const fill = covered === false ? "#EF9A9A" : "#8BC34A";
  const stroke = covered === false ? "#C62828" : "#1F4D36";

  return (
    <MapContainer
      center={[MAP_CENTER.lat, MAP_CENTER.lng]}
      zoom={12}
      className="h-full min-h-[280px] w-full rounded-2xl"
      scrollWheelZoom
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zones.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.polygon.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{
            color: covered === false ? stroke : zone.color,
            weight: 2,
            fillColor: covered === false ? fill : zone.color,
            fillOpacity: covered === false ? 0.18 : 0.28,
          }}
        />
      ))}
      {suggestions.map((place, index) => (
        <CircleMarker
          key={`${place.lat}-${place.lng}-${index}`}
          center={[place.lat, place.lng]}
          radius={highlightedIndex === index ? 11 : 7}
          eventHandlers={{
            click: () => onSuggestionClick?.(place),
          }}
          pathOptions={{
            color: "#1F4D36",
            fillColor: highlightedIndex === index ? "#8BC34A" : "#FFFFFF",
            fillOpacity: 1,
            weight: highlightedIndex === index ? 3 : 2,
          }}
        />
      ))}
      {suggestions.length > 0 && <FitSuggestions points={suggestions} />}
      {marker && suggestions.length === 0 && (
        <>
          <CircleMarker
            center={[marker.lat, marker.lng]}
            radius={10}
            pathOptions={{
              color: "#1F4D36",
              fillColor: covered === false ? "#C62828" : "#8BC34A",
              fillOpacity: 1,
              weight: 3,
            }}
          />
          <Recenter center={marker} zoom={14} />
        </>
      )}
      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
}
