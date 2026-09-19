"""Service layer for user preferences."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.user import User


def get_preferences(db: Session, user: User) -> dict:
    """Return the user's preferences dict (may be empty)."""
    prefs = user.preferences
    if prefs is None:
        return {}
    return dict(prefs)


def update_preferences(db: Session, user: User, data: dict) -> dict:
    """Merge *data* into user.preferences (shallow patch) and persist.

    Only keys present in *data* are updated; other keys are left untouched.
    A value of ``None`` for a key removes that key from the stored preferences.
    """
    current: dict = dict(user.preferences) if user.preferences else {}

    for key, value in data.items():
        if value is None:
            current.pop(key, None)
        else:
            current[key] = value

    # SQLAlchemy does not detect in-place mutation of JSONB; assign new dict.
    user.preferences = current
    db.add(user)
    db.commit()
    db.refresh(user)
    return dict(user.preferences)
