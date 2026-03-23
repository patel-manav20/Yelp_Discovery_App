"""
Score and sort restaurant candidates for the AI assistant.

Ranking formula (see `score_candidate`):
    total = 0.35 * preference_match
          + 0.25 * query_relevance
          + 0.25 * rating_normalized
          + 0.15 * popularity_normalized

- preference_match: overlap between saved user prefs (cuisine tags, city, price) and the candidate.
- query_relevance: simple token overlap between the user message + extracted keywords and candidate text.
- rating_normalized: average_rating / 5.
- popularity_normalized: log-scaled review count vs the max count in the current candidate set.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

from app.schemas.ai_chat_schema import ParsedSearchFilters

# Tunable weights (must sum to 1.0 for easy explanation)
W_PREFERENCE = 0.35
W_QUERY = 0.25
W_RATING = 0.25
W_POPULARITY = 0.15


@dataclass
class RankableCandidate:
    local_id: int | None
    name: str
    city: str
    state: str | None
    average_rating: float
    review_count: int
    price_level: int | None
    cuisine_tags: list[str]
    source: str
    yelp_business_id: str | None
    raw_text: str
    score: float = 0.0


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^\w]+", text.lower()) if len(t) > 1}


def _preference_match(
    candidate: RankableCandidate,
    pref_cuisines: list[str] | None,
    pref_city: str | None,
    pref_price: int | None,
    applied: ParsedSearchFilters,
) -> float:
    """0.0–1.0 rough match to user profile + merged filters."""
    parts: list[float] = []

    cuisines = [c.lower() for c in (pref_cuisines or [])]
    cand_c = [c.lower() for c in candidate.cuisine_tags]
    if cuisines and cand_c:
        overlap = len(set(cuisines) & set(cand_c)) / max(len(set(cuisines)), 1)
        parts.append(min(1.0, overlap + 0.1))
    elif applied.cuisine and cand_c:
        if applied.cuisine.lower() in " ".join(cand_c).lower():
            parts.append(0.8)

    city = (applied.location or pref_city or "").strip().lower()
    if city and city in candidate.city.lower():
        parts.append(1.0)
    elif city:
        parts.append(0.2)

    want_price = applied.price or pref_price
    if want_price is not None and candidate.price_level is not None:
        diff = abs(want_price - candidate.price_level)
        parts.append(max(0.0, 1.0 - diff * 0.35))

    # Additional preference signals (dietary / ambiance / occasion / timing).
    # These rely on `candidate.raw_text` containing those tags (we enrich raw_text for local candidates).
    raw = (candidate.raw_text or "").lower()
    if applied.dietary and applied.dietary.lower() in raw:
        parts.append(0.9)
    if applied.ambiance and applied.ambiance.lower() in raw:
        parts.append(0.85)
    if applied.occasion and applied.occasion.lower() in raw:
        parts.append(0.7)
    if applied.timing and applied.timing.lower() in raw:
        parts.append(0.7)

    if not parts:
        return 0.35
    return min(1.0, sum(parts) / len(parts))


def _query_relevance(candidate: RankableCandidate, user_message: str, filters: ParsedSearchFilters) -> float:
    blob = " ".join(
        [
            user_message,
            filters.cuisine or "",
            filters.dietary or "",
            filters.ambiance or "",
            filters.occasion or "",
            filters.timing or "",
            " ".join(filters.keywords),
        ]
    )
    q_tokens = _tokens(blob)
    c_tokens = _tokens(candidate.raw_text)
    if not q_tokens:
        return 0.3
    inter = len(q_tokens & c_tokens)
    return min(1.0, inter / max(3, len(q_tokens) * 0.4))


def _popularity_norm(review_count: int, max_rc: int) -> float:
    if max_rc <= 0:
        return 0.5
    return min(1.0, math.log1p(review_count) / math.log1p(max(max_rc, 1)))


def score_candidate(
    candidate: RankableCandidate,
    *,
    user_message: str,
    filters: ParsedSearchFilters,
    pref_cuisines: list[str] | None,
    pref_city: str | None,
    pref_price: int | None,
    max_review_count: int,
) -> float:
    pref = _preference_match(candidate, pref_cuisines, pref_city, pref_price, filters)
    qrel = _query_relevance(candidate, user_message, filters)
    rating_n = max(0.0, min(1.0, candidate.average_rating / 5.0))
    pop_n = _popularity_norm(candidate.review_count, max_review_count)
    return (
        W_PREFERENCE * pref
        + W_QUERY * qrel
        + W_RATING * rating_n
        + W_POPULARITY * pop_n
    )


def rank_candidates(
    candidates: list[RankableCandidate],
    *,
    user_message: str,
    filters: ParsedSearchFilters,
    pref_cuisines: list[str] | None,
    pref_city: str | None,
    pref_price: int | None,
) -> list[RankableCandidate]:
    if not candidates:
        return []
    max_rc = max((c.review_count for c in candidates), default=1)
    scored: list[RankableCandidate] = []
    for c in candidates:
        s = score_candidate(
            c,
            user_message=user_message,
            filters=filters,
            pref_cuisines=pref_cuisines,
            pref_city=pref_city,
            pref_price=pref_price,
            max_review_count=max_rc,
        )
        c.score = s
        scored.append(c)
    scored.sort(key=lambda x: x.score, reverse=True)
    return scored


def candidate_to_api_dict(c: RankableCandidate) -> dict[str, Any]:
    return {
        "id": c.local_id,
        "name": c.name,
        "city": c.city,
        "state": c.state,
        "average_rating": round(c.average_rating, 2),
        "review_count": c.review_count,
        "price_level": c.price_level,
        "cuisine_tags": c.cuisine_tags,
        "source": c.source,
        "yelp_business_id": c.yelp_business_id,
        "rank_score": round(c.score, 4),
    }
