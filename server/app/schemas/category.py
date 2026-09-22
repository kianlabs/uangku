from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

CategoryType = Literal["income", "expense"]


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: CategoryType

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class CategoryUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


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


class CategoryListResponse(BaseModel):
    items: list[CategoryResponse]


class CategoryTransferRequest(BaseModel):
    to_category_id: uuid.UUID


class CategoryTransferResponse(BaseModel):
    moved: int
