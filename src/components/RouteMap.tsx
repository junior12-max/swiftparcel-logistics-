import { useState, useMemo } from 'react';
import { Package, MapPin, Warehouse, Anchor, Building2, Truck } from 'lucide-react';

type Coords = { lat: number; lng: number };

type Waypoint = {
  coords: Coords;
  label: string;
  type: 'origin' | 'sorting' | 'customs' | 'local' | 'destination';
};

type Props = {
  origin: Coords;
  destination: Coords;
  current: Coords | null;
  progress: number;
  status?: string;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpCoords(a: Coords, b: Coords, t: number): Coords {
  return { lat: lerp(a.lat, b.lat, t), lng: lerp(a.lng, b.lng, t) };
}

function offsetCoords(c: Coords, dLat: number, dLng: number): Coords {
  return { lat: c.lat + dLat, lng: c.lng + dLng };
}

function buildWaypoints(origin: Coords, destination: Coords): Waypoint[] {
  const mid = lerpCoords(origin, destination, 0.5);
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const perpLat = -dLng * 0.08;
  const perpLng = dLat * 0.08;

  return [
    { coords: origin, label: 'Origin Facility', type: 'origin' },
    {
      coords: offsetCoords(lerpCoords(origin, mid, 0.33), perpLat, perpLng),
      label: 'Regional Sorting Hub',
      type: 'sorting',
    },
    {
      coords: offsetCoords(mid, perpLat * 1.5, perpLng * 1.5),
      label: 'Customs Terminal',
      type: 'customs',
    },
    {
      coords: offsetCoords(lerpCoords(mid, destination, 0.66), perpLat * 0.5, perpLng * 0.5),
      label: 'Local Distribution Center',
      type: 'local',
    },
    { coords: destination, label: 'Destination', type: 'destination' },
  ];
}

const WAYPOINT_COLORS: Record<Waypoint['type'], string> = {
  origin: '#15803d',
  sorting: '#2563eb',
  customs: '#7c3aed',
  local: '#0891b2',
  destination: '#ef4444',
};

function WaypointIcon({ type, className }: { type: Waypoint['type']; className: string }) {
  switch (type) {
    case 'origin': return <MapPin className={className} />;
    case 'sorting': return <Warehouse className={className} />;
    case 'customs': return <Anchor className={className} />;
    case 'local': return <Building2 className={className} />;
    case 'destination': return <MapPin className={className} />;
  }
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'pending': return 'Order Received';
    case 'picked_up': return 'Picked Up';
    case 'in_transit': return 'In Transit';
    case 'out_for_delivery': return 'Out for Delivery';
    case 'delivered': return 'Delivered';
    default: return 'In Transit';
  }
}

function activeWaypointIndex(progress: number, waypointCount: number): number {
  const idx = Math.floor((progress / 100) * (waypointCount - 1));
  return Math.min(idx, waypointCount - 1);
}

export default function RouteMap({ origin, destination, current, progress, status }: Props) {
  const [popupIdx, setPopupIdx] = useState<number | null>(null);
  const padding = 44;
  const width = 360;
  const height = 320;

  const waypoints = useMemo(() => buildWaypoints(origin, destination), [origin, destination]);

  const activeIdx = activeWaypointIndex(progress, waypoints.length);
  const activeLabel = statusLabel(status);

  const allCoords = waypoints.map((w) => w.coords);
  if (current) allCoords.push(current);

  const minLat = Math.min(...allCoords.map((c) => c.lat));
  const maxLat = Math.max(...allCoords.map((c) => c.lat));
  const minLng = Math.min(...allCoords.map((c) => c.lng));
  const maxLng = Math.max(...allCoords.map((c) => c.lng));

  const latRange = Math.max(maxLat - minLat, 0.1);
  const lngRange = Math.max(maxLng - minLng, 0.1);

  const project = (c: Coords) => {
    const x = padding + ((c.lng - minLng) / lngRange) * (width - 2 * padding);
    const y = padding + ((maxLat - c.lat) / latRange) * (height - 2 * padding);
    return { x, y };
  };

  const projected = waypoints.map((w) => ({ ...w, pt: project(w.coords) }));
  const currentPt = current ? project(current) : null;

  // Build polyline segments connecting all waypoints
  const fullSegments = projected.slice(0, -1).map((wp, i) => {
    const next = projected[i + 1];
    return `M ${wp.pt.x} ${wp.pt.y} L ${next.pt.x} ${next.pt.y}`;
  });

  // Completed segments: from first waypoint up to the active waypoint
  const completedSegments: string[] = [];
  for (let i = 0; i < activeIdx; i++) {
    completedSegments.push(`M ${projected[i].pt.x} ${projected[i].pt.y} L ${projected[i + 1].pt.x} ${projected[i + 1].pt.y}`);
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-green-50 to-gray-50 border border-gray-200">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="block touch-manipulation"
        role="img"
        aria-label="Delivery route map with logistics waypoints"
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Decorative landmasses */}
        <ellipse cx={60} cy={70} rx={50} ry={38} fill="#dcfce7" opacity={0.4} />
        <ellipse cx={280} cy={230} rx={55} ry={42} fill="#fef3c7" opacity={0.35} />
        <ellipse cx={180} cy={160} rx={40} ry={30} fill="#dbeafe" opacity={0.25} />

        {/* Full dashed route (all segments) */}
        {fullSegments.map((d, i) => (
          <path key={`full-${i}`} d={d} fill="none" stroke="#d1d5db" strokeWidth="2" strokeDasharray="5 4" />
        ))}

        {/* Completed solid segments */}
        {completedSegments.map((d, i) => (
          <path key={`done-${i}`} d={d} fill="none" stroke="#15803d" strokeWidth="2.5" />
        ))}

        {/* Waypoint markers */}
        {projected.map((wp, i) => {
          const isActive = i === activeIdx;
          const isCompleted = i < activeIdx;
          const color = WAYPOINT_COLORS[wp.type];
          return (
            <g key={`wp-${i}`} className="cursor-pointer" onClick={() => setPopupIdx(popupIdx === i ? null : i)}>
              {isActive && (
                <circle cx={wp.pt.x} cy={wp.pt.y} r={16} fill={color} opacity={0.2}>
                  <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={wp.pt.x}
                cy={wp.pt.y}
                r={isActive ? 9 : 7}
                fill={isCompleted ? '#15803d' : color}
                stroke="#fff"
                strokeWidth="1.5"
              />
              {isActive && (
                <g transform={`translate(${wp.pt.x - 9}, ${wp.pt.y - 9})`}>
                  <rect width="18" height="18" rx="4" fill={color} />
                  <g transform="translate(1, 1)">
                    <Package className="w-4 h-4 text-white" />
                  </g>
                </g>
              )}
              <text
                x={wp.pt.x}
                y={wp.pt.y - 16}
                textAnchor="middle"
                className="fill-gray-700"
                style={{ fontSize: '8px', fontWeight: 600 }}
              >
                {wp.type === 'origin' ? 'Start' : wp.type === 'destination' ? 'End' : `Hub ${i}`}
              </text>

              {/* Popup */}
              {popupIdx === i && (
                <g>
                  <rect
                    x={Math.max(4, Math.min(wp.pt.x - 70, width - 144))}
                    y={Math.max(4, wp.pt.y - 56)}
                    width="140"
                    height="40"
                    rx="6"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                  />
                  <text
                    x={Math.max(14, Math.min(wp.pt.x - 60, width - 134))}
                    y={Math.max(20, wp.pt.y - 40)}
                    style={{ fontSize: '8px', fontWeight: 700 }}
                    className="fill-gray-900"
                  >
                    {wp.label}
                  </text>
                  <text
                    x={Math.max(14, Math.min(wp.pt.x - 60, width - 134))}
                    y={Math.max(32, wp.pt.y - 28)}
                    style={{ fontSize: '7px' }}
                    className="fill-gray-500"
                  >
                    {isActive ? activeLabel : isCompleted ? 'Completed' : 'Pending'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Real-time current location marker (if distinct from waypoints) */}
        {currentPt && (
          <g>
            <circle cx={currentPt.x} cy={currentPt.y} r={6} fill="#eab308" stroke="#fff" strokeWidth="1.5" />
            <circle cx={currentPt.x} cy={currentPt.y} r={12} fill="#eab308" opacity={0.2}>
              <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>

      {/* Active status badge */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] shadow-sm">
        <Truck className="w-3 h-3 text-green-700" />
        <span className="font-semibold text-gray-700">{activeLabel}</span>
        <span className="text-gray-400">· {progress}%</span>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-lg px-2 py-1.5 flex flex-wrap items-center gap-2 text-[9px] text-gray-600 shadow-sm max-w-[200px]">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-green-700" /> Origin
        </span>
        <span className="flex items-center gap-1">
          <Warehouse className="w-3 h-3 text-blue-600" /> Sort
        </span>
        <span className="flex items-center gap-1">
          <Anchor className="w-3 h-3 text-violet-600" /> Customs
        </span>
        <span className="flex items-center gap-1">
          <Building2 className="w-3 h-3 text-cyan-600" /> Local
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-500" /> Dest
        </span>
      </div>
    </div>
  );
}
