"""
User Worker Service - Kafka Consumer

Consumes user events and processes them asynchronously.
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

logging.basicConfig(level=logging.INFO)
_log = logging.getLogger(__name__)


class UserWorker:
    """Kafka consumer for user events."""
    
    def __init__(self):
        self.mongo_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/yelp')
        self.mongo_db = os.getenv('MONGODB_DATABASE', 'yelp')
        self.kafka_bootstrap = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        self.kafka_group = os.getenv('KAFKA_GROUP_ID', 'user-worker-group')
        self.topics = os.getenv('KAFKA_TOPICS', 'user.created,user.updated').split(',')
        
        self.mongo_client = None
        self.db = None
        self.consumer = None
    
    def connect_mongodb(self) -> bool:
        """Connect to MongoDB."""
        try:
            self.mongo_client = MongoClient(self.mongo_url)
            self.db = self.mongo_client[self.mongo_db]
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
    
    def process_user_created(self, event: Dict[str, Any]) -> bool:
        """Process UserCreated event."""
        try:
            data = event.get('data', {})
            user_doc = {
                '_id': data.get('user_id'),
                'email': data.get('email'),
                'username': data.get('username'),
                'password_hash': data.get('password_hash'),  # Must be bcrypt hashed
                'first_name': data.get('first_name'),
                'last_name': data.get('last_name'),
                'profile_image_url': data.get('profile_image_url'),
                'status': 'active',
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc),
            }
            
            self.db['users'].insert_one(user_doc)
            _log.info(f"User created: {data.get('user_id')}")
            return True
        except PyMongoError as e:
            _log.error(f"Error creating user: {e}")
            return False
    
    def process_user_updated(self, event: Dict[str, Any]) -> bool:
        """Process UserUpdated event."""
        try:
            data = event.get('data', {})
            user_id = data.get('user_id')
            
            update_data = {k: v for k, v in data.items() if k != 'user_id'}
            update_data['updated_at'] = datetime.now(timezone.utc)
            
            result = self.db['users'].update_one(
                {'_id': user_id},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                _log.info(f"User updated: {user_id}")
                return True
            return False
        except PyMongoError as e:
            _log.error(f"Error updating user: {e}")
            return False
    
    def process_event(self, event: Dict[str, Any]) -> bool:
        """Route event to appropriate handler."""
        event_type = event.get('event_type')
        handler_map = {
            'UserCreated': self.process_user_created,
            'UserUpdated': self.process_user_updated,
        }
        
        handler = handler_map.get(event_type)
        if handler:
            return handler(event)
        else:
            _log.warning(f"Unknown event type: {event_type}")
            return False
    
    def run(self) -> None:
        """Start consuming and processing events."""
        if not self.connect_mongodb() or not self.connect_kafka():
            sys.exit(1)
        
        _log.info("User Worker started")
        
        try:
            for message in self.consumer:
                try:
                    event = message.value
                    self.process_event(event)
                except Exception as e:
                    _log.error(f"Error processing message: {e}")
        except KeyboardInterrupt:
            _log.info("Worker interrupted")
        finally:
            if self.consumer:
                self.consumer.close()
            if self.mongo_client:
                self.mongo_client.close()


if __name__ == '__main__':
    UserWorker().run()