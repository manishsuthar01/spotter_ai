import React from 'react';
import { Route, Clock, Fuel, Moon, Coffee, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function TripSummary({ summary, locations, dailyLogsCount }) {
  if (!summary) return null;

  const remainingCycle = Math.max(0, 70.0 - (summary.final_cycle_used || 0));

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f9fafb' }}>
            Trip & Hours of Service Summary
          </h2>
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>
            Route from {locations?.start?.name} to {locations?.dropoff?.name} via {locations?.pickup?.name}
          </p>
        </div>
        <div className="compliance-tag">
          <ShieldCheck size={14} color="#10b981" />
          <span>FMCSA Part 395 Compliant</span>
        </div>
      </div>

      <div className="summary-grid">
        {/* Total Distance */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Route size={14} color="#60a5fa" /> Total Distance
          </span>
          <span className="metric-val highlight-blue">
            {summary.total_distance_miles?.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 500 }}>mi</span>
          </span>
          <span className="metric-sub">Commercial highway miles</span>
        </div>

        {/* Driving Hours */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#34d399" /> Total Driving
          </span>
          <span className="metric-val highlight-emerald">
            {summary.total_driving_hours?.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500 }}>hrs</span>
          </span>
          <span className="metric-sub">Max 11h per work shift</span>
        </div>

        {/* On-Duty Hours */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#fbbf24" /> Total On-Duty
          </span>
          <span className="metric-val highlight-amber">
            {summary.total_on_duty_hours?.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500 }}>hrs</span>
          </span>
          <span className="metric-sub">Driving + Work duties</span>
        </div>

        {/* Cycle Recap */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#c084fc" /> 70h Cycle Status
          </span>
          <span className="metric-val highlight-purple">
            {summary.final_cycle_used?.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500 }}>/ 70h</span>
          </span>
          <span className="metric-sub">{remainingCycle.toFixed(1)}h remaining in cycle</span>
        </div>

        {/* 10-Hour Daily Rests */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Moon size={14} color="#a78bfa" /> Daily 10h Rests
          </span>
          <span className="metric-val">
            {summary.rest_stops_count || 0}
          </span>
          <span className="metric-sub">Sleeper berth rest periods</span>
        </div>

        {/* Fuel Stops */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Fuel size={14} color="#f59e0b" /> Fuel Stops
          </span>
          <span className="metric-val">
            {summary.fuel_stops_count || 0}
          </span>
          <span className="metric-sub">&le; 1,000 mi requirement</span>
        </div>

        {/* 30-Min Breaks */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coffee size={14} color="#06b6d4" /> 30-Min Breaks
          </span>
          <span className="metric-val">
            {summary.break_stops_count || 0}
          </span>
          <span className="metric-sub">After 8 cumulative drive hours</span>
        </div>

        {/* Daily Logs Generated */}
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="#10b981" /> Daily ELD Logs
          </span>
          <span className="metric-val highlight-emerald">
            {dailyLogsCount || 1} <span style={{ fontSize: '14px', fontWeight: 500 }}>sheets</span>
          </span>
          <span className="metric-sub">24-hour midnight splits</span>
        </div>
      </div>
    </div>
  );
}
