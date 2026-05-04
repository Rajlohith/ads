from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# User Schemas
class UserCreate(BaseModel):
    preferences: str

class UserResponse(BaseModel):
    id: int
    preferences: str
    created_at: datetime

    class Config:
        from_attributes = True

# Ad Schemas
class AdCreate(BaseModel):
    title: str
    content: str
    category: str
    variant: str

class AdResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    variant: str

    class Config:
        from_attributes = True

# Interaction Schemas
class InteractionCreate(BaseModel):
    user_id: int
    ad_id: int
    interaction_type: str # "view" or "click"

class InteractionResponse(BaseModel):
    id: int
    user_id: int
    ad_id: int
    interaction_type: str
    timestamp: datetime

    class Config:
        from_attributes = True