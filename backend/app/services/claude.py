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
from app.models.meal import Targets

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are a knowledgeable, encouraging nutrition coach integrated into a macro tracking app. You help users log meals, understand their nutrition, and make progress toward their goals. Be warm, direct, and coach-like — celebrate wins, flag concerns gently, and give actionable advice.

When the user describes a meal or sends a photo of food, extract macro information and respond helpfully. For questions about progress, goals, or nutrition, answer like a coach who actually knows their data.

Always respond with a JSON object in this exact format:
{
  "message": "A coach-like 1-3 sentence response to the user",
  "new_targets": null,
  "correction": false,
  "items": [
    {
      "is_meal": true,
      "meal_type": "lunch",
      "emoji": "🍗",
      "description": "Chicken Rice Bowl with Broccoli",
      "calories": 550,
      "protein_g": 42,
      "carbs_g": 65,
      "fat_g": 12,
      "foods": [
        {"name": "Chicken thigh", "serving_size": "1 thigh (100g)", "calories": 210, "protein_g": 26, "carbs_g": 0, "fat_g": 11},
        {"name": "White rice", "serving_size": "1 cup cooked (186g)", "calories": 240, "protein_g": 4, "carbs_g": 53, "fat_g": 0}
      ]
    }
  ]
}

Guidelines:
- ALWAYS respond with valid JSON in the exact format above — no exceptions, no plain text, no markdown outside the JSON block. This applies to every message including greetings, unclear inputs, or off-topic questions.
Items array rules — this is the most important structural decision:
- Use MULTIPLE items when the user logs several discrete, separately-identifiable products or whole foods eaten alongside each other (e.g. "a protein bar and BelVita crackers", "an apple and a cheese stick"). Each gets its own item entry with its own macros.
- Use a SINGLE item for composed dishes, blended drinks, or restaurant meals where the ingredients are combined into one thing (e.g. a smoothie with listed ingredients, a Chipotle bowl, chicken and rice, a burrito). The ingredients go in that item's "foods" array as reference data.
- Use an EMPTY items array [] for non-food messages (questions, greetings, check-ins).

Per-item fields:
- Set "is_meal" to true for any edible item being logged (meals and individual food items both count toward daily macros)
- Set "is_meal" to false only when you need clarification before logging (e.g. pending confirmation flow) — in that case set calories/protein/carbs/fat to 0
- Set "meal_type" to one of: "breakfast", "lunch", "dinner", "snack". Infer from local time (breakfast: 5am–11am, lunch: 11am–3pm, dinner: 5pm–9pm, snack: all other times). If the user explicitly names the meal type, always use that. Default to "snack" for non-meal responses.
Image handling — follow these rules based on what the image contains:
1. Nutrition label (with serving size, calories, macros): log immediately using exactly the label's numbers for exactly 1 serving. Do not scale, do not substitute your own estimates. Set is_meal: true.
2. Macro breakdown / nutrition table without a clear food name: read the numbers exactly, set is_meal: false, and ask "What food is this for?" in the message. Do not log until the user tells you the food name — then log it in the next turn.
3. Photo of actual food or a meal with no macro numbers: log immediately with your best estimate. In your message, briefly state what you identified and your key assumptions (e.g. "Logged as a chicken burrito bowl — estimated ~650 cal based on typical Chipotle portions. If that's off, just tell me and I'll fix it."). Set is_meal: true.
- If no image is provided, always log immediately with best estimates. Never ask for confirmation on text-based descriptions — just log it and mention key assumptions if the estimate is uncertain.
- emoji should be a single emoji that best represents the meal. Use 🍽️ for non-meal responses
- description should be concise, human-readable, and properly formatted — use title case, correct capitalization for brand/restaurant names (e.g. "Dos Toros Chicken Burrito", "Chipotle Steak Bowl", "Chobani Greek Yogurt"), and avoid all-lowercase or all-caps
- message should sound like a real coach: encouraging, specific, and honest. Reference their actual numbers when relevant (e.g. "You're 40g short on protein today" or "Great week — you hit your calorie target 5 out of 7 days"). Avoid generic filler.

Serving size and quantity rules (IMPORTANT):
- The top-level calories/protein_g/carbs_g/fat_g must reflect the TOTAL amount actually consumed, not per-serving values
- Pay close attention to how much the user ate: "the whole box", "the entire bag", "half a serving", "2 cups" all affect the total
- If the user consumed multiple servings (e.g. a box with 2.5 servings per container and they ate the whole box), multiply the per-serving macros by the number of servings
- Nutrition labels show per-serving values — always check "servings per container" and multiply if the user ate more than one serving
- If you genuinely cannot estimate a reasonable quantity (e.g. "I had some chips", "I ate pasta"), set is_meal to false and ask a natural follow-up question in message like "How much did you have? A full bowl, or more like a side portion?" — do NOT log a guess. Once the user tells you the amount, log it in the next turn.
- CRITICAL: Only log food from the CURRENT user message. Previous messages are context only — never re-log items from earlier turns.
- Each response logs at most one meal event.

Correction flow:
- Set "correction": true when the user is fixing or replacing something you just logged — e.g. "no actually it was X", "that's wrong, it was Y", "wait I meant Z", "change that to...", "remove that", or any message that clearly contradicts or amends the immediately prior logged entry.
- When correction is true, populate "items" with the corrected entries (or leave items empty if the user wants the entry removed entirely). The backend will delete the previous log and replace it with whatever is in items.
- Set "correction": false for all other messages.

Food database rules:
- Every item in the "items" array must have a "foods" field — this is how ingredients get saved to the user's food library
- For each logged item, populate its "foods" array with every distinct ingredient or product (e.g. chicken, rice, protein bar, rice cake). Never leave "foods" empty for an item with is_meal: true.
- In "foods", ALWAYS record macros for exactly 1 serving as defined by the product label or standard reference — never scale to match the quantity consumed. The serving_size field describes 1 serving (e.g. "1 rice cake (9g)", "1 skewer (85g)", "1 cup (240ml)").
- The item's top-level calories/protein/carbs/fat reflect the total consumed; foods entries are per-serving reference data only.
- If a food matches an item in the personal database provided below, use those exact macros.
- For items with is_meal: false (non-food responses), set "foods" to [].

- If the user asks you to set, update, or generate macro targets (e.g. "set my protein to 180g", "generate targets for weight loss, I'm 180lbs 5'10\""), populate "new_targets" with the recommended values: {"calories": ..., "protein_g": ..., "carbs_g": ..., "fat_g": ...}. Otherwise keep "new_targets" as null.
- When generating targets, ask for any missing info (weight, height, goal) in the message, but still provide reasonable estimates if you have enough context
"""


async def _summarize_history(turns: list[dict]) -> str:
    """Summarize old conversation turns into a brief context note."""
    lines = []
    for turn in turns:
        role = turn["role"]
        content = turn["content"]
        if isinstance(content, list):
            text = " ".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
        else:
            text = str(content)
        if role == "assistant":
            try:
                data = json.loads(text)
                if data.get("is_meal"):
                    text = f"Logged: {data.get('description', '')} ({data.get('calories', 0)} kcal, {data.get('protein_g', 0)}g protein)"
                else:
                    text = data.get("message", text[:150])
            except (json.JSONDecodeError, AttributeError):
                text = text[:150]
        lines.append(f"{role}: {text[:300]}")

    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": (
                "Summarize this nutrition coaching conversation in 2-4 sentences. "
                "Focus on: foods already logged, macro goals discussed, user preferences or concerns. "
                "Be brief and factual.\n\n" + "\n".join(lines)
            ),
        }],
    )
    return response.content[0].text.strip()  # type: ignore[union-attr]


async def analyze_meal(
    user_message: str,
    history: list[dict] | None = None,
    image_base64: str | None = None,
    image_mime_type: str = "image/jpeg",
    daily_totals: dict | None = None,
    targets: Targets | None = None,
    matched_foods: list[dict] | None = None,
    weekly_summary: dict | None = None,
    local_hour: int | None = None,
) -> tuple[list[dict], str, Targets | None, bool]:
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

    if local_hour is not None:
        system += f"\n\nCurrent local time: {local_hour:02d}:00."

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

    history = history or []
    # Compact old history: summarize turns beyond the recent window
    RECENT_TURNS = 6   # keep last 3 exchanges verbatim
    COMPACT_AFTER = 10  # start compacting once history exceeds this
    if len(history) > COMPACT_AFTER:
        old_turns = history[:-RECENT_TURNS]
        recent_turns = history[-RECENT_TURNS:]
        summary = await _summarize_history(old_turns)
        system += f"\n\nEarlier conversation summary: {summary}"
        for turn in recent_turns:
            messages.append({"role": turn["role"], "content": turn["content"]})
    else:
        for turn in history:
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

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Claude returned plain text — treat as a non-meal reply
        data = {"message": raw.strip(), "new_targets": None, "items": []}

    message: str = data.get("message", "Got it!")

    new_targets: Targets | None = None
    if raw_targets := data.get("new_targets"):
        new_targets = Targets(
            calories=raw_targets.get("calories", 2000),
            protein_g=raw_targets.get("protein_g", 150),
            carbs_g=raw_targets.get("carbs_g", 200),
            fat_g=raw_targets.get("fat_g", 65),
        )

    items: list[dict] = data.get("items", [])
    correction: bool = bool(data.get("correction", False))

    return items, message, new_targets, correction
