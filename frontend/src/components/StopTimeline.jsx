import React from 'react';
import { Truck, Moon, Coffee, Fuel, PackageCheck, MapPin, CheckCircle, Clock } from 'lucide-react';

function getDutyBadgeClass(dutyStatus) {
  switch (dutyStatus) {
    case 'OFF_DUTY': return 'duty-badge off-duty';
    case 'SLEEPER_BERTH': return 'duty-badge sleeper';
    case 'DRIVING': return 'duty-badge driving';
    case 'ON_DUTY_NOT_DRIVING': return 'duty-badge on-duty';
    default: return 'duty-badge off-duty';
  }
}

function getNodeIcon(eventType) {
  switch (eventType) {
    case 'PRE_TRIP': return <Clock size={16} />;
    case 'DRIVING': return <Truck size={16} />;
    case 'PICKUP': return <PackageCheck size={16} />;
    case 'DROPOFF': return <CheckCircle size={16} />;
    case 'FUEL_STOP': return <Fuel size={16} />;
    case 'DAILY_REST':
    case 'CYCLE_RESTART': return <Moon size={16} />;
    case 'REST_BREAK': return <Coffee size={16} />;
    default: return <MapPin size={16} />;
  }
}

function getNodeClass(eventType) {
  switch (eventType) {
    case 'DRIVING': return 'timeline-node driving';
    case 'DAILY_REST':
    case 'CYCLE_RESTART': return 'timeline-node rest';
    case 'REST_BREAK': return 'timeline-node break';
    case 'FUEL_STOP': return 'timeline-node fuel';
    case 'PICKUP': return 'timeline-node pickup';
    case 'DROPOFF': return 'timeline-node dropoff';
    default: return 'timeline-node';
  }
}

export default function StopTimeline({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="glass-card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f9fafb' }}>
          Chronological Trip Schedule & Stop Timeline
        </h3>
        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>
          {events.length} Scheduled Events
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
        Unified driver timeline enforcing 11h driving, 14h window, 8h break, 70h cycle, and fueling stops.
      </p>

      <div className="timeline-list">
        {events.map((evt, idx) => {
          const sDate = new Date(evt.start_time);
          const eDate = new Date(evt.end_time);
          const sTime = sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const eTime = eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = sDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <div key={evt.event_id || idx} className="timeline-item">
              <div className={getNodeClass(evt.event_type)}>
                {getNodeIcon(evt.event_type)}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="timeline-title">{evt.location_name}</span>
                    <span className={getDutyBadgeClass(evt.duty_status)}>
                      {evt.duty_status_display || evt.duty_status}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {evt.duration_hours} hrs
                  </span>
                </div>

                <div className="timeline-meta">
                  <span>📅 {dateStr} • {sTime} → {eTime}</span>
                  {evt.distance_miles > 0 && <span>🛣️ +{evt.distance_miles} mi</span>}
                  <span>📍 Odo: {evt.start_odometer} → {evt.end_odometer} mi</span>
                </div>

                <div className="timeline-note">
                  <b>Action:</b> {evt.remarks}
                </div>
                {evt.reason && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    <b>Compliance:</b> {evt.reason}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
