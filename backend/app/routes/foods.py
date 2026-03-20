from fastapi import APIRouter, Depends
from app.database import get_db
from app.dependencies.auth import AuthUser, get_current_user
from app.models.meal import FoodItem, Macros

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("", response_model=list[FoodItem])
async def list_foods(
    offset: int = 0,
    limit: int = 200,
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
    items = []
    for r in rows.data:
        macros_data = r.get("macros") or {}
        if not macros_data.get("calories") and macros_data.get("calories") != 0:
            continue  # skip rows with missing/empty macros
        items.append(FoodItem(
            id=r["id"],
            name=r["name"],
            serving_size=r["serving_size"],
            macros=Macros(**macros_data),
            use_count=r["use_count"],
            is_food_item=r.get("is_food_item", True),
            emoji=r.get("emoji") or "🍽️",
        ))
    return items


@router.delete("/{food_id}", status_code=204)
async def delete_food(
    food_id: str,
    current_user: AuthUser = Depends(get_current_user),
) -> None:
    db = get_db()
    db.table("foods").delete().eq("id", food_id).eq("user_id", current_user.id).execute()
