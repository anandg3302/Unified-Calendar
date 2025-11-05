# Google Calendar Webhook Verification Guide

## ✅ Changes Made

### 1. Fixed Frontend Endpoint Path
- **Issue**: Frontend was calling `/api/google/watch` but backend endpoint is `/google/watch`
- **Fix**: Updated `calendarStore.ts` to call `/google/watch` correctly
- **File**: `frontend/stores/calendarStore.ts` (line 450)

### 2. Enhanced Backend Logging
- **Added**: Detailed logging in `/google/watch` endpoint
- **Added**: Better error handling and logging in `/google/notify` endpoint
- **Added**: Handling for initial "sync" notification from Google
- **Files**: `backend/server.py` (lines 555-617, 726-766)

### 3. Improved Frontend Logging
- **Added**: Detailed console logs for watch setup success/failure
- **Added**: Logs channel ID, resource ID, and expiration time
- **File**: `frontend/stores/calendarStore.ts` (lines 435-473)

## 🔍 Verification Steps

### Step 1: Verify Watch Channel Creation

**When user logs in with Google:**

1. **Check Frontend Console:**
   ```
   📡 Setting up Google Calendar watch channel...
   📡 Webhook URL: https://unified-calendar-zflg.onrender.com/google/notify
   ✅ Watch setup successful
   ✅ Channel ID: <channel_id>
   ✅ Resource ID: <resource_id>
   ✅ Expiration: <expiration_timestamp>
   ```

2. **Check Backend Logs:**
   ```
   📡 Setting up Google watch channel for user <user_id>
   📡 Creating watch channel with webhook URL: <webhook_url>
   ✅ Successfully created watch channel on attempt 1
   ✅ Created Google watch channel <channel_id> for user <user_id> (resource_id: <resource_id>, expires: <expiration>)
   ```

3. **Verify Database:**
   - Check `google_watch_channels` collection in MongoDB
   - Should contain document with:
     - `user_id`: User's MongoDB ID
     - `channel_id`: Google channel ID
     - `resource_id`: Google resource ID
     - `expiration`: Channel expiration timestamp
     - `address`: Webhook URL

### Step 2: Verify Webhook Receives POST Requests

**When Google Calendar events are created/updated/deleted:**

1. **Check Backend Logs for Webhook Notifications:**
   ```
   📬 Google notify: channel=<channel_id> resource=<resource_id> state=exists
   🔄 Triggering incremental sync for user <user_id>
   ✅ Incremental Google sync complete for user <user_id>
   ```

2. **Expected Behavior:**
   - `/google/notify` endpoint receives POST request from Google
   - Headers include `X-Goog-Channel-ID`, `X-Goog-Resource-ID`, `X-Goog-Resource-State`
   - Background task triggers `_perform_google_incremental_sync`
   - Database is updated with new/changed events

3. **Test Webhook Manually:**
   ```bash
   curl -X POST https://unified-calendar-zflg.onrender.com/google/notify \
     -H "X-Goog-Channel-ID: test-channel" \
     -H "X-Goog-Resource-ID: test-resource" \
     -H "X-Goog-Resource-State: exists" \
     -H "Content-Type: application/json"
   ```
   Expected response: `{"status": "ignored", "reason": "channel_not_found"}` (this is expected for test)

### Step 3: Verify Frontend Updates

**Current Implementation:**
- Frontend polls every **5 minutes** (300 seconds) as fallback
- When webhook syncs events to database, they appear in next poll
- Events are fetched via `fetchEvents()` which calls `/events` endpoint

**To Test Real-Time Updates:**

1. **Create/Update Event in Google Calendar:**
   - Go to Google Calendar web interface
   - Create a new event or update existing one
   - Wait up to 5 minutes (polling interval)

2. **Check Frontend:**
   - Event should appear in the app within 5 minutes
   - Check browser console for "Polling for event updates..." logs

3. **Verify Backend Sync:**
   - Check backend logs for webhook notification
   - Verify database was updated
   - Check `/events` endpoint returns updated events

## 🐛 Troubleshooting

### Issue: Watch Setup Fails

**Symptoms:**
- Frontend console shows: `❌ Watch setup failed`
- Backend logs show: `❌ Error creating Google watch`

**Possible Causes:**
1. **Invalid webhook URL**: Must be publicly accessible HTTPS URL
2. **Missing Google scopes**: User needs `calendar.events` scope
3. **Rate limiting**: Google may rate limit watch channel creation

**Solutions:**
- Verify `BACKEND_URL` environment variable is set correctly
- Ensure webhook URL is accessible: `https://unified-calendar-zflg.onrender.com/google/notify`
- Check Google Cloud Console for API quotas

### Issue: Webhook Not Receiving Notifications

**Symptoms:**
- Watch channel created successfully
- No webhook notifications received
- Events not updating in real-time

**Possible Causes:**
1. **Webhook URL not accessible**: Google can't reach your server
2. **Channel expired**: Watch channels expire after ~7 days
3. **No events changed**: Google only sends notifications when events change

**Solutions:**
- Verify webhook URL is publicly accessible
- Test webhook endpoint manually (see Step 2 above)
- Check Google Cloud Console for webhook delivery status
- Verify channel hasn't expired (check `expiration` field in database)

### Issue: Events Not Updating in Frontend

**Symptoms:**
- Webhook receives notifications
- Backend syncs events successfully
- Frontend doesn't show updated events

**Possible Causes:**
1. **Polling interval too long**: Currently 5 minutes
2. **Frontend not polling**: Polling may have stopped
3. **Cache issues**: Frontend may be caching old events

**Solutions:**
- Check browser console for polling logs
- Manually refresh events by pulling down on events screen
- Verify `fetchEvents()` is being called
- Check network tab for `/events` API calls

## 📊 Monitoring

### Key Logs to Monitor

**Backend:**
- `✅ Created Google watch channel` - Watch setup successful
- `📬 Google notify` - Webhook received
- `🔄 Triggering incremental sync` - Sync started
- `✅ Incremental Google sync complete` - Sync finished

**Frontend:**
- `✅ Watch setup successful` - Watch channel created
- `Polling for event updates...` - Polling active
- `Error during polling` - Polling error

### Database Queries

**Check active watch channels:**
```javascript
db.google_watch_channels.find({
  expiration: { $gt: new Date().toISOString() }
})
```

**Check sync state:**
```javascript
db.google_sync_state.find()
```

**Check events synced:**
```javascript
db.events.find({ calendar_source: "google" })
```

## 🎯 Success Criteria

✅ Watch channel created successfully
✅ Channel ID stored in database
✅ Webhook receives POST requests from Google
✅ Incremental sync triggered on webhook
✅ Database updated with new/changed events
✅ Frontend polls and fetches updated events
✅ Events appear in UI within 5 minutes (polling interval)

## ⚠️ Limitations

- **Frontend updates are not instant**: Currently relies on 5-minute polling
- **For true real-time**: Would need WebSocket or Server-Sent Events (SSE)
- **Channel expiration**: Watch channels expire after ~7 days (auto-renewal logic exists but needs activation)

## 🔄 Next Steps for True Real-Time

To make updates instant in the frontend:

1. **Add WebSocket support** to push updates to frontend when webhook sync completes
2. **Add Server-Sent Events (SSE)** as alternative to WebSocket
3. **Implement channel renewal** to automatically renew expired channels
4. **Add notification system** to alert users of new events immediately

