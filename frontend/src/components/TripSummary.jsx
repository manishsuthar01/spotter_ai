import React from 'react';
import { Route, Clock, Fuel, Moon, Coffee, ShieldCheck, CheckCircle2, Droplets, Info } from 'lucide-react';

export default function TripSummary({ summary, locations, dailyLogsCount }) {
  if (!summary) return null;

  const remainingCycle = Math.max(0, 70.0 - (summary.final_cycle_used || 0));
  const fuelGallons = summary.estimated_fuel_gallons ?? Math.round((summary.total_distance_miles || 0) / 6.5);
  const fuelCost = summary.estimated_fuel_cost ?? Math.round(fuelGallons * 3.85);
  const fuelCount = summary.fuel_stops_count || 0;
  const fuelStops = summary.fuel_stops_details || [];

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>
            Trip &amp; Hours of Service Summary
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
            {locations?.start?.name} → {locations?.pickup?.name} → {locations?.dropoff?.name}
          </p>
        </div>
        <div className="compliance-tag">
          <span className="pulse-dot" />
          <span>FMCSA § 395 Verified</span>
        </div>
      </div>

      <div className="summary-grid">
        {/* Total Distance */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Route size={14} color="var(--brand-orange)" /> Total Distance
          </span>
          <span className="metric-val highlight-orange">
            {summary.total_distance_miles?.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>mi</span>
          </span>
          <span className="metric-sub">Highway corridor route</span>
        </div>

        {/* Driving Hours */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--status-emerald)" /> Driving Time
          </span>
          <span className="metric-val highlight-emerald">
            {summary.total_driving_hours?.toFixed(1)} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>hrs</span>
          </span>
          <span className="metric-sub">Max 11h per shift</span>
        </div>

        {/* On-Duty Hours */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--brand-orange)" /> On-Duty Time
          </span>
          <span className="metric-val">
            {summary.total_on_duty_hours?.toFixed(1)} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>hrs</span>
          </span>
          <span className="metric-sub">Driving + Loading/Unloading</span>
        </div>

        {/* Cycle Utilization */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="var(--status-purple)" /> 70h Cycle Status
          </span>
          <span className="metric-val highlight-purple">
            {summary.final_cycle_used?.toFixed(1)} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>/ 70h</span>
          </span>
          <span className="metric-sub">{remainingCycle.toFixed(1)}h remaining in cycle</span>
        </div>

        {/* 10-Hour Daily Rests */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Moon size={14} color="var(--status-purple)" /> 10h Rests
          </span>
          <span className="metric-val">
            {summary.rest_stops_count || 0}
          </span>
          <span className="metric-sub">Sleeper berth shifts</span>
        </div>

        {/* Fuel Stops */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Fuel size={14} color="var(--brand-orange)" /> Fuel Stops
          </span>
          <span className="metric-val highlight-orange">
            {fuelCount}
          </span>
          <span className="metric-sub">
            {fuelCount > 0 ? `At 1,000-mile interval` : `Within 1,000 mi threshold`}
          </span>
        </div>

        {/* Diesel Fuel Data */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Droplets size={14} color="#0284c7" /> Diesel Fuel Data
          </span>
          <span className="metric-val" style={{ color: '#0284c7' }}>
            {fuelGallons} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>gal</span>
          </span>
          <span className="metric-sub">
            ~${fuelCost} est. (${(3.85).toFixed(2)}/gal @ 6.5 MPG)
          </span>
        </div>

        {/* 30-Min Breaks */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coffee size={14} color="var(--status-slate)" /> 30m Breaks
          </span>
          <span className="metric-val">
            {summary.break_stops_count || 0}
          </span>
          <span className="metric-sub">Required at 8h driving</span>
        </div>
      </div>

      {/* Dedicated Commercial Fuel Status & Compliance Box */}
      <div style={{
        marginTop: '16px',
        padding: '14px 18px',
        background: fuelCount > 0 ? 'rgba(255, 100, 34, 0.06)' : 'rgba(2, 132, 199, 0.06)',
        border: fuelCount > 0 ? '1px solid rgba(255, 100, 34, 0.25)' : '1px solid rgba(2, 132, 199, 0.2)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: fuelCount > 0 ? 'var(--brand-orange)' : '#0284c7',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <Fuel size={18} />
        </div>
        <div style={{ flex: 1, fontSize: '12px', color: 'var(--color-ink)' }}>
          <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Commercial Fuel Management</span>
            <span style={{
              fontSize: '10px',
              padding: '1px 8px',
              borderRadius: '999px',
              fontWeight: 800,
              background: fuelCount > 0 ? 'var(--brand-orange)' : '#0284c7',
              color: '#ffffff'
            }}>
              {fuelCount > 0 ? `${fuelCount} Stop${fuelCount > 1 ? 's' : ''} Scheduled` : 'Single Fill Route'}
            </span>
          </div>

          {fuelCount > 0 ? (
            <div>
              <p style={{ margin: '0 0 6px 0', color: 'var(--color-secondary)' }}>
                <b>Mandatory Rule:</b> Fueling at least once every 1,000 miles (Assessment specification). This {summary.total_distance_miles} mi trip exceeds the 1,000-mile threshold, scheduling 30-minute On-Duty fueling stops at:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {fuelStops.length > 0 ? (
                  fuelStops.map((fs, idx) => (
                    <span key={idx} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ffffff',
                      border: '1px solid var(--color-border)',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '11px',
                      color: 'var(--color-ink)'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                      Stop #{idx + 1}: Mile {Math.round(fs.odometer_mile)} ({fs.location_name})
                    </span>
                  ))
                ) : (
                  <span style={{ fontWeight: 700 }}>Scheduled at 1,000-mile intervals along the route.</span>
                )}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--color-secondary)' }}>
              <b>Trip Distance:</b> {summary.total_distance_miles} miles. Commercial Class-8 semi-tractors are equipped with dual 120–150 gallon diesel tanks (~1,500+ mile capacity at 6.5 MPG). Under the <b>1,000-mile fueling rule</b>, trips under 1,000 miles complete within the initial fill, so no intermediate en-route fueling stops are required. Total estimated consumption: <b>{fuelGallons} gallons</b> (~${fuelCost}).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
