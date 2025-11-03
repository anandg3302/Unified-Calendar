# Google Cloud Console OAuth Configuration Guide

## ✅ Required Configuration Steps

### 1. Access Google Cloud Console
- Go to: https://console.cloud.google.com/apis/credentials
- Make sure you're in the correct Google Cloud project

### 2. Select Your OAuth 2.0 Client ID
- Find your OAuth 2.0 Client ID in the credentials list
- Click on it to edit

### 3. Configure Authorized JavaScript Origins
**Add the following origin:**
```
https://unified-calendar-zflg.onrender.com
```

**Important Notes:**
- Include the protocol (`https://`)
- Do NOT include a trailing slash
- Do NOT include any path after the domain

### 4. Configure Authorized Redirect URIs
**Add the following redirect URI:**
```
https://unified-calendar-zflg.onrender.com/api/google/callback
```

**Important Notes:**
- Must match exactly: protocol + domain + full path
- Case-sensitive
- Must include `/api/google/callback` exactly

### 5. Save Changes
- Click "SAVE" at the bottom of the page
- Wait for confirmation that changes are saved

## 🔍 Verify Your Configuration

After saving, your OAuth 2.0 Client ID should show:

**Authorized JavaScript origins:**
- `https://unified-calendar-zflg.onrender.com`

**Authorized redirect URIs:**
- `https://unified-calendar-zflg.onrender.com/api/google/callback`
- (You may also have localhost entries for local development)

## 🔐 Environment Variables on Render

Ensure your Render environment variables are set:

1. Log into Render dashboard
2. Go to your service → Environment tab
3. Verify/Add these variables:

```bash
GOOGLE_CLIENT_ID=<your-actual-client-id-from-console>
GOOGLE_CLIENT_SECRET=<your-actual-client-secret-from-console>
GOOGLE_REDIRECT_URI=https://unified-calendar-zflg.onrender.com/api/google/callback
```

**⚠️ Important:**
- `GOOGLE_CLIENT_ID` must match the Client ID shown in Google Cloud Console
- `GOOGLE_CLIENT_SECRET` must match the Client Secret (shown once when created)
- `GOOGLE_REDIRECT_URI` must exactly match the redirect URI in Google Cloud Console

## ✅ Verification Checklist

- [ ] Google Cloud Console: JavaScript origin added
- [ ] Google Cloud Console: Redirect URI added
- [ ] Google Cloud Console: Changes saved
- [ ] Render: `GOOGLE_CLIENT_ID` environment variable set
- [ ] Render: `GOOGLE_CLIENT_SECRET` environment variable set
- [ ] Render: `GOOGLE_REDIRECT_URI` environment variable set to production URL
- [ ] Backend code uses `GOOGLE_REDIRECT_URI` from environment variables ✅ (Already configured)

## 🧪 Testing After Configuration

1. **Test the OAuth Flow:**
   - Open your Expo app or frontend
   - Click "Continue with Google"
   - You should be redirected to Google's login page
   - After successful login, you should be redirected back to your app
   - No "redirect_uri_mismatch" errors should occur

2. **Common Errors & Solutions:**

   **Error: "redirect_uri_mismatch"**
   - Check that the redirect URI in Google Console exactly matches `GOOGLE_REDIRECT_URI` in Render
   - Make sure there are no trailing slashes or typos
   - Verify protocol (https vs http)

   **Error: "origin_mismatch"**
   - Check that JavaScript origin is set correctly
   - Make sure it's just the domain without any path

   **Error: "invalid_client"**
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct in Render
   - Check that they match what's shown in Google Cloud Console

## 📝 Quick Reference

**Production URLs:**
- Backend: `https://unified-calendar-zflg.onrender.com`
- Login Endpoint: `https://unified-calendar-zflg.onrender.com/api/google/login`
- Callback Endpoint: `https://unified-calendar-zflg.onrender.com/api/google/callback`

**Required Environment Variables:**
```
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_REDIRECT_URI=https://unified-calendar-zflg.onrender.com/api/google/callback
```

