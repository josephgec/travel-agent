from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import auth, chat, conversations, plans, preferences, trips

settings = get_settings()

app = FastAPI(title="Travel Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(preferences.router)
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(plans.router)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/healthz")
async def api_healthz() -> dict[str, str]:
    return {"status": "ok"}
