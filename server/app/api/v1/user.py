"""User preferences endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user import (
    UserPreferencesData,
    UserPreferencesRequest,
    UserPreferencesResponse,
)
from app.services.user import get_preferences, update_preferences

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/preferences", response_model=UserPreferencesResponse)
def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return current user's preferences."""
    prefs = get_preferences(db, current_user)
    return UserPreferencesResponse(preferences=UserPreferencesData(**prefs))


@router.patch("/preferences", response_model=UserPreferencesResponse)
def patch_user_preferences(
    body: UserPreferencesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update user preferences. Only supplied keys are changed."""
    # Exclude unset fields so we don't accidentally wipe keys with None
    patch_data = body.preferences.model_dump(exclude_unset=True)
    updated = update_preferences(db, current_user, patch_data)
    return UserPreferencesResponse(preferences=UserPreferencesData(**updated))
