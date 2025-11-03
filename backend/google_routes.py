from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

router = APIRouter()
redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

# Optional: Security setup to protect endpoints
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# In-memory state store for demo purposes (use DB in production)
oauth_states = {}

@router.get("/")
async def auth_google():
    """Step 1: Redirect user to Google OAuth login"""
    flow = Flow.from_client_secrets_file(
        "client_secret.json",
        scopes=[
            "https://www.googleapis.com/auth/calendar.readonly",
            "openid",
            "https://www.googleapis.com/auth/userinfo.email"
        ],
        redirect_uri=redirect_uri
    )
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true"
    )
    oauth_states[state] = datetime.utcnow()  # store state
    return RedirectResponse(authorization_url)

@router.get("/callback")
async def google_callback(request: Request):
    """Step 2: Handle Google OAuth callback"""
    state_str = request.query_params.get("state")
    if not state_str:
        raise HTTPException(status_code=400, detail="Missing state")

    # Decode JSON-encoded state
    try:
        state = json.loads(state_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state format")

    frontend_redirect_uri = state.get("frontend_redirect_uri")
    if not frontend_redirect_uri:
        raise HTTPException(status_code=400, detail="Missing frontend redirect URI")

    flow = Flow.from_client_secrets_file(
        "client_secret.json",
        scopes=[
            "https://www.googleapis.com/auth/calendar.readonly",
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ],
        redirect_uri=redirect_uri,
    )

    flow.fetch_token(authorization_response=str(request.url))
    credentials = flow.credentials

    # Get user info from Google
    service = build("oauth2", "v2", credentials=credentials)
    user_info = service.userinfo().get().execute()

    # Build JWT
    token_data = {"sub": user_info["id"]}
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    # ✅ Redirect user back to the frontend with token & user info
    user_json = json.dumps({
        "id": user_info["id"],
        "email": user_info["email"],
        "name": user_info["name"],
    })
    redirect_url = f"{frontend_redirect_uri}?token={access_token}&user={user_json}"

    return RedirectResponse(url=redirect_url)
