import pytest                                                                            
from httpx import AsyncClient                             
from sqlalchemy import delete                                                            
from sqlalchemy.ext.asyncio import AsyncSession                                          
from app.models import Transaction
from tests.conftest import TEST_EMAIL


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_transaction(test_user: dict, client: AsyncClient):
    res = await client.post("/transactions/", json={
        "name": "Test Coffee",
        "amount": "4.50",
        "transaction_date": "2026-04-01",
        "category": "EXPENSE",
    }, headers=auth_headers(test_user["token"]))
    assert res.status_code == 201
    tx = res.json()

    yield tx

    await client.delete(f"/transactions/{tx['id']}", headers=auth_headers(test_user["token"]))


async def test_create_transaction(test_user: dict, client: AsyncClient):
    res = await client.post("/transactions/", json={
        "name": "Salary",
        "amount": "3000.00",
        "transaction_date": "2026-04-01",
        "category": "INCOME",
    }, headers=auth_headers(test_user["token"]))
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Salary"
    assert data["category"] == "INCOME"
    assert "id" in data

    await client.delete(f"/transactions/{data['id']}", headers=auth_headers(test_user["token"]))


async def test_get_transactions(test_user: dict, test_transaction: dict, client: AsyncClient):
    res = await client.get("/transactions/", headers=auth_headers(test_user["token"]))
    assert res.status_code == 200
    ids = [t["id"] for t in res.json()]
    assert test_transaction["id"] in ids


async def test_update_transaction(test_user: dict, test_transaction: dict, client: AsyncClient):
    res = await client.patch(f"/transactions/{test_transaction['id']}", json={
        "name": "Updated Coffee",
        "amount": "5.00",
        "transaction_date": "2026-04-01",
        "category": "EXPENSE",
    }, headers=auth_headers(test_user["token"]))
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Coffee"


async def test_delete_transaction(test_user: dict, client: AsyncClient):
    res = await client.post("/transactions/", json={
        "name": "To Delete",
        "amount": "1.00",
        "transaction_date": "2026-04-01",
        "category": "EXPENSE",
    }, headers=auth_headers(test_user["token"]))
    tx_id = res.json()["id"]

    res = await client.delete(f"/transactions/{tx_id}", headers=auth_headers(test_user["token"]))
    assert res.status_code == 204

    res = await client.get("/transactions/", headers=auth_headers(test_user["token"]))
    assert tx_id not in [t["id"] for t in res.json()]


async def test_unauthenticated_request(client: AsyncClient):
    res = await client.get("/transactions/")
    assert res.status_code == 401