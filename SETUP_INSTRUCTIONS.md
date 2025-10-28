# Apple Calendar Integration Setup Instructions

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.8+ and pip
- MongoDB
- Redis (optional, for background tasks)
- Apple Developer Account
- iOS device or simulator (for testing Sign in with Apple)

## Step-by-Step Setup

### 1. Backend Setup

#### 1.1 Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### 1.2 Configure Environment Variables
```bash
cp env.example .env
```

Edit `.env` file with your configuration:
```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=unified_calendar

# JWT
SECRET_KEY=your-secret-key-change-in-production

# Google OAuth (existing)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/google/callback

# Apple Sign in with Apple (NEW)
APPLE_TEAM_ID=your_apple_team_id
APPLE_CLIENT_ID=your_app_bundle_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key_pem
```

#### 1.3 Apple Developer Setup
1. Go to [Apple Developer Console](https://developer.apple.com)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create a new App ID with Sign in with Apple capability
4. Create a new Service ID for web authentication
5. Generate a private key for Sign in with Apple
6. Download the private key (.p8 file) and convert to PEM format

#### 1.4 Start Backend Server
```bash
python server.py
```

### 2. Frontend Setup

#### 2.1 Install Dependencies
```bash
cd frontend
npm install
# or
yarn install
```

#### 2.2 Configure Environment Variables
```bash
cp env.example .env
```

Edit `.env` file:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
EXPO_PUBLIC_APPLE_CLIENT_ID=your.app.bundle.id
```

#### 2.3 iOS Configuration
Update `app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "your.app.bundle.id",
      "usesAppleSignIn": true
    }
  }
}
```

#### 2.4 Start Frontend
```bash
npm start
# or
yarn start
```

### 3. Apple Calendar Connection Setup

#### 3.1 User Setup (Required for each user)
1. User signs in with Apple ID in the app
2. User creates an app-specific password:
   - Go to [appleid.apple.com](https://appleid.apple.com)
   - Sign in with Apple ID
   - Go to "Security" section
   - Click "Generate Password" under "App-Specific Passwords"
   - Enter label: "Calendar App"
   - Copy the generated password
3. User enters Apple ID and app-specific password in the app
4. App connects to Apple Calendar via CalDAV

## Testing the Integration

### 1. Test Apple Authentication
1. Open the app on iOS device/simulator
2. Navigate to settings or profile
3. Tap "Connect Apple Calendar"
4. Tap "Sign in with Apple"
5. Complete Apple authentication flow
6. Verify successful authentication

### 2. Test Apple Calendar Connection
1. After Apple authentication, tap "Connect with Credentials"
2. Enter Apple ID and app-specific password
3. Tap "Connect"
4. Verify successful connection
5. Check that Apple calendars appear in the calendar list

### 3. Test Event Synchronization
1. Create an event in the app
2. Verify it appears in Apple Calendar
3. Create an event in Apple Calendar
4. Sync in the app
5. Verify it appears in the unified calendar

### 4. Test Unified Calendar View
1. Open the calendar view
2. Verify events from both Google and Apple appear
3. Test source filtering (show only Google, only Apple, or both)
4. Verify event source labels are correct

## Troubleshooting

### Common Issues

#### 1. "Sign in with Apple is not available"
- Ensure you're testing on iOS device or simulator
- Check that the app is properly configured in Apple Developer Console
- Verify the bundle identifier matches

#### 2. "Failed to connect to Apple Calendar"
- Verify the Apple ID is correct
- Ensure the app-specific password is valid
- Check that the user has iCloud Calendar enabled

#### 3. "Invalid Apple ID token"
- Check that the private key is correctly formatted
- Verify the team ID and key ID are correct
- Ensure the token hasn't expired

#### 4. Events not syncing
- Check network connectivity
- Verify CalDAV credentials are correct
- Check the backend logs for errors

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=DEBUG
```

### Logs Location
- Backend: Console output and log files
- Frontend: React Native debugger or console

## Security Notes

1. **Never store regular Apple ID passwords** - only app-specific passwords
2. **Encrypt sensitive data** in production
3. **Use HTTPS** for all API communications
4. **Validate all tokens** on the backend
5. **Implement rate limiting** for API endpoints

## Production Deployment

### Backend
1. Use a production MongoDB instance
2. Set up Redis for background tasks
3. Configure proper SSL certificates
4. Set up monitoring and logging
5. Use environment-specific configuration

### Frontend
1. Build for production
2. Configure proper app signing
3. Set up crash reporting
4. Configure analytics
5. Test on real devices

## Support

For issues:
1. Check the troubleshooting section
2. Review the comprehensive documentation
3. Check the project repository for known issues
4. Contact the development team

## Next Steps

After successful setup:
1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Plan for Microsoft Outlook integration
4. Consider advanced sync features
5. Implement user feedback collection
