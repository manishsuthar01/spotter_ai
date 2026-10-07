"""
Hours of Service (HOS) Engine.
Implements FMCSA 49 CFR Part 395 rules for property-carrying drivers:
- 11-Hour Driving Limit (§ 395.3(a)(3))
- 14-Hour Driving Window (§ 395.3(a)(2))
- 30-Minute Rest Break (§ 395.3(a)(3)(ii))
- 10 Consecutive Hours Off-Duty Rest (§ 395.3(a)(1))
- 70-Hour / 8-Day Cycle Limit (§ 395.3(b))
- 34-Hour Restart Provision (§ 395.3(c))
- Fueling interval every 1,000 miles (Assessment specification)
- Pickup & Dropoff durations (1 hr On-Duty Not Driving each)
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any


class DutyStatus:
    OFF_DUTY = "OFF_DUTY"
    SLEEPER_BERTH = "SLEEPER_BERTH"
    DRIVING = "DRIVING"
    ON_DUTY_NOT_DRIVING = "ON_DUTY_NOT_DRIVING"

    DISPLAY_NAMES = {
        OFF_DUTY: "1. Off Duty",
        SLEEPER_BERTH: "2. Sleeper Berth",
        DRIVING: "3. Driving",
        ON_DUTY_NOT_DRIVING: "4. On Duty (not driving)",
    }

    LINE_NUMBERS = {
        OFF_DUTY: 1,
        SLEEPER_BERTH: 2,
        DRIVING: 3,
        ON_DUTY_NOT_DRIVING: 4,
    }


# FMCSA & Assessment Constants
MAX_DRIVING_SHIFT_HOURS = 11.0          # § 395.3(a)(3)
MAX_DUTY_WINDOW_HOURS = 14.0            # § 395.3(a)(2)
MANDATORY_DAILY_REST_HOURS = 10.0       # § 395.3(a)(1)
MAX_DRIVING_BEFORE_BREAK_HOURS = 8.0    # § 395.3(a)(3)(ii)
MANDATORY_BREAK_HOURS = 0.5             # 30 consecutive minutes
CYCLE_LIMIT_HOURS = 70.0                # § 395.3(b) (70h / 8-day)
CYCLE_RESTART_HOURS = 34.0              # § 395.3(c) (34-hour restart)

FUEL_INTERVAL_MILES = 1000.0            # Fuel at least once every 1,000 miles
FUEL_DURATION_HOURS = 0.5               # 30 minutes On-Duty Not Driving
PICKUP_DURATION_HOURS = 1.0             # 1 hour On-Duty Not Driving
DROPOFF_DURATION_HOURS = 1.0            # 1 hour On-Duty Not Driving
PRE_TRIP_INSPECTION_HOURS = 0.25        # 15 minutes On-Duty Not Driving


@dataclass
class DriverHOSState:
    """Explicit driver state tracker for HOS compliance."""
    current_time: datetime
    odometer_miles: float = 0.0
    miles_since_fuel: float = 0.0

    # Driving & Shift clocks
    driving_in_shift: float = 0.0            # Cumulative driving in current shift (max 11.0)
    shift_start_time: Optional[datetime] = None  # Start of 14-hour window
    driving_since_break: float = 0.0         # Cumulative driving since last qualifying 30m break (max 8.0)

    # Weekly / Rolling cycle clock
    cycle_hours_accumulated: float = 0.0     # Total on-duty (driving + on duty not driving) in cycle (max 70.0)

    # Rest tracking
    consecutive_off_duty: float = 0.0        # Consecutive hours in Off-Duty or Sleeper Berth

    def get_remaining_driving_capacity(self) -> Tuple[float, str]:
        """
        Determines the maximum number of driving hours legally available
        before a mandatory stop (break, daily rest, or cycle restart).
        Returns: (available_hours, binding_reason)
        """
        # 1. 11-Hour Driving Limit (§ 395.3(a)(3))
        drive_left_in_shift = max(0.0, MAX_DRIVING_SHIFT_HOURS - self.driving_in_shift)

        # 2. 14-Hour Driving Window (§ 395.3(a)(2))
        if self.shift_start_time is not None:
            elapsed_in_window = (self.current_time - self.shift_start_time).total_seconds() / 3600.0
            window_left = max(0.0, MAX_DUTY_WINDOW_HOURS - elapsed_in_window)
        else:
            window_left = MAX_DUTY_WINDOW_HOURS

        # 3. 30-Minute Rest Break (§ 395.3(a)(3)(ii))
        break_drive_left = max(0.0, MAX_DRIVING_BEFORE_BREAK_HOURS - self.driving_since_break)

        # 4. 70-Hour Cycle Limit (§ 395.3(b))
        cycle_left = max(0.0, CYCLE_LIMIT_HOURS - self.cycle_hours_accumulated)

        # Identify lowest constraint
        constraints = [
            (break_drive_left, "NEED_30M_BREAK"),
            (drive_left_in_shift, "NEED_10H_REST_DRIVE_LIMIT"),
            (window_left, "NEED_10H_REST_DUTY_WINDOW"),
            (cycle_left, "NEED_34H_CYCLE_RESTART"),
        ]

        min_hours, reason = min(constraints, key=lambda x: x[0])
        return round(min_hours, 4), reason

    def record_event(self, duty_status: str, duration_hours: float, distance_miles: float = 0.0):
        """
        Updates driver state clocks according to the event's duty status and duration.
        """
        duration_hours = max(0.0, duration_hours)
        distance_miles = max(0.0, distance_miles)

        self.odometer_miles += distance_miles
        self.miles_since_fuel += distance_miles
        self.current_time += timedelta(hours=duration_hours)

        is_off_duty = duty_status in (DutyStatus.OFF_DUTY, DutyStatus.SLEEPER_BERTH)
        is_on_duty = duty_status in (DutyStatus.DRIVING, DutyStatus.ON_DUTY_NOT_DRIVING)

        if is_off_duty:
            self.consecutive_off_duty += duration_hours

            # Check 34-Hour Restart (§ 395.3(c))
            if self.consecutive_off_duty >= CYCLE_RESTART_HOURS:
                self.cycle_hours_accumulated = 0.0
                self.driving_in_shift = 0.0
                self.shift_start_time = None
                self.driving_since_break = 0.0

            # Check 10-Hour Daily Rest (§ 395.3(a)(1))
            elif self.consecutive_off_duty >= MANDATORY_DAILY_REST_HOURS:
                self.driving_in_shift = 0.0
                self.shift_start_time = None
                self.driving_since_break = 0.0

            # Check 30-Minute Rest Break (§ 395.3(a)(3)(ii))
            if duration_hours >= MANDATORY_BREAK_HOURS:
                self.driving_since_break = 0.0

        else:
            # Driver went on duty
            self.consecutive_off_duty = 0.0

            # Start 14-hour window if not already active
            if self.shift_start_time is None:
                self.shift_start_time = self.current_time - timedelta(hours=duration_hours)

            # Accumulate weekly cycle on-duty hours
            self.cycle_hours_accumulated += duration_hours

            if duty_status == DutyStatus.DRIVING:
                self.driving_in_shift += duration_hours
                self.driving_since_break += duration_hours
            else:
                # On-duty not driving
                # Under 2020 FMCSA rule (§ 395.3(a)(3)(ii)), 30+ consecutive minutes of ANY non-driving
                # status (including On-Duty Not Driving) satisfies the required break!
                if duration_hours >= MANDATORY_BREAK_HOURS:
                    self.driving_since_break = 0.0
