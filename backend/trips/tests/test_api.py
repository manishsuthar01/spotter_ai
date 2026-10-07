"""
API Integration Tests.
Validates HTTP request/response payloads, status codes, and input validation.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class TripAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'healthy')

    def test_plan_trip_missing_fields_validation(self):
        response = self.client.post('/api/plan/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('current_location', response.data['errors'])
        self.assertIn('pickup_location', response.data['errors'])
        self.assertIn('dropoff_location', response.data['errors'])

    def test_plan_trip_invalid_cycle_validation(self):
        payload = {
            "current_location": "Richmond, VA",
            "pickup_location": "Richmond, VA",
            "dropoff_location": "Fredericksburg, VA",
            "current_cycle_used": 75.0,  # exceeds 70
        }
        response = self.client.post('/api/plan/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_cycle_used', response.data['errors'])

    def test_plan_trip_success(self):
        payload = {
            "current_location": "Richmond, VA",
            "pickup_location": "Baltimore, MD",
            "dropoff_location": "Newark, NJ",
            "current_cycle_used": 24.5,
        }
        response = self.client.post('/api/plan/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('summary', response.data)
        self.assertIn('route', response.data)
        self.assertIn('events', response.data)
        self.assertIn('daily_logs', response.data)
        self.assertTrue(len(response.data['daily_logs']) >= 1)
