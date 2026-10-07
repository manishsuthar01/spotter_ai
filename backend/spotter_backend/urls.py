from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/trips/', include('trips.urls')),
    path('api/', include('trips.urls')),  # Alias /api/plan/ and /api/health/ directly as well
]
