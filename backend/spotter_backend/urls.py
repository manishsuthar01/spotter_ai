from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.http import FileResponse, HttpResponse

def index_view(request):
    dist_index = settings.BASE_DIR.parent / 'frontend' / 'dist' / 'index.html'
    if dist_index.exists():
        return FileResponse(open(dist_index, 'rb'))
    return HttpResponse(
        "<h2>Spotter AI API Server</h2><p>Backend API is running. Run <code>npm run build</code> in /frontend to serve the client UI.</p>",
        content_type="text/html"
    )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/trips/', include('trips.urls')),
    path('api/', include('trips.urls')),
    re_path(r'^(?!api/|admin/).*$', index_view),
]
