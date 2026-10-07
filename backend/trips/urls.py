from django.urls import path
from .views import PlanTripView, GeocodeLookupView, HealthCheckView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('plan/', PlanTripView.as_view(), name='plan-trip'),
    path('geocode/', GeocodeLookupView.as_view(), name='geocode-lookup'),
]
