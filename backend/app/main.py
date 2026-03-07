from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import foods, meals, targets

app = FastAPI(title="Macro Tracker API", version="0.1.0")

allowed_origins = settings.cors_origins
if settings.cors_production_origin:
    allowed_origins = allowed_origins + [settings.cors_production_origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meals.router)
app.include_router(targets.router)
app.include_router(foods.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
