import pytest                                                                            
from collections.abc import AsyncGenerator                                               
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import delete
from app.main import app
from app.dependencies import get_db
from app.core.config import settings
from app.models import User

TEST_EMAIL = "test@finsight.dev"
TEST_PASSWORD = "TestPassword1!"

test_engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args={"ssl": True},
    poolclass=NullPool,
)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def test_user(client: AsyncClient, db: AsyncSession) -> AsyncGenerator[dict, None]:
    await db.execute(delete(User).where(User.email_address == TEST_EMAIL))
    await db.commit()

    res = await client.post("/auth/register", json={
        "first_name": "Test",
        "last_name": "User",
        "email_address": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert res.status_code == 201
    user_id = res.json()["id"]

    res = await client.post("/auth/login", json={
        "email_address": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    token = res.json()["access_token"]

    yield {"id": user_id, "email": TEST_EMAIL, "password": TEST_PASSWORD, "token": token}

    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()