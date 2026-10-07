"""
Electronic Logging Device (ELD) Log Generator.
Converts continuous, chronological trip events into authentic 24-hour (midnight to midnight)
daily driver logs adhering to FMCSA 49 CFR Part 395 and the blank paper log structure.
"""

from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Optional

from .hos import DutyStatus, CYCLE_LIMIT_HOURS, CYCLE_RESTART_HOURS


def generate_daily_eld_logs(
    events: List[Dict[str, Any]],
    carrier_info: Optional[Dict[str, str]] = None,
    initial_cycle_used: float = 0.0,
) -> List[Dict[str, Any]]:
    """
    Splits the continuous chronological stream of TripEvents into 24-hour daily logs.
    Every daily log is mathematically balanced to sum to exactly 24.0 hours across
    the 4 official FMCSA duty statuses.
    """
    if not events:
        return []

    if carrier_info is None:
        carrier_info = {
            "carrier_name": "Spotter AI Logistics Inc.",
            "main_office_address": "100 Logistics Blvd, Richmond, VA",
            "home_terminal_address": "Mid-Atlantic Freight Terminal, Richmond, VA",
            "vehicle_numbers": "Tractor #104 / Trailer #502",
            "shipping_manifest": "BOL-SP84920",
            "shipper_commodity": "Spotter Commercial Freight / Assorted Goods",
            "driver_name": "John Doe",
        }

    # Parse all events with datetimes
    parsed_events = []
    for evt in events:
        s_dt = datetime.fromisoformat(evt["start_time"])
        e_dt = datetime.fromisoformat(evt["end_time"])
        parsed_events.append({
            "event_id": evt["event_id"],
            "event_type": evt["event_type"],
            "duty_status": evt["duty_status"],
            "start_dt": s_dt,
            "end_dt": e_dt,
            "duration_hours": evt["duration_hours"],
            "distance_miles": evt["distance_miles"],
            "start_odometer": evt["start_odometer"],
            "end_odometer": evt["end_odometer"],
            "location_name": evt["location_name"],
            "remarks": evt["remarks"],
            "reason": evt["reason"],
        })

    first_dt = parsed_events[0]["start_dt"]
    last_dt = parsed_events[-1]["end_dt"]

    # Determine day span (midnight to midnight)
    start_date = first_dt.date()
    end_date = last_dt.date()

    # Pre-pad day 1 from midnight 00:00 to first event start with OFF_DUTY if trip started later
    day1_midnight = datetime.combine(start_date, time(0, 0, 0))
    if first_dt > day1_midnight:
        pad_duration = (first_dt - day1_midnight).total_seconds() / 3600.0
        parsed_events.insert(0, {
            "event_id": "pad_start",
            "event_type": "OFF_DUTY",
            "duty_status": DutyStatus.OFF_DUTY,
            "start_dt": day1_midnight,
            "end_dt": first_dt,
            "duration_hours": round(pad_duration, 2),
            "distance_miles": 0.0,
            "start_odometer": parsed_events[0]["start_odometer"],
            "end_odometer": parsed_events[0]["start_odometer"],
            "location_name": parsed_events[0]["location_name"],
            "remarks": f"{parsed_events[0]['location_name']} - Off Duty Prior to Work Shift",
            "reason": "Off duty prior to start of trip",
        })

    # Post-pad final day to midnight 24:00 with OFF_DUTY if trip ended earlier
    final_midnight = datetime.combine(end_date + timedelta(days=1), time(0, 0, 0))
    if last_dt < final_midnight:
        pad_duration = (final_midnight - last_dt).total_seconds() / 3600.0
        parsed_events.append({
            "event_id": "pad_end",
            "event_type": "OFF_DUTY",
            "duty_status": DutyStatus.OFF_DUTY,
            "start_dt": last_dt,
            "end_dt": final_midnight,
            "duration_hours": round(pad_duration, 2),
            "distance_miles": 0.0,
            "start_odometer": parsed_events[-1]["end_odometer"],
            "end_odometer": parsed_events[-1]["end_odometer"],
            "location_name": parsed_events[-1]["location_name"],
            "remarks": f"{parsed_events[-1]['location_name']} - Off Duty Following Delivery",
            "reason": "Off duty after delivery completed",
        })

    # Slice events by calendar days
    daily_logs: List[Dict[str, Any]] = []
    current_date = start_date
    day_idx = 1
    running_cycle_hours = initial_cycle_used
    prior_days_on_duty: List[float] = []

    while current_date <= end_date:
        d_start = datetime.combine(current_date, time(0, 0, 0))
        d_end = datetime.combine(current_date + timedelta(days=1), time(0, 0, 0))

        day_segments = []
        day_remarks = []
        day_driving_miles = 0.0
        start_odo_day = None
        end_odo_day = None
        from_loc = ""
        to_loc = ""

        # Find all event slices falling inside [d_start, d_end)
        for evt in parsed_events:
            s = max(d_start, evt["start_dt"])
            e = min(d_end, evt["end_dt"])
            if e > s:
                dur = (e - s).total_seconds() / 3600.0
                start_h = (s - d_start).total_seconds() / 3600.0
                end_h = (e - d_start).total_seconds() / 3600.0

                # Prorate miles if driving event was sliced
                total_evt_dur = (evt["end_dt"] - evt["start_dt"]).total_seconds() / 3600.0
                frac = dur / total_evt_dur if total_evt_dur > 0 else 1.0
                seg_miles = round(evt["distance_miles"] * frac, 1)

                if evt["duty_status"] == DutyStatus.DRIVING:
                    day_driving_miles += seg_miles

                if start_odo_day is None:
                    start_odo_day = evt["start_odometer"]
                    from_loc = evt["location_name"]
                end_odo_day = evt["end_odometer"]
                to_loc = evt["location_name"]

                seg = {
                    "event_id": evt["event_id"],
                    "event_type": evt["event_type"],
                    "duty_status": evt["duty_status"],
                    "line_number": DutyStatus.LINE_NUMBERS[evt["duty_status"]],
                    "start_hour": round(start_h, 3),
                    "end_hour": round(end_h, 3),
                    "duration_hours": round(dur, 3),
                    "start_time_str": s.strftime("%H:%M"),
                    "end_time_str": e.strftime("%H:%M") if e < d_end else "24:00",
                    "location_name": evt["location_name"],
                    "remarks": evt["remarks"],
                    "reason": evt["reason"],
                }
                day_segments.append(seg)

                # Add remark for duty status change if it begins in this day
                if evt["start_dt"] >= d_start and evt["start_dt"] < d_end:
                    day_remarks.append({
                        "time_str": evt["start_dt"].strftime("%H:%M"),
                        "hour": round((evt["start_dt"] - d_start).total_seconds() / 3600.0, 2),
                        "status": DutyStatus.DISPLAY_NAMES[evt["duty_status"]],
                        "location": evt["location_name"],
                        "note": evt["remarks"],
                    })

        # Calculate exact total hours for each duty status line
        line1_off = sum(s["duration_hours"] for s in day_segments if s["duty_status"] == DutyStatus.OFF_DUTY)
        line2_sb = sum(s["duration_hours"] for s in day_segments if s["duty_status"] == DutyStatus.SLEEPER_BERTH)
        line3_d = sum(s["duration_hours"] for s in day_segments if s["duty_status"] == DutyStatus.DRIVING)
        line4_ond = sum(s["duration_hours"] for s in day_segments if s["duty_status"] == DutyStatus.ON_DUTY_NOT_DRIVING)

        # Force floating-point sum to exactly 24.00
        total_calc = line1_off + line2_sb + line3_d + line4_ond
        if abs(total_calc - 24.0) > 0.001:
            line1_off += (24.0 - total_calc)

        line1_off = round(line1_off, 2)
        line2_sb = round(line2_sb, 2)
        line3_d = round(line3_d, 2)
        line4_ond = round(line4_ond, 2)
        total_hours = round(line1_off + line2_sb + line3_d + line4_ond, 2)

        on_duty_today = round(line3_d + line4_ond, 2)

        # 70-Hour / 8-Day Recap Calculations
        prior_days_on_duty.append(on_duty_today)
        # Last 7 days including today
        last_7_sum = round(sum(prior_days_on_duty[-7:]) + (initial_cycle_used if len(prior_days_on_duty) <= 7 else 0.0), 2)
        # Last 8 days including today
        last_8_sum = round(sum(prior_days_on_duty[-8:]) + (initial_cycle_used if len(prior_days_on_duty) <= 8 else 0.0), 2)
        
        # Check if 34-hour restart occurred today or during trip
        has_restart_today = any(s["event_type"] == "CYCLE_RESTART" for s in day_segments)
        if has_restart_today:
            last_7_sum = on_duty_today
            last_8_sum = on_duty_today
            avail_tomorrow = round(max(0.0, CYCLE_LIMIT_HOURS - on_duty_today), 2)
        else:
            avail_tomorrow = round(max(0.0, CYCLE_LIMIT_HOURS - last_7_sum), 2)

        daily_log = {
            "day_number": day_idx,
            "date": current_date.isoformat(),
            "date_formatted": current_date.strftime("%B %d, %Y"),
            "month": current_date.strftime("%m"),
            "day": current_date.strftime("%d"),
            "year": current_date.strftime("%Y"),
            "from_location": from_loc or "Terminal",
            "to_location": to_loc or "Terminal",
            "total_miles_driving_today": round(day_driving_miles, 1),
            "total_mileage_today": round(end_odo_day or 0.0, 1),
            "carrier_name": carrier_info["carrier_name"],
            "main_office_address": carrier_info["main_office_address"],
            "home_terminal_address": carrier_info["home_terminal_address"],
            "vehicle_numbers": carrier_info["vehicle_numbers"],
            "shipping_manifest": carrier_info["shipping_manifest"],
            "shipper_commodity": carrier_info["shipper_commodity"],
            "driver_name": carrier_info["driver_name"],
            "segments": day_segments,
            "remarks": day_remarks,
            "totals": {
                "line1_off_duty": line1_off,
                "line2_sleeper_berth": line2_sb,
                "line3_driving": line3_d,
                "line4_on_duty_not_driving": line4_ond,
                "total_hours": total_hours,
            },
            "recap": {
                "on_duty_today": on_duty_today,
                "a_hours_last_7_days": last_7_sum,
                "b_hours_available_tomorrow": avail_tomorrow,
                "c_hours_last_8_days": last_8_sum,
                "restart_occurred": has_restart_today,
            }
        }
        daily_logs.append(daily_log)

        current_date += timedelta(days=1)
        day_idx += 1

    return daily_logs
