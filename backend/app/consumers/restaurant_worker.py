"""
Restaurant Worker Service - Kafka Consumer

Consumes restaurant events and processes them asynchronously.
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


class RestaurantWorker:
    """Kafka consumer for restaurant events."""
    
    def __init__(self):
        self.mongo_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/yelp')
        self.mongo_db = os.getenv('MONGODB_DATABASE', 'yelp')
        self.kafka_bootstrap = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        self.kafka_group = os.getenv('KAFKA_GROUP_ID', 'restaurant-worker-group')
        self.topics = os.getenv('KAFKA_TOPICS', 'restaurant.created,restaurant.updated,restaurant.claimed').split(',')
        
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
    
    def process_restaurant_created(self, event: Dict[str, Any]) -> bool:
        """Process RestaurantCreated event."""
        try:
            data = event.get('data', {})
            restaurant_doc = {
                '_id': data.get('restaurant_id'),
                'owner_id': data.get('owner_id'),
                'name': data.get('name'),
                'address': data.get('address'),
                'city': data.get('city'),
                'state': data.get('state'),
                'zip_code': data.get('zip_code'),
                'phone': data.get('phone'),
                'website': data.get('website'),
                'status': 'active',
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc),
            }
            
            self.db['restaurants'].insert_one(restaurant_doc)
            _log.info(f"Restaurant created: {data.get('restaurant_id')}")
            return True
        except PyMongoError as e:
            _log.error(f"Error creating restaurant: {e}")
            return False
    
    def process_restaurant_updated(self, event: Dict[str, Any]) -> bool:
        """Process RestaurantUpdated event."""
        try:
            data = event.get('data', {})
            restaurant_id = data.get('restaurant_id')
            
            update_data = {k: v for k, v in data.items() if k not in ['restaurant_id', 'owner_id']}
            update_data['updated_at'] = datetime.now(timezone.utc)
            
            result = self.db['restaurants'].update_one(
                {'_id': restaurant_id},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                _log.info(f"Restaurant updated: {restaurant_id}")
                return True
            return False
        except PyMongoError as e:
            _log.error(f"Error updating restaurant: {e}")
            return False
    
    def process_restaurant_claimed(self, event: Dict[str, Any]) -> bool:
        """Process RestaurantClaimed event."""
        try:
            data = event.get('data', {})
            restaurant_id = data.get('restaurant_id')
            
            result = self.db['restaurants'].update_one(
                {'_id': restaurant_id},
                {
                    '$set': {
                        'owner_id': data.get('owner_id'),
                        'claimed_at': datetime.now(timezone.utc),
                        'updated_at': datetime.now(timezone.utc),
                    }
                }
            )
            
            if result.modified_count > 0:
                _log.info(f"Restaurant claimed: {restaurant_id}")
                return True
            return False
        except PyMongoError as e:
            _log.error(f"Error claiming restaurant: {e}")
            return False
    
    def process_event(self, event: Dict[str, Any]) -> bool:
        """Route event to appropriate handler."""
        event_type = event.get('event_type')
        handler_map = {
            'RestaurantCreated': self.process_restaurant_created,
            'RestaurantUpdated': self.process_restaurant_updated,
            'RestaurantClaimed': self.process_restaurant_claimed,
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
        
        _log.info("Restaurant Worker started")
        
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
    RestaurantWorker().run()