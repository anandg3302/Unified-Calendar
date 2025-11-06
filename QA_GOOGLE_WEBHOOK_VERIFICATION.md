# Google Calendar Webhook Integration - QA Verification Report

## Test Execution Summary

### ⚠️ Note: This document provides testing instructions. Actual test execution requires:
- Valid authentication token
- Access to backend logs
- Ability to create Google Calendar events
- Frontend application running

---

## 1️⃣ Test `/google/watch` Endpoint

### Test Configuration
**Endpoint**: `POST https://unified-calendar-zflg.onrender.com/google/watch`

**Headers**:
```
Authorization: Bearer <valid_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "webhook_url": "https://unified-calendar-zflg.onrender.com/google/notify"
}
```

### Expected Response ✅

**Status Code**: `201 Created`

**Response Body**:
```json
{
  "status": "success",
  "message": "Watch channel created successfully",
  "watch": {
    "id": "<channel-id>",
    "resourceId": "<resource-id>",
    "expiration": "<timestamp>"
  },
  "channel_id": "<channel-id>",
  "resource_id": "<resource-id>",
  "expiration": "<timestamp>",
  "webhook_url": "https://unified-calendar-zflg.onrender.com/google/notify",
  "user_id": "<user-id>",
  "user_email": "<user-email>"
}
```

### Test Script (curl)
```bash
curl -X POST https://unified-calendar-zflg.onrender.com/google/watch \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://unified-calendar-zflg.onrender.com/google/notify"
  }'
```

### Postman Test
1. Create new request
2. Method: `POST`
3. URL: `https://unified-calendar-zflg.onrender.com/google/watch`
4. Headers tab:
   - Key: `Authorization`, Value: `Bearer YOUR_TOKEN_HERE`
   - Key: `Content-Type`, Value: `application/json`
5. Body tab → raw → JSON:
   ```json
   {
     "webhook_url": "https://unified-calendar-zflg.onrender.com/google/notify"
   }
   ```
6. Send request

### Verification Checklist
- [ ] Status code is `201 Created`
- [ ] Response contains `channel_id`
- [ ] Response contains `resource_id`
- [ ] Response contains `expiration` timestamp
- [ ] Response contains `user_email`
- [ ] No error messages in response

---

## 2️⃣ Check Backend Logs

### Expected Log Messages

After successful watch channel creation, backend logs should show:

```
📡 Setting up Google watch channel for user <user_id> (<user_email> - <user_name>)
📡 Webhook URL: https://unified-calendar-zflg.onrender.com/google/notify
📡 Creating watch channel with channel_id: <channel-id>
✅ Successfully created watch channel on attempt 1
✅ Created Google watch channel <channel-id> for user <user_id> (<user_email>)
   📋 Resource ID: <resource-id>
   ⏰ Expires: <expiration>
   🌐 Webhook URL: https://unified-calendar-zflg.onrender.com/google/notify
```

### Where to Check Logs
- **Render.com**: Dashboard → Service → Logs
- **Local**: Terminal where server is running
- **Production**: Check your deployment platform's logs

### Verification Checklist
- [ ] Log shows user ID, email, and name
- [ ] Log shows webhook URL: `https://unified-calendar-zflg.onrender.com/google/notify`
- [ ] Log shows "✅ Created Google watch channel"
- [ ] Log includes Resource ID
- [ ] Log includes expiration timestamp

### Error Cases to Check
If you see these logs, there's an issue:
- `❌ Google account not connected` → User needs to connect Google account first
- `⚠️ User already has active watch channel` → Channel already exists (409 Conflict)
- `❌ Error creating Google watch` → Check Google API credentials and permissions

---

## 3️⃣ Trigger a Calendar Event

### Method 1: Create Event in Google Calendar Web UI
1. Go to https://calendar.google.com
2. Click on a date/time slot
3. Enter event details (title, time, etc.)
4. Click "Save"
5. Wait 10-30 seconds for webhook notification

### Method 2: Update Existing Event
1. Go to https://calendar.google.com
2. Click on an existing event
3. Edit title, time, or description
4. Click "Save"
5. Wait 10-30 seconds for webhook notification

### Method 3: Delete Event
1. Go to https://calendar.google.com
2. Click on an existing event
3. Click "Delete"
4. Confirm deletion
5. Wait 10-30 seconds for webhook notification

### Expected Backend Logs

When Google sends a webhook notification, you should see:

**Initial Sync Notification** (when channel is first created):
```
📬 Google notify: channel=<channel-id> resource=<resource-id> state=sync
🔄 Received sync notification (channel creation), skipping sync
```

**Event Change Notification** (when event is created/updated/deleted):
```
📬 Google notify: channel=<channel-id> resource=<resource-id> state=exists
🔄 Triggering incremental sync for user <user-id>
```

Then, after sync completes:
```
✅ Incremental Google sync complete for user <user-id>
```

### Verification Checklist
- [ ] Log shows `📬 Google notify` with channel and resource IDs
- [ ] Log shows `state=exists` (or `state=sync` for initial notification)
- [ ] Log shows `🔄 Triggering incremental sync for user`
- [ ] Sync completes successfully (check database for updated events)

### Troubleshooting
- **No webhook received**: 
  - Check if channel is active (not expired)
  - Verify webhook URL is publicly accessible
  - Wait up to 30 seconds (Google may delay notifications)
  
- **"channel not found" warning**:
  - Channel may have expired or been deleted
  - Re-run `/google/watch` to create new channel

---

## 4️⃣ Frontend Confirmation

### Expected Frontend Console Logs

When `setupGoogleWatch()` is called (e.g., after Google login), frontend console should show:

```
📡 Setting up Google Calendar watch channel...
📡 Webhook URL: https://unified-calendar-zflg.onrender.com/google/notify
✅ Watch setup successful
✅ Channel ID: <channel-id>
✅ Resource ID: <resource-id>
✅ Expiration: <expiration>
```

### When is `setupGoogleWatch()` Called?

Based on code analysis, it's called automatically:
1. **After Google login** (`AuthContext.tsx` line 140)
2. **After deep link authentication** (`AuthContext.tsx` line 295)

### How to Trigger Frontend Test

1. **Open browser console** (F12 → Console tab)
2. **Log in with Google** via the app
3. **Watch console** for the log messages above

### Verification Checklist
- [ ] Console shows `📡 Setting up Google Calendar watch channel...`
- [ ] Console shows webhook URL
- [ ] Console shows `✅ Watch setup successful`
- [ ] Console shows Channel ID
- [ ] Console shows Resource ID
- [ ] Console shows Expiration timestamp
- [ ] No error messages (`❌ Watch setup failed`)

### Error Cases
If you see errors:
- `❌ Watch setup failed: No authentication token` → User not logged in
- `❌ Authentication failed - token may be invalid` → Token expired or invalid
- `❌ Bad request - check webhook URL format` → Invalid webhook URL
- `❌ Server error - check backend logs` → Backend error (check backend logs)

---

## 📊 Complete Test Checklist

### Pre-Test Requirements
- [ ] Backend is deployed and accessible
- [ ] Frontend is running
- [ ] User account exists with Google account connected
- [ ] Valid authentication token available

### Test Execution
- [ ] **Step 1**: POST to `/google/watch` → ✅ 201 Created
- [ ] **Step 2**: Check backend logs → ✅ Shows watch channel creation
- [ ] **Step 3**: Create/update/delete Google Calendar event → ✅ Webhook received
- [ ] **Step 4**: Check frontend console → ✅ Shows watch setup success

### Post-Test Verification
- [ ] MongoDB `google_watch_channels` collection contains new document
- [ ] MongoDB `events` collection updated after webhook sync
- [ ] Frontend shows updated events (may take up to 5 minutes with polling)

---

## 🔍 Additional Verification

### Check MongoDB Database

**Verify watch channel exists**:
```javascript
// In MongoDB shell or Compass
db.google_watch_channels.find({
  user_id: "<your-user-id>"
}).pretty()
```

Should show:
```json
{
  "_id": ObjectId("..."),
  "user_id": "<user-id>",
  "channel_id": "<channel-id>",
  "resource_id": "<resource-id>",
  "expiration": "<timestamp>",
  "address": "https://unified-calendar-zflg.onrender.com/google/notify",
  "created_at": ISODate("...")
}
```

**Verify events synced**:
```javascript
db.events.find({
  user_id: "<your-user-id>",
  calendar_source: "google"
}).pretty()
```

### Check Sync State
```javascript
db.google_sync_state.find({
  user_id: "<your-user-id>"
}).pretty()
```

Should show `sync_token` if incremental sync is working.

---

## 🐛 Troubleshooting Guide

### Issue: 401 Unauthorized
**Solution**: 
- Check token is valid and not expired
- Verify token is in `Authorization: Bearer <token>` format
- Re-login to get fresh token

### Issue: 400 Bad Request - "Google account not connected"
**Solution**:
- User must connect Google account first via OAuth
- Check user has `google_refresh_token` in database

### Issue: 409 Conflict
**Solution**:
- Channel already exists (this is OK if it's active)
- Check expiration date - if expired, delete old channel and create new one

### Issue: No webhook notifications received
**Solution**:
- Verify webhook URL is publicly accessible (not localhost)
- Check channel hasn't expired (channels expire after ~7 days)
- Wait 30 seconds after creating event (Google may delay)
- Verify Google Calendar API webhook notifications are enabled

### Issue: Frontend shows "Watch setup failed"
**Solution**:
- Check backend is running and accessible
- Verify CORS allows frontend origin
- Check browser console for detailed error message
- Verify authentication token is valid

---

## ✅ Success Criteria

All tests pass when:
1. ✅ POST to `/google/watch` returns 201 with channel details
2. ✅ Backend logs show successful watch channel creation with user info and webhook URL
3. ✅ Creating/updating/deleting Google Calendar event triggers webhook notification
4. ✅ Backend logs show `📬 Google notify` with correct state
5. ✅ Frontend console shows `✅ Watch setup successful` with all details
6. ✅ Events sync to database after webhook notification
7. ✅ Frontend displays updated events (within polling interval)

---

## 📝 Test Execution Template

Copy this template for your test run:

```
Test Date: ________________
Tester: ________________
Environment: [ ] Production [ ] Staging [ ] Local

Step 1 - /google/watch Endpoint:
[ ] Status Code: ______
[ ] Channel ID: ______
[ ] Resource ID: ______
[ ] Expiration: ______
[ ] Notes: ______

Step 2 - Backend Logs:
[ ] User ID logged: ______
[ ] Webhook URL logged: ______
[ ] Success message logged: [ ] Yes [ ] No
[ ] Notes: ______

Step 3 - Calendar Event Trigger:
[ ] Event action: [ ] Created [ ] Updated [ ] Deleted
[ ] Webhook received: [ ] Yes [ ] No
[ ] Time to receive: ______ seconds
[ ] Backend logs show notification: [ ] Yes [ ] No
[ ] Notes: ______

Step 4 - Frontend Confirmation:
[ ] Console shows setup message: [ ] Yes [ ] No
[ ] Channel ID in console: ______
[ ] Resource ID in console: ______
[ ] Errors: [ ] None [ ] See notes
[ ] Notes: ______

Overall Result: [ ] PASS [ ] FAIL
Issues Found: ______
```

---

## 🚀 Next Steps After Verification

If all tests pass:
1. ✅ Webhook integration is working correctly
2. ✅ Monitor for channel expiration (channels expire after ~7 days)
3. ✅ Consider implementing automatic channel renewal
4. ✅ Set up alerts for webhook failures

If tests fail:
1. ❌ Check error messages in logs
2. ❌ Verify Google API credentials
3. ❌ Check CORS configuration
4. ❌ Verify webhook URL is publicly accessible
5. ❌ Check network connectivity between Google and your server

