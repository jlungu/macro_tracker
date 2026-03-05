from datetime import date, datetime, timezone
from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.meal import (
    DailySummary,
    LogMealRequest,
    LogMealResponse,
    Macros,
    Meal,
    Targets,
)
from app.services.claude import analyze_meal
from app.services.storage import upload_meal_image

router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/log", response_model=LogMealResponse)
async def log_meal(body: LogMealRequest) -> LogMealResponse:
    """Analyze a meal with Claude and persist it to the database."""
    # Fetch today's totals to give Claude context for macro questions
    db = get_db()
    today = date.today()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc).isoformat()
    end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc).isoformat()
    rows = db.table("meals").select("macros").gte("created_at", start).lte("created_at", end).execute()
    daily_totals = {
        "calories": sum(r["macros"]["calories"] for r in rows.data),
        "protein_g": sum(r["macros"]["protein_g"] for r in rows.data),
        "carbs_g": sum(r["macros"]["carbs_g"] for r in rows.data),
        "fat_g": sum(r["macros"]["fat_g"] for r in rows.data),
    }

    targets_row = db.table("targets").select("*").eq("id", "default").single().execute()
    targets = Targets(**targets_row.data) if targets_row.data else Targets()

    macros, description, claude_message, is_meal, new_targets = await analyze_meal(
        user_message=body.message,
        image_base64=body.image_base64,
        image_mime_type=body.image_mime_type or "image/jpeg",
        daily_totals=daily_totals,
        targets=targets,
    )

    if new_targets:
        db.table("targets").upsert({"id": "default", **new_targets.model_dump()}).execute()

    if not is_meal:
        return LogMealResponse(meal=None, claude_message=claude_message, new_targets=new_targets)

    image_url: str | None = None
    if body.image_base64:
        image_url = await upload_meal_image(
            body.image_base64,
            mime_type=body.image_mime_type or "image/jpeg",
        )

    row = (
        db.table("meals")
        .insert(
            {
                "description": description,
                "macros": macros.model_dump(),
                "image_url": image_url,
                "raw_input": body.message,
                "notes": claude_message,
            }
        )
        .execute()
    )

    if not row.data:
        raise HTTPException(status_code=500, detail="Failed to save meal")

    meal = Meal(**row.data[0])
    return LogMealResponse(meal=meal, claude_message=claude_message, new_targets=new_targets)


@router.get("/summary/{date_str}", response_model=DailySummary)
async def get_daily_summary(date_str: str) -> DailySummary:
    """Return all meals for a given date with totals."""
    try:
        day = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format, use YYYY-MM-DD")

    start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc).isoformat()
    end = datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).isoformat()

    db = get_db()
    rows = (
        db.table("meals")
        .select("*")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at")
        .execute()
    )

    meals = [Meal(**r) for r in rows.data]

    totals = Macros(
        calories=sum(m.macros.calories for m in meals),
        protein_g=sum(m.macros.protein_g for m in meals),
        carbs_g=sum(m.macros.carbs_g for m in meals),
        fat_g=sum(m.macros.fat_g for m in meals),
    )

    return DailySummary(date=date_str, meals=meals, totals=totals)


@router.get("", response_model=list[Meal])
async def list_meals(offset: int = 0, limit: int = 20) -> list[Meal]:
    """Paginated meal history, newest first."""
    db = get_db()
    rows = (
        db.table("meals")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [Meal(**r) for r in rows.data]


@router.delete("/{meal_id}", status_code=204)
async def delete_meal(meal_id: str) -> None:
    db = get_db()
    db.table("meals").delete().eq("id", meal_id).execute()
