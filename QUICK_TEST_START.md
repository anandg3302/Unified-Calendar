# Quick Test Start Guide

## Step 1: Start Backend Server

```bash
cd backend
python server.py
```

Wait for: `Starting backend server on http://127.0.0.1:8000`

---

## Step 2: Start Frontend App

```bash
cd frontend
npm start
# or
expo start
```

Then open on your device/emulator.

---

## Step 3: Login to the App

1. Open the app
2. Login with your credentials
3. Note your auth token (check browser DevTools → Application → Local Storage → `auth_token`)

---

## Step 4: Create Test Events (Choose One Method)

### Method A: Using the Python Script (Easiest) ✅

```bash
cd backend
python create_test_events.py YOUR_AUTH_TOKEN_HERE
```

**To get your auth token:**
- **Option 1**: After login, check browser DevTools → Application → Local Storage → `auth_token`
- **Option 2**: Check backend console logs after login
- **Option 3**: Use the app's login API response

### Method B: Create via App UI

1. Click the **"+"** button or **"Create Event"** FAB
2. Create these test events:
   - **Past Event**: Set date to yesterday or last week
   - **Upcoming Event**: Set date to tomorrow or next week
   - **Pending Invite**: Create event and manually set `is_invite: true` (requires database edit)

### Method C: Using curl/Postman

```bash
# Get your token from app login
TOKEN="your_token_here"

# Create past event
curl -X POST http://localhost:8000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Past Event",
    "start_time": "2024-01-01T10:00:00Z",
    "end_time": "2024-01-01T11:00:00Z",
    "calendar_source": "local"
  }'

# Create upcoming event
curl -X POST http://localhost:8000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Upcoming Event",
    "start_time": "2025-12-31T10:00:00Z",
    "end_time": "2025-12-31T11:00:00Z",
    "calendar_source": "local"
  }'

# Create pending invite
curl -X POST http://localhost:8000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Invite",
    "start_time": "2025-01-20T14:00:00Z",
    "end_time": "2025-01-20T15:00:00Z",
    "calendar_source": "local",
    "is_invite": true,
    "invite_status": "pending"
  }'
```

---

## Step 5: Test Each Filter

### Test 1: Upcoming Filter ⏭️

1. Go to **Events** tab
2. Click **"Upcoming"** chip (should be selected)
3. **Verify**:
   - ✅ Only events with dates >= today appear
   - ✅ Past events are hidden
   - ✅ Month navigation shows current month
   - ✅ Events sorted by time (earliest first)

**Expected**: See "Upcoming Event", "Today's Event" (if future time), etc.

---

### Test 2: Past Filter ⏮️

1. Click **"Past"** chip
2. Navigate to previous month if needed (use arrows)
3. **Verify**:
   - ✅ Only past events appear
   - ✅ Future events are hidden
   - ✅ Month navigation works
   - ✅ Can navigate to previous months

**Expected**: See "Past Event", "Yesterday Event", etc.

---

### Test 3: Invites Filter 📧 ⭐ (Most Important)

1. Click **"Invites"** chip
2. **Verify**:
   - ✅ Month navigation bar is **HIDDEN**
   - ✅ Only pending invites appear
   - ✅ Shows invites from ALL months (not just selected month)
   - ✅ Accepted/declined invites are hidden

**Expected**: See "Pending Invite" but NOT "Accepted Invite"

---

### Test 4: All Filter 📅

1. Click **"All"** chip
2. Navigate between months using arrows
3. **Verify**:
   - ✅ All events (past, present, future) in selected month appear
   - ✅ Month navigation works
   - ✅ Events sorted chronologically

**Expected**: See all events in the selected month

---

## Step 6: Verify Visual Features

1. **Pull to Refresh**: Pull down on Events screen → Events should refresh
2. **Empty States**: Navigate to month with no events → Should show appropriate message
3. **Sorting**: Events should be sorted by start_time (earliest first)
4. **Color Coding**: Events should have colors matching their calendar source

---

## Quick Checklist

### ✅ All Filters Working If:
- [ ] **Upcoming**: Shows only future/today events
- [ ] **Past**: Shows only past events
- [ ] **Invites**: Shows only pending invites, month bar hidden
- [ ] **All**: Shows all events in selected month
- [ ] Events sorted chronologically
- [ ] Month navigation works
- [ ] Empty states show correct messages
- [ ] Pull-to-refresh updates events

---

## Common Issues & Fixes

### Issue: "No events found" even after creating events

**Fix**:
1. Pull down to refresh
2. Check backend is running
3. Verify auth token is correct
4. Check backend logs for errors

### Issue: Invites filter shows no events

**Fix**:
1. Verify test event has `is_invite: true` and `invite_status: 'pending'`
2. Check backend response includes these fields
3. Pull down to refresh

### Issue: Month navigation doesn't work

**Fix**:
1. Refresh the page/screen
2. Check console for errors
3. Verify selectedMonth state is updating

---

## Success Criteria ✅

All filters are working correctly if:
- ✅ **Upcoming filter**: Shows only future/today events
- ✅ **Past filter**: Shows only past events
- ✅ **Invites filter**: Shows pending invites (month bar hidden)
- ✅ **All filter**: Shows all events in selected month
- ✅ Events are sorted chronologically
- ✅ Empty states show appropriate messages
- ✅ Pull-to-refresh works

---

## Need Help?

Check the detailed **TESTING_GUIDE.md** for:
- More detailed test cases
- Debugging tips
- API testing methods
- Troubleshooting guide

