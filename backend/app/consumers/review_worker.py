"""
Review Worker Service - Kafka Consumer

Consumes review events from Kafka topics and processes them:
- review.created: Insert new review into MongoDB
- review.updated: Update review in MongoDB
- review.deleted: Mark review as deleted or soft-delete

This is a long-running worker service that should be deployed separately from the API.
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict

from kafka import KafkaConsumer
from kafka.errors import KafkaError
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
_log = logging.getLogger(__name__)


class ReviewWorker:
    """Kafka consumer worker for processing review events."""
    
    def __init__(self):
        self.mongo_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/yelp')
        self.mongo_db = os.getenv('MONGODB_DATABASE', 'yelp')
        self.kafka_bootstrap = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        self.kafka_group = os.getenv('KAFKA_GROUP_ID', 'review-worker-group')
        self.topics = os.getenv('KAFKA_TOPICS', 'review.created,review.updated,review.deleted').split(',')
        
        self.mongo_client = None
        self.db = None
        self.consumer = None
    
    def connect_mongodb(self) -> bool:
        """Connect to MongoDB."""
        try:
            self.mongo_client = MongoClient(self.mongo_url)
            self.db = self.mongo_client[self.mongo_db]
            
            # Verify connection
            self.mongo_client.admin.command('ping')
            _log.info(f"Connected to MongoDB: {self.mongo_db}")
            return True
            
        except PyMongoError as e:
            _log.error(f"Failed to connect to MongoDB: {e}")
            return False
    
    def connect_kafka(self) -> bool:
        """Initialize Kafka consumer."""
        try:
            self.consumer = KafkaConsumer(
                *self.topics,
                bootstrap_servers=self.kafka_bootstrap.split(','),
                group_id=self.kafka_group,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='earliest',
                enable_auto_commit=True,
                max_poll_records=100,
                session_timeout_ms=30000,
            )
            _log.info(f"Connected to Kafka, consuming topics: {self.topics}")
            return True
            
        except KafkaError as e:
            _log.error(f"Failed to connect to Kafka: {e}")
            return False
    
    def process_review_created(self, event: Dict[str, Any]) -> bool:
        """Process ReviewCreated event."""
        try:
            data = event.get('data', {})
            review_doc = {
                '_id': data.get('review_id'),
                'restaurant_id': data.get('restaurant_id'),
                'user_id': data.get('user_id'),
                'rating': data.get('rating'),
                'title': data.get('title'),
                'text': data.get('text'),
                'helpful_count': 0,
                'unhelpful_count': 0,
                'status': 'pending',  # pending, approved, rejected
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc),
            }
            
            self.db['reviews'].insert_one(review_doc)
            _log.info(f"Review created: {data.get('review_id')}")
            return True
            
        except PyMongoError as e:
            _log.error(f"Error creating review: {e}")
            return False
    
    def process_review_updated(self, event: Dict[str, Any]) -> bool:
        """Process ReviewUpdated event."""
        try:
            data = event.get('data', {})
            review_id = data.get('review_id')
            
            update_data = {
                'rating': data.get('rating'),
                'title': data.get('title'),
                'text': data.get('text'),
                'updated_at': datetime.now(timezone.utc),
            }
            
            # Remove None values
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            result = self.db['reviews'].update_one(
                {'_id': review_id},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                _log.info(f"Review updated: {review_id}")
                return True
            else:
                _log.warning(f"Review not found for update: {review_id}")
                return False
                
        except PyMongoError as e:
            _log.error(f"Error updating review: {e}")
            return False
    
    def process_review_deleted(self, event: Dict[str, Any]) -> bool:
        """Process ReviewDeleted event (soft delete)."""
        try:
            data = event.get('data', {})
            review_id = data.get('review_id')
            
            result = self.db['reviews'].update_one(
                {'_id': review_id},
                {
                    '$set': {
                        'status': 'deleted',
                        'deleted_at': datetime.now(timezone.utc),
                        'updated_at': datetime.now(timezone.utc),
                    }
                }
            )
            
            if result.modified_count > 0:
                _log.info(f"Review deleted (soft): {review_id}")
                return True
            else:
                _log.warning(f"Review not found for deletion: {review_id}")
                return False
                
        except PyMongoError as e:
            _log.error(f"Error deleting review: {e}")
            return False
    
    def process_event(self, event: Dict[str, Any]) -> bool:
        """Route event to appropriate handler."""
        event_type = event.get('event_type')
        
        handler_map = {
            'ReviewCreated': self.process_review_created,
            'ReviewUpdated': self.process_review_updated,
            'ReviewDeleted': self.process_review_deleted,
        }
        
        handler = handler_map.get(event_type)
        if handler:
            return handler(event)
        else:
            _log.warning(f"Unknown event type: {event_type}")
            return False
    
    def run(self) -> None:
        """Start consuming and processing events."""
        if not self.connect_mongodb():
            _log.error("Failed to connect to MongoDB")
            sys.exit(1)
        
        if not self.connect_kafka():
            _log.error("Failed to connect to Kafka")
            sys.exit(1)
        
        _log.info("Review Worker started, waiting for events...")
        
        try:
            for message in self.consumer:
                try:
                    event = message.value
                    _log.debug(f"Received event: {event}")
                    
                    success = self.process_event(event)
                    
                    if not success:
                        _log.warning(f"Failed to process event: {event}")
                    
                except Exception as e:
                    _log.error(f"Error processing message: {e}")
                    continue
        
        except KeyboardInterrupt:
            _log.info("Worker interrupted by user")
        except Exception as e:
            _log.error(f"Unexpected error in worker: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self) -> None:
        """Clean up resources."""
        if self.consumer:
            try:
                self.consumer.close()
            except Exception as e:
                _log.error(f"Error closing Kafka consumer: {e}")
        
        if self.mongo_client:
            try:
                self.mongo_client.close()
            except Exception as e:
                _log.error(f"Error closing MongoDB connection: {e}")
        
        _log.info("Worker cleanup completed")


if __name__ == '__main__':
    worker = ReviewWorker()
    worker.run()