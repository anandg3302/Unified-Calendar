#!/bin/bash
# Google Calendar Webhook Integration Test Script
# Usage: ./test_google_webhook.sh <your_auth_token>

set -e

TOKEN="${1:-}"
BACKEND_URL="https://unified-calendar-zflg.onrender.com"
WEBHOOK_URL="${BACKEND_URL}/google/notify"

if [ -z "$TOKEN" ]; then
    echo "❌ Error: Authentication token required"
    echo "Usage: $0 <your_auth_token>"
    exit 1
fi

echo "🧪 Testing Google Calendar Webhook Integration"
echo "=============================================="
echo ""

# Step 1: Test /google/watch endpoint
echo "1️⃣  Testing /google/watch endpoint..."
echo "   POST ${BACKEND_URL}/google/watch"
echo "   Webhook URL: ${WEBHOOK_URL}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/google/watch" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"webhook_url\": \"${WEBHOOK_URL}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    echo "   ✅ SUCCESS: Watch channel created"
    CHANNEL_ID=$(echo "$BODY" | jq -r '.channel_id // .watch.id // "N/A"' 2>/dev/null || echo "N/A")
    RESOURCE_ID=$(echo "$BODY" | jq -r '.resource_id // .watch.resourceId // "N/A"' 2>/dev/null || echo "N/A")
    EXPIRATION=$(echo "$BODY" | jq -r '.expiration // .watch.expiration // "N/A"' 2>/dev/null || echo "N/A")
    
    echo "   Channel ID: $CHANNEL_ID"
    echo "   Resource ID: $RESOURCE_ID"
    echo "   Expiration: $EXPIRATION"
    echo ""
elif [ "$HTTP_CODE" -eq 409 ]; then
    echo "   ⚠️  WARNING: Watch channel already exists (this is OK if active)"
    CHANNEL_ID=$(echo "$BODY" | jq -r '.channel_id // "N/A"' 2>/dev/null || echo "N/A")
    echo "   Existing Channel ID: $CHANNEL_ID"
    echo ""
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo "   ❌ FAIL: Authentication failed - check your token"
    exit 1
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "   ❌ FAIL: Bad request - check error message"
    echo "$BODY" | jq -r '.detail // .message // "Unknown error"' 2>/dev/null || echo "$BODY"
    exit 1
else
    echo "   ❌ FAIL: Unexpected status code"
    exit 1
fi

# Step 2: Instructions for manual testing
echo "2️⃣  Backend Logs Verification"
echo "   Please check your backend logs for:"
echo "   - 📡 Setting up Google watch channel for user..."
echo "   - 📡 Webhook URL: ${WEBHOOK_URL}"
echo "   - ✅ Created Google watch channel..."
echo ""

echo "3️⃣  Calendar Event Trigger Test"
echo "   To test webhook notifications:"
echo "   1. Go to https://calendar.google.com"
echo "   2. Create, update, or delete an event"
echo "   3. Wait 10-30 seconds"
echo "   4. Check backend logs for:"
echo "      - 📬 Google notify: channel=... resource=... state=exists"
echo "      - 🔄 Triggering incremental sync for user..."
echo ""

echo "4️⃣  Frontend Confirmation"
echo "   Open browser console and check for:"
echo "   - 📡 Setting up Google Calendar watch channel..."
echo "   - ✅ Watch setup successful"
echo "   - ✅ Channel ID: ..."
echo "   - ✅ Resource ID: ..."
echo ""

echo "✅ Test script completed!"
echo ""
echo "📋 Next Steps:"
echo "   1. Check backend logs (Step 2)"
echo "   2. Trigger a calendar event (Step 3)"
echo "   3. Verify webhook notification in logs"
echo "   4. Check frontend console (Step 4)"
echo ""

