"""
Unit tests for FMCSA HOS rules engine.
Tests limits, clocks, resets, and driver state transitions.
"""

from datetime import datetime
from django.test import TestCase

from trips.services.hos import (
    DutyStatus,
    DriverHOSState,
    MAX_DRIVING_SHIFT_HOURS,
    MAX_DUTY_WINDOW_HOURS,
    MANDATORY_DAILY_REST_HOURS,
    MAX_DRIVING_BEFORE_BREAK_HOURS,
    CYCLE_LIMIT_HOURS,
    CYCLE_RESTART_HOURS,
)


class HOSTestCase(TestCase):

    def setUp(self):
        self.start_dt = datetime(2026, 10, 7, 6, 0, 0)
        self.state = DriverHOSState(
            current_time=self.start_dt,
            odometer_miles=0.0,
            miles_since_fuel=0.0,
            driving_in_shift=0.0,
            shift_start_time=None,
            driving_since_break=0.0,
            cycle_hours_accumulated=0.0,
            consecutive_off_duty=10.0,
        )

    def test_initial_state_has_full_clocks(self):
        """A well-rested driver at cycle=0 should have 8h until break, 11h shift drive, 14h window, 70h cycle."""
        hours_avail, reason = self.state.get_remaining_driving_capacity()
        # 8h break is the first binding constraint
        self.assertEqual(hours_avail, 8.0)
        self.assertEqual(reason, "NEED_30M_BREAK")

    def test_30_minute_break_resets_8_hour_clock(self):
        """Driving 8 hours requires a 30m break, and taking it resets driving_since_break."""
        # Drive 8 hours
        self.state.record_event(DutyStatus.DRIVING, 8.0, 440.0)
        self.assertEqual(self.state.driving_since_break, 8.0)
        self.assertEqual(self.state.driving_in_shift, 8.0)

        hours_avail, reason = self.state.get_remaining_driving_capacity()
        self.assertEqual(hours_avail, 0.0)
        self.assertEqual(reason, "NEED_30M_BREAK")

        # Take 30-min break
        self.state.record_event(DutyStatus.OFF_DUTY, 0.5, 0.0)
        self.assertEqual(self.state.driving_since_break, 0.0)
        
        # Remaining driving should now be 3.0 hours (11 - 8)
        hours_avail, reason = self.state.get_remaining_driving_capacity()
        self.assertEqual(hours_avail, 3.0)
        self.assertEqual(reason, "NEED_10H_REST_DRIVE_LIMIT")

    def test_11_hour_driving_limit(self):
        """Driver cannot drive more than 11 cumulative hours in a shift."""
        # Drive 7 hours
        self.state.record_event(DutyStatus.DRIVING, 7.0, 385.0)
        # Take 30 min break
        self.state.record_event(DutyStatus.OFF_DUTY, 0.5, 0.0)
        # Drive 4 more hours (total 11 hours)
        self.state.record_event(DutyStatus.DRIVING, 4.0, 220.0)

        self.assertEqual(self.state.driving_in_shift, 11.0)
        hours_avail, reason = self.state.get_remaining_driving_capacity()
        self.assertEqual(hours_avail, 0.0)
        self.assertEqual(reason, "NEED_10H_REST_DRIVE_LIMIT")

    def test_14_hour_duty_window_limit(self):
        """Non-driving on-duty time consumes the 14-hour window."""
        # Come on duty for 5 hours (e.g. loading, inspection, delays)
        self.state.record_event(DutyStatus.ON_DUTY_NOT_DRIVING, 5.0, 0.0)
        # Drive 5 hours
        self.state.record_event(DutyStatus.DRIVING, 5.0, 275.0)
        
        # Total window elapsed: 10.0 hours. Remaining window: 4.0 hours
        # Remaining driving capacity: min(11-5=6, 14-10=4, 8-5=3) -> 3.0 hours (break)
        hours_avail, reason = self.state.get_remaining_driving_capacity()
        self.assertEqual(hours_avail, 3.0)
        self.assertEqual(reason, "NEED_30M_BREAK")

        # Take 30 min break
        self.state.record_event(DutyStatus.OFF_DUTY, 0.5, 0.0)
        # Total elapsed in window: 10.5 hours. Window left: 3.5 hours
        # Drive limit left: 6 hours.
        hours_avail, reason = self.state.get_remaining_driving_capacity()
        self.assertEqual(hours_avail, 3.5)
        self.assertEqual(reason, "NEED_10H_REST_DUTY_WINDOW")

    def test_10_hour_rest_resets_shift_clocks(self):
        """10 consecutive hours off duty or in sleeper berth resets 11h and 14h clocks."""
        self.state.record_event(DutyStatus.DRIVING, 11.0, 600.0)
        self.assertEqual(self.state.driving_in_shift, 11.0)

        # Take 10 hours sleeper berth
        self.state.record_event(DutyStatus.SLEEPER_BERTH, 10.0, 0.0)
        self.assertEqual(self.state.driving_in_shift, 0.0)
        self.assertIsNone(self.state.shift_start_time)
        self.assertEqual(self.state.driving_since_break, 0.0)

    def test_cycle_limit_and_34_hour_restart(self):
        """Current cycle limit stops driving at 70 hours; 34-hour restart resets to 0."""
        # Set driver to 65 hours used
        self.state.cycle_hours_accumulated = 65.0
        
        hours_avail, reason = self.state.get_remaining_driving_capacity()
        self.assertEqual(hours_avail, 5.0)
        self.assertEqual(reason, "NEED_34H_CYCLE_RESTART")

        # Driver drives 5 hours -> reaches 70.0
        self.state.record_event(DutyStatus.DRIVING, 5.0, 275.0)
        self.assertEqual(self.state.cycle_hours_accumulated, 70.0)

        hours_avail, reason = self.state.get_remaining_driving_capacity()
        self.assertEqual(hours_avail, 0.0)
        self.assertEqual(reason, "NEED_34H_CYCLE_RESTART")

        # 34-hour restart
        self.state.record_event(DutyStatus.OFF_DUTY, 34.0, 0.0)
        self.assertEqual(self.state.cycle_hours_accumulated, 0.0)
        self.assertEqual(self.state.driving_in_shift, 0.0)
