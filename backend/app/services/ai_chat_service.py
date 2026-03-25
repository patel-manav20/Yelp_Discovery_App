"""Orchestrates AI chat: prefs, Gemini filters, MySQL search, Yelp supplement, ranking, Gemini reply, persistence."""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import AppHTTPException
from app.models.chat_message import ChatMessage, ChatMessageRole
from app.models.chat_session import ChatSession
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import User
from app.schemas.ai_chat_schema import (
    AIChatRequest,
    AIChatResponse,
    AIRecommendationItem,
    ParsedSearchFilters,
)
from app.schemas.chat_schema import ChatSessionResponse, ChatSessionWithMessages, ChatMessageResponse
from app.services import gemini_service, tavily_service, yelp_fusion_service
from app.services.preference_service import get_or_create_preference
from app.services.ranking_service import RankableCandidate, candidate_to_api_dict, rank_candidates
from app.services.restaurant_service import _filter_conditions
from app.utils.open_now import tz_for_search_city, yelp_hours_open_now


def _extract_restaurant_open_query(message: str) -> tuple[str, str] | None:
    """
    Extract (restaurant_name, city) from messages like:
      - "is masala pizza in san jose open"
      - "is pizza place open in san jose"
    """
    text = (message or "").strip()
    if not text:
        return None

    lower = text.lower()
    if "open" not in lower and "hour" not in lower:
        return None

    patterns: list[tuple[str, int, int]] = [
        (r"is\s+(.+?)\s+in\s+(.+?)\s+open", 1, 2),
        (r"(.+?)\s+in\s+(.+?)\s+open", 1, 2),
        (r"is\s+(.+?)\s+open\s+in\s+(.+?)(?:\?|$)", 1, 2),
        (r"(.+?)\s+open\s+in\s+(.+?)(?:\?|$)", 1, 2),
    ]

    for pat, name_group, city_group in patterns:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if not m:
            continue
        name = (m.group(name_group) or "").strip()
        city = (m.group(city_group) or "").strip()
        if name and city:
            city = re.sub(r"\s+(open|hours)\s*$", "", city, flags=re.IGNORECASE).strip()
            return name, city

    return None


def _build_open_now_reply_prompt(*, restaurant_name: str, city: str, web_context: str) -> str:
    return (
        "Answer this question for a restaurant discovery app.\n\n"
        f"QUESTION: Is {restaurant_name} in {city} open right now?\n\n"
        f"WEB_CONTEXT (may include hours):\n{web_context or '(none)'}\n\n"
        "Return exactly one of these first words: OPEN, CLOSED, or UNKNOWN.\n"
        "Then add one short sentence explaining briefly based on WEB_CONTEXT.\n"
        "Do not invent hours."
    )


def _extract_recommendation_count(message: str) -> int | None:
    """
    Detect “one / top pick / #1” style requests so we can return fewer cards.
    Examples:
      - "best one restaurant in fremont" -> 1
      - "top 3 restaurants in san jose" -> 3
    """
    text = (message or "").strip().lower()
    if not text:
        return None

    if any(k in text for k in ["best one", "top pick", "one best", "just one", "only one", "#1", "number 1", "first choice"]):
        return 1

    if (
        ("best" in text or "top" in text)
        and ("restaurant" in text or "resturent" in text or "place" in text)
        and (" in " in text or " near " in text)
    ):
        return 1

    m = re.search(r"\b(\d{1,2})\s+(restaurants|places)\b", text)
    if m:
        try:
            n = int(m.group(1))
            if 1 <= n <= 5:
                return n
        except Exception:
            return None

    return None


def _extract_city_from_message(message: str) -> str | None:
    """
    Lightweight location extraction for patterns like:
      - "best restaurant in fremont"
      - "restaurants near san jose"
    """
    text = (message or "").strip()
    if not text:
        return None
    lower = text.lower()

    m = re.search(r"\b(?:in|near)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\b", lower)
    if not m:
        return None

    city = (m.group(1) or "").strip()
    if not city or city in {"open", "hours", "hour", "restaurant", "restaurants"}:
        return None

    return " ".join(w.capitalize() for w in city.split())


def _extract_restaurant_query_for_rating(message: str) -> str | None:
    text = (message or "").strip()
    if not text:
        return None
    lower = text.lower()
    if not any(k in lower for k in ("rating", "ratings", "review", "reviews")):
        return None

    patterns = [
        r"(?:ratings?|reviews?)\s+(?:of|for|on|about)\s+(.+)$",
        r"(.+?)\s+(?:ratings?|reviews?)$",
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.IGNORECASE)
        if not m:
            continue
        target = re.sub(r"[?.!,;:]+$", "", m.group(1)).strip(" \"'")
        if target:
            return target[:120]
    return None


def _find_restaurant_by_name(db: Session, query: str) -> Restaurant | None:
    q = query.strip().lower()
    if not q:
        return None
    rows = list(
        db.scalars(
            select(Restaurant)
            .where(Restaurant.is_active.is_(True), func.lower(Restaurant.name).like(f"%{q}%"))
            .options(selectinload(Restaurant.photos))
            .limit(25)
        ).unique()
    )
    if not rows:
        return None

    exact = next((r for r in rows if (r.name or "").strip().lower() == q), None)
    if exact is not None:
        return exact
    starts = next((r for r in rows if (r.name or "").strip().lower().startswith(q)), None)
    if starts is not None:
        return starts
    rows.sort(key=lambda r: len(r.name or ""))
    return rows[0]


def _build_rating_reply(db: Session, restaurant: Restaurant) -> str:
    stmt = (
        select(Review)
        .where(Review.restaurant_id == restaurant.id)
        .options(selectinload(Review.user))
        .order_by(Review.created_at.desc())
    )
    reviews = list(db.scalars(stmt).unique().all())
    count = len(reviews)
    avg = float(restaurant.average_rating or 0.0)
    local_review_count = count
    web_review_count = int(getattr(restaurant, "review_count", 0) or 0)
    title = f"Ratings for {restaurant.name} ({restaurant.city}{', ' + restaurant.state if restaurant.state else ''})"
    display_review_count = (
        web_review_count
        if local_review_count == 0 and web_review_count > 0
        else local_review_count
    )
    summary = (
        f"Average rating: {avg:.2f}/5 from {display_review_count} review"
        f"{'s' if display_review_count != 1 else ''}."
    )

    if local_review_count == 0:
        web_hits = tavily_service.search_web_context(
            f"{restaurant.name} {restaurant.city} reviews rating",
            max_results=3,
        )
        web_context = _format_web_context(web_hits)
        extra = "No review texts are saved in this app yet."
        if web_review_count > 0:
            extra = f"No review texts are saved in this app yet. Yelp shows {web_review_count} reviews."
        if web_context:
            extra = f"{extra}\n\nWeb highlights:\n{web_context}"
        return f"{title}\n{summary}\n{extra}"

    lines = [title, summary, "", "Reviews:"]
    for i, rev in enumerate(reviews, start=1):
        author = (rev.user.display_name if rev.user else None) or "Anonymous"
        body = (rev.body or "").strip()
        body_part = f" — {body}" if body else ""
        lines.append(f"{i}. {rev.rating}/5 by {author}{body_part}")
    return "\n".join(lines)


def _heuristic_filters(message: str) -> ParsedSearchFilters:
    words = re.findall(r"\w+", message.lower())
    stop = {
        "the",
        "a",
        "an",
        "for",
        "and",
        "with",
        "near",
        "me",
        "i",
        "im",
        "find",
        "want",
        "some",
        "good",
        "best",
        "place",
        "restaurant",
        "food",
        "help",
        "please",
        "looking",
    }
    kws = [w for w in words if w not in stop and len(w) > 1][:10]
    return ParsedSearchFilters(keywords=kws)


def _format_recent_chat(messages: list[ChatMessage], max_messages: int = 8) -> str:
    tail = messages[-max_messages:] if len(messages) > max_messages else messages
    lines: list[str] = []
    for m in tail:
        lines.append(f"{m.role.value}: {m.content[:800]}")
    return "\n".join(lines)


def _format_recent_conversation_history(
    conversation_history: list[Any], max_messages: int = 8
) -> str:
    tail = (
        conversation_history[-max_messages:]
        if len(conversation_history) > max_messages
        else conversation_history
    )
    lines: list[str] = []
    for t in tail:
        role = getattr(t, "role", None) or (t.get("role") if isinstance(t, dict) else None) or "user"
        content = getattr(t, "content", None) or (t.get("content") if isinstance(t, dict) else None) or ""
        lines.append(f"{role}: {str(content)[:800]}")
    return "\n".join(lines)


def _merge_with_preferences(parsed: ParsedSearchFilters, pref_row) -> ParsedSearchFilters:
    """Fill gaps from `user_preferences` row (may be empty defaults)."""
    data = parsed.model_dump()
    if data.get("location") is None and pref_row.default_city:
        data["location"] = pref_row.default_city
    if data.get("price") is None and pref_row.price_level is not None:
        data["price"] = pref_row.price_level
    kws = list(data.get("keywords") or [])
    if pref_row.cuisine_tags:
        for c in pref_row.cuisine_tags[:5]:
            if c and c not in kws:
                kws.append(c)
    data["keywords"] = kws
    return ParsedSearchFilters.model_validate(data)


def _applied_filters_dict(f: ParsedSearchFilters) -> dict[str, Any]:
    d = f.model_dump()
    return {k: v for k, v in d.items() if v is not None and v != []}


def _restaurant_to_candidate(r: Restaurant) -> RankableCandidate:
    tags = list(r.cuisine_tags) if r.cuisine_tags else []
    dietary = " ".join(r.dietary_tags or []) if getattr(r, "dietary_tags", None) else ""
    ambiance = " ".join(r.ambiance_tags or []) if getattr(r, "ambiance_tags", None) else ""
    raw = f"{r.name} {r.description or ''} {' '.join(tags)} {dietary} {ambiance} {r.city}"
    return RankableCandidate(
        local_id=r.id,
        name=r.name,
        city=r.city,
        state=r.state,
        average_rating=float(r.average_rating),
        review_count=int(r.review_count),
        price_level=r.price_level,
        cuisine_tags=tags,
        source="local",
        yelp_business_id=r.yelp_business_id,
        raw_text=raw,
    )


def _yelp_search_hit_to_candidate(b: dict[str, Any]) -> RankableCandidate | None:
    if not isinstance(b, dict):
        return None
    yid = b.get("id")
    if not yid:
        return None
    loc = b.get("location") if isinstance(b.get("location"), dict) else {}
    city = (loc.get("city") or "Unknown").strip()
    state = (loc.get("state") or "").strip() or None
    name = (b.get("name") or "Unknown").strip()
    try:
        rating = float(b.get("rating") or 0.0)
    except (TypeError, ValueError):
        rating = 0.0
    try:
        rc = int(b.get("review_count") or 0)
    except (TypeError, ValueError):
        rc = 0
    cats = b.get("categories") or []
    tags: list[str] = []
    if isinstance(cats, list):
        for c in cats:
            if isinstance(c, dict) and c.get("title"):
                tags.append(str(c["title"]).strip())
    price = yelp_fusion_service.yelp_price_to_level(
        b.get("price") if isinstance(b.get("price"), str) else None
    )
    raw = f"{name} {' '.join(tags)} {city}"
    return RankableCandidate(
        local_id=None,
        name=name,
        city=city,
        state=state,
        average_rating=max(0.0, min(5.0, rating)),
        review_count=max(0, rc),
        price_level=price,
        cuisine_tags=tags,
        source="yelp_supplemental",
        yelp_business_id=str(yid),
        raw_text=raw,
    )


def _fetch_local_candidates(db: Session, f: ParsedSearchFilters, user_message: str) -> list[RankableCandidate]:
    kw_parts: list[str] = []
    if f.keywords:
        kw_parts.extend(f.keywords)
    if f.occasion:
        kw_parts.append(f.occasion)
    if f.timing:
        kw_parts.append(f.timing)
    keyword_join = " ".join(kw_parts) if kw_parts else None
    query_main = user_message[:200].strip() if not f.keywords else " ".join(f.keywords[:10])

    from app.utils.filters import parse_restaurant_search_params

    params = parse_restaurant_search_params(
        query=query_main,
        city=f.location,
        zip=None,
        cuisine=f.cuisine,
        keyword=keyword_join,
        price=f.price,
        rating=None,
        dietary=f.dietary,
        ambiance=f.ambiance,
        sort_by="rating_desc",
        page=1,
        limit=40,
    )
    conds = _filter_conditions(params)
    stmt = (
        select(Restaurant)
        .where(*conds)
        .options(selectinload(Restaurant.photos))
        .limit(40)
    )
    rows = list(db.scalars(stmt).unique().all())
    return [_restaurant_to_candidate(r) for r in rows]


def _yelp_supplement(
    f: ParsedSearchFilters,
    user_message: str,
    local_yelp_ids: set[str],
    limit: int = 8,
) -> list[RankableCandidate]:
    term_parts = [f.cuisine, " ".join(f.keywords[:4]), user_message[:40]]
    term = next((t.strip() for t in term_parts if t and str(t).strip()), "restaurants")
    loc = f.location or "United States"
    hits = yelp_fusion_service.search_yelp_businesses(term=term, location=loc, limit=limit + 5)
    out: list[RankableCandidate] = []
    for b in hits:
        c = _yelp_search_hit_to_candidate(b)
        if c is None or not c.yelp_business_id:
            continue
        if c.yelp_business_id in local_yelp_ids:
            continue
        out.append(c)
        if len(out) >= limit:
            break
    return out


def _fallback_reply(user_message: str, names: list[str]) -> str:
    if names:
        joined = ", ".join(names[:3])
        return (
            f'I searched based on what you said: "{user_message[:120]}". '
            f"Here are a few picks to check out: {joined}. "
            "Open a listing for hours, photos, and reviews."
        )
    return (
        "I could not find strong matches in the database for that request. "
        "Try naming a cuisine or neighborhood, or widen your price range."
    )


def _build_tavily_query(user_message: str, top: list[RankableCandidate]) -> str:
    if top:
        names = ", ".join(c.name for c in top[:3] if c.name)
        q = f"{user_message.strip()} {names}".strip()
        return q[:220]
    return user_message.strip()[:220]


def _format_web_context(items: list[dict[str, str]]) -> str:
    if not items:
        return ""
    lines: list[str] = []
    for i, it in enumerate(items, start=1):
        title = (it.get("title") or "Untitled").strip()
        url = (it.get("url") or "").strip()
        content = (it.get("content") or "").strip()
        lines.append(f"{i}. {title} | {url}\n{content}")
    return "\n\n".join(lines)


def _build_recommendation_reason(
    candidate: RankableCandidate,
    *,
    merged_filters: ParsedSearchFilters,
    user_message: str,
    pref_row,
) -> str:
    """
    Build a short deterministic reason for the UI card.
    This is not model "reasoning"—it is derived from the applied filters + candidate data.
    """

    def _nice_val(v: str) -> str:
        return str(v).strip().replace("_", " ")

    def _price_to_dollars(level: int | None) -> str | None:
        if level is None:
            return None
        if not isinstance(level, int):
            try:
                level = int(level)
            except Exception:
                return None
        if level < 1:
            return None
        return "$".repeat(min(4, level))

    desired_cuisine = (merged_filters.cuisine or "").strip() or None
    saved_tags = (pref_row.cuisine_tags or [])[:5] if pref_row is not None else []
    cand_tags = [t for t in (candidate.cuisine_tags or []) if t]

    if desired_cuisine:
        for t in cand_tags:
            if desired_cuisine.lower() in t.lower() or t.lower() in desired_cuisine.lower():
                return f"Cuisine match: {t}."

    for t in saved_tags:
        if t and any(c.lower() == t.lower() for c in cand_tags):
            return f"Matches your saved cuisine: {t}."

    checks: list[tuple[str, str]] = []
    if merged_filters.dietary:
        checks.append((merged_filters.dietary, "dietary"))
    if merged_filters.ambiance:
        checks.append((merged_filters.ambiance, "ambiance"))
    for kw in merged_filters.keywords or []:
        if kw:
            checks.append((kw, "keyword"))

    cand_blob = (candidate.raw_text or "").lower()
    for raw_val, kind in checks:
        if not raw_val:
            continue
        k = str(raw_val).strip().lower()
        if len(k) < 3:
            continue
        if k in cand_blob:
            nice = _nice_val(k)
            if kind == "dietary":
                return f"Great for your dietary need: {nice}."
            if kind == "ambiance":
                return f"Fits your vibe: {nice}."
            return f"Includes “{nice}”."

    desired_price = merged_filters.price if merged_filters.price is not None else pref_row.price_level
    if desired_price is not None and candidate.price_level is not None:
        diff = abs(int(desired_price) - int(candidate.price_level))
        cand_dollars = _price_to_dollars(candidate.price_level)
        wanted_dollars = _price_to_dollars(desired_price)
        if diff == 0:
            return f"Price match: {cand_dollars}."
        if diff == 1:
            return f"Close to your budget ({wanted_dollars} vs {cand_dollars})."

    rating = float(candidate.average_rating or 0.0)
    rc = int(candidate.review_count or 0)
    if rc >= 1000:
        return "Popular with lots of reviewers."
    if rating >= 4.6:
        return "Highly rated by the community."
    if rc >= 200:
        return "Well-reviewed and a strong match."

    return (
        "Recommended based on your preferences."
        if candidate.source == "local"
        else "Suggested from Yelp and matched your vibe."
    )


def process_chat_message(db: Session, user: User, body: AIChatRequest) -> AIChatResponse:
    pref = get_or_create_preference(db, user)

    if body.session_id is not None:
        session = db.get(ChatSession, body.session_id)
        if session is None or session.user_id != user.id:
            raise AppHTTPException(status_code=404, detail="Chat session not found.")
    else:
        session = ChatSession(user_id=user.id, title=body.message[:200])
        db.add(session)
        db.flush()

    if body.conversation_history:
        recent = _format_recent_conversation_history(body.conversation_history)
    else:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.chat_session_id == session.id)
            .order_by(ChatMessage.created_at)
        )
        prior = list(db.scalars(stmt).all())
        recent = _format_recent_chat(prior)

    open_query = _extract_restaurant_open_query(body.message)
    if open_query:
        restaurant_name, city = open_query
        matched = _find_restaurant_by_name(db, restaurant_name)
        if matched is not None:
            hours = matched.hours
            has_hours = isinstance(hours, list) and len(hours) > 0
            if has_hours:
                tz = tz_for_search_city(city)
                is_open = yelp_hours_open_now(hours, tz)
                reply_text = (
                    f"{matched.name} in {city} is currently {'open' if is_open else 'closed'} "
                    f"(based on stored hours)."
                )
                user_msg = ChatMessage(
                    chat_session_id=session.id,
                    role=ChatMessageRole.user,
                    content=body.message,
                )
                asst_msg = ChatMessage(
                    chat_session_id=session.id,
                    role=ChatMessageRole.assistant,
                    content=reply_text,
                )
                db.add(user_msg)
                db.add(asst_msg)
                db.commit()
                db.refresh(session)
                return AIChatResponse(
                    reply=reply_text.strip(),
                    applied_filters={"open_query": True, "restaurant_query": restaurant_name, "location": city},
                    recommendations=[],
                    session_id=session.id,
                )

        tavily_query = f"{restaurant_name} in {city} open now hours"
        web_context = _format_web_context(
            tavily_service.search_web_context(tavily_query, max_results=4)
        )
        if not web_context:
            reply_text = f"I couldn't confirm whether {restaurant_name} in {city} is open right now."
        else:
            prompt = _build_open_now_reply_prompt(
                restaurant_name=restaurant_name,
                city=city,
                web_context=web_context,
            )
            raw = gemini_service.generate_reply_text(reply_prompt=prompt) or ""
            raw_upper = raw.upper()
            if "OPEN" in raw_upper and "CLOSED" not in raw_upper:
                status = "Open"
            elif "CLOSED" in raw_upper:
                status = "Closed"
            else:
                status = "Unknown"
            reply_text = f"{restaurant_name} in {city} is {status} right now."

        user_msg = ChatMessage(
            chat_session_id=session.id,
            role=ChatMessageRole.user,
            content=body.message,
        )
        asst_msg = ChatMessage(
            chat_session_id=session.id,
            role=ChatMessageRole.assistant,
            content=reply_text,
        )
        db.add(user_msg)
        db.add(asst_msg)
        db.commit()
        db.refresh(session)
        return AIChatResponse(
            reply=reply_text.strip(),
            applied_filters={"open_query": True, "restaurant_query": restaurant_name, "location": city},
            recommendations=[],
            session_id=session.id,
        )

    parsed = gemini_service.extract_filters(recent_chat=recent, user_message=body.message)
    if not any(
        [
            parsed.keywords,
            parsed.cuisine,
            parsed.location,
            parsed.dietary,
            parsed.price,
            parsed.ambiance,
            parsed.occasion,
            parsed.timing,
        ]
    ):
        parsed = _heuristic_filters(body.message)

    if parsed.location is None:
        parsed.location = _extract_city_from_message(body.message)

    merged = _merge_with_preferences(parsed, pref)
    applied = _applied_filters_dict(merged)

    rating_target = _extract_restaurant_query_for_rating(body.message)
    if rating_target:
        matched = _find_restaurant_by_name(db, rating_target)
        if matched is not None:
            reply_text = _build_rating_reply(db, matched)
            matched_cand = _restaurant_to_candidate(matched)
            recs = [
                AIRecommendationItem.model_validate(
                    {
                        **candidate_to_api_dict(matched_cand),
                        "reason": _build_recommendation_reason(
                            matched_cand,
                            merged_filters=ParsedSearchFilters(),
                            user_message=body.message,
                            pref_row=pref,
                        ),
                    }
                )
            ]
            user_msg = ChatMessage(
                chat_session_id=session.id,
                role=ChatMessageRole.user,
                content=body.message,
            )
            asst_msg = ChatMessage(
                chat_session_id=session.id,
                role=ChatMessageRole.assistant,
                content=reply_text,
            )
            db.add(user_msg)
            db.add(asst_msg)
            db.commit()
            db.refresh(session)
            return AIChatResponse(
                reply=reply_text.strip(),
                applied_filters={"restaurant_query": rating_target},
                recommendations=recs,
                session_id=session.id,
            )

    desired_count = _extract_recommendation_count(body.message) or 8

    local_cands = _fetch_local_candidates(db, merged, body.message)
    local_yelp_ids = {yid for c in local_cands if (yid := c.yelp_business_id)}

    supplemental: list[RankableCandidate] = []
    if len(local_cands) < 5:
        supplemental = _yelp_supplement(merged, body.message, local_yelp_ids, limit=8)

    combined = local_cands + supplemental
    ranked = rank_candidates(
        combined,
        user_message=body.message,
        filters=merged,
        pref_cuisines=pref.cuisine_tags,
        pref_city=pref.default_city,
        pref_price=pref.price_level,
    )
    top = ranked[:desired_count]

    pref_summary = json.dumps(
        {
            "default_city": pref.default_city,
            "price_level": pref.price_level,
            "cuisine_tags": pref.cuisine_tags or [],
        },
        indent=2,
    )
    rec_lines = []
    for i, c in enumerate(top, start=1):
        rec_lines.append(
            f"{i}. {c.name} - {c.city}, {c.state or ''} | "
            f"{c.average_rating} stars ({c.review_count} reviews) | source={c.source}"
        )
    tavily_query = _build_tavily_query(body.message, top)
    web_context = _format_web_context(tavily_service.search_web_context(tavily_query, max_results=4))
    reply_prompt = gemini_service.build_reply_prompt(
        user_preferences_summary=pref_summary,
        applied_filters_json=json.dumps(applied, indent=2),
        recommendations_summary="\n".join(rec_lines) if rec_lines else "(no results)",
        web_search_summary=web_context,
    )
    reply_text = gemini_service.generate_reply_text(reply_prompt=reply_prompt)
    if not reply_text:
        reply_text = _fallback_reply(body.message, [c.name for c in top])

    user_msg = ChatMessage(
        chat_session_id=session.id,
        role=ChatMessageRole.user,
        content=body.message,
    )
    asst_msg = ChatMessage(
        chat_session_id=session.id,
        role=ChatMessageRole.assistant,
        content=reply_text,
    )
    db.add(user_msg)
    db.add(asst_msg)
    db.commit()
    db.refresh(session)

    recs = [
        AIRecommendationItem.model_validate(
            {
                **candidate_to_api_dict(c),
                "reason": _build_recommendation_reason(
                    c,
                    merged_filters=merged,
                    user_message=body.message,
                    pref_row=pref,
                ),
            }
        )
        for c in top
    ]

    return AIChatResponse(
        reply=reply_text.strip(),
        applied_filters=applied,
        recommendations=recs,
        session_id=session.id,
    )


def list_my_chat_sessions(db: Session, user: User) -> list[ChatSessionResponse]:
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    rows = list(db.scalars(stmt).all())
    return [ChatSessionResponse.model_validate(r) for r in rows]


def get_session_detail(db: Session, user: User, session_id: int) -> ChatSessionWithMessages:
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != user.id:
        raise AppHTTPException(status_code=404, detail="Chat session not found.")

    msg_stmt = (
        select(ChatMessage)
        .where(ChatMessage.chat_session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    msgs = list(db.scalars(msg_stmt).all())
    base = ChatSessionResponse.model_validate(session)
    return ChatSessionWithMessages.model_validate(
        {
            **base.model_dump(),
            "messages": [ChatMessageResponse.model_validate(m) for m in msgs],
        }
    )


def delete_chat_session(db: Session, user: User, session_id: int) -> None:
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != user.id:
        raise AppHTTPException(status_code=404, detail="Chat session not found.")
    db.delete(session)
    db.commit()
