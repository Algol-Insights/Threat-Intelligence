import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { IP_GEOLOCATIONS } from '../constants';
import { Flame, Loader2 } from 'lucide-react';

declare global { var L: any; }

export default function AttackHeatmap() {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, uniqueIPs: 0, topSource: '' });

  useEffect(() => {
    api.getEvents({ limit: '1000' }).then(r => {
      setEvents(r.events);
      const ips = new Set(r.events.map((e: any) => e.sourceIp));
      const ipCounts: Record<string, number> = {};
      r.events.forEach((e: any) => { ipCounts[e.sourceIp] = (ipCounts[e.sourceIp] || 0) + 1; });
      const topIP = Object.entries(ipCounts).sort((a, b) => b[1] - a[1])[0];
      setStats({ total: r.events.length, uniqueIPs: ips.size, topSource: topIP ? `${topIP[0]} (${topIP[1]} events)` : 'N/A' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || typeof L === 'undefined' || mapRef.current) return;
    
    const map = L.map(containerRef.current).setView([-17.83, 31.05], 3); // Centered on Harare
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [loading]);

  // Add heatmap circles
  useEffect(() => {
    if (!mapRef.current || events.length === 0) return;

    // Count events per IP location
    const locationCounts: Record<string, { lat: number; lng: number; city: string; count: number; blocked: number }> = {};
    events.forEach(evt => {
      const geo = IP_GEOLOCATIONS[evt.sourceIp];
      if (!geo) return;
      const key = `${geo.lat},${geo.lng}`;
      if (!locationCounts[key]) locationCounts[key] = { lat: geo.lat, lng: geo.lng, city: geo.city, count: 0, blocked: 0 };
      locationCounts[key].count++;
      if (evt.action === 'BLOCKED') locationCounts[key].blocked++;
    });

    // Clear existing layers
    mapRef.current.eachLayer((layer: any) => {
      if (layer._isHeatCircle) mapRef.current.removeLayer(layer);
    });

    // Add heat circles
    Object.values(locationCounts).forEach(loc => {
      const intensity = Math.min(loc.count / 5, 1); // Normalize
      const radius = Math.max(15, Math.min(loc.count * 3, 60));
      const color = loc.blocked > loc.count * 0.7 ? '#ef4444' : loc.blocked > loc.count * 0.3 ? '#f97316' : '#22c55e';

      const circle = L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.3 + intensity * 0.4,
        color,
        weight: 2,
        opacity: 0.7,
      });
      circle._isHeatCircle = true;
      circle.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; min-width: 150px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${loc.city}</div>
          <div>Total events: <strong>${loc.count}</strong></div>
          <div style="color: #ef4444;">Blocked: <strong>${loc.blocked}</strong></div>
          <div style="color: #22c55e;">Allowed: <strong>${loc.count - loc.blocked}</strong></div>
        </div>
      `);
      circle.addTo(mapRef.current);
    });

    // Add Harare marker (defender position)
    if (!locationCounts['-17.83,31.05']) {
      const defenderCircle = L.circleMarker([-17.83, 31.05], {
        radius: 8, fillColor: '#38bdf8', fillOpacity: 0.8, color: '#38bdf8', weight: 2,
      });
      defenderCircle._isHeatCircle = true;
      defenderCircle.bindPopup('<div style="font-family: system-ui; font-size: 12px;"><strong>🛡️ Chengeto SOC</strong><br>Harare, Zimbabwe</div>');
      defenderCircle.addTo(mapRef.current);
    }
  }, [events]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-soc-muted" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Attack Heatmap</h1>
          <p className="text-soc-muted text-sm">Geographic density of inbound threat sources</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-400">{stats.total}</p>
          <p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">Total events mapped</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-400">{stats.uniqueIPs}</p>
          <p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">Unique source IPs</p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-bold text-red-400 font-mono">{stats.topSource}</p>
          <p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">Top attacker</p>
        </div>
      </div>

      {/* Map */}
      {events.length === 0 ? (
        <div className="card text-center py-16 text-soc-muted">
          <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No events to visualise. Send syslog events to populate the heatmap.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden rounded-xl" style={{ height: '500px' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs text-soc-muted">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500/60" /> Mostly blocked</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500/60" /> Mixed</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500/60" /> Mostly allowed</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-500/80" /> Chengeto SOC</div>
      </div>
    </div>
  );
}
