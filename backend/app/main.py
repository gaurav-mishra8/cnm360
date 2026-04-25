import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine, Base
import app.models  # noqa: F401 — ensures all models are registered before create_all
from app.api.v1.router import router

app = FastAPI(title="CNM360 Financial Automation", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve built React frontend (production only)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(_: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
