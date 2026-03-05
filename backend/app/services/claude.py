"""
Claude service — handles all Anthropic API communication.

Claude is given the user's message (and optional image) and returns
structured macro information plus a friendly response.
"""

import json
import base64
import anthropic
from app.config import settings
from app.models.meal import Macros, Targets

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are a nutrition assistant integrated into a macro tracking app.

When the user describes a meal or sends a photo of food, extract macro information and respond helpfully.

Always respond with a JSON object in this exact format:
{
  "is_meal": true,
  "description": "Brief, clear meal name (e.g. 'Chicken rice bowl with broccoli')",
  "calories": 550,
  "protein_g": 42,
  "carbs_g": 65,
  "fat_g": 12,
  "message": "A friendly 1-2 sentence response to the user",
  "new_targets": null
}

Guidelines:
- Set "is_meal" to true only if the user is clearly logging food or a drink with nutritional value
- Set "is_meal" to false for greetings, questions, or anything with no food being logged — in that case set calories/protein/carbs/fat to 0
- Estimate macros as accurately as possible based on typical serving sizes
- If an image is provided, use it to inform your estimates
- description should be concise and human-readable
- message should be encouraging and informative
- If the user asks you to set, update, or generate macro targets (e.g. "set my protein to 180g", "generate targets for weight loss, I'm 180lbs 5'10\""), populate "new_targets" with the recommended values: {"calories": ..., "protein_g": ..., "carbs_g": ..., "fat_g": ...}. Otherwise keep "new_targets" as null.
- When generating targets, ask for any missing info (weight, height, goal) in the message, but still provide reasonable estimates if you have enough context
"""


async def analyze_meal(
    user_message: str,
    image_base64: str | None = None,
    image_mime_type: str = "image/jpeg",
    daily_totals: dict | None = None,
    targets: Targets | None = None,
) -> tuple[Macros, str, str, bool, Targets | None]:
    """
    Returns (macros, description, claude_message, is_meal).
    """
    system = SYSTEM_PROMPT
    if daily_totals:
        system += (
            f"\n\nToday's logged macros so far: "
            f"{daily_totals['calories']:.0f} kcal, "
            f"{daily_totals['protein_g']:.0f}g protein, "
            f"{daily_totals['carbs_g']:.0f}g carbs, "
            f"{daily_totals['fat_g']:.0f}g fat."
        )
    if targets:
        system += (
            f" Daily targets: {targets.calories:.0f} kcal, "
            f"{targets.protein_g:.0f}g protein, "
            f"{targets.carbs_g:.0f}g carbs, "
            f"{targets.fat_g:.0f}g fat. "
            "Use both to answer questions about remaining macros or progress."
        )

    content: list[anthropic.types.MessageParam] = []  # type: ignore[type-arg]

    user_content: list = []

    if image_base64:
        user_content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_mime_type,
                    "data": image_base64,
                },
            }
        )

    user_content.append({"type": "text", "text": user_message or "What macros are in this meal?"})

    content = [{"role": "user", "content": user_content}]  # type: ignore[assignment]

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=system,
        messages=content,  # type: ignore[arg-type]
    )

    raw = response.content[0].text  # type: ignore[union-attr]

    # Strip markdown code fences if present
    if raw.strip().startswith("```"):
        raw = raw.strip().lstrip("`").split("\n", 1)[-1].rsplit("```", 1)[0]

    data = json.loads(raw)

    macros = Macros(
        calories=data.get("calories", 0),
        protein_g=data.get("protein_g", 0),
        carbs_g=data.get("carbs_g", 0),
        fat_g=data.get("fat_g", 0),
    )
    description: str = data.get("description", user_message[:120])
    message: str = data.get("message", "Meal logged!")
    is_meal: bool = bool(data.get("is_meal", True))

    new_targets: Targets | None = None
    if raw_targets := data.get("new_targets"):
        new_targets = Targets(
            calories=raw_targets.get("calories", 2000),
            protein_g=raw_targets.get("protein_g", 150),
            carbs_g=raw_targets.get("carbs_g", 200),
            fat_g=raw_targets.get("fat_g", 65),
        )

    return macros, description, message, is_meal, new_targets
