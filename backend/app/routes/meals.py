import re
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.dependencies.auth import AuthUser, get_current_user
from app.models.meal import (
    DailySummary,
    LogMealRequest,
    LogMealResponse,
    Macros,
    Meal,
    PatchMealRequest,
    Targets,
)
from app.services.claude import analyze_meal
from app.services.storage import upload_meal_image

router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/log", response_model=LogMealResponse)
async def log_meal(
    body: LogMealRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> LogMealResponse:
    """Analyze a meal with Claude and persist it to the database."""
    db = get_db()
    # Use the client's local date (via tz_offset) so daily totals match their timezone
    offset = timedelta(minutes=body.tz_offset)
    if body.log_date:
        try:
            d = date.fromisoformat(body.log_date)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid log_date format, use YYYY-MM-DD")
        local_midnight = datetime(d.year, d.month, d.day)
    else:
        now_local = datetime.now(timezone.utc) - offset  # shift UTC to local time
        local_midnight = datetime(now_local.year, now_local.month, now_local.day)
    start = (local_midnight + offset).replace(tzinfo=timezone.utc).isoformat()
    end = (local_midnight + offset + timedelta(hours=24) - timedelta(seconds=1)).replace(tzinfo=timezone.utc).isoformat()
    rows = (
        db.table("meals")
        .select("macros")
        .eq("user_id", current_user.id)
        .gte("created_at", start)
        .lte("created_at", end)
        .execute()
    )
    daily_totals = {
        "calories": sum(r["macros"]["calories"] for r in rows.data),
        "protein_g": sum(r["macros"]["protein_g"] for r in rows.data),
        "carbs_g": sum(r["macros"]["carbs_g"] for r in rows.data),
        "fat_g": sum(r["macros"]["fat_g"] for r in rows.data),
    }

    targets_row = (
        db.table("targets")
        .select("*")
        .eq("user_id", current_user.id)
        .maybe_single()
        .execute()
    )
    targets = Targets(**targets_row.data) if targets_row and targets_row.data else Targets()

    # Fetch last 7 days of meals for weekly coaching context
    week_start = (local_midnight - timedelta(days=6) + offset).replace(tzinfo=timezone.utc).isoformat()
    week_rows = (
        db.table("meals")
        .select("macros,created_at")
        .eq("user_id", current_user.id)
        .gte("created_at", week_start)
        .execute()
    )
    # Aggregate into per-day buckets (keyed by local date string)
    week_by_day: dict[str, dict] = {}
    for r in week_rows.data:
        # Convert stored UTC timestamp back to local date
        ts = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
        local_date = (ts - offset).strftime("%Y-%m-%d")
        if local_date not in week_by_day:
            week_by_day[local_date] = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}
        for k in ("calories", "protein_g", "carbs_g", "fat_g"):
            week_by_day[local_date][k] += r["macros"][k]
    weekly_summary = dict(sorted(week_by_day.items()))  # sorted by date ascending

    # Search the user's food database for items matching keywords in the message
    # Strip punctuation so "eggs," doesn't break PostgREST ilike syntax
    words = [re.sub(r"[^a-z0-9]", "", w) for w in body.message.lower().split()]
    words = [w for w in words if len(w) > 2]
    matched_foods: list[dict] = []
    if words:
        filter_str = ",".join(f"name.ilike.%{w}%" for w in words[:5])
        food_rows = (
            db.table("foods")
            .select("name,serving_size,macros")
            .eq("user_id", current_user.id)
            .or_(filter_str)
            .order("use_count", desc=True)
            .limit(5)
            .execute()
        )
        matched_foods = food_rows.data or []

    macros, description, emoji, claude_message, is_meal, new_targets, foods_data = await analyze_meal(
        user_message=body.message,
        history=[h.model_dump() for h in body.history],
        image_base64=body.image_base64,
        image_mime_type=body.image_mime_type or "image/jpeg",
        daily_totals=daily_totals,
        targets=targets,
        matched_foods=matched_foods or None,
        weekly_summary=weekly_summary or None,
    )

    if new_targets:
        db.table("targets").upsert({"user_id": current_user.id, **new_targets.model_dump()}).execute()

    if not is_meal:
        return LogMealResponse(meal=None, claude_message=claude_message, new_targets=new_targets)

    image_url: str | None = None
    if body.image_base64:
        image_url = await upload_meal_image(
            body.image_base64,
            mime_type=body.image_mime_type or "image/jpeg",
        )

    meal_row: dict = {
        "user_id": current_user.id,
        "description": description,
        "emoji": emoji,
        "macros": macros.model_dump(),
        "image_url": image_url,
        "raw_input": body.message,
        "notes": claude_message,
    }
    if body.log_date:
        # Store backdated meals at noon local time so they sort naturally
        noon_utc = (local_midnight + timedelta(hours=12) + offset).replace(tzinfo=timezone.utc)
        meal_row["created_at"] = noon_utc.isoformat()

    row = db.table("meals").insert(meal_row).execute()

    if not row.data:
        raise HTTPException(status_code=500, detail="Failed to save meal")

    # Upsert foods returned by Claude into the user's food database
    for food in foods_data:
        name = food.get("name", "").strip()
        serving_size = food.get("serving_size", "").strip()
        if not name or not serving_size:
            continue
        macros_dict = {
            k: food[k]
            for k in ("calories", "protein_g", "carbs_g", "fat_g")
            if k in food
        }
        existing = (
            db.table("foods")
            .select("id,use_count")
            .eq("user_id", current_user.id)
            .ilike("name", name)
            .maybe_single()
            .execute()
        )
        if existing and existing.data:
            db.table("foods").update(
                {
                    "use_count": existing.data["use_count"] + 1,
                    "macros": macros_dict,
                    "serving_size": serving_size,
                }
            ).eq("id", existing.data["id"]).execute()
        else:
            db.table("foods").insert(
                {
                    "user_id": current_user.id,
                    "name": name,
                    "serving_size": serving_size,
                    "macros": macros_dict,
                }
            ).execute()

    meal = Meal(**row.data[0])
    return LogMealResponse(meal=meal, claude_message=claude_message, new_targets=new_targets)


@router.get("/summary/{date_str}", response_model=DailySummary)
async def get_daily_summary(
    date_str: str,
    tz_offset: int = 0,
    current_user: AuthUser = Depends(get_current_user),
) -> DailySummary:
    """Return all meals for a given date with totals."""
    try:
        day = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format, use YYYY-MM-DD")

    # tz_offset is JS getTimezoneOffset(): positive = behind UTC (e.g. UTC-5 → 300)
    offset = timedelta(minutes=tz_offset)
    local_midnight = datetime(day.year, day.month, day.day)
    start = (local_midnight + offset).replace(tzinfo=timezone.utc).isoformat()
    end = (local_midnight + offset + timedelta(hours=24) - timedelta(seconds=1)).replace(tzinfo=timezone.utc).isoformat()

    db = get_db()
    rows = (
        db.table("meals")
        .select("*")
        .eq("user_id", current_user.id)
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
async def list_meals(
    offset: int = 0,
    limit: int = 20,
    current_user: AuthUser = Depends(get_current_user),
) -> list[Meal]:
    """Paginated meal history, newest first."""
    db = get_db()
    rows = (
        db.table("meals")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [Meal(**r) for r in rows.data]


@router.patch("/{meal_id}", response_model=Meal)
async def patch_meal(
    meal_id: str,
    body: PatchMealRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> Meal:
    """Update a meal's description and/or macros."""
    db = get_db()
    updates: dict = {}
    if body.description is not None:
        updates["description"] = body.description
    if body.macros is not None:
        updates["macros"] = body.macros.model_dump()
    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")
    row = (
        db.table("meals")
        .update(updates)
        .eq("id", meal_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    return Meal(**row.data[0])


@router.delete("/{meal_id}", status_code=204)
async def delete_meal(
    meal_id: str,
    current_user: AuthUser = Depends(get_current_user),
) -> None:
    db = get_db()
    db.table("meals").delete().eq("id", meal_id).eq("user_id", current_user.id).execute()
