import secrets
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Group, GroupMember, Schedule, User
from app.schemas.schemas import (
    GroupCreate,
    GroupPreviewResponse,
    GroupResponse,
    MemberResponse,
)

router = APIRouter(prefix="/groups", tags=["groups"])


async def _generate_unique_invite_code(db: AsyncSession) -> str:
    for _ in range(3):
        code = secrets.token_urlsafe(6)
        result = await db.execute(select(Group).where(Group.invite_code == code))
        if not result.scalar_one_or_none():
            return code
    raise HTTPException(status_code=500, detail="招待コードの生成に失敗しました")


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GroupResponse]:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.get("/by-code/{invite_code}", response_model=GroupPreviewResponse)
async def preview_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupPreviewResponse:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.post("/by-code/{invite_code}/join", response_model=GroupResponse)
async def join_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.get("/{group_id}/members", response_model=list[MemberResponse])
async def list_members(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberResponse]:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="Not Implemented")


@router.delete("/{group_id}/members/{user_id}", status_code=204)
async def remove_member(
    group_id: uuid_lib.UUID,
    user_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="Not Implemented")
