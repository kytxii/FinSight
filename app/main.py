from fastapi import FastAPI
from app.routes import transaction

app = FastAPI(redirect_slashes=False)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(transaction.router)
