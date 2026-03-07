from fastapi import APIRouter, Depends
from app.database import get_db
from app.dependencies.auth import AuthUser, get_current_user
from app.models.meal import Targets

router = APIRouter(prefix="/targets", tags=["targets"])


@router.get("", response_model=Targets)
async def get_targets(current_user: AuthUser = Depends(get_current_user)) -> Targets:
    db = get_db()
    row = db.table("targets").select("*").eq("user_id", current_user.id).maybe_single().execute()
    if not row or not row.data:
        # Auto-create default targets for this user on first visit
        db.table("targets").insert({"user_id": current_user.id}).execute()
        return Targets()
    return Targets(**row.data)


@router.put("", response_model=Targets)
async def update_targets(
    body: Targets,
    current_user: AuthUser = Depends(get_current_user),
) -> Targets:
    db = get_db()
    row = (
        db.table("targets")
        .upsert({"user_id": current_user.id, **body.model_dump()})
        .execute()
    )
    return Targets(**row.data[0])
