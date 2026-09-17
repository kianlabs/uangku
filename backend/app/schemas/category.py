from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

CategoryType = Literal["income", "expense"]


class CategoryCreateRequest(BaseModel):
    name: str
    type: CategoryType


class CategoryUpdateRequest(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: CategoryType

    model_config = {"from_attributes": True}


class CategoryDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: CategoryType
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryUpdatedResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: CategoryType
    updated_at: datetime

    model_config = {"from_attributes": True}
