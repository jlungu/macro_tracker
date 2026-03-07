from datetime import datetime
from pydantic import BaseModel, UUID4


class Macros(BaseModel):
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


class Targets(BaseModel):
    calories: float = 2000
    protein_g: float = 150
    carbs_g: float = 200
    fat_g: float = 65


class Meal(BaseModel):
    id: UUID4
    created_at: datetime
    description: str
    emoji: str = "🍽️"
    macros: Macros
    image_url: str | None = None
    raw_input: str
    notes: str | None = None


class FoodItem(BaseModel):
    id: UUID4 | None = None
    name: str
    serving_size: str
    macros: Macros
    use_count: int = 1


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class LogMealRequest(BaseModel):
    message: str
    image_base64: str | None = None
    image_mime_type: str | None = None
    history: list[HistoryMessage] = []
    tz_offset: int = 0  # JS getTimezoneOffset(): positive = behind UTC (e.g. UTC-5 → 300)
    log_date: str | None = None  # YYYY-MM-DD override for backdating meals


class LogMealResponse(BaseModel):
    meal: Meal | None = None
    claude_message: str
    new_targets: Targets | None = None


class PatchMealRequest(BaseModel):
    description: str | None = None
    macros: Macros | None = None


class DailySummary(BaseModel):
    date: str
    meals: list[Meal]
    totals: Macros
