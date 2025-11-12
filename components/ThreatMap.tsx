import React, { useEffect, useRef } from 'react';
import { GeolocatedThreat } from '../types';
import { MapPinIcon } from './icons';

declare global {
    var L: any;
}

interface ThreatMapProps {
  threats: GeolocatedThreat[];
}

const ThreatMap: React.FC<ThreatMapProps> = ({ threats }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const themeRef = useRef(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  useEffect(() => {
    // Observer to detect theme changes
    const observer = new MutationObserver(() => {
        themeRef.current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        // Force re-render of popups if any are open by re-binding them
        markersRef.current.forEach(marker => {
            const popupContent = marker.getPopup().getContent();
            marker.unbindPopup();
            marker.bindPopup(popupContent);
        });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [20, 10],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        style: themeRef.current === 'dark' ? 'dark_all' : 'light_all'
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }
     // Invalidate map size on next tick to fix rendering issues
    setTimeout(() => {
        mapRef.current?.invalidateSize();
    }, 0);
  }, []);

  useEffect(() => {
    if (mapRef.current) {
        // Update tile layer on theme change
        mapRef.current.eachLayer((layer: any) => {
            if (layer instanceof L.TileLayer) {
                layer.setUrl(`https://{s}.basemaps.cartocdn.com/${themeRef.current === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`);
            }
        });
        
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new markers
        threats.forEach(threat => {
            const markerIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="marker-pin"></div><div class="marker-pulse"></div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            });

            const marker = L.marker([threat.lat, threat.lng], { icon: markerIcon })
                .addTo(mapRef.current!)
                .bindPopup(`<b>Threat:</b> ${threat.description}<br><b>From:</b> ${threat.sourceIp} (${threat.city})`);
            
            markersRef.current.push(marker);
        });
    }
  }, [threats, themeRef.current]);

  return (
    <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <MapPinIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
        <h2 className="text-lg font-semibold text-cyan-500 dark:text-cyan-400">Threat Origins Map</h2>
      </div>
      <div ref={mapContainerRef} className="h-[250px] rounded-md z-0 bg-slate-300 dark:bg-slate-900" id="map"></div>
      <style>{`
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
            background: var(--popup-bg, #1e293b);
            color: var(--popup-text, #cbd5e1);
            box-shadow: 0 3px 14px rgba(0,0,0,0.4);
            border-radius: 6px;
        }
        html.dark .leaflet-popup-content-wrapper, html.dark .leaflet-popup-tip {
             background: #1e293b; /* slate-800 */
             color: #cbd5e1; /* slate-300 */
        }
        html.light .leaflet-popup-content-wrapper, html.light .leaflet-popup-tip {
             background: #ffffff;
             color: #334155; /* slate-700 */
        }
        .custom-div-icon .marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          background: #ef4444; /* red-500 */
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 50%;
          margin: -15px 0 0 -15px;
          border: 1px solid #f87171;
        }
        .custom-div-icon .marker-pin::after {
          content: '';
          width: 14px;
          height: 14px;
          margin: 7px 0 0 7px;
          background: #f87171; /* red-400 */
          position: absolute;
          border-radius: 50%;
        }
        .custom-div-icon .marker-pulse {
          background: rgba(239, 68, 68, 0.5);
          border-radius: 50%;
          height: 14px;
          width: 14px;
          position: absolute;
          left: 50%;
          top: 50%;
          margin: 11px 0 0 -12px;
          transform: rotateX(55deg);
          z-index: -2;
        }
        .custom-div-icon .marker-pulse::after {
          content: "";
          border-radius: 50%;
          height: 40px;
          width: 40px;
          position: absolute;
          margin: -13px 0 0 -13px;
          animation: pulsate 1.5s ease-out infinite;
          opacity: 0;
          box-shadow: 0 0 1px 2px #ef4444;
        }
        @keyframes pulsate {
          0% { transform: scale(0.1, 0.1); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1.2, 1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ThreatMap;