# Apple Calendar Integration Documentation

## Overview

This document provides comprehensive documentation for the Apple Calendar integration in the Unified Calendar application. The integration includes Sign in with Apple authentication and CalDAV-based Apple Calendar synchronization.

## Architecture

### Backend (FastAPI)
- **Apple Authentication Service** (`apple_auth_service.py`)
- **Apple Calendar Service** (`apple_calendar_service.py`) 
- **Apple Routes** (`apple_routes.py`)
- **Background Sync** (Celery + Redis)

### Frontend (React Native)
- **Apple Auth Service** (`services/appleAuthService.ts`)
- **Apple Calendar Service** (`services/appleCalendarService.ts`)
- **Apple Calendar Connection Component** (`components/AppleCalendarConnection.tsx`)
- **Updated Calendar Store** (`stores/calendarStore.ts`)

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Environment Variables
Add the following to your `.env` file:

```env
# Apple Sign in with Apple Configuration
APPLE_TEAM_ID=your_apple_team_id
APPLE_CLIENT_ID=your_app_bundle_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key_pem

# Background Tasks (Optional)
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379
```

#### Apple Developer Setup
1. Go to [Apple Developer Console](https://developer.apple.com)
2. Create a new App ID with Sign in with Apple capability
3. Create a new Service ID for web authentication
4. Generate a private key for Sign in with Apple
5. Configure your app's bundle identifier

### 2. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
# or
yarn install
```

#### iOS Configuration
Add to your `app.json`:

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

#### Environment Variables
Add to your environment configuration:

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
EXPO_PUBLIC_APPLE_CLIENT_ID=your.app.bundle.id
```

## API Endpoints

### Apple Authentication

#### POST `/api/apple/auth/signin`
Sign in with Apple authentication.

**Request:**
```json
{
  "identity_token": "apple_id_token",
  "authorization_code": "apple_auth_code",
  "user_identifier": "apple_user_id"
}
```

**Response:**
```json
{
  "message": "Apple authentication successful",
  "user_info": {
    "apple_user_id": "user_id",
    "email": "user@example.com",
    "name": {
      "givenName": "John",
      "familyName": "Doe"
    }
  }
}
```

#### GET `/api/apple/auth/instructions`
Get instructions for creating app-specific passwords.

**Response:**
```json
{
  "title": "Create App-Specific Password for Apple Calendar",
  "instructions": [
    "1. Go to appleid.apple.com and sign in with your Apple ID",
    "2. In the \"Security\" section, click \"Generate Password\" under \"App-Specific Passwords\"",
    "3. Enter a label for this password (e.g., \"Calendar App\")",
    "4. Click \"Create\" and copy the generated password",
    "5. Use this password in the app instead of your regular Apple ID password",
    "6. Keep this password secure and do not share it"
  ],
  "note": "App-specific passwords are required for CalDAV access to iCloud Calendar"
}
```

### Apple Calendar

#### POST `/api/apple/calendar/connect`
Connect to Apple Calendar using CalDAV credentials.

**Request:**
```json
{
  "apple_id": "user@icloud.com",
  "app_specific_password": "abcd-efgh-ijkl-mnop"
}
```

**Response:**
```json
{
  "message": "Apple Calendar connected successfully",
  "calendars": [
    {
      "id": "calendar_id",
      "name": "Calendar Name",
      "url": "caldav_url",
      "display_name": "Display Name",
      "color": "#FF3B30",
      "is_active": true
    }
  ]
}
```

#### GET `/api/apple/calendar/calendars`
Get user's Apple Calendar list.

**Response:**
```json
{
  "calendars": [
    {
      "id": "calendar_id",
      "name": "Calendar Name",
      "url": "caldav_url",
      "display_name": "Display Name",
      "color": "#FF3B30",
      "is_active": true
    }
  ],
  "total": 1
}
```

#### GET `/api/apple/calendar/events`
Get events from Apple Calendar.

**Query Parameters:**
- `start_date` (optional): Start date (ISO string)
- `end_date` (optional): End date (ISO string)
- `calendar_id` (optional): Specific calendar ID

**Response:**
```json
{
  "events": [
    {
      "id": "event_id",
      "title": "Event Title",
      "description": "Event Description",
      "start_time": "2024-01-01T10:00:00Z",
      "end_time": "2024-01-01T11:00:00Z",
      "location": "Event Location",
      "calendar_source": "apple",
      "calendar_id": "calendar_id",
      "calendar_name": "Calendar Name",
      "is_invite": false,
      "invite_status": null,
      "created_at": "2024-01-01T09:00:00Z"
    }
  ],
  "total": 1,
  "source": "apple"
}
```

#### POST `/api/apple/calendar/events`
Create a new event in Apple Calendar.

**Request:**
```json
{
  "title": "Event Title",
  "description": "Event Description",
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T11:00:00Z",
  "location": "Event Location",
  "calendar_id": "calendar_id"
}
```

**Response:**
```json
{
  "message": "Apple Calendar event created successfully",
  "event_id": "apple_event_id",
  "local_event_id": "local_event_id"
}
```

#### PUT `/api/apple/calendar/events/{event_id}`
Update an existing Apple Calendar event.

**Request:**
```json
{
  "title": "Updated Event Title",
  "description": "Updated Description",
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T11:00:00Z",
  "location": "Updated Location"
}
```

**Response:**
```json
{
  "message": "Apple Calendar event updated successfully",
  "event_id": "apple_event_id"
}
```

#### DELETE `/api/apple/calendar/events/{event_id}`
Delete an Apple Calendar event.

**Response:**
```json
{
  "message": "Apple Calendar event deleted successfully",
  "event_id": "apple_event_id"
}
```

#### POST `/api/apple/calendar/sync`
Initiate Apple Calendar synchronization.

**Request:**
```json
{
  "sync_direction": "from_apple",
  "date_range_days": 30
}
```

**Response:**
```json
{
  "message": "Apple Calendar sync initiated",
  "sync_direction": "from_apple",
  "date_range_days": 30
}
```

## Frontend Usage

### 1. Apple Authentication

```typescript
import appleAuthService from '../services/appleAuthService';

// Check if Apple authentication is available
const isAvailable = await appleAuthService.isAvailable();

// Sign in with Apple
const result = await appleAuthService.signInWithApple();
if (result.success) {
  console.log('Apple sign in successful:', result.user);
} else {
  console.error('Apple sign in failed:', result.error);
}
```

### 2. Apple Calendar Connection

```typescript
import { useCalendarStore } from '../stores/calendarStore';

const { connectAppleCalendar, appleConnected } = useCalendarStore();

// Connect to Apple Calendar
const success = await connectAppleCalendar({
  appleId: 'user@icloud.com',
  appSpecificPassword: 'abcd-efgh-ijkl-mnop'
});

if (success) {
  console.log('Apple Calendar connected successfully');
}
```

### 3. Apple Calendar Operations

```typescript
import appleCalendarService from '../services/appleCalendarService';

// Get Apple Calendar events
const events = await appleCalendarService.getEvents({
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-31T23:59:59Z'
});

// Create Apple Calendar event
const result = await appleCalendarService.createEvent({
  title: 'New Event',
  description: 'Event Description',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T11:00:00Z',
  location: 'Event Location'
});

// Update Apple Calendar event
await appleCalendarService.updateEvent('event_id', {
  title: 'Updated Event Title'
});

// Delete Apple Calendar event
await appleCalendarService.deleteEvent('event_id');
```

### 4. Using the Apple Calendar Connection Component

```typescript
import AppleCalendarConnection from '../components/AppleCalendarConnection';

function SettingsScreen() {
  return (
    <View>
      <AppleCalendarConnection
        onConnectionSuccess={() => {
          console.log('Apple Calendar connected successfully');
        }}
        onConnectionError={(error) => {
          console.error('Apple Calendar connection failed:', error);
        }}
      />
    </View>
  );
}
```

## Security Considerations

### 1. Token Management
- Apple ID tokens are validated using Apple's public keys
- App-specific passwords are stored encrypted in the database
- All API endpoints require authentication

### 2. CalDAV Security
- Uses HTTPS for all CalDAV connections
- App-specific passwords are required (not regular Apple ID passwords)
- Credentials are stored securely and encrypted

### 3. Data Privacy
- User data is only stored locally and in the user's own calendars
- No third-party data sharing
- All operations are user-initiated

## Error Handling

### Common Errors

1. **Invalid Apple ID Token**
   - Error: `Invalid Apple ID token`
   - Solution: Ensure the token is valid and not expired

2. **CalDAV Connection Failed**
   - Error: `Failed to connect to Apple Calendar`
   - Solution: Check Apple ID and app-specific password

3. **App-Specific Password Required**
   - Error: `App-specific password required`
   - Solution: Create an app-specific password in Apple ID settings

4. **Calendar Not Found**
   - Error: `Calendar not found`
   - Solution: Ensure the calendar exists and is accessible

### Error Response Format

```json
{
  "detail": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

## Testing

### Backend Testing

```bash
cd backend
python -m pytest tests/test_apple_integration.py
```

### Frontend Testing

```bash
cd frontend
npm test
```

## Troubleshooting

### 1. Apple Sign in Not Working
- Ensure the app is properly configured in Apple Developer Console
- Check that the bundle identifier matches
- Verify the private key is correctly formatted

### 2. CalDAV Connection Issues
- Verify the Apple ID is correct
- Ensure the app-specific password is valid
- Check network connectivity

### 3. Events Not Syncing
- Check if the user has granted calendar permissions
- Verify the calendar is accessible via CalDAV
- Check the sync logs for errors

## Future Enhancements

### 1. Microsoft Outlook Integration
The architecture is designed to easily add Microsoft Outlook Calendar integration:

```typescript
// Future Outlook integration
interface CalendarService {
  connect(): Promise<boolean>;
  getEvents(): Promise<Event[]>;
  createEvent(event: Event): Promise<string>;
  updateEvent(id: string, event: Event): Promise<boolean>;
  deleteEvent(id: string): Promise<boolean>;
}
```

### 2. Advanced Sync Features
- Real-time event synchronization
- Conflict resolution
- Offline support
- Batch operations

### 3. Enhanced Security
- OAuth 2.0 for all providers
- End-to-end encryption
- Audit logging
- Rate limiting

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the error logs
3. Contact the development team
4. Submit an issue on the project repository

## License

This integration follows the same license as the main project.
