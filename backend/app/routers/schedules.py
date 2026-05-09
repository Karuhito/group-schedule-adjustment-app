import uuid as uuid_lib

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User
from app.schemas.schemas import MemberScheduleResponse, ScheduleResponse, ScheduleUpsert

router = APIRouter(prefix="/groups", tags=["schedules"])


@router.put("/{group_id}/schedules", response_model=ScheduleResponse)
async def put_schedules(
    group_id: uuid_lib.UUID,
    data: ScheduleUpsert,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScheduleResponse:
    raise NotImplementedError


@router.get("/{group_id}/schedules", response_model=list[MemberScheduleResponse])
async def get_schedules(
    group_id: uuid_lib.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberScheduleResponse]:
    raise NotImplementedError
