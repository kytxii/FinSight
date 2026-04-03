from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import transaction, users, auth
from app.core.config import settings

app = FastAPI(redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, settings.DEV_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok"}

app.include_router(transaction.router)
app.include_router(users.router)
app.include_router(auth.router)