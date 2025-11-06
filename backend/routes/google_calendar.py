from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from pydantic import BaseModel
from datetime import datetime
import os
import pytz

from dependencies import get_current_user


router = APIRouter()


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")


def get_google_service(access_token: str | None, refresh_token: str | None):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google client config missing")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google refresh token missing")

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=["https://www.googleapis.com/auth/calendar"],
    )

    # Ensure we have a valid access token
    if not creds.valid:
        try:
            creds.refresh(request=None)  # google-auth will create a Request internally if None is provided in some versions
        except Exception:
            # Fallback: explicitly use google.auth.transport.requests.Request
            from google.auth.transport.requests import Request as GoogleRequest
            creds.refresh(GoogleRequest())

    return build("calendar", "v3", credentials=creds)


class EventData(BaseModel):
    title: str
    description: str | None = None
    start: str
    end: str
    calendar_id: str = "primary"


@router.post("/google/create-event")
async def create_google_event(event: EventData, request: Request, current_user: dict = Depends(get_current_user)):
    # Prefer request.state.user if present; otherwise use current_user
    user = getattr(request.state, "user", None) or current_user
    access_token = user.get("google_access_token")
    refresh_token = user.get("google_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google account not connected")

    service = get_google_service(access_token, refresh_token)

    event_body = {
        "summary": event.title,
        "description": event.description,
        "start": {"dateTime": event.start},
        "end": {"dateTime": event.end},
    }

    try:
        created = service.events().insert(calendarId=event.calendar_id, body=event_body).execute()
        return {"status": "success", "event": created}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Google event: {e}")


@router.put("/google/update-event/{event_id}")
async def update_google_event(event_id: str, event: EventData, request: Request, current_user: dict = Depends(get_current_user)):
    user = getattr(request.state, "user", None) or current_user
    access_token = user.get("google_access_token")
    refresh_token = user.get("google_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google account not connected")

    service = get_google_service(access_token, refresh_token)

    event_body = {
        "summary": event.title,
        "description": event.description,
        "start": {"dateTime": event.start},
        "end": {"dateTime": event.end},
    }

    try:
        updated = service.events().update(calendarId=event.calendar_id, eventId=event_id, body=event_body).execute()
        return {"status": "success", "event": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update Google event: {e}")


@router.delete("/google/delete-event/{event_id}")
async def delete_google_event(event_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    user = getattr(request.state, "user", None) or current_user
    access_token = user.get("google_access_token")
    refresh_token = user.get("google_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google account not connected")

    service = get_google_service(access_token, refresh_token)

    try:
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return {"status": "success", "deleted": event_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Google event: {e}")


@router.get("/google/events")
async def list_google_events(request: Request, current_user: dict = Depends(get_current_user)):
    user = getattr(request.state, "user", None) or current_user
    access_token = user.get("google_access_token")
    refresh_token = user.get("google_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google account not connected")

    service = get_google_service(access_token, refresh_token)

    try:
        events_result = service.events().list(
            calendarId="primary",
            singleEvents=True,
            orderBy="startTime",
            timeMin=None,
        ).execute()

        events = events_result.get("items", [])

        normalized = []
        for e in events:
            normalized.append({
                "id": e.get("id"),
                "title": e.get("summary"),
                "description": e.get("description"),
                "start": (e.get("start") or {}).get("dateTime") or (e.get("start") or {}).get("date"),
                "end": (e.get("end") or {}).get("dateTime") or (e.get("end") or {}).get("date"),
                "calendar_source": "google",
            })

        return {"events": normalized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Google events: {e}")


