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
        // The style will be updated by the theme observer on the html element
        style: document.documentElement.classList.contains('dark') ? 'dark_all' : 'light_all'
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }
     // Invalidate map size on next tick to fix rendering issues
    setTimeout(() => {
        mapRef.current?.invalidateSize();
    }, 0);
  }, []);

  useEffect(() => {
    // Observer to update tile layer on theme change
    const observer = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains('dark');
        if (mapRef.current) {
            mapRef.current.eachLayer((layer: any) => {
                if (layer instanceof L.TileLayer) {
                    layer.setUrl(`https://{s}.basemaps.cartocdn.com/${isDark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`);
                }
            });
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    if (mapRef.current) {
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
  }, [threats]);

  return (
    <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <MapPinIcon className="h-6 w-6 text-blue-500" />
        <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Threat Origins Map</h2>
      </div>
      <div ref={mapContainerRef} className="h-[250px] rounded-md z-0 bg-gray-200 dark:bg-gray-900" id="map"></div>
      <style>{`
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
            box-shadow: 0 3px 14px rgba(0,0,0,0.4);
            border-radius: 6px;
        }
        html.dark .leaflet-popup-content-wrapper, html.dark .leaflet-popup-tip {
             background: #111827; /* gray-900 */
             color: #e5e7eb; /* gray-200 */
             border: 1px solid #374151; /* gray-700 */
        }
        html.light .leaflet-popup-content-wrapper, html.light .leaflet-popup-tip {
             background: #ffffff;
             color: #1f2937; /* gray-800 */
             border: 1px solid #e5e7eb; /* gray-200 */
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