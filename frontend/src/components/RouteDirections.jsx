import React, { useState } from 'react';
import { Compass, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

export default function RouteDirections({ route, locations }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!route) return null;

  const leg1Steps = route.leg1?.steps || [];
  const leg2Steps = route.leg2?.steps || [];
  const totalSteps = leg1Steps.length + leg2Steps.length;

  return (
    <div className="glass-card" style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} color="#3b82f6" />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f9fafb' }}>
            Turn-by-Turn Route Instructions
          </h3>
          <span style={{ fontSize: '11px', color: '#9ca3af', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
            {totalSteps} maneuvers
          </span>
        </div>
        <button
          type="button"
          style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          {/* Leg 1 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} /> Leg 1: {locations?.start?.name} → {locations?.pickup?.name} ({route.leg1?.distance_miles} mi)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {leg1Steps.map((step, idx) => (
                <div
                  key={`leg1_${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '6px 10px',
                    background: 'rgba(31, 41, 55, 0.4)',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ color: '#e5e7eb' }}>{idx + 1}. {step.instruction}</span>
                  <span style={{ color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                    {step.distance_miles > 0 ? `${step.distance_miles} mi` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leg 2 */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#a78bfa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} /> Leg 2: {locations?.pickup?.name} → {locations?.dropoff?.name} ({route.leg2?.distance_miles} mi)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {leg2Steps.map((step, idx) => (
                <div
                  key={`leg2_${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '6px 10px',
                    background: 'rgba(31, 41, 55, 0.4)',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ color: '#e5e7eb' }}>{idx + 1}. {step.instruction}</span>
                  <span style={{ color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                    {step.distance_miles > 0 ? `${step.distance_miles} mi` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
