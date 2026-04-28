"""Restaurant worker consuming restaurant Kafka topics."""

from __future__ import annotations

import asyncio
import logging

from app.db.database import close_db, init_db
from app.kafka.consumer import KafkaConsumerRunner, restaurant_topic_handlers
from app.kafka.producer import kafka_producer

logging.basicConfig(level=logging.INFO)


async def _run() -> None:
    await init_db()
    await kafka_producer.start()
    runner = KafkaConsumerRunner(restaurant_topic_handlers(), group_id="restaurant-worker-group")
    await runner.start()
    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        await runner.stop()
        await kafka_producer.stop()
        await close_db()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
