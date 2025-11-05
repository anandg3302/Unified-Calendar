# Import multiprocessing setup first (must be before any MongoDB imports)
import multiprocessing_setup

import sys
import os,json

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, BackgroundTasks
from fastapi.requests import Request as FastAPIRequest
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials as GoogleCredentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.errors import HttpError
from fastapi.middleware.cors import CORSMiddleware
import logging
import urllib.parse
import json
import asyncio
import uuid

google_client = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "project_id": "unified-calendar",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uris": [
            "http://localhost:8000/api/google/callback",
            "https://unified-calendar-zflg.onrender.com/api/google/callback",
            "https://auth.expo.io/@anand9100/unified-calendar"
        ],
        "javascript_origins": ["https://unified-calendar-zflg.onrender.com"]
    }
}

# Write to a temporary file (so Flow.from_client_secrets_file can use it)
with open("client_secret.json", "w") as f:
    json.dump(google_client, f)
# ───────────────────────────────────────────────
# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ───────────────────────────────────────────────
# Import shared dependencies
from dependencies import db, get_current_user, security, SECRET_KEY, ALGORITHM

# ───────────────────────────────────────────────
# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# ───────────────────────────────────────────────
# App setup
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ───────────────────────────────────────────────
# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/callback")
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]

# ───────────────────────────────────────────────
# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Event(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    calendar_source: str
    location: Optional[str] = None
    is_invite: bool = False
    invite_status: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    calendar_source: str
    location: Optional[str] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None

class CalendarSource(BaseModel):
    id: str
    name: str
    type: str
    color: str
    is_active: bool = True

# ───────────────────────────────────────────────
# Helper functions
def get_password_hash(password: str):
    # bcrypt supports passwords up to 72 bytes
    if len(password.encode("utf-8")) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# get_current_user is now imported from dependencies

# ───────────────────────────────────────────────
# Health check routes
@app.get("/health")
async def health_check():
    """Check if the server and database are running properly"""
    try:
        # Test database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/health/db")
async def database_health_check():
    """Detailed database connection health check"""
    try:
        # Test database connection with ping
        ping_result = await db.command("ping")
        
        # Get database stats
        stats = await db.command("dbStats")
        
        # Get collection count
        collections = await db.list_collection_names()
        
        return {
            "status": "healthy",
            "database": "connected",
            "ping_result": ping_result,
            "database_name": stats.get("db"),
            "collections": collections,
            "collections_count": len(collections),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# ───────────────────────────────────────────────
# Google OAuth routes
@app.get("/api/google/login")
async def google_login(frontend_redirect_uri: str = None):
    flow = Flow.from_client_secrets_file(
        "client_secret.json",
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )

    # Store the frontend redirect URI in state
    state_data = {"frontend_redirect_uri": frontend_redirect_uri}
    state = urllib.parse.quote(json.dumps(state_data))

    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        state=state
    )
    return RedirectResponse(auth_url)

@app.get("/api/google/callback")
async def google_callback(request: Request):
    code = request.query_params.get("code")
    state = request.query_params.get("state")  # Encoded JSON with frontend redirect URI
    if not code:
        return JSONResponse({"error": "No code provided"}, status_code=400)

    try:
        # Google OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI],
                }
            },
            scopes=SCOPES,
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Get user info
        userinfo_service = build("oauth2", "v2", credentials=credentials)
        user_info = userinfo_service.userinfo().get().execute()
        email = user_info.get("email")
        name = user_info.get("name", email.split("@")[0] if email else "User")

        if not email:
            return JSONResponse({"error": "Could not get email from Google"}, status_code=400)

        # Find or create user in MongoDB
        user = await db.users.find_one({"email": email})
        
        # Store granted scopes with the token for scope validation
        granted_scopes = credentials.scopes if hasattr(credentials, 'scopes') else SCOPES
        
        if not user:
            user_dict = {
                "email": email,
                "name": name,
                "password_hash": None,
                "google_refresh_token": credentials.refresh_token,
                "google_scopes": granted_scopes,  # Store granted scopes
                "google_scopes_updated_at": datetime.utcnow(),  # Track when scopes were updated
                "created_at": datetime.utcnow(),
            }
            result = await db.users.insert_one(user_dict)
            user_id = str(result.inserted_id)
        else:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "google_refresh_token": credentials.refresh_token,
                    "google_scopes": granted_scopes,  # Update stored scopes
                    "google_scopes_updated_at": datetime.utcnow(),  # Update timestamp
                }},
            )
            user_id = str(user["_id"])

        # Generate JWT
        access_token = create_access_token(data={"sub": user_id})

        # Build redirect URL for frontend
        # Decode and parse state to extract the frontend redirect URI
        try:
            frontend_redirect_data = None
            if state:
                # state was encoded with urllib.parse.quote(json.dumps(...))
                decoded_state = urllib.parse.unquote(state)
                frontend_redirect_data = json.loads(decoded_state)
            frontend_redirect = (
                (frontend_redirect_data or {}).get("frontend_redirect_uri")
                or os.getenv("FRONTEND_REDIRECT", "frontend://oauth-callback")
            )
        except Exception:
            # Fallback if state is missing or malformed
            frontend_redirect = os.getenv("FRONTEND_REDIRECT", "frontend://oauth-callback")
        user_data = {"id": user_id, "email": email, "name": name}
        from urllib.parse import urlencode, quote
        import json
        # Properly encode the user JSON string
        user_json = json.dumps(user_data)
        # urlencode will handle the encoding properly
        query_params = urlencode({
            'token': access_token,
            'user': user_json  # urlencode will properly encode the JSON string
        })
        redirect_uri = f"{frontend_redirect}?{query_params}"
        print("🔗 Redirecting to:", redirect_uri)  # Debug log
        print("🔗 User data:", user_json)  # Debug log
        return RedirectResponse(redirect_uri)
    except Exception as e:
        logger.error(f"Error in Google OAuth callback: {str(e)}")
        # Try to redirect back to frontend with error (decode state if possible)
        try:
            decoded_state = urllib.parse.unquote(state) if state else None
            data = json.loads(decoded_state) if decoded_state else {}
            frontend_redirect = data.get("frontend_redirect_uri") or os.getenv("FRONTEND_REDIRECT", "frontend://oauth-callback")
        except Exception:
            frontend_redirect = os.getenv("FRONTEND_REDIRECT", "frontend://oauth-callback")
        error_redirect = f"{frontend_redirect}?{urlencode({'error': 'Google OAuth failed', 'error_description': str(e)})}"
        return RedirectResponse(error_redirect)

# ───────────────────────────────────────────────
# Google Calendar REST Endpoints
@app.get("/google/events")
async def get_google_events(current_user: dict = Depends(get_current_user)):
    """Fetch upcoming events from user's primary Google Calendar."""
    user_id = str(current_user["_id"]) if "_id" in current_user else None
    refresh_token = current_user.get("google_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google account not connected")

    try:
        stored_scopes = current_user.get("google_scopes", SCOPES)
        creds = GoogleCredentials(
            None,
            refresh_token=refresh_token,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
            scopes=stored_scopes,
        )
        creds.refresh(GoogleRequest())
        service = build("calendar", "v3", credentials=creds)

        now_iso = datetime.utcnow().isoformat() + "Z"
        events_result = service.events().list(
            calendarId="primary",
            timeMin=now_iso,
            maxResults=50,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        items = events_result.get("items", [])

        def normalize(e: dict):
            start = e.get("start", {})
            end = e.get("end", {})
            return {
                "id": e.get("id"),
                "summary": e.get("summary") or "(No title)",
                "start": start.get("dateTime") or start.get("date"),
                "end": end.get("dateTime") or end.get("date"),
                "source": "google",
            }

        events = [normalize(e) for e in items]
        logging.info("✅ Fetched Google events successfully for user %s", user_id)
        return {"events": events}
    except Exception as e:
        logging.error("Failed to fetch Google events: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch Google events")


class GoogleEventCreate(BaseModel):
    summary: str
    description: Optional[str] = None
    start: dict  # { dateTime: ISO, timeZone?: str } or { date: YYYY-MM-DD }
    end: dict    # same shape as start
    location: Optional[str] = None


class GoogleEventUpdate(BaseModel):
    summary: Optional[str] = None
    description: Optional[str] = None
    start: Optional[dict] = None
    end: Optional[dict] = None
    location: Optional[str] = None


def _get_calendar_service_from_refresh_token(current_user: dict):
    refresh_token = current_user.get("google_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google account not connected")
    stored_scopes = current_user.get("google_scopes", SCOPES)
    creds = GoogleCredentials(
        None,
        refresh_token=refresh_token,
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=stored_scopes,
    )
    creds.refresh(GoogleRequest())
    return build("calendar", "v3", credentials=creds)


@app.post("/google/add_event")
async def add_google_event(payload: GoogleEventCreate, current_user: dict = Depends(get_current_user)):
    try:
        service = _get_calendar_service_from_refresh_token(current_user)
        body = {
            "summary": payload.summary,
            "description": payload.description,
            "start": payload.start,
            "end": payload.end,
            "location": payload.location,
        }
        # Remove None fields
        body = {k: v for k, v in body.items() if v is not None}
        created = service.events().insert(calendarId="primary", body=body).execute()
        logging.info("✅ Created Google event %s", created.get("id"))
        return {"id": created.get("id"), "status": "created"}
    except Exception as e:
        logging.error("Error creating Google event: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create Google event")


@app.put("/google/update_event/{event_id}")
async def update_google_event(event_id: str, payload: GoogleEventUpdate, current_user: dict = Depends(get_current_user)):
    try:
        service = _get_calendar_service_from_refresh_token(current_user)
        existing = service.events().get(calendarId="primary", eventId=event_id).execute()
        if not existing:
            raise HTTPException(status_code=404, detail="Event not found")
        # Apply updates
        if payload.summary is not None:
            existing["summary"] = payload.summary
        if payload.description is not None:
            existing["description"] = payload.description
        if payload.start is not None:
            existing["start"] = payload.start
        if payload.end is not None:
            existing["end"] = payload.end
        if payload.location is not None:
            existing["location"] = payload.location
        updated = service.events().update(calendarId="primary", eventId=event_id, body=existing).execute()
        logging.info("✅ Updated Google event %s", event_id)
        return {"id": updated.get("id"), "status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error updating Google event: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to update Google event")


@app.delete("/google/delete_event/{event_id}")
async def delete_google_event(event_id: str, current_user: dict = Depends(get_current_user)):
    try:
        service = _get_calendar_service_from_refresh_token(current_user)
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        logging.info("✅ Deleted Google event %s", event_id)
        return {"id": event_id, "status": "deleted"}
    except Exception as e:
        logging.error("Error deleting Google event: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to delete Google event")


class WatchRequest(BaseModel):
    webhook_url: str
    token: Optional[str] = None  # Opaque token to verify notifications


@app.post("/google/watch")
async def google_watch(body: WatchRequest, current_user: dict = Depends(get_current_user)):
    """Create a Google Calendar watch channel for push notifications."""
    try:
        service = _get_calendar_service_from_refresh_token(current_user)
        channel_id = str(uuid.uuid4())
        request_body = {
            "id": channel_id,
            "type": "web_hook",
            "address": body.webhook_url,
        }
        if body.token:
            request_body["token"] = body.token
        # Exponential backoff on creating the watch channel
        max_attempts = 5
        delay = 1
        last_exc = None
        watch = None
        for _ in range(max_attempts):
            try:
                watch = service.events().watch(calendarId="primary", body=request_body).execute()
                break
            except Exception as e:
                last_exc = e
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
        if watch is None:
            raise last_exc or Exception("Failed to create Google watch channel")
        # Persist channel metadata for stop/renew later
        await db.google_watch_channels.insert_one({
            "user_id": str(current_user["_id"]),
            "channel_id": watch.get("id"),
            "resource_id": watch.get("resourceId"),
            "expiration": watch.get("expiration"),
            "address": body.webhook_url,
            "token": body.token,
            "created_at": datetime.utcnow(),
        })
        logging.info("✅ Created Google watch channel %s", watch.get("id"))
        return {"watch": watch}
    except Exception as e:
        logging.error("Error creating Google watch: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create Google watch channel")


async def _build_google_service_for_user_id(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    refresh_token = user.get("google_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    stored_scopes = user.get("google_scopes", SCOPES)
    creds = GoogleCredentials(
        None,
        refresh_token=refresh_token,
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=stored_scopes,
    )
    creds.refresh(GoogleRequest())
    return build("calendar", "v3", credentials=creds)


async def _upsert_google_event_for_user(user_id: str, item: dict):
    start = item.get("start", {})
    end = item.get("end", {})
    start_iso = start.get("dateTime") or start.get("date")
    end_iso = end.get("dateTime") or end.get("date")
    update_doc = {
        "title": item.get("summary") or "(No title)",
        "description": item.get("description"),
        "start_time": start_iso,
        "end_time": end_iso,
        "calendar_source": "google",
        "location": item.get("location"),
        "is_invite": False,
        "created_at": datetime.utcnow(),
        "user_id": user_id,
        "external_id": item.get("id"),
    }
    # Remove None values to avoid overwriting with nulls
    update_doc = {k: v for k, v in update_doc.items() if v is not None}
    await db.events.update_one(
        {"user_id": user_id, "calendar_source": "google", "external_id": item.get("id")},
        {"$set": update_doc},
        upsert=True,
    )


async def _delete_google_event_for_user(user_id: str, external_id: str):
    await db.events.delete_one({
        "user_id": user_id,
        "calendar_source": "google",
        "external_id": external_id,
    })


async def _perform_google_incremental_sync(user_id: str):
    """Fetch deltas using syncToken if available, otherwise do a windowed full sync."""
    try:
        service = await _build_google_service_for_user_id(user_id)
        state = await db.google_sync_state.find_one({"user_id": user_id})
        params = {
            "calendarId": "primary",
            "singleEvents": True,
        }
        if state and state.get("sync_token"):
            params["syncToken"] = state["sync_token"]
        else:
            # Initial sync: pull recent 60 days
            from datetime import timedelta
            params["timeMin"] = (datetime.utcnow() - timedelta(days=60)).isoformat() + "Z"
            params["maxResults"] = 2500

        next_page = None
        next_sync_token = None
        while True:
            if next_page:
                params["pageToken"] = next_page
            try:
                # Exponential backoff for Google events list
                max_attempts = 5
                delay = 1
                last_exc = None
                resp = None
                for _ in range(max_attempts):
                    try:
                        resp = service.events().list(**params).execute()
                        break
                    except Exception as e:
                        last_exc = e
                        await asyncio.sleep(delay)
                        delay = min(delay * 2, 30)
                if resp is None:
                    raise last_exc or Exception("Failed to list Google events")
            except HttpError as he:
                # 410 Gone: invalid sync token → clear and retry full
                if getattr(he, "status_code", None) == 410 or "410" in str(he):
                    await db.google_sync_state.delete_one({"user_id": user_id})
                    # Restart with full windowed sync
                    params.pop("syncToken", None)
                    from datetime import timedelta
                    params["timeMin"] = (datetime.utcnow() - timedelta(days=60)).isoformat() + "Z"
                    continue
                raise

            items = resp.get("items", [])
            for item in items:
                if item.get("status") == "cancelled":
                    await _delete_google_event_for_user(user_id, item.get("id"))
                else:
                    await _upsert_google_event_for_user(user_id, item)

            next_page = resp.get("nextPageToken")
            if not next_page:
                next_sync_token = resp.get("nextSyncToken") or next_sync_token
                break

        if next_sync_token:
            await db.google_sync_state.update_one(
                {"user_id": user_id},
                {"$set": {"sync_token": next_sync_token, "updated_at": datetime.utcnow()}},
                upsert=True,
            )
        logging.info("✅ Incremental Google sync complete for user %s", user_id)
    except Exception as e:
        logging.error("Google incremental sync failed for user %s: %s", user_id, str(e))


@app.post("/google/notify")
async def google_notify(request: Request, background_tasks: BackgroundTasks):
    """Receive Google push notifications. Google expects 200 OK quickly."""
    # Read headers from Google
    channel_id = request.headers.get("X-Goog-Channel-ID")
    resource_id = request.headers.get("X-Goog-Resource-ID")
    resource_state = request.headers.get("X-Goog-Resource-State")
    token = request.headers.get("X-Goog-Channel-Token")
    logging.info(
        "📬 Google notify: channel=%s resource=%s state=%s", channel_id, resource_id, resource_state
    )
    if not channel_id or not resource_id:
        return {"status": "ignored"}
    # Lookup which user this resource belongs to
    channel = await db.google_watch_channels.find_one({
        "channel_id": channel_id,
        "resource_id": resource_id,
    })
    if channel and channel.get("user_id"):
        background_tasks.add_task(_perform_google_incremental_sync, channel["user_id"])
    return {"status": "ok"}


async def perform_google_incremental_sync(headers: dict):
    """Public wrapper to trigger incremental sync using notify headers.
    Expects X-Goog-Channel-ID and X-Goog-Resource-ID in headers.
    """
    channel_id = headers.get("X-Goog-Channel-ID")
    resource_id = headers.get("X-Goog-Resource-ID")
    if not channel_id or not resource_id:
        return
    channel = await db.google_watch_channels.find_one({
        "channel_id": channel_id,
        "resource_id": resource_id,
    })
    if channel and channel.get("user_id"):
        await _perform_google_incremental_sync(channel["user_id"])


class StopWatchRequest(BaseModel):
    channel_id: str
    resource_id: str


@app.post("/google/stop_watch")
async def stop_google_watch(body: StopWatchRequest, current_user: dict = Depends(get_current_user)):
    try:
        service = await _build_google_service_for_user_id(str(current_user["_id"]))
        # Stop the channel
        service.channels().stop(body={"id": body.channel_id, "resourceId": body.resource_id}).execute()
        await db.google_watch_channels.delete_one({
            "user_id": str(current_user["_id"]),
            "channel_id": body.channel_id,
            "resource_id": body.resource_id,
        })
        return {"status": "stopped"}
    except Exception as e:
        logging.error("Error stopping Google watch: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to stop Google watch")


async def _renew_channel_for_user(user_id: str, channel_doc: dict):
    """Stop an existing channel and create a new one with the same address/token."""
    try:
        service = await _build_google_service_for_user_id(user_id)
        address = channel_doc.get("address")
        token_val = channel_doc.get("token")
        if not address:
            logging.warning("Channel missing address; cannot renew (user=%s)", user_id)
            return
        # Stop old channel with backoff
        max_attempts = 5
        delay = 1
        for _ in range(max_attempts):
            try:
                service.channels().stop(body={"id": channel_doc["channel_id"], "resourceId": channel_doc["resource_id"]}).execute()
                break
            except Exception:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
        # Create new watch
        new_id = str(uuid.uuid4())
        body = {"id": new_id, "type": "web_hook", "address": address}
        if token_val:
            body["token"] = token_val
        delay = 1
        watch = None
        last_exc = None
        for _ in range(max_attempts):
            try:
                watch = service.events().watch(calendarId="primary", body=body).execute()
                break
            except Exception as e:
                last_exc = e
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
        if watch is None:
            raise last_exc or Exception("Failed to renew Google watch channel")
        # Update stored channel document
        await db.google_watch_channels.update_one(
            {"_id": channel_doc["_id"]},
            {"$set": {
                "channel_id": watch.get("id"),
                "resource_id": watch.get("resourceId"),
                "expiration": watch.get("expiration"),
                "address": address,
                "token": token_val,
                "updated_at": datetime.utcnow(),
            }}
        )
        logging.info("🔄 Renewed Google watch channel for user %s", user_id)
    except Exception as e:
        logging.error("Failed to renew channel for user %s: %s", user_id, str(e))


async def _renew_google_channels_periodically():
    """Background task to renew channels expiring within 24 hours."""
    while True:
        try:
            now_ms = int(datetime.utcnow().timestamp() * 1000)
            threshold_ms = now_ms + 24 * 60 * 60 * 1000
            cursor = db.google_watch_channels.find({"expiration": {"$lte": str(threshold_ms)}})
            channels = await cursor.to_list(length=1000)
            for ch in channels:
                user_id = ch.get("user_id")
                if user_id:
                    await _renew_channel_for_user(user_id, ch)
        except Exception as e:
            logging.error("Channel renewal loop error: %s", str(e))
        # Check hourly
        await asyncio.sleep(3600)

# ───────────────────────────────────────────────
# Auth routes
@app.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    try:
        logging.info("📝 /auth/register payload received: %s", {"email": user_data.email, "name": user_data.name})
    except Exception:
        pass
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        logging.warning("⚠️ Register attempt for existing email: %s", user_data.email)
        raise HTTPException(status_code=400, detail="Email already registered")
    user_dict = {
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": get_password_hash(user_data.password),
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    access_token = create_access_token(data={"sub": user_id})
    resp = {"access_token": access_token, "token_type": "bearer", "user": {"id": user_id, "email": user_data.email, "name": user_data.name}}
    logging.info("✅ /auth/register success for %s", user_data.email)
    return resp

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    try:
        logging.info("🔐 /auth/login payload received: %s", {"email": user_data.email})
    except Exception:
        pass
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        logging.warning("🚫 Login failed for email: %s", user_data.email)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    resp = {"access_token": access_token, "token_type": "bearer", "user": {"id": user_id, "email": user["email"], "name": user["name"]}}
    logging.info("✅ /auth/login success for %s", user_data.email)
    return resp

# ───────────────────────────────────────────────
# Calendar Sources
@app.get("/calendar-sources", response_model=List[CalendarSource])
async def get_calendar_sources(current_user: dict = Depends(get_current_user)):
    sources = [
        CalendarSource(id="google", name="Google Calendar", type="google", color="#4285F4"),
        CalendarSource(id="apple", name="Apple Calendar", type="apple", color="#FF3B30"),
        CalendarSource(id="outlook", name="Outlook Calendar", type="outlook", color="#0078D4")
    ]
    
    # Check if Google needs re-authentication
    google_token = current_user.get("google_refresh_token")
    if google_token:
        stored_scopes = current_user.get("google_scopes", [])
        required_scopes = [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events"
        ]
        has_required_scopes = any(
            required_scope in stored_scopes 
            for required_scope in required_scopes
        ) if stored_scopes else False
        
        # Mark Google source as needing re-auth if scopes are insufficient
        if not has_required_scopes:
            for source in sources:
                if source.id == "google":
                    source.is_active = False
    
    return sources

# ───────────────────────────────────────────────
# Google Re-authentication Check
@app.get("/google/reauth-required")
async def check_google_reauth_required(current_user: dict = Depends(get_current_user)):
    """Check if user needs to re-authenticate Google account for new scopes"""
    user_id = str(current_user["_id"])
    refresh_token = current_user.get("google_refresh_token")
    
    if not refresh_token:
        return {"reauth_required": False, "reason": "No Google account connected"}
    
    stored_scopes = current_user.get("google_scopes", [])
    required_scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]
    
    has_required_scopes = any(
        required_scope in stored_scopes 
        for required_scope in required_scopes
    ) if stored_scopes else False
    
    return {
        "reauth_required": not has_required_scopes,
        "reason": "Old scopes detected - re-authentication needed for write access" if not has_required_scopes else None,
        "current_scopes": stored_scopes,
        "required_scopes": required_scopes
    }

# ───────────────────────────────────────────────
# Events
@app.get("/events")
async def get_events(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])

    # Fetch events from local DB
    db_events = await db.events.find({"user_id": user_id}).to_list(100)
    for e in db_events:
        e["id"] = str(e["_id"])
        e["_id"] = str(e["_id"])

    # Fetch Google events if available
    google_events = []
    refresh_token = current_user.get("google_refresh_token")
    if refresh_token:
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.exceptions import RefreshError
            
            # Check if user has sufficient scopes
            stored_scopes = current_user.get("google_scopes", [])
            required_scopes = [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events"
            ]
            
            # Check if stored scopes include required scopes
            has_required_scopes = any(
                required_scope in stored_scopes 
                for required_scope in required_scopes
            ) if stored_scopes else False
            
            if not has_required_scopes:
                # Old token with insufficient scopes - need re-authentication
                logger.warning(f"User {user_id} has insufficient Google scopes. Re-authentication required.")
                # Don't throw error, just skip Google events and let frontend handle re-auth
                pass
            else:
                creds = Credentials(
                    None,
                    refresh_token=refresh_token,
                    client_id=GOOGLE_CLIENT_ID,
                    client_secret=GOOGLE_CLIENT_SECRET,
                    token_uri="https://oauth2.googleapis.com/token",
                    scopes=stored_scopes if stored_scopes else SCOPES  # Use stored scopes
                )
                
                # Refresh the access token
                try:
                    from google.auth.transport.requests import Request as GoogleRequest
                    creds.refresh(GoogleRequest())
                    service = build("calendar", "v3", credentials=creds)
                    events_result = service.events().list(
                        calendarId="primary",
                        maxResults=20,
                        singleEvents=True,
                        orderBy="startTime"
                    ).execute()
                    google_events = events_result.get("items", [])
                except RefreshError as e:
                    logger.error(f"Failed to refresh Google token for user {user_id}: {str(e)}")
                    # Token may be revoked - need re-authentication
                    pass
                except Exception as e:
                    # Check if error is due to insufficient permissions
                    error_str = str(e).lower()
                    if "insufficient" in error_str or "permission" in error_str or "scope" in error_str:
                        logger.warning(f"User {user_id} has insufficient permissions. Re-authentication required.")
                        # Clear the old token to force re-auth
                        await db.users.update_one(
                            {"_id": ObjectId(user_id)},
                            {"$unset": {"google_refresh_token": "", "google_scopes": ""}}
                        )
                    else:
                        logger.error(f"Error fetching Google events for user {user_id}: {str(e)}")
                    pass
        except Exception as e:
            logger.error(f"Error initializing Google credentials for user {user_id}: {str(e)}")
            pass

    # Fetch Apple events if available
    apple_events = []
    if current_user.get("apple_calendar_connected"):
        try:
            from apple_calendar_service import AppleCalendarService
            credentials = current_user.get("apple_calendar_credentials", {})
            if credentials:
                apple_calendar = AppleCalendarService(
                    apple_id=credentials["apple_id"],
                    app_specific_password=credentials["app_specific_password"],
                    user_id=user_id
                )
                apple_events = await apple_calendar.get_events()
        except Exception as e:
            logger.error(f"Error fetching Apple events: {str(e)}")

    # Fetch Microsoft events if available
    microsoft_events = []
    if current_user.get("microsoft_calendar_connected"):
        try:
            from microsoft_calendar_service import MicrosoftCalendarService
            access_token = current_user.get("microsoft_access_token")
            if access_token:
                from datetime import timedelta
                microsoft_calendar = MicrosoftCalendarService(access_token)
                start_date = datetime.utcnow()
                end_date = datetime.utcnow() + timedelta(days=30)
                microsoft_events = microsoft_calendar.get_events(
                    start_date=start_date,
                    end_date=end_date,
                    max_results=20
                )
        except Exception as e:
            logger.error(f"Error fetching Microsoft events: {str(e)}")

    return {
        "local_events": db_events, 
        "google_events": google_events,
        "apple_events": apple_events,
        "microsoft_events": microsoft_events
    }

@app.post("/events")
async def create_event(event: dict, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    event["user_id"] = user_id

    result = await db.events.insert_one(event)
    event["id"] = str(result.inserted_id)
    event["_id"] = str(result.inserted_id)
    return {"message": "Event created successfully", "event": event}
@app.put("/events/{event_id}")
async def update_event(event_id: str, event: EventUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])

    existing = await db.events.find_one({"_id": ObjectId(event_id), "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only update fields that are provided
    update_data = {k: v for k, v in event.dict().items() if v is not None}
    
    await db.events.update_one({"_id": ObjectId(event_id)}, {"$set": update_data})
    
    # Return the updated event with proper ObjectId conversion
    updated_event = await db.events.find_one({"_id": ObjectId(event_id)})
    if updated_event:
        # Convert ObjectId to string for JSON serialization
        updated_event["id"] = str(updated_event["_id"])
        updated_event["_id"] = str(updated_event["_id"])
        # Convert any other ObjectId fields to strings
        if "user_id" in updated_event and isinstance(updated_event["user_id"], ObjectId):
            updated_event["user_id"] = str(updated_event["user_id"])
    
    return updated_event


# -------------------------------
# DELETE /api/events/{event_id}
# -------------------------------
@app.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    result = await db.events.delete_one({"_id": ObjectId(event_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}
# ───────────────────────────────────────────────
# Include Routers + Middleware
app.include_router(api_router)

origins = [
    "https://unified-calendar-one.vercel.app", 
    "https://unified-calendar-zflg.onrender.com",
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────────────────────────────────────
# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ───────────────────────────────────────────────
# Import Apple Calendar routes (after all other definitions to avoid circular imports)
from apple_routes import apple_router
app.include_router(apple_router)

# Import Microsoft Calendar routes
from microsoft_routes import microsoft_router
app.include_router(microsoft_router)

# ───────────────────────────────────────────────
# Startup
@app.on_event("startup")
async def _startup_tasks():
    try:
        asyncio.create_task(_renew_google_channels_periodically())
        logging.info("🕒 Started Google channel renewal background task")
    except Exception as e:
        logging.error("Failed to start renewal background task: %s", str(e))

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting backend server on http://127.0.0.1:8000")
    
    # Configure uvicorn for Windows compatibility
    # Disable reload by default to avoid multiprocessing issues
    uvicorn.run(
        "server:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=False,  # Disable reload to avoid multiprocessing issues
        workers=1,     # Use single worker to avoid multiprocessing issues
        loop="asyncio" # Explicitly set event loop
    )
