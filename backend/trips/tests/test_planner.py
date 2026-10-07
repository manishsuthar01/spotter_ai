"""
Unit tests for Trip Planner and ELD Log Generator.
Validates end-to-end trip planning, stop insertion, edge cases, and 24-hour log calculations.
"""

from datetime import datetime
from django.test import TestCase

from trips.services.planner import TripPlanner
from trips.services.eld import generate_daily_eld_logs
from trips.services.hos import DutyStatus


class TripPlannerTestCase(TestCase):

    def test_short_trip_same_day(self):
        """Case A: Short trip within a single day."""
        planner = TripPlanner(
            current_location="Richmond, VA",
            pickup_location="Richmond, VA",
            dropoff_location="Fredericksburg, VA",
            current_cycle_used=10.0,
            start_datetime=datetime(2026, 10, 7, 8, 0, 0),
        )
        plan = planner.plan()
        
        # Verify pickup (1h) and dropoff (1h) exist
        pickup_evts = [e for e in plan["events"] if e["event_type"] == "PICKUP"]
        dropoff_evts = [e for e in plan["events"] if e["event_type"] == "DROPOFF"]
        self.assertEqual(len(pickup_evts), 1)
        self.assertEqual(len(dropoff_evts), 1)
        self.assertEqual(pickup_evts[0]["duration_hours"], 1.0)
        self.assertEqual(dropoff_evts[0]["duration_hours"], 1.0)
        self.assertEqual(pickup_evts[0]["duty_status"], DutyStatus.ON_DUTY_NOT_DRIVING)
        self.assertEqual(dropoff_evts[0]["duty_status"], DutyStatus.ON_DUTY_NOT_DRIVING)

        # Generate ELD daily logs
        logs = generate_daily_eld_logs(plan["events"], initial_cycle_used=10.0)
        self.assertTrue(len(logs) >= 1)
        for log in logs:
            self.assertAlmostEqual(log["totals"]["total_hours"], 24.0, places=1)

    def test_medium_trip_crossing_break_threshold(self):
        """Case C: Trip crossing the 8-hour driving break threshold."""
        # Richmond, VA -> Chicago, IL (~800 miles, ~14 hours drive)
        planner = TripPlanner(
            current_location="Richmond, VA",
            pickup_location="Richmond, VA",
            dropoff_location="Chicago, IL",
            current_cycle_used=0.0,
            start_datetime=datetime(2026, 10, 7, 6, 0, 0),
        )
        plan = planner.plan()

        # Should have at least one mandatory 30m break or rest stop
        breaks = [e for e in plan["events"] if e["event_type"] == "REST_BREAK"]
        rests = [e for e in plan["events"] if e["event_type"] == "DAILY_REST"]
        self.assertTrue(len(breaks) >= 1 or len(rests) >= 1)

        logs = generate_daily_eld_logs(plan["events"], initial_cycle_used=0.0)
        self.assertTrue(len(logs) >= 2)  # Multi-day trip
        for log in logs:
            self.assertAlmostEqual(log["totals"]["total_hours"], 24.0, places=1)

    def test_long_trip_requiring_fuel_and_multiple_days(self):
        """Case B, D, F: Multi-day trip requiring fuel (>1000 miles) and 10h rests."""
        # Richmond, VA -> Dallas, TX (~1,250 miles)
        planner = TripPlanner(
            current_location="Richmond, VA",
            pickup_location="Richmond, VA",
            dropoff_location="Dallas, TX",
            current_cycle_used=0.0,
            start_datetime=datetime(2026, 10, 7, 6, 0, 0),
        )
        plan = planner.plan()

        fuel_stops = [e for e in plan["events"] if e["event_type"] == "FUEL_STOP"]
        self.assertTrue(len(fuel_stops) >= 1, "Trip over 1,000 miles must have at least one fuel stop")
        self.assertEqual(fuel_stops[0]["duration_hours"], 0.5)
        self.assertEqual(fuel_stops[0]["duty_status"], DutyStatus.ON_DUTY_NOT_DRIVING)

        daily_rests = [e for e in plan["events"] if e["event_type"] == "DAILY_REST"]
        self.assertTrue(len(daily_rests) >= 1, "Multi-day trip must have 10-hour daily rests")
        self.assertEqual(daily_rests[0]["duration_hours"], 10.0)

        logs = generate_daily_eld_logs(plan["events"], initial_cycle_used=0.0)
        self.assertTrue(len(logs) >= 2)
        for log in logs:
            self.assertAlmostEqual(log["totals"]["total_hours"], 24.0, places=1)

    def test_high_current_cycle_triggers_restart(self):
        """Case H: Driver near 70-hour cycle limit must trigger 34-hour restart."""
        planner = TripPlanner(
            current_location="Richmond, VA",
            pickup_location="Richmond, VA",
            dropoff_location="Dallas, TX",
            current_cycle_used=68.0,  # Only 2 hours available before 70h limit
            start_datetime=datetime(2026, 10, 7, 6, 0, 0),
        )
        plan = planner.plan()

        restarts = [e for e in plan["events"] if e["event_type"] == "CYCLE_RESTART"]
        self.assertTrue(len(restarts) >= 1, "Driver with 68h cycle used must take 34h restart")
        self.assertEqual(restarts[0]["duration_hours"], 34.0)

        logs = generate_daily_eld_logs(plan["events"], initial_cycle_used=68.0)
        for log in logs:
            self.assertAlmostEqual(log["totals"]["total_hours"], 24.0, places=1)

    def test_eld_recap_and_totals_integrity(self):
        """Validates that ELD daily logs maintain proper recap and duty line integrity."""
        planner = TripPlanner(
            current_location="Richmond, VA",
            pickup_location="Baltimore, MD",
            dropoff_location="Newark, NJ",
            current_cycle_used=20.0,
            start_datetime=datetime(2026, 10, 7, 6, 0, 0),
        )
        plan = planner.plan()
        logs = generate_daily_eld_logs(plan["events"], initial_cycle_used=20.0)

        for log in logs:
            t = log["totals"]
            line_sum = t["line1_off_duty"] + t["line2_sleeper_berth"] + t["line3_driving"] + t["line4_on_duty_not_driving"]
            self.assertAlmostEqual(line_sum, 24.0, places=2)
            self.assertAlmostEqual(t["total_hours"], 24.0, places=2)

            recap = log["recap"]
            self.assertGreaterEqual(recap["b_hours_available_tomorrow"], 0.0)
            self.assertLessEqual(recap["b_hours_available_tomorrow"], 70.0)
