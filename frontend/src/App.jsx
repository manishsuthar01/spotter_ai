import React, { useState, useEffect } from 'react';
import { Truck, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import TripForm from './components/TripForm';
import TripSummary from './components/TripSummary';
import RouteMap from './components/RouteMap';
import StopTimeline from './components/StopTimeline';
import RouteDirections from './components/RouteDirections';
import EldLogSheet from './components/EldLogSheet';
import { planTripApi } from './services/api';

export default function App() {
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'eld' | 'schedule'

  const handlePlanTrip = async (params) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await planTripApi(params);
      setTripData(data);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to plan trip. Please verify inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handlePlanTrip({
      current_location: 'Richmond, VA',
      pickup_location: 'Baltimore, MD',
      dropoff_location: 'Newark, NJ',
      current_cycle_used: 18.0,
    });
  }, []);

  return (
    <div className="app-container">
      {/* Clean Modern Navbar */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-logo">
            <Truck size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">Spotter AI</h1>
            <div className="brand-subtitle">Commercial HOS & ELD Operations</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="compliance-tag">
            <span className="pulse-dot" />
            <span>FMCSA 49 CFR Part 395</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Parameters Form (Left) + Map / Progress (Right) */}
      <div className="planner-grid">
        <div>
          <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
        </div>

        <div>
          {isLoading && (
            <div className="glass-card loading-box">
              <div className="spinner" />
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-ink)' }}>
                Planning Route & Simulating HOS Clocks
              </h3>
              <div className="loading-steps">
                <div className="loading-step-item">
                  <span style={{ color: 'var(--brand-orange)', fontWeight: 800 }}>✔</span>
                  <span>Computing commercial highway distances & corridors via OSRM</span>
                </div>
                <div className="loading-step-item">
                  <span style={{ color: 'var(--brand-orange)', fontWeight: 800 }}>✔</span>
                  <span>Applying 11h drive limits, 14h window, and 8h rest break rules</span>
                </div>
                <div className="loading-step-item">
                  <span style={{ color: 'var(--brand-orange)', fontWeight: 800 }}>✔</span>
                  <span>Scheduling mandatory 1,000-mile fuel stops & 10h sleeper rests</span>
                </div>
                <div className="loading-step-item">
                  <span style={{ color: 'var(--brand-orange)', fontWeight: 800 }}>✔</span>
                  <span>Generating 24-hour midnight ELD daily log sheets</span>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="glass-card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>Planning Error</h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-secondary)', marginTop: '4px' }}>{errorMessage}</p>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => handlePlanTrip({
                      current_location: 'Richmond, VA',
                      pickup_location: 'Baltimore, MD',
                      dropoff_location: 'Newark, NJ',
                      current_cycle_used: 18.0,
                    })}
                    style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={12} /> Reload Default Route
                  </button>
                </div>
              </div>
            </div>
          )}

          {tripData && !isLoading && (
            <RouteMap
              route={tripData.route}
              events={tripData.events}
              locations={tripData.locations}
            />
          )}
        </div>
      </div>

      {/* Results Dashboard */}
      {tripData && !isLoading && (
        <section id="trip-results-section">
          {/* Key Metric Cards */}
          <TripSummary
            summary={tripData.summary}
            locations={tripData.locations}
            dailyLogsCount={tripData.daily_logs?.length}
          />

          {/* Clean View Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button
              type="button"
              className={`eld-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              All Operations
            </button>
            <button
              type="button"
              className={`eld-tab-btn ${activeTab === 'eld' ? 'active' : ''}`}
              onClick={() => setActiveTab('eld')}
            >
              📄 ELD Daily Logs ({tripData.daily_logs?.length} Sheets)
            </button>
            <button
              type="button"
              className={`eld-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              ⏱️ Driver Timeline ({tripData.events?.length} Stops)
            </button>
            <button
              type="button"
              className={`eld-tab-btn ${activeTab === 'directions' ? 'active' : ''}`}
              onClick={() => setActiveTab('directions')}
            >
              🧭 Turn-by-Turn Directions
            </button>
          </div>

          {/* ELD Daily Logs View */}
          {(activeTab === 'overview' || activeTab === 'eld') && (
            <EldLogSheet dailyLogs={tripData.daily_logs} />
          )}

          {/* Timeline View */}
          {(activeTab === 'overview' || activeTab === 'schedule') && (
            <div style={{ marginTop: '24px' }}>
              <StopTimeline events={tripData.events} />
            </div>
          )}

          {/* Turn-by-Turn Maneuvers */}
          {(activeTab === 'overview' || activeTab === 'directions') && (
            <div style={{ marginTop: '20px' }}>
              <RouteDirections route={tripData.route} locations={tripData.locations} />
            </div>
          )}
        </section>
      )}

      {/* Clean Minimalist Footer */}
      <footer style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-muted)', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <b>Spotter AI</b> • Commercial Hours of Service & ELD Engine
        </div>
        <div>
          Property-Carrying CMVs • 70-Hour / 8-Day Schedule
        </div>
      </footer>
    </div>
  );
}
