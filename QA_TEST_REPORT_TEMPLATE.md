# Google Calendar Webhook QA Test Report

## Test Execution Date: _______________
## Tester: _______________
## Environment: [ ] Production [ ] Staging [ ] Local

---

## Test Results Summary

| Step | Test | Status | Notes |
|------|------|--------|-------|
| 1 | POST /google/watch | ⬜ | |
| 2 | Backend Logs | ⬜ | |
| 3 | Event Trigger | ⬜ | |
| 4 | Frontend Console | ⬜ | |

---

## 1️⃣ Test /google/watch Endpoint

### Request Details
- **URL**: `POST https://unified-calendar-zflg.onrender.com/google/watch`
- **Authorization**: `Bearer <token>`
- **Body**: `{"webhook_url": "https://unified-calendar-zflg.onrender.com/google/notify"}`

### Response
- **Status Code**: _______________
- **Channel ID**: _______________
- **Resource ID**: _______________
- **Expiration**: _______________
- **User Email**: _______________

### Result
- [ ] ✅ PASS - 201 Created with channel details
- [ ] ⚠️ WARNING - 409 Conflict (channel exists)
- [ ] ❌ FAIL - Other status code
- **Error Details**: _______________

---

## 2️⃣ Check Backend Logs

### Expected Log Messages
- [ ] `📡 Setting up Google watch channel for user <id> (<email> - <name>)`
- [ ] `📡 Webhook URL: https://unified-calendar-zflg.onrender.com/google/notify`
- [ ] `📡 Creating watch channel with channel_id: <id>`
- [ ] `✅ Successfully created watch channel on attempt X`
- [ ] `✅ Created Google watch channel <id> for user <id> (<email>)`
- [ ] `📋 Resource ID: <id>`
- [ ] `⏰ Expires: <timestamp>`
- [ ] `🌐 Webhook URL: <url>`

### Log Source
- [ ] Render.com Dashboard
- [ ] Local Terminal
- [ ] Other: _______________

### Result
- [ ] ✅ PASS - All expected logs found
- [ ] ⚠️ PARTIAL - Some logs missing
- [ ] ❌ FAIL - No logs or errors found
- **Notes**: _______________

---

## 3️⃣ Trigger Calendar Event

### Event Action Performed
- [ ] Created new event
- [ ] Updated existing event
- [ ] Deleted event

### Event Details
- **Title**: _______________
- **Time**: _______________
- **Action Time**: _______________

### Webhook Notification
- **Time to Receive**: _______________ seconds
- **Received**: [ ] Yes [ ] No
- **Backend Log Message**: _______________

### Expected Backend Logs
- [ ] `📬 Google notify: channel=<id> resource=<id> state=exists`
- [ ] `🔄 Triggering incremental sync for user <id>`
- [ ] `✅ Incremental Google sync complete for user <id>`

### Result
- [ ] ✅ PASS - Webhook received and logged
- [ ] ⚠️ WARNING - Received but sync failed
- [ ] ❌ FAIL - No webhook received
- **Notes**: _______________

---

## 4️⃣ Frontend Confirmation

### Browser Console Logs
- [ ] `📡 Setting up Google Calendar watch channel...`
- [ ] `📡 Webhook URL: https://unified-calendar-zflg.onrender.com/google/notify`
- [ ] `✅ Watch setup successful`
- [ ] `✅ Channel ID: <id>`
- [ ] `✅ Resource ID: <id>`
- [ ] `✅ Expiration: <timestamp>`

### Frontend Details
- **Browser**: _______________
- **Console Tab**: [ ] Open [ ] Closed
- **When Triggered**: [ ] On Google login [ ] Manual call [ ] Other: _______________

### Errors Found
- [ ] None
- [ ] `❌ Watch setup failed: No authentication token`
- [ ] `❌ Authentication failed - token may be invalid`
- [ ] `❌ Bad request - check webhook URL format`
- [ ] `❌ Server error - check backend logs`
- [ ] Other: _______________

### Result
- [ ] ✅ PASS - All logs present, no errors
- [ ] ⚠️ WARNING - Logs present but with warnings
- [ ] ❌ FAIL - Errors or missing logs
- **Notes**: _______________

---

## Additional Verification

### MongoDB Check
- [ ] Watch channel document exists in `google_watch_channels` collection
- [ ] Channel has valid `expiration` date
- [ ] Events synced to `events` collection after webhook

### Database Query Results
**Channel Document**: _______________
**Synced Events Count**: _______________

---

## Overall Test Result

- [ ] ✅ **PASS** - All tests passed
- [ ] ⚠️ **WARNING** - Tests passed with warnings
- [ ] ❌ **FAIL** - Tests failed

### Issues Found
1. _______________
2. _______________
3. _______________

### Recommendations
1. _______________
2. _______________
3. _______________

---

## Sign-off

**Tester Signature**: _______________  
**Date**: _______________  
**Approved**: [ ] Yes [ ] No

