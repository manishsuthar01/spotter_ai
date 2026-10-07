import React, { useState } from 'react';
import { Navigation, MapPin, Clock, ArrowRight, Play, Sparkles } from 'lucide-react';

const PRESETS = [
  {
    name: 'East Coast Corridor (Richmond → Baltimore → Newark)',
    current: 'Richmond, VA',
    pickup: 'Baltimore, MD',
    dropoff: 'Newark, NJ',
    cycle: 18.0,
  },
  {
    name: 'Long-Haul Fuel & Rests (Richmond → Dallas)',
    current: 'Richmond, VA',
    pickup: 'Richmond, VA',
    dropoff: 'Dallas, TX',
    cycle: 5.0,
  },
  {
    name: 'Cycle Near Limit (64h Used → Restart)',
    current: 'Richmond, VA',
    pickup: 'Richmond, VA',
    dropoff: 'Chicago, IL',
    cycle: 64.0,
  },
  {
    name: 'Short Haul (Richmond → Fredericksburg)',
    current: 'Richmond, VA',
    pickup: 'Richmond, VA',
    dropoff: 'Fredericksburg, VA',
    cycle: 12.0,
  },
];

export default function TripForm({ onSubmit, isLoading }) {
  const [currentLocation, setCurrentLocation] = useState('Richmond, VA');
  const [pickupLocation, setPickupLocation] = useState('Baltimore, MD');
  const [dropoffLocation, setDropoffLocation] = useState('Newark, NJ');
  const [cycleUsed, setCycleUsed] = useState(20.0);
  const [formError, setFormError] = useState('');

  const handleApplyPreset = (preset) => {
    setCurrentLocation(preset.current);
    setPickupLocation(preset.pickup);
    setDropoffLocation(preset.dropoff);
    setCycleUsed(preset.cycle);
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentLocation.trim() || !pickupLocation.trim() || !dropoffLocation.trim()) {
      setFormError('Please provide Current Location, Pickup Location, and Dropoff Location.');
      return;
    }
    const cycleNum = parseFloat(cycleUsed);
    if (isNaN(cycleNum) || cycleNum < 0 || cycleNum > 70) {
      setFormError('Current Cycle Used must be a number between 0 and 70 hours.');
      return;
    }
    setFormError('');
    onSubmit({
      current_location: currentLocation.trim(),
      pickup_location: pickupLocation.trim(),
      dropoff_location: dropoffLocation.trim(),
      current_cycle_used: cycleNum,
    });
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={18} color="#3b82f6" /> Trip Parameters
        </h2>
        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>FMCSA 70h / 8-Day Rule</span>
      </div>
      <p className="form-description">
        Configure the driver's current status and shipment route. The engine will schedule mandatory breaks, fuel stops, and 10-hour daily rests.
      </p>

      {/* Preset Scenarios */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} color="#60a5fa" /> Quick Test Presets:
        </div>
        <div className="preset-buttons-container">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              onClick={() => handleApplyPreset(p)}
              disabled={isLoading}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {formError && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            {formError}
          </div>
        )}

        {/* Current Location */}
        <div className="input-group">
          <label className="input-label" htmlFor="current-location-input">
            Current Location <span className="req">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="current-location-input"
              type="text"
              className="text-input"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. Richmond, VA or coordinates"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* Pickup Location */}
        <div className="input-group">
          <label className="input-label" htmlFor="pickup-location-input">
            Pickup Location (1 Hour Loading) <span className="req">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="pickup-location-input"
              type="text"
              className="text-input"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Baltimore, MD"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* Dropoff Location */}
        <div className="input-group">
          <label className="input-label" htmlFor="dropoff-location-input">
            Dropoff Location (1 Hour Unloading) <span className="req">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="dropoff-location-input"
              type="text"
              className="text-input"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="e.g. Newark, NJ"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* Current Cycle Used */}
        <div className="input-group">
          <div className="slider-container">
            <div className="slider-header">
              <label className="input-label" htmlFor="cycle-input" style={{ marginBottom: 0 }}>
                Current Cycle Used (Hours)
              </label>
              <span className="slider-value-display">{Number(cycleUsed).toFixed(1)} / 70.0 hrs</span>
            </div>
            <input
              id="cycle-slider"
              type="range"
              min="0"
              max="70"
              step="0.5"
              className="range-slider"
              value={cycleUsed}
              onChange={(e) => setCycleUsed(parseFloat(e.target.value))}
              disabled={isLoading}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              <span>0h (Fresh 70h)</span>
              <span>35h</span>
              <span>70h (Exhausted)</span>
            </div>
          </div>
        </div>

        {/* Plan Trip Button */}
        <button
          id="btn-plan-trip"
          type="submit"
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
              <span>Analyzing HOS & Planning Trip...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Generate Schedule & ELD Logs</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
