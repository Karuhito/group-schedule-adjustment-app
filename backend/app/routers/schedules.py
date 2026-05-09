import uuid as uuid_lib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Group, GroupMember, Schedule, User
from app.schemas.schemas import (
    MemberScheduleResponse,
    ScheduleResponse,
    ScheduleSlot,
    ScheduleUpsert,
)

router = APIRouter(prefix="/groups", tags=["schedules"])


@router.put("/{group_id}/schedules", response_model=ScheduleResponse)
async def put_schedules(
    group_id: uuid_lib.UUID,
    data: ScheduleUpsert,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScheduleResponse:
    result = await db.execute(select(Group).where(Group.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="グループが見つかりません")
    membership = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="グループのメンバーではありません")
    await db.execute(
        delete(Schedule).where(
            Schedule.group_id == group_id,
            Schedule.user_id == current_user.id,
        )
    )
    for slot in data.slots:
        db.add(Schedule(
            user_id=current_user.id,
            group_id=group_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
        ))
    await db.commit()
    return ScheduleResponse(slots=data.slots)


@router.get("/{group_id}/schedules", response_model=list[MemberScheduleResponse])
async def get_schedules(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberScheduleResponse]:
    raise NotImplementedError
