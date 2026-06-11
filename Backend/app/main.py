from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .models.models import Base
from .db.session import engine

app = FastAPI(title="TailorPro Management System API")

# Create tables
Base.metadata.create_all(bind=engine)

@app.on_event("startup")
def on_startup():
    try:
        from app.services.telegram_bot_service import start_telegram_services
        start_telegram_services()
    except Exception as e:
        print(f"[STARTUP ERROR] Failed to start Telegram services: {e}", flush=True)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to TailorPro Management System API"}

# Import and include routers
from .api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")
