#!/usr/bin/env python3
"""
Script to create test events for testing filters
Usage: python create_test_events.py <auth_token>
"""

import sys
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def create_test_events(token):
    """Create test events for filter testing"""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    now = datetime.utcnow()
    
    # Test events
    test_events = [
        {
            "title": "Past Event - Last Week",
            "description": "This is a past event from last week",
            "start_time": (now - timedelta(days=7)).isoformat() + "Z",
            "end_time": (now - timedelta(days=7) + timedelta(hours=1)).isoformat() + "Z",
            "calendar_source": "local",
            "location": "Test Location"
        },
        {
            "title": "Past Event - Yesterday",
            "description": "This is a past event from yesterday",
            "start_time": (now - timedelta(days=1)).isoformat() + "Z",
            "end_time": (now - timedelta(days=1) + timedelta(hours=2)).isoformat() + "Z",
            "calendar_source": "local",
            "location": "Test Location"
        },
        {
            "title": "Upcoming Event - Tomorrow",
            "description": "This is an upcoming event tomorrow",
            "start_time": (now + timedelta(days=1)).isoformat() + "Z",
            "end_time": (now + timedelta(days=1) + timedelta(hours=1)).isoformat() + "Z",
            "calendar_source": "local",
            "location": "Test Location"
        },
        {
            "title": "Upcoming Event - Next Week",
            "description": "This is an upcoming event next week",
            "start_time": (now + timedelta(days=7)).isoformat() + "Z",
            "end_time": (now + timedelta(days=7) + timedelta(hours=2)).isoformat() + "Z",
            "calendar_source": "local",
            "location": "Test Location"
        },
        {
            "title": "Pending Invite - Next Week",
            "description": "This is a pending invite",
            "start_time": (now + timedelta(days=5)).isoformat() + "Z",
            "end_time": (now + timedelta(days=5) + timedelta(hours=1)).isoformat() + "Z",
            "calendar_source": "local",
            "location": "Test Location",
            "is_invite": True,
            "invite_status": "pending"
        },
        {
            "title": "Accepted Invite - Next Month",
            "description": "This is an accepted invite (should NOT appear in invites filter)",
            "start_time": (now + timedelta(days=30)).isoformat() + "Z",
            "end_time": (now + timedelta(days=30) + timedelta(hours=1)).isoformat() + "Z",
            "calendar_source": "local",
            "location": "Test Location",
            "is_invite": True,
            "invite_status": "accepted"
        },
        {
            "title": "Today's Event - Future Time",
            "description": "This is today's event at a future time",
            "start_time": (now + timedelta(hours=2)).isoformat() + "Z",
            "end_time": (now + timedelta(hours=3)).isoformat() + "Z",
            "calendar_source": "local",
            "location": "Test Location"
        }
    ]
    
    print(f"Creating {len(test_events)} test events...")
    print("-" * 50)
    
    created_count = 0
    failed_count = 0
    
    for event in test_events:
        try:
            response = requests.post(
                f"{BASE_URL}/api/events",
                headers=headers,
                json=event,
                timeout=10
            )
            
            if response.status_code == 200 or response.status_code == 201:
                print(f"✅ Created: {event['title']}")
                created_count += 1
            else:
                print(f"❌ Failed: {event['title']} - Status: {response.status_code}")
                print(f"   Error: {response.text}")
                failed_count += 1
        except Exception as e:
            print(f"❌ Error creating {event['title']}: {str(e)}")
            failed_count += 1
    
    print("-" * 50)
    print(f"✅ Created: {created_count}")
    print(f"❌ Failed: {failed_count}")
    print("\n🎉 Test events created! Now test the filters in the app.")
    print("\nTest Checklist:")
    print("  • Upcoming filter: Should show 'Tomorrow', 'Next Week', 'Today's Event'")
    print("  • Past filter: Should show 'Last Week', 'Yesterday'")
    print("  • Invites filter: Should show ONLY 'Pending Invite' (not 'Accepted Invite')")
    print("  • All filter: Should show all events in selected month")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_test_events.py <auth_token>")
        print("\nTo get your auth token:")
        print("  1. Login to the app")
        print("  2. Check browser/app storage for 'token'")
        print("  3. Or check the backend logs after login")
        sys.exit(1)
    
    token = sys.argv[1]
    create_test_events(token)

