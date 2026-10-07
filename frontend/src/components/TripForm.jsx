import React, { useState } from 'react';
import { Navigation, Play, Sparkles } from 'lucide-react';

const PRESETS = [
  {
    name: 'East Coast Corridor (Richmond → Newark)',
    current: 'Richmond, VA',
    pickup: 'Baltimore, MD',
    dropoff: 'Newark, NJ',
    cycle: 18.0,
  },
  {
    name: 'Long-Haul (Richmond → Dallas)',
    current: 'Richmond, VA',
    pickup: 'Richmond, VA',
    dropoff: 'Dallas, TX',
    cycle: 5.0,
  },
  {
    name: 'Cycle Restart (64h Used)',
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
      setFormError('Please enter Current, Pickup, and Dropoff locations.');
      return;
    }
    const cycleNum = parseFloat(cycleUsed);
    if (isNaN(cycleNum) || cycleNum < 0 || cycleNum > 70) {
      setFormError('Cycle hours must be between 0 and 70.');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={18} color="var(--brand-orange)" /> Trip Parameters
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
          70h / 8-Day Rule
        </span>
      </div>

      {/* Preset Chips */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} color="var(--brand-orange)" /> Presets:
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
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#dc2626',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '16px'
          }}>
            {formError}
          </div>
        )}

        {/* Current Location */}
        <div className="input-group">
          <label className="input-label" htmlFor="current-location-input">
            Current Location
          </label>
          <input
            id="current-location-input"
            type="text"
            className="text-input"
            value={currentLocation}
            onChange={(e) => setCurrentLocation(e.target.value)}
            placeholder="e.g. Richmond, VA"
            disabled={isLoading}
            required
          />
        </div>

        {/* Pickup Location */}
        <div className="input-group">
          <label className="input-label" htmlFor="pickup-location-input">
            Pickup Location (1h Loading)
          </label>
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

        {/* Dropoff Location */}
        <div className="input-group">
          <label className="input-label" htmlFor="dropoff-location-input">
            Dropoff Location (1h Unloading)
          </label>
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

        {/* Current Cycle Used Slider */}
        <div className="input-group">
          <div className="slider-container">
            <div className="slider-header">
              <label className="input-label" htmlFor="cycle-slider" style={{ marginBottom: 0 }}>
                Current Cycle Used
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px', fontWeight: 600 }}>
              <span>0h Available</span>
              <span>35h</span>
              <span>70h Limit</span>
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
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#ffffff' }} />
              <span>Calculating HOS Schedule...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Calculate Trip & Draw ELD Logs</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
