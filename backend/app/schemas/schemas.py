import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator


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


class ScheduleSlot(BaseModel):
    start_time: datetime
    end_time: datetime

    @model_validator(mode='after')
    def validate_time_range(self) -> 'ScheduleSlot':
        if self.start_time >= self.end_time:
            raise ValueError('end_time は start_time より後にしてください')
        return self


class ScheduleUpsert(BaseModel):
    slots: list[ScheduleSlot]


class ScheduleResponse(BaseModel):
    slots: list[ScheduleSlot]


class MemberScheduleResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    avatar_url: str | None
    slots: list[ScheduleSlot]
