import uuid

from pydantic import BaseModel


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    avatar_url: str | None


class GroupCreate(BaseModel):
    name: str


class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    invite_code: str
    member_count: int
    is_owner: bool


class GroupPreviewResponse(BaseModel):
    id: uuid.UUID
    name: str
    member_count: int


class MemberResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    avatar_url: str | None
    is_owner: bool
