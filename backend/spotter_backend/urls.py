import mimetypes
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from django.http import FileResponse, HttpResponse

# Explicitly ensure JavaScript and CSS MIME types are registered correctly
mimetypes.add_type("application/javascript", ".js", True)
mimetypes.add_type("text/css", ".css", True)

FRONTEND_DIST = settings.BASE_DIR.parent / 'frontend' / 'dist'

def index_view(request):
    dist_index = FRONTEND_DIST / 'index.html'
    if dist_index.exists():
        return FileResponse(open(dist_index, 'rb'), content_type="text/html")
    return HttpResponse(
        "<h2>Spotter AI API Server</h2><p>Backend API is running. Run <code>npm run build</code> in /frontend to serve the client UI.</p>",
        content_type="text/html"
    )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/trips/', include('trips.urls')),
    path('api/', include('trips.urls')),

    # 1. Serve Vite JavaScript / CSS asset bundles with strict, correct MIME types
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIST / 'assets'}),

    # 2. Serve root static assets (favicon, icons, logos, manifests)
    re_path(r'^(?P<path>[^/]+\.(?:svg|png|ico|json|txt|jpg|jpeg|webp))$', serve, {'document_root': FRONTEND_DIST}),

    # 3. Catch-all: Route all other web paths to index.html for React SPA client routing
    re_path(r'^(?!api/|admin/|assets/).*$', index_view),
]
