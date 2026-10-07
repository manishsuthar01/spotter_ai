import React from 'react';
import { Route, Clock, Fuel, Moon, Coffee, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function TripSummary({ summary, locations, dailyLogsCount }) {
  if (!summary) return null;

  const remainingCycle = Math.max(0, 70.0 - (summary.final_cycle_used || 0));

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>
            Trip & Hours of Service Summary
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
          <span className="metric-val">
            {summary.fuel_stops_count || 0}
          </span>
          <span className="metric-sub">&le; 1,000 mi interval</span>
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

        {/* Daily Log Sheets */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="var(--status-emerald)" /> Daily ELD Logs
          </span>
          <span className="metric-val highlight-emerald">
            {dailyLogsCount || 1} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>sheets</span>
          </span>
          <span className="metric-sub">24-hour midnight split</span>
        </div>
      </div>
    </div>
  );
}
