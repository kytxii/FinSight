from httpx import AsyncClient                                                            


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_get_me(test_user: dict, client: AsyncClient):
    res = await client.get("/users/me", headers=auth_headers(test_user["token"]))
    assert res.status_code == 200
    assert res.json()["email_address"] == test_user["email"]


async def test_update_me(test_user: dict, client: AsyncClient):
    res = await client.patch("/users/me", json={"first_name": "Updated"}, headers=auth_headers(test_user["token"]))
    assert res.status_code == 200
    assert res.json()["first_name"] == "Updated"


async def test_delete_me(test_user: dict, client: AsyncClient):
    res = await client.delete("/users/me", headers=auth_headers(test_user["token"]))
    assert res.status_code == 204

    res = await client.get("/users/me", headers=auth_headers(test_user["token"]))
    assert res.status_code in (401, 403)
    