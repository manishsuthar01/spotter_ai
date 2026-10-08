/**
 * API Service for Spotter AI Trip Planner.
 * Interacts with Django REST backend with intelligent local fallback for resilient demonstration.
 */

// Intelligent base URL:
// 1. Uses explicit VITE_API_URL if set (e.g. on Vercel pointing to external backend)
// 2. If running locally on Vite dev server (port 5173), points to local Django (port 8000)
// 3. Otherwise (e.g. all-in-one production build or same-host deployment), uses relative path ''
const BACKEND_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '5173'
    ? 'http://127.0.0.1:8000'
    : '');

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/health/`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend health check unreachable:', e);
  }
  return null;
}

export async function fetchLocationSuggestions(query) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/geocode/?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.suggestions || [];
    }
  } catch (e) {
    console.warn('Location suggestion lookup failed:', e);
  }
  return [];
}

export async function planTripApi(params) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/plan/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error_details || 'Failed to plan trip.');
    }
    return data;
  } catch (err) {
    // If backend is unreachable or timed out, report descriptive error
    console.error('API call failed:', err);
    throw err;
  }
}
