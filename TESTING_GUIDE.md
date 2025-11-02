# Testing Guide for Events Screen Filters

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   python server.py
   ```
   Server should be running on `http://localhost:8000` or your configured port.

2. **Frontend App Running**
   ```bash
   cd frontend
   npm start
   # or
   expo start
   ```

3. **User Authentication**
   - Log in to the app
   - Make sure you have at least one connected calendar (Google/Apple/Microsoft)

---

## Manual Testing Steps

### Test 1: Upcoming Filter

**Goal**: Verify that only future and today's events are shown

**Steps**:
1. Open the app and navigate to the **Events** tab
2. Click on the **"Upcoming"** chip (should be selected by default)
3. Verify:
   - ✅ Only events with start_time >= today are displayed
   - ✅ Month navigation shows current month
   - ✅ Events are sorted chronologically (earliest first)
   - ✅ Events from all calendar sources appear if they're upcoming

**Expected Result**: Only upcoming events in the selected month are displayed

**Test Data Needed**:
- At least one event with start_time in the future
- At least one event with start_time today (future time)
- At least one event with start_time in the past (should NOT appear)

---

### Test 2: Past Filter

**Goal**: Verify that only completed events are shown

**Steps**:
1. Click on the **"Past"** chip in the filters
2. Use month navigation to go to a previous month (e.g., last month)
3. Verify:
   - ✅ Only events with end_time < now are displayed
   - ✅ Month navigation works (can go to previous months)
   - ✅ Events are sorted chronologically
   - ✅ Empty state shows "No past events in [Month Year]" if no past events

**Expected Result**: Only past events in the selected month are displayed

**Test Data Needed**:
- At least one event with end_time in the past
- Navigate to the month containing past events

---

### Test 3: Invites Filter ⭐ (Most Important)

**Goal**: Verify that pending invites are shown across all months

**Steps**:
1. Click on the **"Invites"** chip
2. Verify:
   - ✅ Month navigation bar is HIDDEN (invites show across all months)
   - ✅ Only events with `is_invite: true` AND `invite_status: 'pending'` are displayed
   - ✅ Invites from Google Calendar appear if user is an attendee with `responseStatus: 'needsAction'`
   - ✅ Empty state shows "No pending invites" if no invites
   - ✅ Accepted/declined invites do NOT appear

**Expected Result**: All pending invites from all months are displayed, month bar is hidden

**Test Data Needed**:
- Create a test event with `is_invite: true` and `invite_status: 'pending'`
- Or receive an invite from Google Calendar

---

### Test 4: All Filter

**Goal**: Verify that all events in the selected month are shown

**Steps**:
1. Click on the **"All"** chip
2. Use month navigation to select different months
3. Verify:
   - ✅ ALL events (past, present, future) in selected month are displayed
   - ✅ Month navigation works
   - ✅ Events are sorted chronologically
   - ✅ Events from all calendar sources appear

**Expected Result**: All events in the selected month are displayed

---

## Creating Test Data

### Option 1: Create Events via API (Using Postman/curl)

```bash
# Create a past event
curl -X POST http://localhost:8000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Past Event",
    "description": "This is a past event",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z",
    "calendar_source": "local",
    "location": "Test Location"
  }'

# Create an upcoming event
curl -X POST http://localhost:8000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Upcoming Event",
    "description": "This is an upcoming event",
    "start_time": "2025-12-25T10:00:00Z",
    "end_time": "2025-12-25T11:00:00Z",
    "calendar_source": "local",
    "location": "Test Location"
  }'

# Create a pending invite
curl -X POST http://localhost:8000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Invite",
    "description": "This is a test invite",
    "start_time": "2025-01-20T14:00:00Z",
    "end_time": "2025-01-20T15:00:00Z",
    "calendar_source": "local",
    "location": "Test Location",
    "is_invite": true,
    "invite_status": "pending"
  }'
```

### Option 2: Create Events via App UI

1. Click the **"+"** button or **"Create Event"** FAB
2. Fill in event details:
   - Title
   - Date/Time (set to past for past events, future for upcoming)
   - Location (optional)
   - Description (optional)
3. Click **"Create Event"**

### Option 3: Connect Real Calendars

1. **Google Calendar**:
   - Connect via OAuth
   - Create events in Google Calendar
   - They will appear in the app after sync

2. **Apple Calendar**:
   - Connect using Apple ID and app-specific password
   - Events from iCloud Calendar will sync

3. **Microsoft Calendar**:
   - Connect via Microsoft OAuth
   - Outlook events will sync

---

## Testing Checklist

### ✅ Upcoming Filter
- [ ] Shows only future events
- [ ] Shows today's events (if future time)
- [ ] Hides past events
- [ ] Month navigation works
- [ ] Events sorted chronologically
- [ ] Works with all calendar sources

### ✅ Past Filter
- [ ] Shows only past events
- [ ] Hides future events
- [ ] Month navigation works
- [ ] Can navigate to previous months
- [ ] Events sorted chronologically
- [ ] Empty state message is correct

### ✅ Invites Filter
- [ ] Shows only pending invites
- [ ] Month bar is HIDDEN
- [ ] Shows invites from all months
- [ ] Hides accepted invites
- [ ] Hides declined invites
- [ ] Works with Google Calendar invites
- [ ] Empty state shows "No pending invites"

### ✅ All Filter
- [ ] Shows all events (past, present, future)
- [ ] Month navigation works
- [ ] Events sorted chronologically
- [ ] Respects month filter
- [ ] Works with all calendar sources

---

## Debugging Tips

### If filters don't work:

1. **Check Console Logs**:
   - Open browser/app developer console
   - Look for errors when switching filters
   - Check for API errors

2. **Verify Events Structure**:
   - Check if events have `start_time` and `end_time` fields
   - Verify `is_invite` and `invite_status` fields exist
   - Ensure dates are in ISO format

3. **Check Backend Response**:
   ```bash
   # Test API endpoint
   curl -X GET http://localhost:8000/api/events \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   - Verify events are returned correctly
   - Check if Google events have normalized fields

4. **Refresh Events**:
   - Pull down to refresh on Events screen
   - Verify events are fetched correctly

5. **Check Filter State**:
   - Console log the `filter` state variable
   - Verify filter chip selection works

---

## Quick Test Script

You can use this Python script to create test events:

```python
# test_events.py
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
TOKEN = "YOUR_TOKEN_HERE"  # Get from app login

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Create past event
past_event = {
    "title": "Past Meeting",
    "start_time": (datetime.now() - timedelta(days=10)).isoformat(),
    "end_time": (datetime.now() - timedelta(days=10) + timedelta(hours=1)).isoformat(),
    "calendar_source": "local"
}

# Create upcoming event
upcoming_event = {
    "title": "Upcoming Meeting",
    "start_time": (datetime.now() + timedelta(days=10)).isoformat(),
    "end_time": (datetime.now() + timedelta(days=10) + timedelta(hours=1)).isoformat(),
    "calendar_source": "local"
}

# Create pending invite
invite_event = {
    "title": "Pending Invite",
    "start_time": (datetime.now() + timedelta(days=5)).isoformat(),
    "end_time": (datetime.now() + timedelta(days=5) + timedelta(hours=1)).isoformat(),
    "calendar_source": "local",
    "is_invite": True,
    "invite_status": "pending"
}

# Create events
for event in [past_event, upcoming_event, invite_event]:
    response = requests.post(f"{BASE_URL}/api/events", headers=headers, json=event)
    print(f"Created: {event['title']} - Status: {response.status_code}")

print("\nTest events created! Now test the filters in the app.")
```

---

## Expected Behaviors Summary

| Filter | Shows | Month Filter | Sort Order |
|--------|-------|--------------|------------|
| **Upcoming** | Future + Today's events | ✅ Yes | Chronological |
| **Past** | Completed events | ✅ Yes | Chronological |
| **Invites** | Pending invites only | ❌ No | Chronological |
| **All** | All events | ✅ Yes | Chronological |

---

## Troubleshooting

**Problem**: Invites filter shows no events
- **Solution**: Create a test event with `is_invite: true` and `invite_status: 'pending'`

**Problem**: Month navigation doesn't work
- **Solution**: Check if selectedMonth state is updating correctly

**Problem**: Google Calendar invites don't appear
- **Solution**: Verify backend is normalizing Google events with invite fields

**Problem**: Empty state shows wrong message
- **Solution**: Check filter state variable matches current filter

---

## Success Criteria

All filters are working correctly if:
- ✅ Upcoming filter shows only future/today events
- ✅ Past filter shows only past events  
- ✅ Invites filter shows pending invites (month bar hidden)
- ✅ All filter shows all events in selected month
- ✅ Events are sorted chronologically
- ✅ Empty states show appropriate messages
- ✅ Pull-to-refresh updates events correctly

