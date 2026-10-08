# Spotter AI Assessment — Full-Stack Trip Planner & ELD

**Repository:** https://github.com/manishsuthar01/spotter_ai
**Stack:** Django REST Framework, React, Vite, Leaflet, OpenStreetMap, OSRM
**HOS Standard:** FMCSA 49 CFR Part 395 — Property-Carrying CMVs, 70-Hour / 8-Day Schedule

## 1. Overview

This project is a full-stack commercial trucking trip planner built for the Spotter AI assessment.

The application takes:

* Current location
* Pickup location
* Dropoff location
* Current cycle hours used

It then calculates a road route, applies the required Hours-of-Service constraints, and generates a complete trip plan containing:

* Interactive route map
* Route waypoints
* Stop timeline
* Turn-by-turn directions
* Driver duty-status timeline
* FMCSA-style daily ELD logs
* Multi-day trip breakdown
* 70-hour / 8-day cycle information

The application uses free routing and mapping services and does not require paid API keys.

---

## 2. Architecture

The application keeps the trip-planning logic in the Django backend instead of putting regulatory calculations inside React.

```text
backend/
└── trips/
    └── services/
        ├── hos.py
        ├── planner.py
        ├── eld.py
        └── routing.py
```

### `hos.py`

Contains the HOS rules and driver-clock calculations.

### `planner.py`

Converts the route and driver state into a normalized sequence of trip events.

### `eld.py`

Takes the event stream and splits it across 24-hour boundaries to generate individual daily logs.

### `routing.py`

Handles geocoding and OSRM route requests, with fallback handling for external-service failures.

### Single TripEvent stream

A key design decision was to use one event stream as the source of truth.

The same events are used to generate:

```text
Trip Events
    ├── Map
    ├── Stop Timeline
    ├── Trip Metrics
    ├── Turn-by-Turn Directions
    └── ELD Daily Logs
```

This prevents different parts of the UI from independently calculating driver states or trip timing.

---

## 3. HOS Implementation

The planner implements the property-carrying HOS requirements relevant to the assessment.

| Rule                         | Implementation                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 11-hour driving limit        | Driver driving time is capped at 11 hours within the applicable 14-hour window.                                     |
| 14-hour duty window          | Driving is prevented after the 14th consecutive hour of the work period.                                            |
| 30-minute interruption       | A qualifying 30-minute non-driving period is scheduled when required after cumulative driving time.                 |
| 10-hour off-duty requirement | Required daily off-duty periods are incorporated into trip planning.                                                |
| 70-hour / 8-day cycle        | Driving is stopped when the configured 70-hour cycle limit is reached.                                              |
| 34-hour restart              | A qualifying 34-hour off-duty period can restart the 70/8 cycle.                                                    |
| Fuel stops                   | A 30-minute fueling stop is scheduled according to the assessment requirement of at least one stop per 1,000 miles. |
| Pickup / Dropoff             | Each facility includes 1 hour of on-duty, not-driving time as required by the assessment.                           |

The federal baseline for property-carrying drivers includes an 11-hour driving limit following 10 consecutive hours off duty, a 14-hour window, the 30-minute interruption requirement, and the 60/70-hour cycle limits. A 34-hour off-duty period can restart the applicable 7/8-day period.

The project follows the **70-hour / 8-day configuration specified by the assessment**.

---

## 4. ELD Daily Log

The ELD component is rendered as a data-driven SVG rather than a static image.

It follows the structure of the provided blank paper log and includes:

### Header

* Date
* From / To
* Carrier
* Main office
* Home terminal
* Vehicle number
* Daily driving miles
* Daily mileage

### 24-Hour Duty Graph

The graph contains the four standard duty-status rows:

1. Off Duty
2. Sleeper Berth
3. Driving
4. On Duty — Not Driving

The graph includes:

* Midnight-to-midnight timeline
* Hour markers
* 15-minute intervals
* Duty-status transition bars
* Continuous event-based duty line
* Daily totals for each duty status

The totals are calculated from the underlying event intervals and are balanced to exactly **24 hours per daily log**.

### Remarks

Each relevant duty-status transition is represented with:

* Timestamp
* Location
* State/city information
* Duty status
* Event description

### Cycle Recap

The daily log also exposes the relevant 70-hour / 8-day information, including:

* On-duty hours for the current day
* Previous-cycle hours
* Remaining available hours
* Eight-day total
* Restart status

### Multi-Day Support

Long trips are automatically split across calendar days.

The UI provides:

* Day navigation
* Previous / next controls
* Individual daily logs
* Print/export support

The log is kept inside a horizontally scrollable paper-sized container so that the original log proportions remain usable on smaller screens.

---

## 5. Route Planning

Routing is handled through:

**OpenStreetMap → OSRM → Django → React**

The backend obtains:

1. Geocoded locations
2. Road route geometry
3. Distance
4. Duration
5. Route legs
6. Maneuvers / instructions

The resulting route is displayed through Leaflet using OpenStreetMap tiles.

No paid mapping API or API key is required for the assessment implementation.

---

## 6. Frontend

The frontend was redesigned around the workflow rather than exposing backend implementation details.

The main views are:

* **All Operations**
* **ELD Daily Logs**
* **Driver Timeline**
* **Turn-by-Turn Directions**

The interface also includes quick test scenarios for:

* East Coast Corridor
* Long-haul trips above 1,000 miles
* Cycle restart scenarios
* Short-haul trips

### Visual System

The UI uses a light operational-dashboard style with:

* Orange primary accent
* Light neutral background
* White cards
* Subtle borders and shadows
* Dark primary typography
* Muted secondary text
* Monospace typography for ELD/tabular information

The goal was to keep the interface focused on dispatch and driver information rather than adding unnecessary visual effects.

---

## 7. Backend Validation & Error Handling

The backend validates:

* Required locations
* Coordinate values
* Cycle-hour range
* Trip parameters
* External routing/geocoding responses

External service failures are handled without crashing the application, with fallback behavior where possible.

The routing layer is isolated from the HOS and trip-planning logic so that changes to an external routing provider do not affect the regulatory calculations.

---

## 8. Testing

The backend currently has **15 automated tests passing**.

The test suite covers:

* 11-hour driving limit
* 14-hour window
* 30-minute break requirement
* Daily rest handling
* 70-hour / 8-day cycle
* 34-hour restart
* Multi-day event splitting
* 24-hour ELD balance
* Fuel-stop scheduling
* API validation
* Error handling

The frontend production build also completes successfully with Vite.

```text
npm run build
✓ Build completed successfully
```

---

## 9. Git & Deployment

The project is maintained in Git with semantic commits and the final implementation pushed to the `main` branch.

Deployment configuration includes:

* Gunicorn
* WhiteNoise
* Procfile
* Vercel configuration

The architecture supports both:

```text
Option 1:
React/Vite frontend
        ↓
Django REST API
```

and a single-service deployment where Django serves the built frontend.

---

## 10. Key Engineering Decisions

### One source of truth

The `TripEvent` stream is the central data model for the trip.

This avoids having separate timing calculations for the map, timeline, directions, and ELD.

### Regulatory logic isolated from UI

HOS calculations live in backend services instead of React components.

This makes the rules easier to test and change independently.

### Data-driven ELD

The paper log is generated from actual trip events rather than manually drawing a predefined log.

This allows the same component to represent different trips and automatically handle multi-day schedules.

### Free infrastructure

The assessment implementation uses:

* OpenStreetMap
* OSRM
* Leaflet

instead of relying on paid routing or mapping APIs.

---

## 11. Result

The final application provides an end-to-end workflow:

```text
Trip Inputs
     ↓
Location Validation
     ↓
Geocoding + Road Routing
     ↓
Route + Driver State
     ↓
HOS-Constrained Trip Planner
     ↓
Normalized Trip Events
     ↓
 ┌──────────────┬──────────────┬──────────────┐
 ↓              ↓              ↓              ↓
Map          Timeline      Directions       ELD
                                            Logs
```

The result is a functional full-stack trip planning system that combines road routing, HOS-aware scheduling, driver timelines, and electronic daily logs into one consistent data model.
