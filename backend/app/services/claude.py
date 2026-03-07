"""
Claude service — handles all Anthropic API communication.

Claude is given the user's message (and optional image) and returns
structured macro information plus a friendly response.
"""

import asyncio
import json
import base64
import anthropic
from app.config import settings
from app.models.meal import Macros, Targets

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are a knowledgeable, encouraging nutrition coach integrated into a macro tracking app. You help users log meals, understand their nutrition, and make progress toward their goals. Be warm, direct, and coach-like — celebrate wins, flag concerns gently, and give actionable advice.

When the user describes a meal or sends a photo of food, extract macro information and respond helpfully. For questions about progress, goals, or nutrition, answer like a coach who actually knows their data.

Always respond with a JSON object in this exact format:
{
  "is_meal": true,
  "emoji": "🍗",
  "description": "Brief, clear meal name (e.g. 'Chicken rice bowl with broccoli')",
  "calories": 550,
  "protein_g": 42,
  "carbs_g": 65,
  "fat_g": 12,
  "message": "A coach-like 1-3 sentence response to the user",
  "new_targets": null,
  "foods": [
    {"name": "Chicken thigh", "serving_size": "1 thigh (100g)", "calories": 210, "protein_g": 26, "carbs_g": 0, "fat_g": 11},
    {"name": "White rice", "serving_size": "1 cup cooked (186g)", "calories": 240, "protein_g": 4, "carbs_g": 53, "fat_g": 0}
  ]
}

Guidelines:
- Set "is_meal" to true only if the user is clearly logging food or a drink with nutritional value
- Set "is_meal" to false for questions, check-ins, or anything where no food is being logged — in that case set calories/protein/carbs/fat to 0
- Estimate macros as accurately as possible based on typical serving sizes
- If an image is provided, use it to inform your estimates
- emoji should be a single emoji that best represents the meal. Use 🍽️ for non-meal responses
- description should be concise and human-readable
- message should sound like a real coach: encouraging, specific, and honest. Reference their actual numbers when relevant (e.g. "You're 40g short on protein today" or "Great week — you hit your calorie target 5 out of 7 days"). Avoid generic filler.

Serving size and quantity rules (IMPORTANT):
- The top-level calories/protein_g/carbs_g/fat_g must reflect the TOTAL amount actually consumed, not per-serving values
- Pay close attention to how much the user ate: "the whole box", "the entire bag", "half a serving", "2 cups" all affect the total
- If the user consumed multiple servings (e.g. a box with 2.5 servings per container and they ate the whole box), multiply the per-serving macros by the number of servings
- Nutrition labels show per-serving values — always check "servings per container" and multiply if the user ate more than one serving
- When uncertain about quantity, ask in your message and make a reasonable assumption

Food database rules:
- Always populate "foods" with each distinct food item in a logged meal (packaged products, whole foods, beverages, etc)
- In the "foods" array, ALWAYS record macros for exactly 1 serving (not the total consumed). The serving_size field describes what 1 serving is (e.g. "1 cup (240ml)", "1 bag (28g)", "3 pieces (85g)")
- The top-level totals reflect what was eaten; the foods array reflects the per-serving reference data
- If a food matches an item in the personal database provided below, use those exact macros. Set "foods" to [] for non-meal responses.

- If the user asks you to set, update, or generate macro targets (e.g. "set my protein to 180g", "generate targets for weight loss, I'm 180lbs 5'10\""), populate "new_targets" with the recommended values: {"calories": ..., "protein_g": ..., "carbs_g": ..., "fat_g": ...}. Otherwise keep "new_targets" as null.
- When generating targets, ask for any missing info (weight, height, goal) in the message, but still provide reasonable estimates if you have enough context
"""


async def analyze_meal(
    user_message: str,
    history: list[dict] | None = None,
    image_base64: str | None = None,
    image_mime_type: str = "image/jpeg",
    daily_totals: dict | None = None,
    targets: Targets | None = None,
    matched_foods: list[dict] | None = None,
    weekly_summary: dict | None = None,
) -> tuple[Macros, str, str, str, bool, Targets | None, list[dict]]:
    system = SYSTEM_PROMPT

    if matched_foods:
        system += (
            f"\n\nPersonal food database — items that may match this message:\n"
            f"{json.dumps(matched_foods, indent=2)}\n"
            "If the user is eating any of these, use their exact macros and include them in \"foods\"."
        )

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
            f"{targets.fat_g:.0f}g fat."
        )

    if weekly_summary:
        lines = []
        for day, totals in weekly_summary.items():
            lines.append(
                f"  {day}: {totals['calories']:.0f} kcal, "
                f"{totals['protein_g']:.0f}g P, "
                f"{totals['carbs_g']:.0f}g C, "
                f"{totals['fat_g']:.0f}g F"
            )
        system += "\n\nLast 7 days (days with no entry had no meals logged):\n" + "\n".join(lines)

    messages: list = []

    # Include previous turns (last 10 messages = 5 exchanges)
    for turn in (history or [])[-10:]:
        messages.append({"role": turn["role"], "content": turn["content"]})

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
    messages.append({"role": "user", "content": user_content})

    # Retry up to 5 times on transient overload errors (529)
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=system,
                messages=messages,  # type: ignore[arg-type]
            )
            break
        except anthropic.InternalServerError as e:
            last_error = e
            if attempt < 4:
                await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s, 8s
    else:
        raise last_error  # type: ignore[misc]

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
    emoji: str = data.get("emoji", "🍽️")
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

    foods_data: list[dict] = data.get("foods", [])

    return macros, description, emoji, message, is_meal, new_targets, foods_data
