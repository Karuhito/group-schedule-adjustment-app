import uuid
import pytest
from datetime import datetime
from app.models.models import User, Group, GroupMember, Schedule


@pytest.mark.asyncio
async def test_create_user(db_session):
    """User モデルを保存・取得できること"""
    user = User(
        discord_id="123456789",
        username="testuser",
        avatar_url="https://cdn.discordapp.com/avatars/123/abc.png",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert isinstance(user.id, uuid.UUID)
    assert user.discord_id == "123456789"
    assert user.username == "testuser"
    assert isinstance(user.created_at, datetime)


@pytest.mark.asyncio
async def test_user_discord_id_unique(db_session):
    """同じ discord_id を持つ User を 2 件保存するとエラーになること"""
    from sqlalchemy.exc import IntegrityError

    user1 = User(discord_id="same_id", username="user1")
    user2 = User(discord_id="same_id", username="user2")
    db_session.add(user1)
    await db_session.commit()

    db_session.add(user2)
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_group_member_unique_constraint(db_session):
    """同じ (group_id, user_id) の GroupMember を 2 件保存するとエラーになること"""
    from sqlalchemy.exc import IntegrityError

    user = User(discord_id="uid1", username="user1")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    group = Group(name="テストグループ", invite_code="ABC123", created_by=user.id)
    db_session.add(group)
    await db_session.commit()
    await db_session.refresh(group)

    member1 = GroupMember(group_id=group.id, user_id=user.id)
    member2 = GroupMember(group_id=group.id, user_id=user.id)
    db_session.add(member1)
    await db_session.commit()

    db_session.add(member2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
