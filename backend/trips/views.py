"""
API Views for Spotter AI Trip Planner and ELD Log Generator.
Exposes REST endpoints with strict validation and graceful error handling.
"""

import logging
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services.planner import TripPlanner
from .services.eld import generate_daily_eld_logs
from .services.routing import geocode_location, KNOWN_US_LOCATIONS

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """Health check endpoint to verify backend service readiness."""
    def get(self, request):
        return Response({
            "status": "healthy",
            "service": "Spotter AI HOS & ELD Engine",
            "fmcsa_rules": "49 CFR Part 395",
            "cycle_rule": "70 Hours / 8 Days",
            "timestamp": datetime.now().isoformat(),
        })


class GeocodeLookupView(APIView):
    """Autocomplete and geocoding helper endpoint."""
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            # Return popular logistics hubs
            suggestions = [
                {"name": v["name"], "lat": v["lat"], "lng": v["lng"]}
                for v in list(KNOWN_US_LOCATIONS.values())[:10]
            ]
            return Response({"suggestions": suggestions})

        try:
            loc = geocode_location(query)
            return Response({"suggestions": [loc]})
        except Exception as e:
            logger.warning(f"Geocode lookup failed for '{query}': {e}")
            return Response({"suggestions": []})


class PlanTripView(APIView):
    """
    Main endpoint for trip planning and ELD daily log generation.
    Strictly validates input data and returns comprehensive route, timeline,
    and 24-hour ELD logs.
    """

    def post(self, request):
        data = request.data or {}

        # 1. Input Validation
        current_loc = str(data.get("current_location", "")).strip()
        pickup_loc = str(data.get("pickup_location", "")).strip()
        dropoff_loc = str(data.get("dropoff_location", "")).strip()
        raw_cycle = data.get("current_cycle_used", 0)

        errors = {}
        if not current_loc:
            errors["current_location"] = "Current location is required."
        if not pickup_loc:
            errors["pickup_location"] = "Pickup location is required."
        if not dropoff_loc:
            errors["dropoff_location"] = "Dropoff location is required."

        try:
            cycle_used = float(raw_cycle)
            if cycle_used < 0.0 or cycle_used > 70.0:
                errors["current_cycle_used"] = "Current cycle used must be between 0.0 and 70.0 hours."
        except (ValueError, TypeError):
            errors["current_cycle_used"] = "Current cycle used must be a valid number."

        if errors:
            return Response(
                {"success": False, "errors": errors, "message": "Validation failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse optional start datetime
        start_dt = None
        raw_start_time = data.get("start_time")
        if raw_start_time:
            try:
                start_dt = datetime.fromisoformat(raw_start_time.replace("Z", "+00:00"))
            except Exception:
                pass

        carrier_info = data.get("carrier_info")

        try:
            # 2. Run Trip Planner
            planner = TripPlanner(
                current_location=current_loc,
                pickup_location=pickup_loc,
                dropoff_location=dropoff_loc,
                current_cycle_used=cycle_used,
                start_datetime=start_dt,
            )
            plan_result = planner.plan()

            # 3. Generate 24-Hour ELD Daily Logs
            daily_logs = generate_daily_eld_logs(
                events=plan_result["events"],
                carrier_info=carrier_info,
                initial_cycle_used=cycle_used,
            )

            # Combine complete payload
            response_payload = {
                "success": True,
                "inputs": {
                    "current_location": current_loc,
                    "pickup_location": pickup_loc,
                    "dropoff_location": dropoff_loc,
                    "current_cycle_used": cycle_used,
                },
                "locations": plan_result["locations"],
                "summary": plan_result["summary"],
                "route": plan_result["route"],
                "events": plan_result["events"],
                "daily_logs": daily_logs,
            }

            return Response(response_payload, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Trip planning execution error: {e}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "message": f"Unable to plan trip: {str(e)}",
                    "error_details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
