import uuid

from pydantic import BaseModel


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    avatar_url: str | None
