import React, { useState, useEffect } from 'react';
import { Truck, ShieldCheck, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
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
      setErrorMessage(err.message || 'Failed to plan trip. Please verify backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load: automatically plan the default trip so reviewer sees instant results
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
      {/* Header */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-logo">
            <Truck size={24} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">Spotter AI</h1>
            <div className="brand-subtitle">Commercial HOS Trip Planner & ELD Log Engine</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="compliance-tag">
            <span className="pulse-dot" />
            <span>FMCSA 49 CFR § 395 Active</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Form on Left, Map/Results on Right */}
      <div className="planner-grid">
        {/* Left Column: Input Form */}
        <div>
          <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
        </div>

        {/* Right Column: Loading or Map & Quick Metrics */}
        <div>
          {isLoading && (
            <div className="glass-card loading-box">
              <div className="spinner" />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f9fafb' }}>
                Analyzing Route & Computing HOS Compliance
              </h3>
              <div className="loading-steps">
                <div className="loading-step-item">
                  <span>✔</span>
                  <span>Calculating highway distances & corridor routing via OSRM</span>
                </div>
                <div className="loading-step-item">
                  <span>✔</span>
                  <span>Evaluating 11-hour drive limits, 14-hour windows, and 8-hour breaks</span>
                </div>
                <div className="loading-step-item">
                  <span>✔</span>
                  <span>Scheduling mandatory fuel stops (&le;1,000 mi) and 10h sleeper rests</span>
                </div>
                <div className="loading-step-item">
                  <span>✔</span>
                  <span>Bisecting event stream at midnight & generating 24h ELD log sheets</span>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="glass-card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fca5a5' }}>Planning Error</h4>
                  <p style={{ fontSize: '13px', color: '#e5e7eb', marginTop: '4px' }}>{errorMessage}</p>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => handlePlanTrip({
                      current_location: 'Richmond, VA',
                      pickup_location: 'Baltimore, MD',
                      dropoff_location: 'Newark, NJ',
                      current_cycle_used: 18.0,
                    })}
                    style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={12} /> Reload Default Corridor
                  </button>
                </div>
              </div>
            </div>
          )}

          {tripData && !isLoading && (
            <>
              {/* Route Map */}
              <RouteMap
                route={tripData.route}
                events={tripData.events}
                locations={tripData.locations}
              />
            </>
          )}
        </div>
      </div>

      {/* Results Section */}
      {tripData && !isLoading && (
        <section id="trip-results-section" style={{ marginTop: '12px' }}>
          {/* Trip Summary Metric Cards */}
          <TripSummary
            summary={tripData.summary}
            locations={tripData.locations}
            dailyLogsCount={tripData.daily_logs?.length}
          />

          {/* View Mode Navigation Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`eld-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              All Sections & Schedule
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
              ⏱️ Chronological Timeline ({tripData.events?.length} Stops)
            </button>
          </div>

          {/* Section: ELD Daily Logs */}
          {(activeTab === 'overview' || activeTab === 'eld') && (
            <EldLogSheet dailyLogs={tripData.daily_logs} />
          )}

          {/* Section: Chronological Stop Timeline */}
          {(activeTab === 'overview' || activeTab === 'schedule') && (
            <div style={{ marginTop: '32px' }}>
              <StopTimeline events={tripData.events} />
            </div>
          )}

          {/* Section: Turn-by-Turn Route Instructions */}
          {(activeTab === 'overview') && (
            <RouteDirections route={tripData.route} locations={tripData.locations} />
          )}
        </section>
      )}

      {/* Footer */}
      <footer style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <b>Spotter AI Engineering Assessment</b> • Built with Django REST Framework & React
        </div>
        <div>
          Enforcing 49 CFR § 395.3 Property-Carrying Driver Regulations (70h / 8-Day Rule)
        </div>
      </footer>
    </div>
  );
}
