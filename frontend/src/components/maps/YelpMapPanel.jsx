import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER = [37.3382, -121.8863];
const DEFAULT_ZOOM = 10;

const OSM_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const EMPTY_POINTS = [];

function pointsFromRestaurants(restaurants) {
  return (restaurants || [])
    .filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        Number.isFinite(Number(r.latitude)) &&
        Number.isFinite(Number(r.longitude))
    )
    .map((r, i) => ({
      id: r.id,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      label: String(i + 1),
      title: r.name || `Listing ${i + 1}`,
    }));
}

function MapResizeObserver({ observeRef }) {
  const map = useMap();

  useEffect(() => {
    const node = observeRef?.current;
    if (!node) return;
    const bump = () => {
      map.invalidateSize({ animate: false });
      requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    };
    const ro = new ResizeObserver(() => bump());
    ro.observe(node);
    bump();
    const t = window.setTimeout(bump, 100);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [map, observeRef]);

  return null;
}

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
  }, [map, points]);

  return null;
}

function NumberedMarker({ point, active, onSelect }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "yelp-map-marker-wrap",
        html: `<div class="yelp-map-marker${active ? " yelp-map-marker--active" : ""}" aria-hidden="true">★</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    [point.label, active]
  );

  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      zIndexOffset={active ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect?.(point.id),
      }}
    >
      <Popup>
        <span className="font-semibold text-gray-900">{point.title}</span>
      </Popup>
    </Marker>
  );
}

function Toolbar({ searchAsMapMoves, onSearchAsMapMovesChange, onFullscreen }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-white z-10">
      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={searchAsMapMoves}
          onChange={(e) => onSearchAsMapMovesChange?.(e.target.checked)}
          className="rounded border-gray-300 text-yelp-red focus:ring-yelp-red"
        />
        Search as map moves
      </label>
      <button
        type="button"
        onClick={onFullscreen}
        className="p-2 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm"
        aria-label="Full screen map"
        title="Full screen"
      >
        ⛶
      </button>
    </div>
  );
}

export default function YelpMapPanel({
  restaurants = [],
  highlightedId = null,
  onMarkerClick,
  searchAsMapMoves = false,
  onSearchAsMapMovesChange,
  className = "",
}) {
  const mapWrapRef = useRef(null);
  const mapPaneRef = useRef(null);
  const points = useMemo(() => {
    const p = pointsFromRestaurants(restaurants);
    return p.length ? p : EMPTY_POINTS;
  }, [restaurants]);

  const handleFullscreen = () => {
    const el = mapWrapRef.current;
    if (!el?.requestFullscreen) return;
    el.requestFullscreen().catch(() => {});
  };

  return (
    <div
      ref={mapWrapRef}
      className={`flex h-full w-full min-h-[min(55vh,420px)] flex-col bg-white lg:min-h-0 ${className}`}
    >
      <Toolbar
        searchAsMapMoves={searchAsMapMoves}
        onSearchAsMapMovesChange={onSearchAsMapMovesChange}
        onFullscreen={handleFullscreen}
      />

      <div
        ref={mapPaneRef}
        className="relative z-0 min-h-[280px] w-full min-w-0 flex-1 overflow-hidden lg:min-h-0"
        style={{ flex: "1 1 0%" }}
      >
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="yelp-explore-map absolute inset-0 z-0 h-full w-full rounded-none"
          scrollWheelZoom
          attributionControl
        >
          <TileLayer attribution={OSM_ATTRIB} url={OSM_TILE} />
          <MapResizeObserver observeRef={mapPaneRef} />
          <FitBounds points={points} />
          {points.map((p) => (
            <NumberedMarker
              key={p.id}
              point={p}
              active={highlightedId === p.id}
              onSelect={onMarkerClick}
            />
          ))}
        </MapContainer>
      </div>

      <p className="text-[10px] text-gray-500 px-2 py-1.5 border-t border-gray-100 bg-gray-50">
        Map data © OpenStreetMap — free for fair use; heavy traffic may need your own tile server.
      </p>
    </div>
  );
}
