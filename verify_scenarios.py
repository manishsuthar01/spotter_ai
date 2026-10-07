import urllib.request
import json

def test_scenario(name, payload):
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/plan/',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        s = data['summary']
        logs = data['daily_logs']
        print(f"=== {name} ===")
        print(f"Distance: {s['total_distance_miles']} mi | Driving: {s['total_driving_hours']}h | Elapsed: {s['total_elapsed_hours']}h")
        print(f"Fuel stops: {s['fuel_stops_count']} | Rest stops: {s['rest_stops_count']} | Breaks: {s['break_stops_count']}")
        print(f"Initial Cycle: {s['initial_cycle_used']}h | Final Cycle: {s['final_cycle_used']}h")
        print(f"Daily Logs Count: {len(logs)}")
        for log in logs:
            tot = log['totals']
            recap = log['recap']
            print(f"  Day {log['day_number']} ({log['date']}): Off={tot['line1_off_duty']}h, SB={tot['line2_sleeper_berth']}h, D={tot['line3_driving']}h, OnD={tot['line4_on_duty_not_driving']}h => Total={tot['total_hours']}h | Recap Avail Tomorrow={recap['b_hours_available_tomorrow']}h")

test_scenario('1. East Coast Corridor', {
    'current_location': 'Richmond, VA',
    'pickup_location': 'Baltimore, MD',
    'dropoff_location': 'Newark, NJ',
    'current_cycle_used': 18.0
})

test_scenario('2. Long-Haul (>1000mi Fuel & Rest)', {
    'current_location': 'Richmond, VA',
    'pickup_location': 'Richmond, VA',
    'dropoff_location': 'Dallas, TX',
    'current_cycle_used': 5.0
})

test_scenario('3. Cycle Near Limit (64h used)', {
    'current_location': 'Richmond, VA',
    'pickup_location': 'Richmond, VA',
    'dropoff_location': 'Chicago, IL',
    'current_cycle_used': 64.0
})

test_scenario('4. Short Haul', {
    'current_location': 'Richmond, VA',
    'pickup_location': 'Richmond, VA',
    'dropoff_location': 'Fredericksburg, VA',
    'current_cycle_used': 12.0
})
