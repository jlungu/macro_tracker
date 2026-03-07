from fastapi import APIRouter, Depends
from app.database import get_db
from app.dependencies.auth import AuthUser, get_current_user
from app.models.meal import FoodItem, Macros

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("", response_model=list[FoodItem])
async def list_foods(
    offset: int = 0,
    limit: int = 50,
    current_user: AuthUser = Depends(get_current_user),
) -> list[FoodItem]:
    """Return the user's saved food library, sorted by most-used first."""
    db = get_db()
    rows = (
        db.table("foods")
        .select("*")
        .eq("user_id", current_user.id)
        .order("use_count", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [
        FoodItem(
            id=r["id"],
            name=r["name"],
            serving_size=r["serving_size"],
            macros=Macros(**r["macros"]),
            use_count=r["use_count"],
        )
        for r in rows.data
    ]


@router.delete("/{food_id}", status_code=204)
async def delete_food(
    food_id: str,
    current_user: AuthUser = Depends(get_current_user),
) -> None:
    db = get_db()
    db.table("foods").delete().eq("id", food_id).eq("user_id", current_user.id).execute()
