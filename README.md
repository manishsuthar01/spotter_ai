# Spotter AI - Commercial HOS Trip Planner & ELD Log Engine

A full-stack commercial trucking logistics application built with **Django REST Framework** and **React**, engineered for property-carrying commercial motor vehicles (CMVs) under **FMCSA 49 CFR Part 395** regulations and the 70-hour / 8-day rule.

The platform takes trip waypoints and driver cycle usage as inputs, calculates highway routing via OpenStreetMap / OSRM, simulates hours-of-service compliance (driving limits, shift windows, rest breaks, sleeper berth resets, 1,000-mile fueling intervals), and dynamically draws authentic 24-hour **Driver's Daily Log (ELD)** SVG sheets matching the official FMCSA paper log standard.

---

## 📸 Key Features

- **Authoritative HOS Domain Engine**: Decoupled backend architecture enforcing FMCSA Part 395 rules independently from the user interface.
- **Dynamic 24-Hour ELD Log Generator**: Pure SVG data-driven daily log sheets replicating the FMCSA blank paper log format:
  - 24-hour graph grid (Midnight to Midnight) with 15-minute tick marks.
  - 4 Official Duty Status Rows: *Off Duty*, *Sleeper Berth*, *Driving*, and *On Duty (not driving)*.
  - Mathematical balance ensuring every day sums to **exactly 24.0 hours**.
  - Duty transition step lines and vertical connector bars.
  - Complete Header details (carrier, terminal, vehicle numbers, odometer, daily driving miles).
  - Remarks section with timestamped city/state change-of-status annotations.
  - 70-Hour / 8-Day Recap table with rolling cycle totals and 34-hour restart tracking.
- **Interactive Commercial Corridor Map**: High-contrast Leaflet map displaying highway route polylines and distinct pins for Origin, Pickup, Dropoff, Fuel stops, 10-hour rest areas, and 30-minute breaks.
- **Unified Single Source of Truth**: A normalized event stream (`TripEvent[]`) directly drives the map, timeline, turn-by-turn route instructions, and daily log generator.
- **Real Cycle Usage Support**: Inputting current cycle hours directly influences scheduling capacity, automatically scheduling 34-hour restarts when approaching the 70-hour limit.
- **Fuel Stop Insertion**: Automatically schedules 30-minute fueling stops (On-Duty Not Driving) at intervals not exceeding 1,000 miles.

---

## 🏛️ System Architecture

```text
spotter_ai/
├── backend/
│   ├── spotter_backend/
│   │   ├── settings.py          # CORS, REST Framework, app config
│   │   ├── urls.py              # Root API routing
│   │   └── wsgi.py
│   └── trips/
│       ├── services/
│       │   ├── routing.py       # Geocoding & OSRM road geometry
│       │   ├── hos.py           # FMCSA Part 395 HOS rule validation
│       │   ├── planner.py       # Trip scheduling & state machine
│       │   └── eld.py           # 24-hour log splitting & recap math
│       ├── views.py             # REST API endpoints (/api/plan/, /api/health/)
│       ├── urls.py
│       └── tests/
│           ├── test_hos.py      # HOS state machine unit tests
│           ├── test_planner.py  # Trip scheduler & multi-day tests
│           └── test_api.py      # API integration tests
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── TripForm.jsx     # Parameter input with test presets
    │   │   ├── TripSummary.jsx  # Metric cards & compliance badges
    │   │   ├── RouteMap.jsx     # Leaflet map with route & stop markers
    │   │   ├── StopTimeline.jsx # Ordered chronological schedule
    │   │   ├── RouteDirections.jsx # Turn-by-turn maneuvers
    │   │   └── EldLogSheet.jsx  # Pure SVG paper-replica ELD log
    │   ├── services/
    │   │   └── api.js           # API client with health checking
    │   ├── App.jsx              # Main dashboard view
    │   └── index.css            # Modern dark/slate design system
    └── package.json
```

---

## 📋 Hours of Service (HOS) Implementation Details

The backend scheduling engine strictly enforces the rules established in the FMCSA Driver's Guide to Hours of Service and the Spotter AI assessment specification:

| Regulation | FMCSA / Assessment Source | Implemented Rule & Behavior |
|---|---|---|
| **11-Hour Driving Limit** | 49 CFR § 395.3(a)(3) | Driver may drive a maximum of 11.0 cumulative hours during a shift following 10 consecutive hours off duty. |
| **14-Hour Duty Window** | 49 CFR § 395.3(a)(2) | Driver cannot drive after 14 consecutive hours have elapsed since coming on duty following 10 consecutive hours off duty. |
| **30-Minute Rest Break** | 49 CFR § 395.3(a)(3)(ii) | Driving is prohibited if more than 8 cumulative hours of driving have passed without at least 30 consecutive minutes of non-driving time (Off Duty, Sleeper Berth, or On-Duty Not Driving). |
| **10-Hour Daily Rest** | 49 CFR § 395.3(a)(1) | Requires 10 consecutive hours off duty / sleeper berth once driving limit or duty window is reached. Resets both 11h and 14h clocks. |
| **70-Hour / 8-Day Cycle** | 49 CFR § 395.3(b) | Driver may not drive after accumulating 70 on-duty hours in any rolling 8 consecutive days. |
| **34-Hour Cycle Restart** | 49 CFR § 395.3(c) | Taking 34 consecutive hours off duty / sleeper berth completely resets the rolling 70-hour clock back to 0.0 hours. |
| **Fueling Requirement** | Assessment Guide | Mandatory fueling stop (0.5 hr On-Duty Not Driving) scheduled at least once every 1,000 miles. Also satisfies the 30-min break rule. |
| **Pickup Operation** | Assessment Guide | 1.0 hour On-Duty Not Driving at pickup facility for loading and inspection. |
| **Dropoff Operation** | Assessment Guide | 1.0 hour On-Duty Not Driving at destination facility for unloading and paperwork. |

### How Driver State is Tracked

`DriverHOSState` (in `backend/trips/services/hos.py`) maintains explicit, independent clocks:
1. `driving_in_shift`: Cumulative driving hours since last 10h rest (capped at 11.0h).
2. `shift_start_time`: Timestamp marking the start of the 14-hour duty window.
3. `driving_since_break`: Cumulative driving hours since last qualifying 30m break (capped at 8.0h).
4. `cycle_hours_accumulated`: Rolling total of on-duty hours (capped at 70.0h).
5. `miles_since_fuel`: Odometer tracker ensuring stops occur within 1,000 miles.
6. `consecutive_off_duty`: Accumulated off-duty/sleeper time to detect 10h daily rests and 34h restarts.

### 24-Hour Midnight Log Splitting

In `backend/trips/services/eld.py`, the continuous timeline of `TripEvent` objects is bisected precisely at calendar day boundaries (`00:00:00` to `24:00:00`). Any event spanning across midnight is divided into two segments with matching duty statuses, ensuring:
- Every daily log has status totals that sum to **exactly 24.0 hours**.
- Multi-day trips cleanly generate sequential log sheets (`Day 1 of N`, `Day 2 of N`, etc.).
- Recap values accurately roll forward across days.

---

## 🚀 Setup & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup (Django)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database migrations (SQLite)
python manage.py migrate

# Run unit and integration tests
python manage.py test

# Start the Django development server (runs on port 8000)
python manage.py runserver 8000
```

### 2. Frontend Setup (React + Vite)

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server (runs on port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser. The application will immediately load with a pre-configured commercial route demonstration.

---

## 🧪 Testing

The backend includes a comprehensive suite of 15 automated test cases covering HOS rules, edge cases, multi-day splitting, and REST API validation:

```bash
cd backend
python manage.py test
```

### Edge Cases Covered:
- **Case A: Short Trip** — Single-day trip (Richmond, VA $\rightarrow$ Fredericksburg, VA).
- **Case B: Multi-Day Trip** — Trips spanning multiple calendar days (Richmond, VA $\rightarrow$ Dallas, TX).
- **Case C: 8-Hour Break Threshold** — Mandatory 30-minute break triggered upon reaching 8 driving hours.
- **Case D & E: 11-Hour Drive / 14-Hour Window Limit** — Shift termination and insertion of 10-hour sleeper berth rests.
- **Case F: Fuel Stops** — Trips over 1,000 miles inserting mandatory 30-minute fueling stops.
- **Case H: High Current Cycle** — Driver starting near the 70-hour limit (e.g. 64h or 68h used) triggering a 34-hour restart.
- **Case I: 24-Hour Daily Balance** — Validation that every generated ELD sheet sums to exactly 24.0 hours across lines 1–4.
- **Case J, K, L: Resilient Routing & Fallbacks** — Automatic offline geometric fallbacks if external geocoding/routing APIs fail or time out.

---

## 🌐 Live Deployment Guide

### Frontend Deployment (Vercel)
1. Push repository to GitHub.
2. In Vercel, import the repository and set the **Root Directory** to `frontend`.
3. Set environment variable: `VITE_API_URL=https://your-backend-api-url.onrender.com`.
4. Deploy! `frontend/vercel.json` ensures SPA client-side routing.

### Backend Deployment (Render / Railway)
1. In Render or Railway, create a new Web Service pointing to `backend/`.
2. Build command: `pip install -r requirements.txt`.
3. Start command: `gunicorn spotter_backend.wsgi:application --bind 0.0.0.0:$PORT`.
4. Add environment variables: `PYTHON_VERSION=3.11`, `ALLOWED_HOSTS=*`.

---

## ⚖️ Regulatory Notice & Limitations

*The application implements the HOS rules and assumptions specified in the Spotter AI assessment and supplied reference materials (FMCSA 49 CFR Part 395 for property-carrying CMVs under the 70-hour / 8-day schedule). It does not claim full regulatory certification for commercial production ELD hardware, nor does it support passenger-carrying rules, Alaska/Hawaii exceptions, or oilfield exemptions.*
