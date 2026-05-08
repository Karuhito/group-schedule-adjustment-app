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
    invite_code = await _generate_unique_invite_code(db)
    group = Group(name=data.name, invite_code=invite_code, created_by=current_user.id)
    db.add(group)
    await db.flush()
    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    await db.commit()
    await db.refresh(group)
    return GroupResponse(
        id=group.id,
        name=group.name,
        invite_code=group.invite_code,
        member_count=1,
        is_owner=True,
    )


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GroupResponse]:
    result = await db.execute(
        select(Group, func.count(GroupMember.id).label("member_count"))
        .join(GroupMember, Group.id == GroupMember.group_id)
        .where(GroupMember.user_id == current_user.id)
        .group_by(Group.id)
    )
    rows = result.all()
    return [
        GroupResponse(
            id=row.Group.id,
            name=row.Group.name,
            invite_code=row.Group.invite_code,
            member_count=row.member_count,
            is_owner=row.Group.created_by == current_user.id,
        )
        for row in rows
    ]


@router.get("/by-code/{invite_code}", response_model=GroupPreviewResponse)
async def preview_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupPreviewResponse:
    result = await db.execute(select(Group).where(Group.invite_code == invite_code))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="招待コードが見つかりません")
    count_result = await db.execute(
        select(func.count(GroupMember.id)).where(GroupMember.group_id == group.id)
    )
    member_count = count_result.scalar_one()
    return GroupPreviewResponse(id=group.id, name=group.name, member_count=member_count)


@router.post("/by-code/{invite_code}/join", response_model=GroupResponse)
async def join_group(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    result = await db.execute(select(Group).where(Group.invite_code == invite_code))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="招待コードが見つかりません")
    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group.id,
            GroupMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="既にこのグループのメンバーです")
    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    await db.commit()
    count_result = await db.execute(
        select(func.count(GroupMember.id)).where(GroupMember.group_id == group.id)
    )
    member_count = count_result.scalar_one()
    return GroupResponse(
        id=group.id,
        name=group.name,
        invite_code=group.invite_code,
        member_count=member_count,
        is_owner=group.created_by == current_user.id,
    )


@router.get("/{group_id}/members", response_model=list[MemberResponse])
async def list_members(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberResponse]:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    membership = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="グループのメンバーではありません")
    members_result = await db.execute(
        select(User, GroupMember)
        .join(GroupMember, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
    )
    rows = members_result.all()
    return [
        MemberResponse(
            user_id=row.User.id,
            username=row.User.username,
            avatar_url=row.User.avatar_url,
            is_owner=row.User.id == group.created_by,
        )
        for row in rows
    ]


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
