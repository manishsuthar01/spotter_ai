"""
Trip Planning and Scheduling Engine.
Synthesizes route geometry, driver state, and HOS rules into an authoritative,
chronological stream of normalized TripEvents.
"""

import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from .hos import (
    DutyStatus,
    DriverHOSState,
    MAX_DRIVING_SHIFT_HOURS,
    MAX_DUTY_WINDOW_HOURS,
    MANDATORY_DAILY_REST_HOURS,
    MAX_DRIVING_BEFORE_BREAK_HOURS,
    MANDATORY_BREAK_HOURS,
    CYCLE_LIMIT_HOURS,
    CYCLE_RESTART_HOURS,
    FUEL_INTERVAL_MILES,
    FUEL_DURATION_HOURS,
    PICKUP_DURATION_HOURS,
    DROPOFF_DURATION_HOURS,
    PRE_TRIP_INSPECTION_HOURS,
)
from .routing import (
    geocode_location,
    get_route_segment,
    interpolate_location_on_path,
)


@dataclass
class TripEvent:
    event_id: str
    event_type: str        # PRE_TRIP, DRIVING, REST_BREAK, FUEL_STOP, DAILY_REST, CYCLE_RESTART, PICKUP, DROPOFF, OFF_DUTY
    duty_status: str       # OFF_DUTY, SLEEPER_BERTH, DRIVING, ON_DUTY_NOT_DRIVING
    start_time: datetime
    end_time: datetime
    duration_hours: float
    distance_miles: float
    start_odometer: float
    end_odometer: float
    location_name: str
    latitude: float
    longitude: float
    remarks: str
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["start_time"] = self.start_time.isoformat()
        d["end_time"] = self.end_time.isoformat()
        d["duty_status_display"] = DutyStatus.DISPLAY_NAMES.get(self.duty_status, self.duty_status)
        d["line_number"] = DutyStatus.LINE_NUMBERS.get(self.duty_status, 1)
        return d


class TripPlanner:
    """
    Coordinates end-to-end trip planning.
    Ensures that route instructions, map markers, stop timeline,
    and daily ELD logs are generated from a single, unified source of truth.
    """

    def __init__(
        self,
        current_location: str,
        pickup_location: str,
        dropoff_location: str,
        current_cycle_used: float = 0.0,
        start_datetime: Optional[datetime] = None,
    ):
        self.current_location_query = current_location
        self.pickup_location_query = pickup_location
        self.dropoff_location_query = dropoff_location
        self.current_cycle_used = max(0.0, min(float(current_cycle_used), 70.0))

        if start_datetime is None:
            # Default to 06:00 AM on today's date
            now = datetime.now()
            self.start_datetime = datetime(now.year, now.month, now.day, 6, 0, 0)
        else:
            self.start_datetime = start_datetime

        self.events: List[TripEvent] = []
        self.event_counter = 1

    def _create_event(
        self,
        event_type: str,
        duty_status: str,
        start_time: datetime,
        duration_hours: float,
        distance_miles: float,
        start_odo: float,
        location_name: str,
        lat: float,
        lng: float,
        remarks: str,
        reason: str,
    ) -> TripEvent:
        end_time = start_time + timedelta(hours=duration_hours)
        end_odo = start_odo + distance_miles
        evt = TripEvent(
            event_id=f"evt_{self.event_counter}",
            event_type=event_type,
            duty_status=duty_status,
            start_time=start_time,
            end_time=end_time,
            duration_hours=round(duration_hours, 2),
            distance_miles=round(distance_miles, 1),
            start_odometer=round(start_odo, 1),
            end_odometer=round(end_odo, 1),
            location_name=location_name,
            latitude=round(lat, 5),
            longitude=round(lng, 5),
            remarks=remarks,
            reason=reason,
        )
        self.event_counter += 1
        return evt

    def plan(self) -> Dict[str, Any]:
        # 1. Geocode all locations
        loc_start = geocode_location(self.current_location_query)
        loc_pickup = geocode_location(self.pickup_location_query)
        loc_dropoff = geocode_location(self.dropoff_location_query)

        # 2. Get routing for both legs
        leg1_route = get_route_segment(loc_start, loc_pickup)
        leg2_route = get_route_segment(loc_dropoff if False else loc_pickup, loc_dropoff)

        total_distance = round(leg1_route["distance_miles"] + leg2_route["distance_miles"], 1)
        combined_path = leg1_route["path"] + leg2_route["path"]

        # 3. Initialize driver state
        state = DriverHOSState(
            current_time=self.start_datetime,
            odometer_miles=0.0,
            miles_since_fuel=0.0,
            driving_in_shift=0.0,
            shift_start_time=None,
            driving_since_break=0.0,
            cycle_hours_accumulated=self.current_cycle_used,
            consecutive_off_duty=10.0,  # Starts fully rested
        )

        self.events = []
        self.event_counter = 1

        # A. Pre-Trip Inspection (0.25h On-Duty Not Driving)
        pre_trip_evt = self._create_event(
            event_type="PRE_TRIP",
            duty_status=DutyStatus.ON_DUTY_NOT_DRIVING,
            start_time=state.current_time,
            duration_hours=PRE_TRIP_INSPECTION_HOURS,
            distance_miles=0.0,
            start_odo=state.odometer_miles,
            location_name=loc_start["name"],
            lat=loc_start["lat"],
            lng=loc_start["lng"],
            remarks=f"{loc_start['name']} - Pre-Trip Vehicle Inspection",
            reason="Mandatory pre-trip CMV inspection",
        )
        self.events.append(pre_trip_evt)
        state.record_event(pre_trip_evt.duty_status, pre_trip_evt.duration_hours, pre_trip_evt.distance_miles)

        # B. Drive Leg 1 (Start -> Pickup)
        self._simulate_driving_leg(
            state=state,
            leg_name="Leg 1: En Route to Pickup",
            origin_loc=loc_start,
            dest_loc=loc_pickup,
            leg_distance=leg1_route["distance_miles"],
            leg_duration=leg1_route["duration_hours"],
            leg_path=leg1_route["path"],
        )

        # C. Pickup Operation (1.0h On-Duty Not Driving)
        pickup_evt = self._create_event(
            event_type="PICKUP",
            duty_status=DutyStatus.ON_DUTY_NOT_DRIVING,
            start_time=state.current_time,
            duration_hours=PICKUP_DURATION_HOURS,
            distance_miles=0.0,
            start_odo=state.odometer_miles,
            location_name=loc_pickup["name"],
            lat=loc_pickup["lat"],
            lng=loc_pickup["lng"],
            remarks=f"{loc_pickup['name']} - Shipper Loading & Cargo Securement",
            reason="Shipper pickup and document verification (1 hour)",
        )
        self.events.append(pickup_evt)
        state.record_event(pickup_evt.duty_status, pickup_evt.duration_hours, pickup_evt.distance_miles)

        # D. Drive Leg 2 (Pickup -> Dropoff)
        self._simulate_driving_leg(
            state=state,
            leg_name="Leg 2: En Route to Delivery",
            origin_loc=loc_pickup,
            dest_loc=loc_dropoff,
            leg_distance=leg2_route["distance_miles"],
            leg_duration=leg2_route["duration_hours"],
            leg_path=leg2_route["path"],
        )

        # E. Dropoff Operation (1.0h On-Duty Not Driving)
        dropoff_evt = self._create_event(
            event_type="DROPOFF",
            duty_status=DutyStatus.ON_DUTY_NOT_DRIVING,
            start_time=state.current_time,
            duration_hours=DROPOFF_DURATION_HOURS,
            distance_miles=0.0,
            start_odo=state.odometer_miles,
            location_name=loc_dropoff["name"],
            lat=loc_dropoff["lat"],
            lng=loc_dropoff["lng"],
            remarks=f"{loc_dropoff['name']} - Consignee Delivery & Unloading",
            reason="Consignee dropoff and bill of lading signing (1 hour)",
        )
        self.events.append(dropoff_evt)
        state.record_event(dropoff_evt.duty_status, dropoff_evt.duration_hours, dropoff_evt.distance_miles)

        # F. Post-Trip Inspection & Final Off-Duty
        post_trip_evt = self._create_event(
            event_type="OFF_DUTY",
            duty_status=DutyStatus.OFF_DUTY,
            start_time=state.current_time,
            duration_hours=0.5,
            distance_miles=0.0,
            start_odo=state.odometer_miles,
            location_name=loc_dropoff["name"],
            lat=loc_dropoff["lat"],
            lng=loc_dropoff["lng"],
            remarks=f"{loc_dropoff['name']} - Post-Trip Inspection & Released from Work",
            reason="Post-trip inspection and released from work",
        )
        self.events.append(post_trip_evt)
        state.record_event(post_trip_evt.duty_status, post_trip_evt.duration_hours, post_trip_evt.distance_miles)

        # 4. Generate summary statistics
        total_driving_hours = sum(e.duration_hours for e in self.events if e.duty_status == DutyStatus.DRIVING)
        total_on_duty_hours = sum(e.duration_hours for e in self.events if e.duty_status in (DutyStatus.DRIVING, DutyStatus.ON_DUTY_NOT_DRIVING))
        total_off_duty_hours = sum(e.duration_hours for e in self.events if e.duty_status in (DutyStatus.OFF_DUTY, DutyStatus.SLEEPER_BERTH))
        total_elapsed_hours = (state.current_time - self.start_datetime).total_seconds() / 3600.0

        num_fuel_stops = len([e for e in self.events if e.event_type == "FUEL_STOP"])
        num_rest_stops = len([e for e in self.events if e.event_type in ("DAILY_REST", "CYCLE_RESTART")])
        num_breaks = len([e for e in self.events if e.event_type == "REST_BREAK"])

        return {
            "locations": {
                "start": loc_start,
                "pickup": loc_pickup,
                "dropoff": loc_dropoff,
            },
            "summary": {
                "total_distance_miles": total_distance,
                "total_driving_hours": round(total_driving_hours, 2),
                "total_on_duty_hours": round(total_on_duty_hours, 2),
                "total_off_duty_hours": round(total_off_duty_hours, 2),
                "total_elapsed_hours": round(total_elapsed_hours, 2),
                "start_time": self.start_datetime.isoformat(),
                "end_time": state.current_time.isoformat(),
                "initial_cycle_used": self.current_cycle_used,
                "final_cycle_used": round(state.cycle_hours_accumulated, 2),
                "fuel_stops_count": num_fuel_stops,
                "rest_stops_count": num_rest_stops,
                "break_stops_count": num_breaks,
            },
            "route": {
                "combined_path": combined_path,
                "leg1": leg1_route,
                "leg2": leg2_route,
            },
            "events": [e.to_dict() for e in self.events],
        }

    def _simulate_driving_leg(
        self,
        state: DriverHOSState,
        leg_name: str,
        origin_loc: Dict[str, Any],
        dest_loc: Dict[str, Any],
        leg_distance: float,
        leg_duration: float,
        leg_path: List[List[float]],
    ):
        """Simulates driving a leg while strictly enforcing all FMCSA HOS rules and fueling requirements."""
        if leg_distance <= 0:
            return

        avg_speed = leg_distance / leg_duration if leg_duration > 0 else 55.0
        remaining_leg_miles = leg_distance
        completed_leg_miles = 0.0

        while remaining_leg_miles > 0.001:
            # 1. Check max driving time allowed under HOS rules
            available_drive_hours, limiting_reason = state.get_remaining_driving_capacity()

            # 2. Check distance and time until next fuel stop (<= 1,000 miles interval)
            miles_to_fuel = max(0.0, FUEL_INTERVAL_MILES - state.miles_since_fuel)
            hours_to_fuel = miles_to_fuel / avg_speed if avg_speed > 0 else 999.0

            # 3. Time needed to finish the remainder of this leg
            hours_to_dest = remaining_leg_miles / avg_speed

            # Identify next stopping trigger
            # Is the driver able to reach destination before any stop?
            if hours_to_dest <= available_drive_hours and remaining_leg_miles <= miles_to_fuel:
                # Drive all the way to destination!
                drive_hours = hours_to_dest
                drive_miles = remaining_leg_miles
                remaining_leg_miles = 0.0
                completed_leg_miles += drive_miles

                cur_lat, cur_lng = interpolate_location_on_path(leg_path, 1.0)
                evt = self._create_event(
                    event_type="DRIVING",
                    duty_status=DutyStatus.DRIVING,
                    start_time=state.current_time,
                    duration_hours=drive_hours,
                    distance_miles=drive_miles,
                    start_odo=state.odometer_miles,
                    location_name=dest_loc["name"],
                    lat=cur_lat,
                    lng=cur_lng,
                    remarks=f"Driving towards {dest_loc['name']}",
                    reason=f"{leg_name} driving",
                )
                self.events.append(evt)
                state.record_event(evt.duty_status, evt.duration_hours, evt.distance_miles)
                break

            # Need to stop before destination. Which trigger hits first?
            # A. Fuel trigger
            if hours_to_fuel <= available_drive_hours and miles_to_fuel < remaining_leg_miles:
                # Drive to fuel stop
                drive_hours = hours_to_fuel
                drive_miles = miles_to_fuel
                remaining_leg_miles -= drive_miles
                completed_leg_miles += drive_miles

                progress_ratio = completed_leg_miles / leg_distance if leg_distance > 0 else 0.0
                cur_lat, cur_lng = interpolate_location_on_path(leg_path, progress_ratio)

                drive_evt = self._create_event(
                    event_type="DRIVING",
                    duty_status=DutyStatus.DRIVING,
                    start_time=state.current_time,
                    duration_hours=drive_hours,
                    distance_miles=drive_miles,
                    start_odo=state.odometer_miles,
                    location_name=f"Corridor en route to {dest_loc['name']}",
                    lat=cur_lat,
                    lng=cur_lng,
                    remarks=f"Driving en route to {dest_loc['name']}",
                    reason="Driving towards fuel stop",
                )
                self.events.append(drive_evt)
                state.record_event(drive_evt.duty_status, drive_evt.duration_hours, drive_evt.distance_miles)

                # Fuel Stop (0.5h On-Duty Not Driving)
                fuel_loc_name = f"Travel Plaza / Fuel Stop (Mile {int(state.odometer_miles)})"
                fuel_evt = self._create_event(
                    event_type="FUEL_STOP",
                    duty_status=DutyStatus.ON_DUTY_NOT_DRIVING,
                    start_time=state.current_time,
                    duration_hours=FUEL_DURATION_HOURS,
                    distance_miles=0.0,
                    start_odo=state.odometer_miles,
                    location_name=fuel_loc_name,
                    lat=cur_lat,
                    lng=cur_lng,
                    remarks=f"{fuel_loc_name} - Refuel CMV & Walk-Around Check",
                    reason="Required fueling stop (<= 1,000 miles interval)",
                )
                self.events.append(fuel_evt)
                state.record_event(fuel_evt.duty_status, fuel_evt.duration_hours, fuel_evt.distance_miles)
                state.miles_since_fuel = 0.0
                continue

            # B. HOS limit trigger
            drive_hours = available_drive_hours
            drive_miles = min(remaining_leg_miles, drive_hours * avg_speed)
            remaining_leg_miles -= drive_miles
            completed_leg_miles += drive_miles

            progress_ratio = completed_leg_miles / leg_distance if leg_distance > 0 else 0.0
            cur_lat, cur_lng = interpolate_location_on_path(leg_path, progress_ratio)

            if drive_hours > 0:
                drive_evt = self._create_event(
                    event_type="DRIVING",
                    duty_status=DutyStatus.DRIVING,
                    start_time=state.current_time,
                    duration_hours=drive_hours,
                    distance_miles=drive_miles,
                    start_odo=state.odometer_miles,
                    location_name=f"Highway en route to {dest_loc['name']}",
                    lat=cur_lat,
                    lng=cur_lng,
                    remarks=f"Driving en route to {dest_loc['name']}",
                    reason=f"Driving segment ({limiting_reason})",
                )
                self.events.append(drive_evt)
                state.record_event(drive_evt.duty_status, drive_evt.duration_hours, drive_evt.distance_miles)

            # Insert appropriate mandatory HOS rest or break
            stop_loc_name = f"Rest Area / Truck Stop (Mile {int(state.odometer_miles)})"

            if limiting_reason == "NEED_30M_BREAK":
                # 30-minute rest break (§ 395.3(a)(3)(ii))
                break_evt = self._create_event(
                    event_type="REST_BREAK",
                    duty_status=DutyStatus.OFF_DUTY,
                    start_time=state.current_time,
                    duration_hours=MANDATORY_BREAK_HOURS,
                    distance_miles=0.0,
                    start_odo=state.odometer_miles,
                    location_name=stop_loc_name,
                    lat=cur_lat,
                    lng=cur_lng,
                    remarks=f"{stop_loc_name} - Mandatory 30-Min Rest Break",
                    reason="Mandatory 30-min break after 8 cumulative driving hours (§ 395.3(a)(3)(ii))",
                )
                self.events.append(break_evt)
                state.record_event(break_evt.duty_status, break_evt.duration_hours, break_evt.distance_miles)

            elif limiting_reason in ("NEED_10H_REST_DRIVE_LIMIT", "NEED_10H_REST_DUTY_WINDOW"):
                # 10 consecutive hours daily rest in sleeper berth (§ 395.3(a)(1))
                reason_desc = (
                    "11-hour driving limit reached (§ 395.3(a)(3))"
                    if limiting_reason == "NEED_10H_REST_DRIVE_LIMIT"
                    else "14-hour duty window reached (§ 395.3(a)(2))"
                )
                daily_rest_evt = self._create_event(
                    event_type="DAILY_REST",
                    duty_status=DutyStatus.SLEEPER_BERTH,
                    start_time=state.current_time,
                    duration_hours=MANDATORY_DAILY_REST_HOURS,
                    distance_miles=0.0,
                    start_odo=state.odometer_miles,
                    location_name=stop_loc_name,
                    lat=cur_lat,
                    lng=cur_lng,
                    remarks=f"{stop_loc_name} - 10-Hour Sleeper Berth Daily Rest",
                    reason=f"Mandatory 10-hour consecutive rest: {reason_desc}",
                )
                self.events.append(daily_rest_evt)
                state.record_event(daily_rest_evt.duty_status, daily_rest_evt.duration_hours, daily_rest_evt.distance_miles)

            elif limiting_reason == "NEED_34H_CYCLE_RESTART":
                # 34-hour restart provision (§ 395.3(c))
                restart_evt = self._create_event(
                    event_type="CYCLE_RESTART",
                    duty_status=DutyStatus.SLEEPER_BERTH,
                    start_time=state.current_time,
                    duration_hours=CYCLE_RESTART_HOURS,
                    distance_miles=0.0,
                    start_odo=state.odometer_miles,
                    location_name=stop_loc_name,
                    lat=cur_lat,
                    lng=cur_lng,
                    remarks=f"{stop_loc_name} - 34-Hour Restart (Cycle Reset to 0)",
                    reason="Mandatory 34-hour restart: 70-hour/8-day cycle limit reached (§ 395.3(c))",
                )
                self.events.append(restart_evt)
                state.record_event(restart_evt.duty_status, restart_evt.duration_hours, restart_evt.distance_miles)
