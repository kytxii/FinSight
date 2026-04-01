from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import transaction

app = FastAPI(redirect_slashes=False)

# TODO: restrict allow_origins to FRONTEND_URL once auth is wired up
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(transaction.router)
