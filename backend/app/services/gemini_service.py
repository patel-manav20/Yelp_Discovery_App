"""
Google Gemini REST client (httpx). Used for:
1) JSON filter extraction from the user message (+ optional chat history)
2) Final conversational reply text

---------------------------------------------------------------------------
INTERNAL PROMPT TEMPLATE #1 — FILTER EXTRACTION (JSON mode)
---------------------------------------------------------------------------
You are given RECENT_CHAT (optional) and the USER_MESSAGE.

Return ONLY a JSON object with these keys (use null when unknown):
  "cuisine": string|null,
  "dietary": string|null,
  "price": integer 1-4|null (dollar buckets),
  "ambiance": string|null,
  "occasion": string|null (e.g. date night, family, study),
  "location": string|null (city or neighborhood),
  "timing": string|null (e.g. lunch, late night),
  "keywords": string[] (extra food or vibe words)

Rules:
- Infer only what the user implied; do not invent a city unless they said it.
- If they refine a previous message, merge intent with the conversation.
- Output valid JSON only, no markdown.

The prompt sent to the API wraps:
  RECENT_CHAT + USER_MESSAGE inside this instruction block.

---------------------------------------------------------------------------
INTERNAL PROMPT TEMPLATE #2 — REPLY GENERATION (plain text)
---------------------------------------------------------------------------
You are a friendly restaurant discovery helper for a college-town app.

USER_PREFERENCES: (saved cuisines, default city, price hint — may be empty)
APPLIED_FILTERS: (structured filters we used to search)
TOP_RECOMMENDATIONS: numbered list of name, city, rating, review count, source (local vs Yelp idea)

Write 2–4 short sentences:
- Acknowledge what they asked.
- Mention 1–3 standout spots from TOP_RECOMMENDATIONS by name.
- If results are thin, say so honestly and suggest broadening filters.
- Do not claim you booked a table or read menus you were not given.
- No markdown bullets; plain sentences.

The API receives a single user message string built from the above sections.
"""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.ai_chat_schema import ParsedSearchFilters
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate


def _gemini_endpoint() -> tuple[str, str] | None:
    key = (settings.gemini_api_key or "").strip()
    if not key:
        return None
    model = (settings.gemini_model or "gemini-2.0-flash").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    return url, key


def _extract_text_from_response(data: dict[str, Any]) -> str | None:
    try:
        cands = data.get("candidates")
        if not cands or not isinstance(cands, list):
            return None
        content = cands[0].get("content") or {}
        parts = content.get("parts") or []
        if not parts:
            return None
        text = parts[0].get("text")
        return text if isinstance(text, str) else None
    except (IndexError, KeyError, TypeError):
        return None


def call_gemini(
    prompt: str,
    *,
    json_mode: bool = False,
    temperature: float = 0.4,
) -> str | None:
    """Returns model text or None if API key missing / request failed."""
    ep = _gemini_endpoint()
    if not ep:
        return None
    url, key = ep

    body: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 1024,
        },
    }
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    try:
        with httpx.Client(timeout=45.0) as client:
            r = client.post(url, params={"key": key}, json=body)
    except httpx.RequestError:
        return None

    if r.status_code != 200:
        return None

    try:
        data = r.json()
    except ValueError:
        return None

    return _extract_text_from_response(data)


def _coerce_keywords(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.append(x.strip())
        elif isinstance(x, (int, float)):
            s = str(x).strip()
            if s:
                out.append(s)
    return out[:20]


def _strip_json_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```\w*\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def build_filter_extraction_prompt(*, recent_chat: str, user_message: str) -> str:
    return (
        "Return ONLY a JSON object with keys: cuisine, dietary, price (1-4 or null), "
        "ambiance, occasion, location, timing, keywords (array of strings). "
        "Use null when unknown.\n\n"
        f"RECENT_CHAT:\n{recent_chat or '(none)'}\n\n"
        f"USER_MESSAGE:\n{user_message}"
    )


def build_reply_prompt(
    *,
    user_preferences_summary: str,
    applied_filters_json: str,
    recommendations_summary: str,
    web_search_summary: str = "",
) -> str:
    web_context = web_search_summary.strip() or "(none)"
    return (
        "You are a friendly restaurant discovery helper for a college-town app.\n\n"
        f"USER_PREFERENCES:\n{user_preferences_summary}\n\n"
        f"APPLIED_FILTERS:\n{applied_filters_json}\n\n"
        f"TOP_RECOMMENDATIONS:\n{recommendations_summary}\n\n"
        f"WEB_SEARCH_CONTEXT:\n{web_context}\n\n"
        "Write 2–4 short plain-text sentences (no markdown lists). "
        "Reference specific restaurant names from TOP_RECOMMENDATIONS when helpful. "
        "Use WEB_SEARCH_CONTEXT only as supplemental context; if uncertain, say so."
    )


def parse_filters_from_llm_output(raw: str | None) -> ParsedSearchFilters:
    if not raw:
        return ParsedSearchFilters()
    text = _strip_json_fence(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return ParsedSearchFilters()
    if not isinstance(data, dict):
        return ParsedSearchFilters()
    raw_price = data.get("price")
    price_val: int | None = None
    if raw_price is not None:
        try:
            p = int(float(raw_price))
            if 1 <= p <= 4:
                price_val = p
        except (TypeError, ValueError):
            price_val = None

    try:
        return ParsedSearchFilters.model_validate(
            {
                "cuisine": data.get("cuisine"),
                "dietary": data.get("dietary"),
                "price": price_val,
                "ambiance": data.get("ambiance"),
                "occasion": data.get("occasion"),
                "location": data.get("location"),
                "timing": data.get("timing"),
                "keywords": _coerce_keywords(data.get("keywords")),
            }
        )
    except Exception:
        return ParsedSearchFilters()


def extract_filters(*, recent_chat: str, user_message: str) -> ParsedSearchFilters:
    parser = PydanticOutputParser(pydantic_object=ParsedSearchFilters)
    template = (
        "Return ONLY a JSON object with these keys when known, and use null when unknown.\n"
        "Keys: cuisine, dietary, price (1-4), ambiance, occasion, location, timing, keywords.\n\n"
        "{format_instructions}\n\n"
        "RECENT_CHAT:\n{recent_chat}\n\n"
        "USER_MESSAGE:\n{user_message}"
    )
    prompt = (
        PromptTemplate(
            input_variables=["recent_chat", "user_message"],
            template=template,
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        .format(recent_chat=recent_chat or "(none)", user_message=user_message)
    )

    out = call_gemini(prompt, json_mode=True, temperature=0.2)
    if out is None:
        return ParsedSearchFilters()

    stripped = _strip_json_fence(out)
    try:
        return parser.parse(stripped)
    except Exception:
        return parse_filters_from_llm_output(stripped)


def generate_reply_text(*, reply_prompt: str) -> str | None:
    return call_gemini(reply_prompt, json_mode=False, temperature=0.7)
