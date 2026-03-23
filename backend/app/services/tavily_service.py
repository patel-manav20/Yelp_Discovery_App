"""Tavily web search client for supplemental AI-chat context."""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


def _api_key() -> str | None:
    key = (settings.tavily_api_key or "").strip()
    return key or None


def search_web_context(query: str, *, max_results: int = 5) -> list[dict[str, str]]:
    """
    Returns simplified web snippets for the AI assistant reply step.
    Each item contains: title, url, content.
    """
    key = _api_key()
    q = (query or "").strip()
    if not key or not q:
        return []

    body: dict[str, Any] = {
        "api_key": key,
        "query": q,
        "search_depth": "basic",
        "max_results": max(1, min(max_results, 8)),
        "include_answer": False,
        "include_raw_content": False,
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.post("https://api.tavily.com/search", json=body)
    except httpx.RequestError:
        return []

    if r.status_code != 200:
        return []

    try:
        payload = r.json()
    except ValueError:
        return []

    raw = payload.get("results")
    if not isinstance(raw, list):
        return []

    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        url = str(item.get("url") or "").strip()
        content = str(item.get("content") or "").strip()
        if not (title or content):
            continue
        out.append(
            {
                "title": title,
                "url": url,
                "content": content[:400],
            }
        )
        if len(out) >= max_results:
            break
    return out
