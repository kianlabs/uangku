"""User preferences endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import ValidationError
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


def _read_preferences(prefs: dict) -> UserPreferencesData:
    """Bangun respons preferensi tanpa pernah 500.

    Data korup (mis. hasil edit manual di DB) dibersihkan saat dibaca:
    kunci tak dikenal dibuang, nilai tak valid diganti default.
    """
    try:
        return UserPreferencesData(**prefs)
    except ValidationError:
        known = {k: v for k, v in prefs.items() if k in UserPreferencesData.model_fields}
        try:
            return UserPreferencesData(**known)
        except ValidationError:
            return UserPreferencesData()


@router.get("/preferences", response_model=UserPreferencesResponse)
def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return current user's preferences."""
    prefs = get_preferences(db, current_user)
    return UserPreferencesResponse(preferences=_read_preferences(prefs))


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
    return UserPreferencesResponse(preferences=_read_preferences(updated))
