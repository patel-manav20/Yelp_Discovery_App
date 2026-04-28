"""Base async Kafka consumer runner."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from aiokafka import AIOKafkaConsumer

from app.core.config import settings
from app.kafka import topics
from app.kafka.handlers import (
    handle_restaurant_claimed,
    handle_restaurant_created,
    handle_restaurant_updated,
    handle_review_created,
    handle_review_deleted,
    handle_review_updated,
    handle_user_created,
    handle_user_updated,
)

logger = logging.getLogger(__name__)
Handler = Callable[[dict[str, Any]], Awaitable[None]]


class KafkaConsumerRunner:
    def __init__(self, topic_handlers: dict[str, Handler], group_id: str = "yelp-backend-consumer") -> None:
        self._topic_handlers = topic_handlers
        self._consumer: AIOKafkaConsumer | None = None
        self._task: asyncio.Task | None = None
        self._group_id = group_id

    async def start(self) -> None:
        if self._task is not None:
            return
        self._consumer = AIOKafkaConsumer(
            *self._topic_handlers.keys(),
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id=self._group_id,
            enable_auto_commit=True,
            auto_offset_reset="latest",
        )
        await self._consumer.start()
        self._task = asyncio.create_task(self._consume_loop(), name="kafka-consumer-loop")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        if self._consumer is not None:
            await self._consumer.stop()
            self._consumer = None

    async def _consume_loop(self) -> None:
        assert self._consumer is not None
        try:
            async for msg in self._consumer:
                handler = self._topic_handlers.get(msg.topic)
                if handler is None:
                    continue
                try:
                    payload = json.loads(msg.value.decode("utf-8"))
                    await handler(payload)
                except Exception:  # noqa: BLE001
                    logger.exception("Kafka handler failed for topic=%s", msg.topic)
        except asyncio.CancelledError:
            raise


def default_topic_handlers() -> dict[str, Handler]:
    return {
        topics.REVIEW_CREATED: handle_review_created,
        topics.REVIEW_UPDATED: handle_review_updated,
        topics.REVIEW_DELETED: handle_review_deleted,
        topics.RESTAURANT_CREATED: handle_restaurant_created,
        topics.RESTAURANT_UPDATED: handle_restaurant_updated,
        topics.RESTAURANT_CLAIMED: handle_restaurant_claimed,
        topics.USER_CREATED: handle_user_created,
        topics.USER_UPDATED: handle_user_updated,
    }


def review_topic_handlers() -> dict[str, Handler]:
    return {
        topics.REVIEW_CREATED: handle_review_created,
        topics.REVIEW_UPDATED: handle_review_updated,
        topics.REVIEW_DELETED: handle_review_deleted,
    }


def restaurant_topic_handlers() -> dict[str, Handler]:
    return {
        topics.RESTAURANT_CREATED: handle_restaurant_created,
        topics.RESTAURANT_UPDATED: handle_restaurant_updated,
        topics.RESTAURANT_CLAIMED: handle_restaurant_claimed,
    }


def user_topic_handlers() -> dict[str, Handler]:
    return {
        topics.USER_CREATED: handle_user_created,
        topics.USER_UPDATED: handle_user_updated,
    }


kafka_consumer = KafkaConsumerRunner(default_topic_handlers())
