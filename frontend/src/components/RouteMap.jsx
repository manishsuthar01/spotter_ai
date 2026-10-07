import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Custom Pin SVG generator for crisp, modern Leaflet map markers
function createCustomPin(color, letter, subText = '') {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: ${color};
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            color: #ffffff;
            font-size: 13px;
            font-weight: 800;
            font-family: sans-serif;
          ">${letter}</span>
        </div>
        ${subText ? `<span style="
          margin-top: 2px;
          background: rgba(17, 24, 39, 0.9);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.2);
        ">${subText}</span>` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -36],
  });
}

export default function RouteMap({ route, events, locations }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([39.8283, -98.5795], 4);

      // CartoDB Dark Matter tiles or OpenStreetMap standard tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing vector layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    // 1. Draw Route Polyline
    if (route && route.combined_path && route.combined_path.length > 0) {
      const polyline = L.polyline(route.combined_path, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Glow backing
      L.polyline(route.combined_path, {
        color: '#60a5fa',
        weight: 9,
        opacity: 0.25,
      }).addTo(map);

      bounds.extend(polyline.getBounds());
    }

    // 2. Add Stop Markers from Events
    if (events && events.length > 0) {
      events.forEach((evt) => {
        if (!evt.latitude || !evt.longitude) return;

        let icon = null;
        let title = '';

        if (evt.event_type === 'PRE_TRIP') {
          icon = createCustomPin('#10b981', 'S', 'Start');
          title = 'Origin / Start';
        } else if (evt.event_type === 'PICKUP') {
          icon = createCustomPin('#06b6d4', 'P', 'Pickup');
          title = 'Pickup Location (1h)';
        } else if (evt.event_type === 'DROPOFF') {
          icon = createCustomPin('#8b5cf6', 'D', 'Dropoff');
          title = 'Dropoff Location (1h)';
        } else if (evt.event_type === 'FUEL_STOP') {
          icon = createCustomPin('#f59e0b', 'F', 'Fuel');
          title = 'Fuel Stop';
        } else if (evt.event_type === 'DAILY_REST') {
          icon = createCustomPin('#4f46e5', 'R', '10h Rest');
          title = '10-Hour Daily Rest';
        } else if (evt.event_type === 'CYCLE_RESTART') {
          icon = createCustomPin('#dc2626', '34', 'Restart');
          title = '34-Hour Restart';
        } else if (evt.event_type === 'REST_BREAK') {
          icon = createCustomPin('#64748b', 'B', '30m Break');
          title = '30-Minute Break';
        }

        if (icon) {
          const marker = L.marker([evt.latitude, evt.longitude], { icon }).addTo(map);
          bounds.extend([evt.latitude, evt.longitude]);

          const sTime = new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const eTime = new Date(evt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const popupContent = `
            <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
              <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #111827;">${title}</h4>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #4b5563;"><b>Location:</b> ${evt.location_name}</p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #4b5563;"><b>Schedule:</b> ${sTime} – ${eTime} (${evt.duration_hours}h)</p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #4b5563;"><b>Odometer:</b> ${evt.start_odometer} mi</p>
              <p style="margin: 0; font-size: 11px; color: #1f2937;"><i>${evt.remarks}</i></p>
            </div>
          `;
          marker.bindPopup(popupContent);
        }
      });
    }

    // Adjust map viewport to fit all elements
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Invalidate map size on layout adjustments
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [route, events, locations]);

  return (
    <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f9fafb' }}>
          Interactive Commercial Route & Waypoints Map
        </h3>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Powered by OpenStreetMap & OSRM</span>
      </div>
      <div ref={mapContainerRef} className="map-wrapper" />
      {/* Map Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        paddingTop: '12px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#9ca3af',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} /> Start
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} /> Pickup (1h)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} /> Dropoff (1h)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} /> Fuel (&le;1,000 mi)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4f46e5' }} /> 10h Daily Rest
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b' }} /> 30m Break
        </div>
      </div>
    </div>
  );
}
