"""Singleton async Kafka producer."""

from __future__ import annotations

import json
from typing import Any

from aiokafka import AIOKafkaProducer

from app.core.config import settings


class KafkaProducerManager:
    def __init__(self) -> None:
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        if self._producer is not None:
            return
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            key_serializer=lambda v: v.encode("utf-8") if isinstance(v, str) else None,
        )
        await self._producer.start()

    async def stop(self) -> None:
        if self._producer is None:
            return
        await self._producer.stop()
        self._producer = None

    async def send(self, topic: str, key: str | None, value: dict[str, Any]) -> None:
        if self._producer is None:
            raise RuntimeError("Kafka producer not initialized.")
        await self._producer.send_and_wait(topic, key=key, value=value)

    def is_ready(self) -> bool:
        return self._producer is not None


kafka_producer = KafkaProducerManager()
