from fastapi import APIRouter
from app.database import get_db
from app.models.meal import Targets

router = APIRouter(prefix="/targets", tags=["targets"])

_ROW_ID = "default"


@router.get("", response_model=Targets)
async def get_targets() -> Targets:
    db = get_db()
    row = db.table("targets").select("*").eq("id", _ROW_ID).single().execute()
    return Targets(**row.data)


@router.put("", response_model=Targets)
async def update_targets(body: Targets) -> Targets:
    db = get_db()
    row = (
        db.table("targets")
        .upsert({"id": _ROW_ID, **body.model_dump()})
        .execute()
    )
    return Targets(**row.data[0])
