import pytest                                                                   
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User
from tests.conftest import TEST_EMAIL, TEST_PASSWORD
from app.core.limiter import limiter

limiter.enabled = False

async def test_register_success(test_user: dict):
    assert "id" in test_user
    assert test_user["email"] == TEST_EMAIL

async def test_register_not_whitelisted(client: AsyncClient):
    res = await client.post("/auth/register", json={
        "first_name": "Hacker",
        "last_name": "Person",
        "email_address": "stranger@example.com",
        "password": "TestPassword1!",
    })
    assert res.status_code == 403


async def test_login_success(test_user: dict, client: AsyncClient):
    res = await client.post("/auth/login", json={
        "email_address": test_user["email"],
        "password": test_user["password"],
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_login_wrong_password(test_user: dict, client: AsyncClient):
    res = await client.post("/auth/login", json={
        "email_address": test_user["email"],
        "password": "WrongPassword1!",
    })
    assert res.status_code == 401


async def test_login_unknown_email(client: AsyncClient):
    res = await client.post("/auth/login", json={
        "email_address": "nobody@finsight.dev",
        "password": "TestPassword1!",
    })
    assert res.status_code == 401